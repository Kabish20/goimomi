import time
from datetime import timedelta
from unittest.mock import Mock, patch
from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from . import hotel_supplier, hotel_views
from .tripjack import TripJackError


class HotelTests(SimpleTestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.factory = APIRequestFactory()
        day = timezone.localdate() + timedelta(days=5)
        self.query = {'regionId': '123', 'checkIn': str(day), 'checkOut': str(day + timedelta(days=2)),
                      'nationality': '106', 'rooms': [{'adults': 2, 'children': 1, 'childAge': [5]}]}

    def post(self, action, body):
        return hotel_views.operation(self.factory.post('/', body, format='json'), action)

    @patch('Holidays.hotel_supplier.call')
    def test_search_pricing_review_preserve_context(self, call):
        call.side_effect = [
            {'hotels': [{'tjHotelId': '1234'}], 'pageable': {'totalPages': 2}},
            {'hotels': [{'tjHotelId': '1234', 'name': 'Test hotel'}]},
            {'hotels': [{'tjHotelId': '1234', 'star_rating': '5'}]},
            {'reviewHash': 'hash', 'options': [{'optionId': 'available'}, {'optionId': 'sold', 'inventory': {'available': False}}]},
            {'bookingId': 'private', 'option': {'optionId': 'available'}, 'hotelName': 'Test hotel'},
        ]
        listing = self.post('search', self.query)
        self.assertEqual(listing.status_code, 200)
        self.assertTrue(listing.data['hasMore'])
        details = self.post('pricing', {'token': listing.data['token'], 'hid': '1234', 'checkIn': '2000-01-01'})
        self.assertEqual(details.status_code, 200)
        self.assertEqual(len(details.data['options']), 1)
        self.assertEqual(listing.data['hotels'][0]['static']['star_rating'], '5')
        self.assertNotIn('reviewHash', details.data)
        reviewed = self.post('review', {'token': details.data['token'], 'optionId': 'available'})
        self.assertEqual(reviewed.status_code, 200)
        self.assertNotIn('bookingId', reviewed.data)
        listing_body = call.call_args_list[1].args[1]
        pricing_body = call.call_args_list[3].args[1]
        self.assertEqual(pricing_body['checkIn'], self.query['checkIn'])
        self.assertEqual(pricing_body['rooms'], listing_body['rooms'])
        self.assertEqual(call.call_args.args[1]['correlationId'], listing_body['correlationId'])

    @patch('Holidays.hotel_supplier.call')
    def test_validation_rejects_child_ages_and_dates(self, call):
        self.query['rooms'][0]['childAge'] = []
        self.assertEqual(self.post('search', self.query).status_code, 400)
        self.query['rooms'][0]['childAge'] = [5]
        self.query['checkOut'] = self.query['checkIn']
        self.assertEqual(self.post('search', self.query).status_code, 400)
        self.assertEqual(self.post('search', []).status_code, 400)
        call.assert_not_called()

    @patch('Holidays.hotel_supplier.call')
    def test_invalid_expired_and_unselected_context(self, call):
        self.assertEqual(self.post('pricing', {'token': 'fake'}).status_code, 410)
        state = {'expires': time.time() - 1, 'hotels': ['1']}
        self.assertEqual(self.post('pricing', {'token': hotel_views.token(state), 'hid': '1'}).status_code, 410)
        state['expires'] = time.time() + 900
        self.assertEqual(self.post('pricing', {'token': hotel_views.token(state), 'hid': 'other'}).status_code, 400)
        self.assertEqual(self.post('review', {'token': hotel_views.token(state), 'optionId': 'other'}).status_code, 400)
        call.assert_not_called()

    @override_settings(TRIPJACK_HOTEL_API_KEY='test', TRIPJACK_ENVIRONMENT='uat')
    @patch('Holidays.hotel_supplier.requests.request')
    def test_transport_host_and_sold_out(self, request):
        request.return_value = Mock(status_code=200, json=Mock(return_value={'status': {'success': False}, 'error': {'code': 'OPTION_SOLD_OUT', 'message': 'private'}}))
        with self.assertRaises(TripJackError) as error:
            hotel_supplier.call('review', {})
        self.assertEqual(error.exception.status, 409)
        self.assertNotIn('private', str(error.exception))
        self.assertEqual(request.call_args.args[1], 'https://apitest-hms.tripjack.com/hms/v3/hotel/review')
        self.assertFalse(request.call_args.kwargs['allow_redirects'])
        self.assertEqual(request.call_count, 1)

    @override_settings(TRIPJACK_HOTEL_API_KEY='test', TRIPJACK_ENVIRONMENT='production')
    @patch('Holidays.hotel_supplier.requests.request')
    def test_production_search_host(self, request):
        request.return_value = Mock(status_code=200, json=Mock(return_value={'nationalityInfos': []}))
        hotel_supplier.call('nationalities')
        self.assertEqual(request.call_args.args[:2], ('GET', 'https://hms-search.tripjack.com/hms/v3/nationality-info'))

    @override_settings(TRIPJACK_HOTEL_API_KEY='test', TRIPJACK_ENVIRONMENT='uat')
    @patch('Holidays.hotel_supplier.requests.request')
    def test_country_and_nationality_lists_use_distinct_supplier_endpoints(self, request):
        request.return_value = Mock(status_code=200, json=Mock(return_value={'status': {'success': True}, 'hotelCountries': ['INDIA', 'UNITED ARAB EMIRATES']}))
        countries = hotel_views.countries(self.factory.get('/'))
        self.assertEqual(countries.data, ['INDIA', 'UNITED ARAB EMIRATES'])
        self.assertEqual(request.call_args.args[:2], ('GET', 'https://apitest-hms.tripjack.com/hms/v3/content/fetch-countries'))
        self.assertEqual(request.call_args.kwargs['headers']['apikey'], 'test')
        request.return_value = Mock(status_code=200, json=Mock(return_value={'status': {'success': True}, 'nationalityInfos': [{'countryId': '106', 'countryName': 'India'}]}))
        nationalities = hotel_views.nationalities(self.factory.get('/'))
        self.assertEqual(nationalities.data[0]['countryId'], '106')
        self.assertEqual(request.call_args.args[:2], ('GET', 'https://apitest.tripjack.com/hms/v3/nationality-info'))

    @patch('Holidays.hotel_supplier.call', side_effect=TripJackError('Hotel search is not configured.', 503))
    @patch('Holidays.hotel_views.Country.objects.order_by')
    @patch('Holidays.hotel_views.Nationality.objects.order_by')
    def test_local_lists_fill_dropdowns_without_supplier_credentials(self, nationalities, countries, supplier):
        nationalities.return_value.values.return_value = [{'id': 9, 'name': 'India'}]
        countries.return_value.values_list.return_value = ['India', 'United Arab Emirates']
        self.assertEqual(hotel_views.nationalities(self.factory.get('/')).data,
                         [{'countryId': 'local:9', 'countryName': 'India', 'source': 'local'}])
        self.assertEqual(hotel_views.countries(self.factory.get('/')).data,
                         ['INDIA', 'UNITED ARAB EMIRATES'])
        self.assertEqual(supplier.call_count, 2)
