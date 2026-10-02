"""Public discovery and staff-only supplier operations.

Public review accepts only fares from a signed, unexpired search response.
Booking IDs and passenger/account data are never exposed by public endpoints.
"""
from django.core import signing
from django.urls import path
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from . import tripjack


class Airport(serializers.Serializer):
    code = serializers.RegexField(r'^[A-Z]{3}$')


class Airline(serializers.Serializer):
    code = serializers.RegexField(r'^[A-Z0-9]{2}$')


class Route(serializers.Serializer):
    fromCityOrAirport = Airport()
    toCityOrAirport = Airport()
    travelDate = serializers.DateField()

    def validate(self, data):
        if data['fromCityOrAirport'] == data['toCityOrAirport']:
            raise serializers.ValidationError('Origin and destination must differ.')
        if data['travelDate'] < timezone.localdate():
            raise serializers.ValidationError('Travel date cannot be in the past.')
        return data


class Passengers(serializers.Serializer):
    ADULT = serializers.IntegerField(min_value=1, max_value=9)
    CHILD = serializers.IntegerField(min_value=0, max_value=8, default=0)
    INFANT = serializers.IntegerField(min_value=0, max_value=9, default=0)

    def validate(self, data):
        if data['INFANT'] > data['ADULT'] or data['CHILD'] > data['ADULT']:
            raise serializers.ValidationError('Children and infants cannot exceed adults.')
        if data['ADULT'] + data['CHILD'] > 9:
            raise serializers.ValidationError('Maximum nine seated passengers.')
        return data


class Modifiers(serializers.Serializer):
    isDirectFlight = serializers.BooleanField(default=False)
    isConnectingFlight = serializers.BooleanField(default=False)
    pfts = serializers.CharField(default='REGULAR')

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        raw_pfts = data.get('pfts', 'REGULAR')
        if isinstance(raw_pfts, (list, tuple)) and raw_pfts:
            raw_pfts = raw_pfts[0]
        elif isinstance(raw_pfts, str):
            raw_pfts = raw_pfts.strip("[]'\" ")
        val = str(raw_pfts).upper() if raw_pfts else 'REGULAR'
        data['pfts'] = val if val in ('STUDENT', 'SENIOR_CITIZEN', 'REGULAR') else 'REGULAR'
        return super().to_internal_value(data)

    def validate(self, data):
        if data['isDirectFlight'] and data['isConnectingFlight']:
            raise serializers.ValidationError('Select direct or connecting flights, not both.')
        return data


class SearchQuery(serializers.Serializer):
    cabinClass = serializers.ChoiceField(choices=['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'], default='ECONOMY')
    paxInfo = Passengers()
    routeInfos = Route(many=True, min_length=1, max_length=6)
    searchModifiers = Modifiers(required=False)
    preferredAirline = Airline(many=True, required=False, max_length=10)

    def validate_routeInfos(self, routes):
        dates = [route['travelDate'] for route in routes]
        if dates != sorted(dates):
            raise serializers.ValidationError('Travel dates must be ascending.')
        return routes


def supplier_response(operation, payload):
    try:
        return Response(tripjack.call(operation, payload))
    except tripjack.TripJackError as exc:
        return Response({'detail': str(exc)}, status=exc.status)


@api_view(['POST'])
@permission_classes([AllowAny])
def search(request):
    if not isinstance(request.data, dict):
        return Response({'detail': 'Expected a JSON object.'}, status=400)
    query = SearchQuery(data=request.data.get('searchQuery'))
    query.is_valid(raise_exception=True)
    response = supplier_response('search', {'searchQuery': query.data})
    if response.status_code != 200:
        return response
    groups = response.data.get('searchResult', {}).get('tripInfos', {})
    fares = {fare['id']: {'group': group, 'kind': fare.get('fareIdentifier'), 'sri': fare.get('sri'), 'msri': fare.get('msri')}
             for group, trips in groups.items() for trip in trips for fare in trip.get('totalPriceList', []) if fare.get('id')}
    response.data['searchToken'] = signing.dumps({'fares': fares}, salt='tripjack-search', compress=True)
    response.data['expiresIn'] = 900
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def review(request):
    if not isinstance(request.data, dict):
        return Response({'detail': 'Expected a JSON object.'}, status=400)
    try:
        context = signing.loads(request.data.get('searchToken', ''), salt='tripjack-search', max_age=900)
    except (signing.BadSignature, TypeError):
        return Response({'detail': 'Search expired. Please search again.'}, status=400)
    ids = request.data.get('priceIds')
    fares = context['fares']
    if not isinstance(ids, list) or not 1 <= len(ids) <= 6 or any(not isinstance(i, str) or i not in fares for i in ids):
        return Response({'detail': 'Select valid fares from your search.'}, status=400)
    groups = [fares[i]['group'] for i in ids]
    if len(set(groups)) != len(groups) or set(groups) != {f['group'] for f in fares.values()}:
        return Response({'detail': 'Select one fare for every journey.'}, status=400)
    selected = [fares[i] for i in ids]
    if any(f['kind'] == 'SPECIAL_RETURN' for f in selected):
        onward = next((f for f in selected if f['group'] == 'ONWARD'), {})
        back = next((f for f in selected if f['group'] == 'RETURN'), {})
        matches = back.get('msri') or []
        if isinstance(matches, str):
            matches = [matches]
        if len(selected) != 2 or any(f['kind'] != 'SPECIAL_RETURN' for f in selected) or not onward.get('sri') or onward['sri'] not in matches:
            return Response({'detail': 'Select matching special return fares.'}, status=400)
    response = supplier_response('review', {'priceIds': ids})
    if response.status_code == 200:
        response.data = {key: response.data[key] for key in ('tripInfos', 'totalPriceInfo', 'conditions', 'alerts') if key in response.data}
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def fare_rules(request):
    if not isinstance(request.data, dict):
        return Response({'detail': 'Expected a JSON object.'}, status=400)
    try:
        context = signing.loads(request.data.get('searchToken', ''), salt='tripjack-search', max_age=900)
    except (signing.BadSignature, TypeError):
        return Response({'detail': 'Search expired. Please search again.'}, status=400)
    price_id = request.data.get('priceId')
    if not isinstance(price_id, str) or price_id not in context['fares']:
        return Response({'detail': 'Select a valid fare from your search.'}, status=400)
    return supplier_response('fare-rules', {'flowType': 'SEARCH', 'id': price_id})


@api_view(['POST', 'GET'])
@permission_classes([IsAdminUser])
def staff_operation(request, operation):
    if operation not in tripjack.ENDPOINTS:
        return Response({'detail': 'Unknown flight operation.'}, status=404)
    if (request.method == 'GET') != (operation == 'user-detail'):
        return Response({'detail': 'Method not allowed.'}, status=405)
    if not isinstance(request.data, dict):
        return Response({'detail': 'Expected a JSON object.'}, status=400)
    return supplier_response(operation, request.data)


urlpatterns = [
    path('search/', search),
    path('review/', review),
    path('fare-rules/', fare_rules),
    path('staff/<slug:operation>/', staff_operation),
]
