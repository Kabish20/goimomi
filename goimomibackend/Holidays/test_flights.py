from datetime import timedelta
from unittest.mock import Mock, patch
import requests
from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from . import flight_views, tripjack


class FlightAPITests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.query = {'paxInfo': {'ADULT': 1}, 'routeInfos': [{
            'fromCityOrAirport': {'code': 'DEL'}, 'toCityOrAirport': {'code': 'BOM'},
            'travelDate': str(timezone.localdate() + timedelta(days=30)),
        }]}

    def post(self, view, body):
        return view(self.factory.post('/', body, format='json'))

    @patch('Holidays.tripjack.call')
    def test_non_object_body_is_rejected(self, call):
        for view in (flight_views.search, flight_views.review, flight_views.fare_rules):
            self.assertEqual(self.post(view, ['invalid']).status_code, 400)
        call.assert_not_called()

    @patch('Holidays.tripjack.call')
    def test_fare_rules_are_bound_to_search(self, call):
        token = flight_views.signing.dumps({'fares': {'price-1': {}}}, salt='tripjack-search')
        call.return_value = {'fareRule': {'tfr': {'CANCELLATION': [{'amount': 500}]}}}
        response = self.post(flight_views.fare_rules, {'searchToken': token, 'priceId': 'price-1', 'flowType': 'BOOKING_DETAIL', 'id': 'private-booking'})
        self.assertEqual(response.status_code, 200)
        call.assert_called_once_with('fare-rules', {'flowType': 'SEARCH', 'id': 'price-1'})

    @patch('Holidays.tripjack.call')
    def test_fare_rules_reject_invalid_or_expired_fares(self, call):
        token = flight_views.signing.dumps({'fares': {'price-1': {}}}, salt='tripjack-search')
        for body in ({'searchToken': 'fake', 'priceId': 'price-1'}, {'searchToken': token, 'priceId': 'other'}, {'searchToken': token, 'priceId': []}):
            self.assertEqual(self.post(flight_views.fare_rules, body).status_code, 400)
        with patch('Holidays.flight_views.signing.loads', side_effect=flight_views.signing.SignatureExpired):
            self.assertEqual(self.post(flight_views.fare_rules, {'searchToken': token, 'priceId': 'price-1'}).status_code, 400)
        call.assert_not_called()

    @patch('Holidays.tripjack.call')
    def test_invalid_search_does_not_contact_supplier(self, call):
        self.query['routeInfos'][0]['toCityOrAirport']['code'] = 'DEL'
        self.assertEqual(self.post(flight_views.search, {'searchQuery': self.query}).status_code, 400)
        call.assert_not_called()

    @patch('Holidays.tripjack.call')
    def test_search_and_review_exclude_booking_id(self, call):
        call.return_value = {'searchResult': {'tripInfos': {'ONWARD': [{'totalPriceList': [{'id': 'price-1'}]}]}}}
        result = self.post(flight_views.search, {'searchQuery': self.query})
        self.assertEqual(result.status_code, 200)
        call.return_value = {'bookingId': 'private-id', 'conditions': {'st': 300}, 'alerts': [{'type': 'FAREALERT'}]}
        reviewed = self.post(flight_views.review, {'searchToken': result.data['searchToken'], 'priceIds': ['price-1']})
        self.assertEqual(reviewed.status_code, 200)
        self.assertNotIn('bookingId', reviewed.data)
        self.assertEqual(reviewed.data['alerts'][0]['type'], 'FAREALERT')
        call.assert_called_with('review', {'priceIds': ['price-1']})

    @patch('Holidays.tripjack.call')
    def test_review_rejects_tampered_or_expired_search(self, call):
        self.assertEqual(self.post(flight_views.review, {'searchToken': 'fake', 'priceIds': ['fake']}).status_code, 400)
        with patch('Holidays.flight_views.signing.loads', side_effect=flight_views.signing.SignatureExpired):
            self.assertEqual(self.post(flight_views.review, {'searchToken': 'expired'}).status_code, 400)
        call.assert_not_called()

    @patch('Holidays.tripjack.call')
    def test_return_requires_both_legs(self, call):
        token = flight_views.signing.dumps({'fares': {'a': {'group': 'ONWARD'}, 'b': {'group': 'RETURN'}}}, salt='tripjack-search')
        self.assertEqual(self.post(flight_views.review, {'searchToken': token, 'priceIds': ['a']}).status_code, 400)
        call.assert_not_called()

    @patch('Holidays.tripjack.call')
    def test_special_return_must_match(self, call):
        token = flight_views.signing.dumps({'fares': {
            'a': {'group': 'ONWARD', 'kind': 'SPECIAL_RETURN', 'sri': 'match'},
            'b': {'group': 'RETURN', 'kind': 'SPECIAL_RETURN', 'msri': ['other']},
        }}, salt='tripjack-search')
        self.assertEqual(self.post(flight_views.review, {'searchToken': token, 'priceIds': ['a', 'b']}).status_code, 400)
        call.assert_not_called()

    @patch('Holidays.tripjack.call')
    def test_non_staff_cannot_book_or_read_account(self, call):
        for operation in ('book', 'booking-details', 'user-detail'):
            request = self.factory.post('/', {}, format='json')
            force_authenticate(request, user=Mock(is_authenticated=True, is_staff=False, pk=1))
            self.assertEqual(flight_views.staff_operation(request, operation).status_code, 403)
        call.assert_not_called()


