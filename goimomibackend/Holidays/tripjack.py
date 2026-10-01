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
    if not 200 <= response.status_code < 300 or status.get('success') is False or data.get('errors'):
        # Never echo supplier messages which may contain request data or credentials.
        errors = data.get('errors') or []
        codes = ', '.join(str(e.get('errCode', e.get('code', 'unknown'))) for e in errors if isinstance(e, dict)) if isinstance(errors, list) else ''
        raise TripJackError(f'Flight supplier rejected the request{": " + codes if codes else ""}. Please check availability and request details.', 400 if response.status_code < 500 else 502)
    return data
