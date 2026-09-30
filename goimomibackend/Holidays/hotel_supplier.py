"""Hotel v3 transport, separate from the Flights host and response envelope."""
import requests
from django.conf import settings
from .tripjack import TripJackError

PATHS = {'listing': 'hotel/listing', 'pricing': 'hotel/pricing', 'review': 'hotel/review',
         'mapping': 'content/fetch-hotel-mapping', 'content': 'content/fetch-hotel-content',
         'cities': 'content/fetch-city-regionIds', 'countries': 'content/fetch-countries',
         'nationalities': 'nationality-info'}


def call(operation, payload=None):
    key = getattr(settings, 'TRIPJACK_HOTEL_API_KEY', '') or settings.TRIPJACK_API_KEY
    if not key:
        raise TripJackError('Hotel search is not configured. Please contact our travel team.', 503)
    environment = settings.TRIPJACK_ENVIRONMENT
    if environment not in ('uat', 'production'):
        raise TripJackError('Hotel service configuration is invalid.', 503)
    host = 'https://hms-search.tripjack.com' if environment == 'production' else (
        'https://apitest.tripjack.com' if operation == 'nationalities' else 'https://apitest-hms.tripjack.com')
    is_get = operation in ('cities', 'countries', 'nationalities')
    try:
        response = requests.request('GET' if is_get else 'POST', f'{host}/hms/v3/{PATHS[operation]}',
                                    headers={'apikey': key, 'Content-Type': 'application/json', 'Accept': 'application/json'},
                                    params=payload if is_get else None, json=None if is_get else payload,
                                    timeout=(10, 60), allow_redirects=False)
        data = response.json()
    except (requests.RequestException, ValueError):
        raise TripJackError('Hotel supplier could not be reached. Please try again later.') from None
    if not isinstance(data, dict) or not isinstance(data.get('status', {}), dict):
        raise TripJackError('Hotel supplier returned an invalid response.')
    if not 200 <= response.status_code < 300 or data.get('status', {}).get('success') is False or data.get('error') or data.get('errors'):
        error = data.get('error') or {}
        code = error.get('code') if isinstance(error, dict) else None
        messages = {'OPTION_SOLD_OUT': ('This room option is sold out. Please choose another option.', 409),
                    'SEARCH_SESSION_EXPIRED': ('Your hotel search expired. Please search again.', 410),
                    'RATE_LIMITED': ('Hotel search is busy. Please try again shortly.', 429)}
        message, status = messages.get(code, ('Hotel supplier could not complete this request. Please check your dates and try again.', 502))
        raise TripJackError(message, status)
    return data
