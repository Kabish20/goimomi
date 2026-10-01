"""TripJack Flights v2.0.2 transport. Keys never leave the server.

No automatic retries: a timed-out booking may already have been committed.
"""
import requests
from django.conf import settings


ENDPOINTS = {
    'search': 'fms/v1/air-search-all',
    'fare-rules': 'fms/v2/farerule',
    'review': 'fms/v1/review',
    'seats': 'fms/v1/seat',
    'fare-validate': 'oms/v1/air/book/fare-validate',
    'book': 'oms/v1/air/book',
    'hold-validate': 'oms/v1/air/fare-validate',
    'confirm-book': 'oms/v1/air/confirm-book',
    'booking-details': 'oms/v1/booking-details',
    'unhold': 'oms/v1/air/unhold',
    'amendment-charges': 'oms/v1/air/amendment/amendment-charges',
    'submit-amendment': 'oms/v1/air/amendment/submit-amendment',
    'amendment-details': 'oms/v1/air/amendment/amendment-details',
    'fetch-ssr': 'fms/v1/ancillaries/fetch/ssr',
    'fetch-seats': 'fms/v1/ancillaries/fetch/seat',
    'add-ssr': 'oms/v1/air/amendment/add/ssr',
    'reissue-query': 'fms/v1/reissue/poll/searchquery-list',
    'reissue-search': 'fms/v1/reissue/poll/search',
    'reissue-review': 'fms/v1/reissue/review',
    'reissue-book': 'oms/v1/air/amendment/auto-reissue',
    'user-detail': 'ums/v1/user-detail',
}
MUTATIONS = {'book', 'confirm-book', 'unhold', 'submit-amendment', 'add-ssr', 'reissue-book'}


class TripJackError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def call(operation, payload=None):
    key = settings.TRIPJACK_API_KEY
    if not key:
        raise TripJackError('Flight service is not configured. Please contact our travel team.', 503)
    environment = settings.TRIPJACK_ENVIRONMENT
    if environment not in ('uat', 'production'):
        raise TripJackError('Flight service configuration is invalid.', 503)
    if operation in MUTATIONS and not settings.TRIPJACK_BOOKING_ENABLED:
        raise TripJackError('Flight booking operations are not enabled.', 503)
    host = 'https://tripjack.com' if environment == 'production' else 'https://apitest.tripjack.com'
    if operation == 'search' and isinstance(payload, dict) and 'searchQuery' in payload:
        sq = payload['searchQuery']
        if isinstance(sq, dict) and 'searchModifiers' in sq:
            sm = sq['searchModifiers']
            if isinstance(sm, dict) and isinstance(sm.get('pfts'), str):
                sm['pfts'] = [sm['pfts']]
    try:
        response = requests.request(
            'GET' if operation == 'user-detail' else 'POST',
            f'{host}/{ENDPOINTS[operation]}',
            headers={'apikey': key, 'Content-Type': 'application/json'},
            json=payload if operation != 'user-detail' else None,
            timeout=(10, 60), allow_redirects=False,
        )
    except requests.RequestException:
        raise TripJackError('Flight supplier could not be reached. For booking operations, check booking details before retrying.') from None
    try:
        data = response.json()
    except ValueError:
        raise TripJackError('Flight supplier returned an invalid response.') from None
    if not isinstance(data, dict):
        raise TripJackError('Flight supplier returned an invalid response.')
    status = data.get('status') or {}
    if not isinstance(status, dict):
        raise TripJackError('Flight supplier returned an invalid response.')

    errors = data.get('errors') or []
    codes_list = [str(e.get('errCode', e.get('code', ''))) for e in errors if isinstance(e, dict) and (e.get('errCode') or e.get('code'))]
    codes = ', '.join(codes_list)

    # 1. Search operations: TripJack returns HTTP 200 with code 1207 or 1045 when no flights match the search criteria.
    # Treat this as a successful search with 0 flights rather than a fatal request rejection.
    if operation == 'search' and 200 <= response.status_code < 300:
        if status.get('success') is True or any(c in ('1207', '1045') for c in codes_list):
            search_res = data.setdefault('searchResult', {})
            if not isinstance(search_res, dict):
                data['searchResult'] = {'tripInfos': {}}
            elif not isinstance(search_res.get('tripInfos'), dict):
                search_res['tripInfos'] = {}
            return data

    if not 200 <= response.status_code < 300 or status.get('success') is False or errors:
        messages_map = {
            '1000': 'The requested flight is no longer available. Please search again.',
            '1001': 'Children and infants cannot exceed the number of adult passengers.',
            '1002': 'Children cannot exceed the number of adult passengers.',
            '1003': 'Travel dates must be in ascending order.',
            '1004': 'Travel date cannot be more than one year in advance.',
            '1005': 'Origin and destination airports must be different.',
            '1006': 'A maximum of 9 passengers can be booked at a time.',
            '1009': 'Please select a valid fare to proceed.',
            '1010': 'Duplicate passenger names are not allowed.',
            '1012': 'Adult passenger age must be at least 12 years.',
            '1013': 'Child passenger age must be between 2 and 12 years.',
            '1014': 'Infant passenger age must be between 0 and 2 years.',
            '1045': 'No flights available matching your search criteria. Please check your travel dates or route.',
            '1051': 'Date of birth is required for adult passengers.',
            '1052': 'Date of birth is required for child passengers.',
            '1053': 'Date of birth is required for infant passengers.',
            '1056': 'Seat selection is not available for this flight.',
            '1057': 'Booking could not be found.',
            '1059': 'Fare hold time has expired. Please select a new fare.',
            '1064': 'Passport number is required.',
            '1065': 'Passport issue date is invalid.',
            '1066': 'Passport expiry date is invalid.',
            '1067': 'Passport must be valid for at least 6 months from travel date.',
            '1071': 'The selected fare is no longer available. Please select another flight.',
            '1207': 'No flights found for this route and date. Please try another date or nearby airports.',
            '408': 'Flight service is temporarily busy. Please wait a moment and try again.',
            '429': 'Flight service rate limit reached. Please wait a moment and try again.',
        }
        first_code = codes_list[0] if codes_list else ''
        friendly_message = messages_map.get(first_code)
        if friendly_message:
            message = f'{friendly_message} (Supplier code: {codes})' if codes else friendly_message
        else:
            message = f'Flight supplier rejected the request{": " + codes if codes else ""}. Please check availability and request details.'
        raise TripJackError(message, 400 if response.status_code < 500 else 502)
    return data