@override_settings(TRIPJACK_API_KEY='test-key', TRIPJACK_ENVIRONMENT='uat', TRIPJACK_BOOKING_ENABLED=False)
class TripJackTransportTests(SimpleTestCase):
    @patch('Holidays.tripjack.requests.request')
    def test_headers_endpoint_and_no_redirects(self, request):
        request.return_value = Mock(status_code=200, json=Mock(return_value={'status': {'success': True}}))
        tripjack.call('fare-rules', {'flowType': 'SEARCH', 'id': 'price'})
        args, kwargs = request.call_args
        self.assertEqual(args, ('POST', 'https://apitest.tripjack.com/fms/v2/farerule'))
        self.assertEqual(kwargs['headers']['apikey'], 'test-key')
        self.assertFalse(kwargs['allow_redirects'])

    @patch('Holidays.tripjack.requests.request')
    def test_mutations_disabled_by_default(self, request):
        for operation in tripjack.MUTATIONS:
            with self.assertRaises(tripjack.TripJackError):
                tripjack.call(operation, {})
        request.assert_not_called()

    @patch('Holidays.tripjack.requests.request')
    def test_timeout_never_retries(self, request):
        request.side_effect = requests.Timeout('secret request')
        with self.assertRaises(tripjack.TripJackError) as error:
            tripjack.call('review', {})
        self.assertNotIn('secret', str(error.exception))
        self.assertEqual(request.call_count, 1)

    @patch('Holidays.tripjack.requests.request')
    def test_supplier_error_on_http_200(self, request):
        request.return_value = Mock(status_code=200, json=Mock(return_value={
            'status': {'success': False}, 'errors': [{'errCode': '1015', 'message': 'secret'}],
        }))
        with self.assertRaises(tripjack.TripJackError) as error:
            tripjack.call('review', {})
        self.assertIn('1015', str(error.exception))
        self.assertNotIn('secret', str(error.exception))

    @override_settings(TRIPJACK_ENVIRONMENT='production')
    @patch('Holidays.tripjack.requests.request')
    def test_account_uses_get_and_production_host(self, request):
        request.return_value = Mock(status_code=200, json=Mock(return_value={}))
        tripjack.call('user-detail')
        self.assertEqual(request.call_args.args, ('GET', 'https://tripjack.com/ums/v1/user-detail'))

    @patch('Holidays.tripjack.requests.request')
    def test_search_treats_empty_results_gracefully(self, request):
        for code in ('1045', '1207'):
            request.return_value = Mock(status_code=200, json=Mock(return_value={
                'status': {'success': True, 'httpStatus': 200},
                'searchResult': {'tripInfos': {}},
                'errors': [{'errCode': code, 'message': 'No flights available'}],
            }))
            res = tripjack.call('search', {'searchQuery': {}})
            self.assertEqual(res['searchResult']['tripInfos'], {})

    def test_modifiers_accepts_list_and_string_pfts(self):
        serializer = flight_views.Modifiers(data={'pfts': ['REGULAR']})
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['pfts'], 'REGULAR')

        serializer = flight_views.Modifiers(data={'pfts': "['STUDENT']"})
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['pfts'], 'STUDENT')

        serializer = flight_views.Modifiers(data={'pfts': 'senior_citizen'})
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['pfts'], 'SENIOR_CITIZEN')

