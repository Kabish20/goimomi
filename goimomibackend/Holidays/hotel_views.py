import json
import time
import uuid
from pathlib import Path
from django.conf import settings
from django.core import signing
from django.db import DatabaseError
from django.urls import path
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from . import hotel_supplier
from .models import Country, Nationality
from .tripjack import TripJackError


class Room(serializers.Serializer):
    adults = serializers.IntegerField(min_value=1, max_value=6)
    children = serializers.IntegerField(min_value=0, max_value=4, default=0)
    childAge = serializers.ListField(child=serializers.IntegerField(min_value=0, max_value=17), default=list, max_length=4)

    def validate(self, data):
        if len(data['childAge']) != data['children']:
            raise serializers.ValidationError('Provide an age for every child.')
        return data


class Search(serializers.Serializer):
    regionId = serializers.RegexField(r'^\d+$', max_length=30)
    checkIn = serializers.DateField()
    checkOut = serializers.DateField()
    rooms = Room(many=True, min_length=1, max_length=9)
    nationality = serializers.RegexField(r'^\d+$', max_length=20)
    page = serializers.IntegerField(min_value=0, max_value=10000, default=0)

    def validate(self, data):
        if data['checkIn'] <= timezone.localdate() or data['checkOut'] <= data['checkIn']:
            raise serializers.ValidationError('Choose a future check-in and a later check-out date.')
        return data


def token(context):
    return signing.dumps(context, salt='hotel-search', compress=True)


def context(request):
    try:
        value = signing.loads(request.data.get('token', ''), salt='hotel-search', max_age=900)
        if time.time() >= value['expires']:
            raise signing.SignatureExpired()
        return value
    except (signing.BadSignature, TypeError, KeyError):
        raise TripJackError('Your hotel search expired. Please search again.', 410) from None


@api_view(['GET'])
@permission_classes([AllowAny])
def destinations(request):
    query = request.query_params.get('q', '').strip().casefold()
    if len(query) < 2:
        return Response([])
    try:
        rows = json.loads((Path(settings.BASE_DIR) / 'hotel_destinations.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return Response({'detail': 'Hotel destinations are not available yet. Please contact our travel team.'}, status=503)
    return Response([row for row in rows if query in row.get('fullRegionName', row.get('cityName', '')).casefold()][:30])


@api_view(['GET'])
@permission_classes([AllowAny])
def nationalities(request):
    try:
        rows = hotel_supplier.call('nationalities').get('nationalityInfos', [])
        return Response(rows if isinstance(rows, list) else [])
    except TripJackError as exc:
        if exc.status in (502, 503):
            try:
                rows = [{'countryId': f"local:{row['id']}", 'countryName': row['name'], 'source': 'local'}
                        for row in Nationality.objects.order_by('name').values('id', 'name')]
                if rows:
                    return Response(rows)
            except DatabaseError:
                pass
        return Response({'detail': str(exc)}, status=exc.status)


@api_view(['GET'])
@permission_classes([AllowAny])
def countries(request):
    try:
        rows = hotel_supplier.call('countries').get('hotelCountries', [])
        return Response([name for name in rows if isinstance(name, str)] if isinstance(rows, list) else [])
    except TripJackError as exc:
        if exc.status in (502, 503):
            try:
                rows = [name.upper() for name in Country.objects.order_by('name').values_list('name', flat=True)]
                if rows:
                    return Response(rows)
            except DatabaseError:
                pass
        return Response({'detail': str(exc)}, status=exc.status)


@api_view(['POST'])
@permission_classes([AllowAny])
def operation(request, action):
    if not isinstance(request.data, dict):
        return Response({'detail': 'Expected a JSON object.'}, status=400)
    try:
        if action == 'search':
            form = Search(data=request.data)
            form.is_valid(raise_exception=True)
            values = dict(form.data)
            page, region = values.pop('page'), values.pop('regionId')
            mapping = hotel_supplier.call('mapping', {'regionIds': [region], 'page': page, 'size': 100})
            ids = [int(h['tjHotelId']) for h in mapping.get('hotels', []) if str(h.get('tjHotelId', '')).isdigit()]
            if not ids:
                return Response({'hotels': [], 'hasMore': False})
            values.update(currency='INR', correlationId=str(uuid.uuid4()), hids=ids)
            result = hotel_supplier.call('listing', values)
            # Catalogue data decorates cards; dynamic Listing remains the rate source.
            try:
                static = hotel_supplier.call('content', {'hotelIds': [str(i) for i in ids]})
                content = {str(h.get('tjHotelId')): h for h in static.get('hotels', [])}
                for hotel in result.get('hotels', []):
                    record = content.get(str(hotel.get('tjHotelId')), {})
                    hotel['static'] = {key: record[key] for key in ('star_rating', 'property_type', 'locale', 'images') if key in record}
            except TripJackError:
                pass
            state = {'query': values, 'hotels': [str(h['tjHotelId']) for h in result.get('hotels', [])], 'expires': time.time() + 900}
            result.update(token=token(state), expiresAt=state['expires'], hasMore=page + 1 < mapping.get('pageable', {}).get('totalPages', 1))
        elif action == 'pricing':
            state = context(request)
            hid = request.data.get('hid')
            if not isinstance(hid, str) or hid not in state['hotels']:
                raise TripJackError('Select a hotel from your search.', 400)
            query = {key: value for key, value in state['query'].items() if key != 'hids'}
            result = hotel_supplier.call('pricing', {**query, 'hid': hid})
            options = [o for o in result.get('options', []) if o.get('inventory', {}).get('available') is not False]
            state.update(hid=hid, reviewHash=result.pop('reviewHash', None), options=[o['optionId'] for o in options])
            result.update(options=options, token=token(state), expiresAt=state['expires'])
        elif action == 'review':
            state = context(request)
            option_id = request.data.get('optionId')
            if not isinstance(option_id, str) or option_id not in state.get('options', []) or not state.get('reviewHash'):
                raise TripJackError('Select an available room option.', 400)
            result = hotel_supplier.call('review', {'correlationId': state['query']['correlationId'], 'hid': state['hid'], 'reviewHash': state['reviewHash'], 'optionId': option_id})
            result = {key: result[key] for key in ('hotelName', 'tjHotelId', 'option', 'status') if key in result}
        else:
            return Response(status=404)
        return Response(result)
    except TripJackError as exc:
        return Response({'detail': str(exc)}, status=exc.status)


urlpatterns = [path('destinations/', destinations), path('nationalities/', nationalities), path('countries/', countries), path('<slug:action>/', operation)]
