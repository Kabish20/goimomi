import os
import logging
import json
from decimal import Decimal, InvalidOperation

# Django Imports
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.core import signing
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, F


# Rest Framework Imports
from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes, action
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.throttling import AnonRateThrottle
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

logger = logging.getLogger(__name__)

class IsAuthenticatedOrWriteOnly(BasePermission):
    """
    Allow any user to POST (create) a resource,
    but require staff access for any other action (read, update, delete).
    """
    def has_permission(self, request, view):
        if request.method == 'POST' and getattr(view, 'action', None) == 'create':
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsAdminOrReadOnly(BasePermission):
    """Expose public catalogue reads while reserving management changes for staff."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

class EmailSharingRateThrottle(AnonRateThrottle):
    rate = '5/minute' # limit email requests to 5 per minute per IP


class AdminLoginRateThrottle(AnonRateThrottle):
    rate = '5/minute'


class InsufficientProductStock(Exception):
    """Raised when a paid product order cannot be fulfilled from current inventory."""


def verify_zoho_payment_session(callback_session_id, stored_session_id, reference_number, amount):
    """Verify a paid Zoho checkout session without trusting redirect query parameters."""
    if not stored_session_id:
        return False
    if callback_session_id and callback_session_id != stored_session_id:
        return False

    try:
        from Holidays.services.zoho_payment import ZohoPaymentService

        currency = 'USD' if getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper() == 'US' else 'INR'
        return ZohoPaymentService.verify_paid_session(
            stored_session_id,
            reference_number=reference_number,
            amount=amount,
            currency=currency,
        )
    except Exception as error:
        print(f"Unable to verify Zoho payment session for {reference_number}: {error}")
        return False


def _normalise_cab_city(value):
    city = str(value or '').split('(')[0].split(',')[0].strip().lower()
    aliases = {
        'makkah': 'mecca',
        'mekka': 'mecca',
        'medina': 'madinah',
        'madina': 'madinah',
    }
    return aliases.get(city, city)


def _cab_value_matches(rate_value, requested_value):
    rate_value = str(rate_value or '').strip().lower()
    requested_value = str(requested_value or '').strip().lower()
    if not rate_value or not requested_value:
        return True
    return rate_value == requested_value or rate_value in requested_value or requested_value in rate_value


def quote_cab_fare(vehicle_id, from_city, to_city, pickup_date, pickup_point='', drop_point=''):
    """Resolve a fare only from rate cards valid for the requested trip."""
    try:
        vehicle = VehicleMaster.objects.select_related('brand').get(pk=int(vehicle_id))
    except (VehicleMaster.DoesNotExist, TypeError, ValueError):
        return None, None

    try:
        travel_date = timezone.datetime.strptime(str(pickup_date), '%Y-%m-%d').date()
    except (TypeError, ValueError):
        travel_date = None

    norm_from_city = _normalise_cab_city(from_city)
    norm_to_city = _normalise_cab_city(to_city)
    if not travel_date or not norm_from_city or not norm_to_city:
        return vehicle, None

    vehicle_names = {str(vehicle.name or '').strip().lower()}
    if vehicle.brand_id:
        vehicle_names.add(f"{vehicle.brand.name} {vehicle.name}".strip().lower())

    def _extract_fares(rate_cards_qs):
        found_fares = []
        for rate_card in rate_cards_qs:
            routes = rate_card.routes
            columns = rate_card.column_vehicles
            if isinstance(routes, str):
                try:
                    routes = json.loads(routes)
                except (TypeError, ValueError):
                    routes = []
            if isinstance(columns, str):
                try:
                    columns = json.loads(columns)
                except (TypeError, ValueError):
                    columns = []

            if not isinstance(routes, list) or not isinstance(columns, list):
                continue

            for route in routes or []:
                if not isinstance(route, dict):
                    continue
                route_from = _normalise_cab_city(route.get('start_city'))
                route_to = _normalise_cab_city(route.get('drop_city'))
                if not route_from or not _cab_value_matches(route_from, norm_from_city):
                    continue
                if not route_to or not _cab_value_matches(route_to, norm_to_city):
                    continue
                if pickup_point and not _cab_value_matches(route.get('start_from'), pickup_point):
                    continue
                if drop_point and not _cab_value_matches(route.get('drop_to'), drop_point):
                    continue

                for index, name in enumerate(columns or []):
                    if str(name or '').strip().lower() not in vehicle_names:
                        continue
                    try:
                        fare = Decimal(str(route.get(f'v{index + 1}')))
                    except (InvalidOperation, TypeError, ValueError):
                        continue
                    if fare.is_finite() and fare > 0:
                        found_fares.append(fare)
        return found_fares

    fares = []
    if travel_date:
        strict_cards = VehicleRateCard.objects.filter(
            validity_start__lte=travel_date,
            validity_end__gte=travel_date,
        )
        fares = _extract_fares(strict_cards)

    return vehicle, min(fares) if fares else None


def build_cab_document_token(booking):
    return signing.dumps(
        {'booking_id': booking.booking_id, 'booking_pk': booking.pk},
        salt='cab-booking-document',
    )


def get_cab_document_booking(token):
    try:
        payload = signing.loads(token, salt='cab-booking-document', max_age=60 * 60 * 24 * 30)
        booking = CabBooking.objects.get(pk=payload.get('booking_pk'))
    except (signing.BadSignature, CabBooking.DoesNotExist, TypeError, ValueError, AttributeError):
        return None

    return booking if booking.booking_id == payload.get('booking_id') else None


from .models import (
    HolidayEnquiry, UmrahEnquiry, Enquiry, HolidayPackage,
    ItineraryMaster, Visa,
    VisaApplication, VisaApplicant, VisaAdditionalDocument,
    Supplier, CruiseCalendar, HotelMaster, Airline, SightseeingMaster,
    SightseeingImage, MealMaster, VehicleBrand, Accommodation,
    AccommodationImage, RoomType, VehicleMaster, DriverMaster,
    VehicleRateCard, PickupPointMaster, CabBooking, CabAdditionalDocument,
    CancellationPolicy, CantonEnquiry, BusinessJourneyRegistration, City, Region, Nationality, Country, Airport, CruiseTerminal, OTPVerification,
    GoimomiProduct, GoimomiProductImage, GoimomiProductOrder, LogisticsProvider, PackageBooking,
    CatalogueMaster, SubCatalogue, ZohoWebhookLog, GlobalHorizonsProfile
)
from .serializers import (
    HolidayEnquirySerializer, UmrahEnquirySerializer, EnquirySerializer,
    HolidayPackageSerializer,
    ItineraryMasterSerializer, UserSerializer,
    VisaSerializer, VisaApplicationSerializer,
    VisaApplicantSerializer, VisaAdditionalDocumentSerializer,
    VisaApplicantSubmissionSerializer, VisaDocumentSubmissionSerializer,
    SupplierSerializer, CruiseCalendarSerializer,
    HotelMasterSerializer, AirlineSerializer, SightseeingMasterSerializer,
    MealMasterSerializer, VehicleBrandSerializer, AccommodationSerializer,
    RoomTypeSerializer, VehicleMasterSerializer, DriverMasterSerializer,
    VehicleRateCardSerializer, PickupPointMasterSerializer,
    CabBookingSerializer, CabAdditionalDocumentSerializer,
    CancellationPolicySerializer, CantonEnquirySerializer, BusinessJourneyRegistrationSerializer, CitySerializer,
    RegionSerializer, NationalitySerializer, CountrySerializer, AirportSerializer, CruiseTerminalSerializer,
    GoimomiProductSerializer, GoimomiProductImageSerializer, GoimomiProductOrderSerializer, LogisticsProviderSerializer, PackageBookingSerializer,
    CatalogueMasterSerializer, SubCatalogueSerializer, GlobalHorizonsProfileSerializer
)

class GlobalHorizonsProfileViewSet(ModelViewSet):
    permission_classes = [IsAuthenticatedOrWriteOnly]
    queryset = GlobalHorizonsProfile.objects.all()
    serializer_class = GlobalHorizonsProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None

    def perform_create(self, serializer):
        with transaction.atomic():
            serializer.save()

    def perform_update(self, serializer):
        with transaction.atomic():
            serializer.save()

    @action(detail=False, methods=['get'], url_path='export', permission_classes=[IsAdminUser])
    def export(self, request):
        from .profile_exports import export_profiles
        file_type = request.query_params.get('file_type', 'xlsx')
        if file_type not in ('xlsx', 'pdf', 'booklet'):
            return Response({'detail': 'Choose xlsx, pdf or booklet.'}, status=400)
        search = request.query_params.get('search', '').strip().lower()
        search_fields = ('full_name', 'city', 'country', 'profession', 'organization', 'email', 'interests', 'connections_sought')
        profiles = [profile for profile in self.get_queryset()
                    if not search or any(search in str(getattr(profile, field) or '').lower() for field in search_fields)]
        if file_type == 'booklet':
            from django.http import HttpResponse
            from .profile_documents import participant_booklet
            response = HttpResponse(participant_booklet(profiles), content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="global-horizons-participant-booklet.pdf"'
            response['Cache-Control'] = 'private, no-store'
            return response
        return export_profiles(profiles, request, file_type)


class BusinessJourneyRegistrationViewSet(ModelViewSet):
    permission_classes = [IsAuthenticatedOrWriteOnly]
    queryset = BusinessJourneyRegistration.objects.all().order_by('-created_at')
    serializer_class = BusinessJourneyRegistrationSerializer
    pagination_class = None

    def perform_create(self, serializer):
        registration = serializer.save()
        try:
            from .utils import create_zoho_crm_lead
            import threading
            lead_data = {
                'name': getattr(registration, 'full_name', '') or 'Business Registration',
                'email': getattr(registration, 'email', '') or '',
                'phone': getattr(registration, 'phone', '') or getattr(registration, 'whatsapp_number', '') or '',
                'description': f"Journey: {getattr(registration, 'journey', '')}\nCompany: {getattr(registration, 'company_name', '')}\nWhatsApp: {getattr(registration, 'whatsapp_number', '')}\nPurpose: {getattr(registration, 'contacting_for', '')}\nMessage: {getattr(registration, 'message', '')}",
                'lead_source': f"Website - {getattr(registration, 'journey', 'Business')} Registration",
                'company': getattr(registration, 'company_name', '') or 'Individual'
            }
            threading.Thread(target=create_zoho_crm_lead, args=(lead_data,)).start()
        except Exception as e:
            print(f"Error syncing BusinessJourneyRegistration to Zoho CRM: {e}")

class CantonEnquiryAPI(ModelViewSet):
    permission_classes = [IsAuthenticatedOrWriteOnly]
    queryset = CantonEnquiry.objects.all().order_by('-created_at')
    serializer_class = CantonEnquirySerializer
    pagination_class = None

    def perform_create(self, serializer):
        enquiry = serializer.save()
        try:
            from .utils import create_zoho_crm_lead
            import threading
            lead_data = {
                'name': getattr(enquiry, 'full_name', '') or getattr(enquiry, 'name', '') or 'Canton Lead',
                'email': getattr(enquiry, 'email', '') or '',
                'phone': getattr(enquiry, 'whatsapp_number', '') or getattr(enquiry, 'phone', '') or '',
                'description': f"Canton Fair Enquiry\nCompany: {getattr(enquiry, 'business_name', '')}\nPhase: {getattr(enquiry, 'selected_phase', '')}\nPayment Status: {getattr(enquiry, 'payment_status', 'Pending')}",
                'lead_source': 'Website Canton Fair Enquiry',
                'company': getattr(enquiry, 'business_name', '') or 'Individual'
            }
            threading.Thread(target=create_zoho_crm_lead, args=(lead_data,)).start()
        except Exception as e:
            print(f"Error syncing CantonEnquiry to Zoho CRM: {e}")

class AirportViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = AirportSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Airport.objects.select_related('city', 'city__country', 'city__region').all().order_by('name')
        search = self.request.query_params.get('search')
        city_id = self.request.query_params.get('city_id')
        country_id = self.request.query_params.get('country_id')
        if search:
            queryset = queryset.filter(
                Q(iata_code__icontains=search) |
                Q(name__icontains=search) |
                Q(city__name__icontains=search) |
                Q(city__country__name__icontains=search)
            )
        if city_id and city_id != 'undefined':
            queryset = queryset.filter(city_id=city_id)
        if country_id and country_id != 'undefined':
            queryset = queryset.filter(city__country_id=country_id)
        return queryset

    def list(self, request, *args, **kwargs):
        search = (request.query_params.get('search') or '').strip().lower()
        city_id = (request.query_params.get('city_id') or '').strip()
        country_id = (request.query_params.get('country_id') or '').strip()
        cache_key = f"airports_list_{search}_{city_id}_{country_id}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(cached_data)

        response = super().list(request, *args, **kwargs)
        if response.status_code == 200:
            cache.set(cache_key, response.data, 86400 if not search else 3600)
        return response

    def _clear_airports_cache(self):
        try:
            cache.delete_pattern("airports_list_*")
        except AttributeError:
            cache.delete("airports_list___")

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._clear_airports_cache()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._clear_airports_cache()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        self._clear_airports_cache()


class CruiseTerminalViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = CruiseTerminalSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = CruiseTerminal.objects.all().order_by('terminal_name')
        country_id = self.request.query_params.get('country_id')
        if country_id and country_id != 'undefined':
            queryset = queryset.filter(city__country_id=country_id)
        return queryset

class CountryViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Country.objects.all().order_by('name')
    serializer_class = CountrySerializer
    pagination_class = None

class NationalityViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = NationalitySerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Nationality.objects.all().order_by('name')
        country_id = self.request.query_params.get('country_id')
        if country_id:
            queryset = queryset.filter(country_id=country_id)
        return queryset

class RegionViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = RegionSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Region.objects.all().order_by('name')
        country_id = self.request.query_params.get('country_id')
        if country_id and country_id != 'undefined':
            queryset = queryset.filter(country_id=country_id)
        return queryset

class CityViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = CitySerializer
    pagination_class = None

    def get_queryset(self):
        queryset = City.objects.exclude(name='Jeddah (JED)').order_by('name')
        region_id = self.request.query_params.get('region_id')
        country_id = self.request.query_params.get('country_id')
        if region_id and region_id != 'undefined':
            queryset = queryset.filter(region_id=region_id)
        if country_id and country_id != 'undefined':
            queryset = queryset.filter(country_id=country_id)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().select_related('country', 'region').values(
            'id', 'name', 
            country_name=F('country__name'), 
            region_name=F('region__name')
        )
        return Response(list(queryset))

class DashboardStatsAPI(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        cab_bookings_qs = CabBooking.objects.all()
        visa_apps_qs = VisaApplication.objects.select_related('visa').prefetch_related('applicants').all()
        product_orders_qs = GoimomiProductOrder.objects.select_related('product').all()
        package_bookings_qs = PackageBooking.objects.all()

        # Revenue aggregations
        cab_revenue = sum(float(b.price or 0) for b in cab_bookings_qs if b.price)
        product_revenue = sum(float(o.total_amount or 0) for o in product_orders_qs if o.total_amount)
        package_revenue = sum(float(pb.total_price or 0) for pb in package_bookings_qs if pb.total_price)
        total_revenue = cab_revenue + product_revenue + package_revenue

        # Operational status breakdowns
        cab_status_counts = {
            'requested': cab_bookings_qs.filter(status='Booking Requested').count(),
            'defined': cab_bookings_qs.filter(status='defined').count(),
            'confirmed': cab_bookings_qs.filter(status='Confirmed').count(),
            'completed': cab_bookings_qs.filter(status='Completed').count(),
            'cancelled': cab_bookings_qs.filter(status='Cancelled').count(),
        }

        package_status_counts = {
            'pending': package_bookings_qs.filter(status='Pending').count(),
            'confirmed': package_bookings_qs.filter(status='Confirmed').count(),
            'cancelled': package_bookings_qs.filter(status='Cancelled').count(),
        }

        product_status_counts = {
            'pending': product_orders_qs.filter(status='Pending').count(),
            'confirmed': product_orders_qs.filter(status='Confirmed').count(),
            'shipped': product_orders_qs.filter(status='Shipped').count(),
            'delivered': product_orders_qs.filter(status='Delivered').count(),
            'cancelled': product_orders_qs.filter(status='Cancelled').count(),
        }

        # Comprehensive system counts
        stats = {
            "packages": HolidayPackage.objects.count(),
            "enquiries": Enquiry.objects.count(),
            "holidayEnquiries": HolidayEnquiry.objects.count(),
            "umrahEnquiries": UmrahEnquiry.objects.count(),
            "itineraryMasters": ItineraryMaster.objects.count(),
            "sightseeingMasters": SightseeingMaster.objects.count(),
            "accommodations": Accommodation.objects.count(),
            "visas": Visa.objects.count(),
            "visaApplications": visa_apps_qs.count(),
            "cantonEnquiries": CantonEnquiry.objects.count(),
            "cabBookings": cab_bookings_qs.count(),
            "packageBookings": package_bookings_qs.count(),
            "cabEnquiries": Enquiry.objects.filter(enquiry_type='Cab').count(),
            "cruiseEnquiries": Enquiry.objects.filter(enquiry_type='Cruise').count(),
            "hotelEnquiries": Enquiry.objects.filter(enquiry_type='Hotel').count(),
            "productOrders": product_orders_qs.count(),
            "goimomiProducts": GoimomiProduct.objects.count(),
            "vehicles": VehicleMaster.objects.count(),
            "drivers": DriverMaster.objects.count(),
            "rateCards": VehicleRateCard.objects.count(),
            "cities": City.objects.count(),
            "countries": Country.objects.count(),
            "airports": Airport.objects.count(),
            "pickupPoints": PickupPointMaster.objects.count(),
            "cruiseTerminals": CruiseTerminal.objects.count(),
            "users": User.objects.count(),
            "suppliers": Supplier.objects.count(),
            "logisticsProviders": LogisticsProvider.objects.count(),
            "catalogues": CatalogueMaster.objects.count(),
            "cabRevenue": cab_revenue,
            "productRevenue": product_revenue,
            "packageRevenue": package_revenue,
            "totalRevenue": total_revenue,
            "cabStatusCounts": cab_status_counts,
            "packageStatusCounts": package_status_counts,
            "productStatusCounts": product_status_counts,
        }

        # 2. Rich Recent Submissions & Activity Log
        recent = []

        # Cab Bookings
        for e in cab_bookings_qs.order_by('-created_at')[:8]:
            title_name = f"{e.title or ''} {e.first_name} {e.last_name}".strip()
            recent.append({
                "id": e.id,
                "type": "Cab Booking",
                "category_key": "cab",
                "name": title_name or f"Guest #{e.id}",
                "email": e.email or "—",
                "phone": e.phone or "—",
                "created_at": e.created_at,
                "status": e.status,
                "booking_id": e.booking_id or f"GO-TRN-{str(e.pk).zfill(4)}",
                "amount": float(e.price or 0),
                "purpose": f"{e.from_city} → {e.to_city} ({e.vehicle_name})",
                "details": {
                    "vehicle": e.vehicle_name,
                    "from_city": e.from_city,
                    "to_city": e.to_city,
                    "pickup_date": str(e.pickup_date),
                    "guests": e.guests,
                    "driver": e.driver or "Unassigned",
                    "transfer_type": e.transfer_type,
                }
            })

        # Package Bookings
        for e in package_bookings_qs.order_by('-created_at')[:5]:
            recent.append({
                "id": e.id,
                "type": "Package Booking",
                "category_key": "package",
                "name": e.full_name or f"Traveler #{e.id}",
                "email": e.email or "—",
                "phone": e.phone or "—",
                "created_at": e.created_at,
                "status": e.status,
                "booking_id": e.booking_id or f"GO-PKG-{str(e.pk).zfill(4)}",
                "amount": float(e.total_price or 0),
                "purpose": f"Package: {e.package_title}",
                "details": {
                    "package_title": e.package_title,
                    "travel_date": str(e.travel_date),
                    "adults": e.adults,
                    "children": e.children,
                    "payment_status": e.payment_status,
                }
            })

        # Product Orders
        for e in product_orders_qs.order_by('-created_at')[:6]:
            prod_name = e.product.title if e.product else "Cart Items"
            recent.append({
                "id": e.id,
                "type": "Product Order",
                "category_key": "product",
                "name": e.name or f"Customer #{e.id}",
                "email": e.email or "—",
                "phone": e.phone or "—",
                "created_at": e.created_at,
                "status": e.status,
                "booking_id": e.order_id or f"GO-ORD-{str(e.pk).zfill(4)}",
                "amount": float(e.total_amount or 0),
                "purpose": f"Order: {prod_name} (x{e.quantity})",
                "details": {
                    "product": prod_name,
                    "quantity": e.quantity,
                    "city": e.city or "",
                    "state": e.state or "",
                    "address": e.address or "",
                }
            })

        # Visa Applications
        for e in visa_apps_qs.order_by('-created_at')[:6]:
            app = e.applicants.first()
            name = f"{app.first_name} {app.last_name}".strip() if app else "Applicant"
            phone = app.phone if app and app.phone else "—"
            email = app.email if hasattr(app, 'email') and app.email else "—"
            v_country = e.visa.country if e.visa else "N/A"
            v_title = e.visa.title if e.visa else "Visa Application"
            recent.append({
                "id": e.id,
                "type": "Visa Application",
                "category_key": "visa",
                "name": name,
                "email": email,
                "phone": phone,
                "created_at": e.created_at,
                "status": "Received",
                "booking_id": f"GO-VSA-{str(e.id).zfill(4)}",
                "amount": 0,
                "purpose": f"Visa for {v_country} ({v_title})",
                "details": {
                    "country": v_country,
                    "visa_title": v_title,
                    "applicants_count": e.applicants.count(),
                }
            })

        # Holiday Enquiries
        for e in HolidayEnquiry.objects.all().order_by('-created_at')[:5]:
            dest_list = []
            if isinstance(e.cities, list):
                for c in e.cities:
                    if isinstance(c, dict):
                        dest_list.append(str(c.get('city') or c.get('name') or c))
                    elif isinstance(c, str):
                        dest_list.append(c)
            dest = ", ".join(dest_list) if dest_list else (e.start_city or "Custom Tour")
            recent.append({
                "id": e.id,
                "type": "Holiday",
                "category_key": "holiday",
                "name": e.full_name or "Holiday Guest",
                "email": e.email or "—",
                "phone": e.phone or "—",
                "created_at": e.created_at,
                "status": "Enquiry",
                "booking_id": f"ENQ-HOL-{str(e.id).zfill(4)}",
                "amount": 0,
                "purpose": f"Package: {e.package_type or 'Custom Tour'} ({dest})",
                "details": {
                    "package_type": e.package_type or "Custom",
                    "start_city": e.start_city or "N/A",
                    "holiday_type": getattr(e, 'holiday_type', 'N/A'),
                    "travel_date": str(e.travel_date) if e.travel_date else "Flexible",
                }
            })

        # Umrah Enquiries
        for e in UmrahEnquiry.objects.all().order_by('-created_at')[:5]:
            recent.append({
                "id": e.id,
                "type": "Umrah",
                "category_key": "umrah",
                "name": e.full_name or "Umrah Pilgrim",
                "email": e.email or "—",
                "phone": e.phone or "—",
                "created_at": e.created_at,
                "status": "Enquiry",
                "booking_id": f"ENQ-UMR-{str(e.id).zfill(4)}",
                "amount": 0,
                "purpose": "Umrah Pilgrimage Consultation",
                "details": {
                    "package_type": e.package_type or "Umrah",
                    "start_city": e.start_city or "N/A",
                    "travel_date": str(e.travel_date) if e.travel_date else "Flexible",
                }
            })

        # Canton Enquiries
        for e in CantonEnquiry.objects.all().order_by('-created_at')[:4]:
            recent.append({
                "id": e.id,
                "type": "Canton",
                "category_key": "canton",
                "name": e.full_name or "Business Delegate",
                "email": "—",
                "phone": e.whatsapp_number or "—",
                "created_at": e.created_at,
                "status": "Enquiry",
                "booking_id": f"ENQ-CAN-{str(e.id).zfill(4)}",
                "amount": 0,
                "purpose": f"Phase: {e.selected_phase} ({e.business_name or 'Company'})",
                "details": {
                    "phase": e.selected_phase,
                    "business": e.business_name or "N/A",
                }
            })

        # General/Other Enquiries (Cab, Cruise, Hotel, Business)
        for e in Enquiry.objects.all().order_by('-created_at')[:6]:
            purpose = e.purpose
            if e.enquiry_type == 'Cab':
                purpose = f"Cab: {e.vehicle or 'N/A'} - {e.from_city or 'N/A'} to {e.to_city or 'N/A'}"
            elif e.enquiry_type == 'Cruise':
                purpose = f"Cruise: {e.destination or 'N/A'} at {e.from_city or 'N/A'}"
            elif e.enquiry_type == 'Hotel':
                purpose = f"Hotel Stay: {e.destination or 'N/A'}"

            recent.append({
                "id": e.id,
                "type": e.enquiry_type or "General",
                "category_key": "general",
                "name": e.name or "Customer",
                "email": e.email or "—",
                "phone": e.phone or "—",
                "created_at": e.created_at,
                "status": "Enquiry",
                "booking_id": f"ENQ-GEN-{str(e.id).zfill(4)}",
                "amount": 0,
                "purpose": purpose or "General Customer Enquiry",
                "details": {
                    "enquiry_type": e.enquiry_type or "General",
                    "destination": e.destination or "N/A",
                }
            })

        # Sort all recent items by created_at descending
        recent.sort(key=lambda x: x['created_at'], reverse=True)
        recent = recent[:25]

        return Response({
            "stats": stats,
            "recentEnquiries": recent
        })

@authentication_classes([])
@permission_classes([AllowAny])
class AdminLoginView(APIView):
    throttle_classes = [AdminLoginRateThrottle]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        
        user = authenticate(username=username, password=password)

        if user is not None:
            if user.is_staff:
                return Response({
                    "success": True,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "is_superuser": user.is_superuser
                    }
                })
            else:
                return Response({"error": "Access denied. Admin privileges required."}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)



class HolidayEnquiryAPI(ModelViewSet):
    permission_classes = [IsAuthenticatedOrWriteOnly]
    queryset = HolidayEnquiry.objects.all()
    serializer_class = HolidayEnquirySerializer
    pagination_class = None

    def perform_create(self, serializer):
        enquiry = serializer.save()
        try:
            from .tasks import queue_enquiry_notifications
            lead_data = {
                'name': getattr(enquiry, 'full_name', '') or getattr(enquiry, 'name', '') or 'Holiday Lead',
                'email': getattr(enquiry, 'email', '') or '',
                'phone': getattr(enquiry, 'phone', '') or '',
                'city': getattr(enquiry, 'start_city', '') or getattr(enquiry, 'destination', '') or '',
                'description': f"Holiday Package Enquiry\nPackage: {getattr(enquiry, 'package_type', '') or getattr(enquiry, 'holiday_type', '')}\nStart City: {getattr(enquiry, 'start_city', '')}\nTravel Date: {getattr(enquiry, 'travel_date', '')}\nRooms: {getattr(enquiry, 'rooms', '')}\nAdults: {getattr(enquiry, 'adults', 0)}, Children: {getattr(enquiry, 'children', 0)}\nMessage: {getattr(enquiry, 'message', '') or ''}",
                'lead_source': 'Website Holiday Enquiry',
                'company': 'Individual'
            }
            queue_enquiry_notifications(enquiry, 'Holiday Package', lead_data)
        except Exception as e:
            print(f"Error handling HolidayEnquiry perform_create: {e}")


class UmrahEnquiryAPI(ModelViewSet):
    permission_classes = [IsAuthenticatedOrWriteOnly]
    queryset = UmrahEnquiry.objects.all()
    serializer_class = UmrahEnquirySerializer
    pagination_class = None

    def perform_create(self, serializer):
        enquiry = serializer.save()
        try:
            from .tasks import queue_enquiry_notifications
            lead_data = {
                'name': getattr(enquiry, 'full_name', '') or getattr(enquiry, 'name', '') or 'Umrah Lead',
                'email': getattr(enquiry, 'email', '') or '',
                'phone': getattr(enquiry, 'phone', '') or '',
                'city': getattr(enquiry, 'start_city', '') or '',
                'description': f"Umrah Package Enquiry\nPackage: {getattr(enquiry, 'package_type', '')}\nStart City: {getattr(enquiry, 'start_city', '')}\nTravel Date: {getattr(enquiry, 'travel_date', '')}\nRooms: {getattr(enquiry, 'rooms', '')}\nAdults: {getattr(enquiry, 'adults', 0)}, Children: {getattr(enquiry, 'children', 0)}, Infants: {getattr(enquiry, 'infants', 0)}\nMessage: {getattr(enquiry, 'message', '') or ''}",
                'lead_source': 'Website Umrah Enquiry',
                'company': 'Individual'
            }
            queue_enquiry_notifications(enquiry, 'Umrah', lead_data)
        except Exception as e:
            print(f"Error handling UmrahEnquiry perform_create: {e}")


class EnquiryAPI(ModelViewSet):
    permission_classes = [IsAuthenticatedOrWriteOnly]
    queryset = Enquiry.objects.all()
    serializer_class = EnquirySerializer
    pagination_class = None

    def perform_create(self, serializer):
        enquiry = serializer.save()
        try:
            from .tasks import queue_enquiry_notifications
            enquiry_type = getattr(enquiry, 'enquiry_type', 'General')
            lead_data = {
                'name': getattr(enquiry, 'name', '') or getattr(enquiry, 'full_name', '') or 'Enquiry Lead',
                'email': getattr(enquiry, 'email', '') or '',
                'phone': getattr(enquiry, 'phone', '') or '',
                'city': getattr(enquiry, 'destination', '') or '',
                'description': f"Website Enquiry\nType: {enquiry_type}\nDestination: {getattr(enquiry, 'destination', '')}\nPurpose: {getattr(enquiry, 'purpose', '')}",
                'lead_source': f"Website {enquiry_type} Enquiry",
                'company': 'Individual'
            }
            queue_enquiry_notifications(enquiry, enquiry_type, lead_data)
        except Exception as e:
            print(f"Error handling Enquiry perform_create: {e}")


class HolidayPackageViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = HolidayPackage.objects.all()
    serializer_class = HolidayPackageSerializer

    def get_queryset(self):
        queryset = HolidayPackage.objects.prefetch_related(
            'inclusions', 'exclusions', 'highlights', 'cancellation_policies', 
            'extra_destinations', 'extra_destinations__destination', 'itinerary', 'vehicles'
        ).select_related('supplier').order_by('-created_at', '-id')
        
        # Admin can pass ?all=true to see both active and inactive in lists
        is_all = self.request.query_params.get('all', 'false').lower() == 'true'
        
        # In list view, we usually filter by is_active unless 'all=true' is passed
        if self.action == 'list' and not is_all:
            today = timezone.now().date()
            
            # Filter by is_active first
            queryset = queryset.filter(is_active=True)
            
            # Filter out expired fixed departures
            packages = list(queryset)
            active_ids = []
            for pkg in packages:
                if pkg.fixed_departure and pkg.fixed_departure_data:
                    try:
                        # Check if any travel date's booking is still valid
                        is_valid = False
                        data = pkg.fixed_departure_data
                        if isinstance(data, str):
                            data = json.loads(data)
                        
                        for slot in data:
                            valid_until_str = slot.get('booking_valid_until')
                            if valid_until_str:
                                valid_until = timezone.datetime.strptime(valid_until_str, '%Y-%m-%d').date()
                                if valid_until >= today:
                                    is_valid = True
                                    break
                        if is_valid:
                            active_ids.append(pkg.id)
                    except:
                        # If parsing fails, keep it active to be safe
                        active_ids.append(pkg.id)
                else:
                    # Regular packages are already filtered by is_active
                    active_ids.append(pkg.id)
            queryset = queryset.filter(id__in=active_ids)

        with_flight = self.request.query_params.get('with_flight', None)
        if with_flight is not None:
            if with_flight.lower() == 'true':
                queryset = queryset.filter(with_flight=True)
            elif with_flight.lower() == 'false':
                queryset = queryset.filter(with_flight=False)
                 
        return queryset
        
    def paginate_queryset(self, queryset):
        # Disable pagination for home page 'popular' requests to avoid breaking frontend arrays
        if self.request.query_params.get('is_popular') == 'true':
            return None
        return super().paginate_queryset(queryset)








class ItineraryMasterViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = ItineraryMaster.objects.all()
    serializer_class = ItineraryMasterSerializer
    pagination_class = None



class UserViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()
    serializer_class = UserSerializer
    pagination_class = None









class VisaViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Visa.objects.all()
    serializer_class = VisaSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Visa.objects.select_related('supplier').all()
        is_all = self.request.query_params.get('all', 'false').lower() == 'true'
        
        # Admin view or explicit 'all' param
        if getattr(self, 'action', 'list') != 'list' or is_all:
            return queryset

        # Default filtering for public view
        country = self.request.query_params.get('country', None)
        is_popular = self.request.query_params.get('is_popular', None)
        
        queryset = queryset.filter(is_active=True)
        
        if country:
            queryset = queryset.filter(country__iexact=country)
            
        if is_popular is not None:
            queryset = queryset.filter(is_popular=is_popular.lower() == 'true')
            
        return queryset


class VisaApplicationViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = VisaApplication.objects.all().order_by('-created_at')
    serializer_class = VisaApplicationSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in {'create', 'create_zoho_payment_session', 'verify_zoho_payment'}:
            return [AllowAny()]
        return [IsAdminUser()]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        applicants_json = data.get('applicants_data')
        try:
            applicants_list = json.loads(applicants_json) if isinstance(applicants_json, str) else applicants_json
        except (TypeError, ValueError, json.JSONDecodeError):
            return Response({'error': 'Applicants data must be valid JSON.'}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(applicants_list, list) or not applicants_list or not all(isinstance(item, dict) for item in applicants_list):
            return Response({'error': 'At least one valid applicant is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            visa = Visa.objects.get(pk=int(data.get('visa')), is_active=True)
        except (Visa.DoesNotExist, TypeError, ValueError):
            return Response({'error': 'Selected visa is unavailable.'}, status=status.HTTP_400_BAD_REQUEST)

        # The visa and applicant count determine the amount; browser totals are untrusted.
        data['visa'] = visa.pk
        data['total_price'] = str(visa.selling_price * len(applicants_list))
        data['status'] = 'Pending'
        data['payment_status'] = 'Pending'
        for field in ('zoho_payment_session_id', 'zoho_access_key', 'invoice_number'):
            data.pop(field, None)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        applicant_submissions = []
        for i, applicant_data in enumerate(applicants_list):
            applicant_input = applicant_data.copy()
            applicant_input['passport_front'] = request.FILES.get(f'applicant_{i}_passport_front')
            applicant_input['photo'] = request.FILES.get(f'applicant_{i}_photo')
            applicant_serializer = VisaApplicantSubmissionSerializer(data=applicant_input)
            applicant_serializer.is_valid(raise_exception=True)

            documents = []
            additional_docs = applicant_data.get('additional_documents', [])
            if not isinstance(additional_docs, list) or not all(isinstance(doc, dict) for doc in additional_docs):
                return Response({'error': 'Additional documents must be a list of objects.'}, status=status.HTTP_400_BAD_REQUEST)
            for j, doc_data in enumerate(additional_docs):
                doc_file = request.FILES.get(f'applicant_{i}_additional_doc_{j}')
                if doc_file:
                    document_serializer = VisaDocumentSubmissionSerializer(data={
                        'document_name': doc_data.get('name', f'Document {j+1}'), 'file': doc_file,
                    })
                    document_serializer.is_valid(raise_exception=True)
                    documents.append(document_serializer)
            applicant_submissions.append((applicant_serializer, documents))

        # Validate every traveller before writing; save the whole application together.
        with transaction.atomic():
            application = serializer.save()
            for applicant_serializer, documents in applicant_submissions:
                applicant = applicant_serializer.save(application=application)
                for document_serializer in documents:
                    document_serializer.save(applicant=applicant)

        resp_data = serializer.data

        # Sync Lead to Zoho CRM
        try:
            from Holidays.utils import create_zoho_crm_lead
            import threading
            first_applicant = applicants_list[0] if applicants_list else {}
            applicant_name = f"{first_applicant.get('first_name', '')} {first_applicant.get('last_name', '')}".strip() or 'Visa Applicant'
            applicant_phone = first_applicant.get('phone', '')
            lead_data = {
                'name': applicant_name,
                'email': str(request.data.get('email') or '').strip(),
                'phone': applicant_phone,
                'description': f"Visa Application: {visa.country} - {visa.visa_type}\nApplicants: {len(applicants_list)}\nTotal Price: ₹{application.total_price}\nApplication ID: {application.id}",
                'lead_source': 'Website Visa Application',
                'company': 'Individual'
            }
            threading.Thread(target=create_zoho_crm_lead, args=(lead_data,)).start()
        except Exception as crm_err:
            print(f"Error syncing lead to Zoho CRM for Visa Application: {crm_err}")

        # Generate Zoho Payments session for the Visa Application
        try:
            from Holidays.services.zoho_payment import ZohoPaymentService
            from django.shortcuts import reverse

            try:
                verify_path = reverse('visa-application-verify-zoho-payment')
                backend_verify_url = request.build_absolute_uri(verify_path)
            except Exception:
                backend_verify_url = request.build_absolute_uri('/api/visa-applications/verify-zoho-payment/')

            if '?' in backend_verify_url:
                backend_verify_url = f"{backend_verify_url}&application_id={application.id}"
            else:
                backend_verify_url = f"{backend_verify_url}?application_id={application.id}"

            if backend_verify_url.startswith('http://'):
                backend_verify_url = backend_verify_url.replace('http://', 'https://', 1)

            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
            frontend_failure_url = f"{frontend_url}/payment-failed?visa_app_id={application.id}"

            session = ZohoPaymentService.create_visa_checkout_session(
                application=application,
                success_url=backend_verify_url,
                failure_url=frontend_failure_url
            )

            payments_session_id = getattr(session, 'payments_session_id', None)
            access_key = getattr(session, 'access_key', None)

            if payments_session_id and access_key:
                application.zoho_payment_session_id = payments_session_id
                application.zoho_access_key = access_key
                application.save()

                edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
                if edition_str == 'IN':
                    checkout_domain = 'payments.zoho.in'
                elif edition_str == 'US':
                    checkout_domain = 'payments.zoho.com'
                else:
                    checkout_domain = 'paymentssandbox.zoho.in'

                redirect_url = f"https://{checkout_domain}/hostedcheckout/{access_key}"
                resp_data['payment_url'] = redirect_url
            else:
                resp_data['payment_url'] = f"{frontend_url}/payment-failed?visa_app_id={application.id}"
        except Exception as e:
            print(f"Error generating Zoho payment session for Visa application {application.id}: {e}")
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
            resp_data['payment_url'] = f"{frontend_url}/payment-failed?visa_app_id={application.id}"

        return Response(resp_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='create-zoho-payment-session', permission_classes=[AllowAny])
    def create_zoho_payment_session(self, request, pk=None):
        try:
            application = self.get_object()
            from Holidays.services.zoho_payment import ZohoPaymentService
            from django.shortcuts import reverse

            try:
                verify_path = reverse('visa-application-verify-zoho-payment')
                backend_verify_url = request.build_absolute_uri(verify_path)
            except Exception:
                backend_verify_url = request.build_absolute_uri('/api/visa-applications/verify-zoho-payment/')

            if '?' in backend_verify_url:
                backend_verify_url = f"{backend_verify_url}&application_id={application.id}"
            else:
                backend_verify_url = f"{backend_verify_url}?application_id={application.id}"

            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
            frontend_failure_url = f"{frontend_url}/payment-failed?visa_app_id={application.id}"

            session = ZohoPaymentService.create_visa_checkout_session(
                application=application,
                success_url=backend_verify_url,
                failure_url=frontend_failure_url
            )

            payments_session_id = getattr(session, 'payments_session_id', None)
            access_key = getattr(session, 'access_key', None)

            if not payments_session_id or not access_key:
                return Response(
                    {'error': 'Failed to retrieve session ID or access key from Zoho Payments.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            application.zoho_payment_session_id = payments_session_id
            application.zoho_access_key = access_key
            application.save()

            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            if edition_str == 'IN':
                checkout_domain = 'payments.zoho.in'
            elif edition_str == 'US':
                checkout_domain = 'payments.zoho.com'
            else:
                checkout_domain = 'paymentssandbox.zoho.in'

            redirect_url = f"https://{checkout_domain}/hostedcheckout/{access_key}"

            return Response({
                'payments_session_id': payments_session_id,
                'access_key': access_key,
                'redirect_url': redirect_url
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error creating Zoho Payment Session for Visa Application: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='verify-zoho-payment', permission_classes=[AllowAny])
    def verify_zoho_payment(self, request):
        from django.http import HttpResponseRedirect
        import random

        application_id = request.GET.get('application_id') or request.GET.get('visa_app_id')
        callback_session_id = request.GET.get('session_id') or request.GET.get('payments_session_id')
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')

        application = None
        if application_id:
            try:
                application = VisaApplication.objects.get(pk=application_id)
            except VisaApplication.DoesNotExist:
                pass

        if not application and callback_session_id:
            try:
                application = VisaApplication.objects.get(zoho_payment_session_id=callback_session_id)
            except VisaApplication.DoesNotExist:
                pass

        if not application:
            return HttpResponseRedirect(f"{frontend_url}/visa?error=application_not_found")

        frontend_failure_url = f"{frontend_url}/payment-failed?visa_app_id={application.id}"

        if not verify_zoho_payment_session(
            callback_session_id,
            application.zoho_payment_session_id,
            f"VISA-{application.id}",
            application.total_price,
        ):
            return HttpResponseRedirect(frontend_failure_url)

        newly_paid = application.payment_status != 'Paid'
        if newly_paid:
            application.payment_status = 'Paid'
            application.status = 'Processing'
            if not application.invoice_number:
                application.invoice_number = f"GM-VSA-{random.randint(100000, 999999)}"
            application.save()

            # Send a notification only once after the provider has verified payment.
            try:
                first_applicant = application.applicants.first()
                if first_applicant and first_applicant.phone:
                    from Holidays.utils import send_visa_whatsapp_msg
                    import threading
                    threading.Thread(
                        target=send_visa_whatsapp_msg,
                        args=(first_applicant.phone, f"Your payment for Visa Application #{application.id} ({application.visa.country}) is confirmed! Invoice: {application.invoice_number}")
                    ).start()
            except Exception as notify_err:
                print(f"Error sending Visa payment confirmation notification: {notify_err}")

        return HttpResponseRedirect(f"{frontend_url}/?payment_success=true&visa_app_id={application.id}&invoice={application.invoice_number}")


class PackageBookingViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = PackageBooking.objects.all().order_by('-created_at')
    serializer_class = PackageBookingSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in {'create', 'create_zoho_payment_session', 'verify_zoho_payment'}:
            return [AllowAny()]
        return [IsAdminUser()]

    def create(self, request, *args, **kwargs):
        package_id = request.data.get('package')
        full_name = str(request.data.get('full_name') or '').strip()
        email = str(request.data.get('email') or '').strip()
        phone = str(request.data.get('phone') or '').strip()
        try:
            travel_date = timezone.datetime.strptime(
                str(request.data.get('travel_date') or ''), '%Y-%m-%d'
            ).date()
        except ValueError:
            return Response({'error': 'Travel date must use YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            adults = int(request.data.get('adults', 1))
            children = int(request.data.get('children', 0))
        except (TypeError, ValueError):
            return Response({'error': 'Adults and children must be whole numbers.'}, status=status.HTTP_400_BAD_REQUEST)

        if not full_name or not email or not phone or not travel_date:
            return Response({'error': 'Full name, email, phone, and travel date are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if adults < 1 or children < 0:
            return Response({'error': 'At least one adult is required and children cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pkg_obj = HolidayPackage.objects.get(pk=int(package_id), is_active=True)
        except (HolidayPackage.DoesNotExist, TypeError, ValueError):
            return Response({'error': 'Select an available package before starting online payment.'}, status=status.HTTP_400_BAD_REQUEST)

        unit_price = pkg_obj.price or pkg_obj.Offer_price or 0
        if unit_price <= 0:
            return Response({'error': 'This package does not have an online payment price.'}, status=status.HTTP_400_BAD_REQUEST)
        total_price = unit_price * adults

        booking = PackageBooking.objects.create(
            package=pkg_obj,
            package_title=pkg_obj.title,
            full_name=full_name,
            email=email,
            phone=phone,
            travel_date=travel_date,
            adults=adults,
            children=children,
            total_price=float(total_price),
            status='Pending',
            payment_status='Pending'
        )

        resp_data = PackageBookingSerializer(booking).data

        # Sync Lead to Zoho CRM
        try:
            from Holidays.utils import create_zoho_crm_lead
            import threading
            lead_data = {
                'name': full_name,
                'email': email,
                'phone': phone,
                'description': f"Package Booking: {pkg_obj.title}\nTravel Date: {travel_date}\nAdults: {adults}, Children: {children}\nTotal: ₹{total_price}\nBooking ID: {booking.booking_id}",
                'lead_source': 'Website Package Booking',
                'company': 'Individual'
            }
            threading.Thread(target=create_zoho_crm_lead, args=(lead_data,)).start()
        except Exception as crm_err:
            print(f"Error syncing lead to Zoho CRM for Package Booking: {crm_err}")

        # Create Zoho Payments session
        try:
            from Holidays.services.zoho_payment import ZohoPaymentService
            from django.shortcuts import reverse

            try:
                verify_path = reverse('package-booking-verify-zoho-payment')
                backend_verify_url = request.build_absolute_uri(verify_path)
            except Exception:
                backend_verify_url = request.build_absolute_uri('/api/package-bookings/verify-zoho-payment/')

            if '?' in backend_verify_url:
                backend_verify_url = f"{backend_verify_url}&booking_id={booking.booking_id}"
            else:
                backend_verify_url = f"{backend_verify_url}?booking_id={booking.booking_id}"

            if backend_verify_url.startswith('http://'):
                backend_verify_url = backend_verify_url.replace('http://', 'https://', 1)

            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
            frontend_failure_url = f"{frontend_url}/payment-failed?booking_id={booking.booking_id}"

            session = ZohoPaymentService.create_package_checkout_session(
                booking=booking,
                success_url=backend_verify_url,
                failure_url=frontend_failure_url
            )

            payments_session_id = getattr(session, 'payments_session_id', None)
            access_key = getattr(session, 'access_key', None)

            if payments_session_id and access_key:
                booking.zoho_payment_session_id = payments_session_id
                booking.zoho_access_key = access_key
                booking.save()

                edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
                if edition_str == 'IN':
                    checkout_domain = 'payments.zoho.in'
                elif edition_str == 'US':
                    checkout_domain = 'payments.zoho.com'
                else:
                    checkout_domain = 'paymentssandbox.zoho.in'

                redirect_url = f"https://{checkout_domain}/hostedcheckout/{access_key}"
                resp_data['payment_url'] = redirect_url
            else:
                resp_data['payment_url'] = f"{frontend_url}/payment-failed?booking_id={booking.booking_id}"
        except Exception as e:
            print(f"Error generating Zoho payment session for Package booking {booking.booking_id}: {e}")
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
            resp_data['payment_url'] = f"{frontend_url}/payment-failed?booking_id={booking.booking_id}"

        return Response(resp_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='create-zoho-payment-session', permission_classes=[AllowAny])
    def create_zoho_payment_session(self, request, pk=None):
        try:
            booking = self.get_object()
            from Holidays.services.zoho_payment import ZohoPaymentService
            from django.shortcuts import reverse

            try:
                verify_path = reverse('package-booking-verify-zoho-payment')
                backend_verify_url = request.build_absolute_uri(verify_path)
            except Exception:
                backend_verify_url = request.build_absolute_uri('/api/package-bookings/verify-zoho-payment/')

            if '?' in backend_verify_url:
                backend_verify_url = f"{backend_verify_url}&booking_id={booking.booking_id}"
            else:
                backend_verify_url = f"{backend_verify_url}?booking_id={booking.booking_id}"

            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
            frontend_failure_url = f"{frontend_url}/payment-failed?booking_id={booking.booking_id}"

            session = ZohoPaymentService.create_package_checkout_session(
                booking=booking,
                success_url=backend_verify_url,
                failure_url=frontend_failure_url
            )

            payments_session_id = getattr(session, 'payments_session_id', None)
            access_key = getattr(session, 'access_key', None)

            if not payments_session_id or not access_key:
                return Response(
                    {'error': 'Failed to retrieve session ID or access key from Zoho Payments.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            booking.zoho_payment_session_id = payments_session_id
            booking.zoho_access_key = access_key
            booking.save()

            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            if edition_str == 'IN':
                checkout_domain = 'payments.zoho.in'
            elif edition_str == 'US':
                checkout_domain = 'payments.zoho.com'
            else:
                checkout_domain = 'paymentssandbox.zoho.in'

            redirect_url = f"https://{checkout_domain}/hostedcheckout/{access_key}"

            return Response({
                'payments_session_id': payments_session_id,
                'access_key': access_key,
                'redirect_url': redirect_url
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error creating Zoho Payment Session for Package Booking: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='verify-zoho-payment', permission_classes=[AllowAny])
    def verify_zoho_payment(self, request):
        from django.http import HttpResponseRedirect
        import random

        booking_id = request.GET.get('booking_id')
        callback_session_id = request.GET.get('session_id') or request.GET.get('payments_session_id')
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')

        booking = None
        if booking_id:
            try:
                booking = PackageBooking.objects.get(booking_id=booking_id)
            except PackageBooking.DoesNotExist:
                pass

        if not booking and callback_session_id:
            try:
                booking = PackageBooking.objects.get(zoho_payment_session_id=callback_session_id)
            except PackageBooking.DoesNotExist:
                pass

        if not booking:
            return HttpResponseRedirect(f"{frontend_url}/holidays?error=booking_not_found")

        frontend_failure_url = f"{frontend_url}/payment-failed?booking_id={booking.booking_id}"

        if not verify_zoho_payment_session(
            callback_session_id,
            booking.zoho_payment_session_id,
            booking.booking_id,
            booking.total_price,
        ):
            return HttpResponseRedirect(frontend_failure_url)

        newly_paid = booking.payment_status != 'Paid'
        if newly_paid:
            booking.payment_status = 'Paid'
            booking.status = 'Confirmed'
            if not booking.invoice_number:
                booking.invoice_number = f"GM-PKG-{random.randint(100000, 999999)}"
            booking.save()

            try:
                from Holidays.utils import send_enquiry_email
                send_enquiry_email(booking, f"Package Booking Confirmed ({booking.package_title})")
            except Exception as mail_err:
                print(f"Error sending package booking email: {mail_err}")

        return HttpResponseRedirect(f"{frontend_url}/?payment_success=true&booking_id={booking.booking_id}&invoice={booking.invoice_number}")


class VisaApplicantViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = VisaApplicant.objects.all()
    serializer_class = VisaApplicantSerializer
    pagination_class = None


class VisaAdditionalDocumentViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = VisaAdditionalDocument.objects.all()
    serializer_class = VisaAdditionalDocumentSerializer
    pagination_class = None




class SupplierViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    pagination_class = None

@authentication_classes([])
@permission_classes([AllowAny])
class SendVisaDetailsAPI(APIView):
    throttle_classes = [EmailSharingRateThrottle]

    def post(self, request):
        email = str(request.data.get("email") or '').strip()
        subject = str(request.data.get("subject") or '').strip()
        body = str(request.data.get("body") or '').strip()

        if not email or not subject or not body:
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)
        if len(subject) > 160 or len(body) > 5000 or '\n' in subject or '\r' in subject:
            return Response({"error": "Invalid email content."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.core.validators import validate_email
            from django.core.exceptions import ValidationError
            validate_email(email)
        except ValidationError:
            return Response({"error": "A valid email address is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from django.core.mail import EmailMultiAlternatives
            from django.utils.html import escape
            sender = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Reservations@goimomi.com')
            html_safe_body = escape(body).replace('\n', '<br>')
            
            # Build rich HTML body to avoid spam filters
            html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a5c2a; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 22px;">Goimomi Holidays</h1>
    <p style="color: #a8e6b8; margin: 4px 0 0; font-size: 13px;">Your Travel Partner</p>
  </div>
  <div style="background: #fff; padding: 24px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 15px; color: #333;">Dear Traveler,</p>
    <p style="font-size: 14px; color: #555; white-space: pre-wrap;">{html_safe_body}</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 13px; color: #888;">
      For queries, call us at <strong>+91 81100 82222</strong> or email 
      <a href="mailto:hello@goimomi.com" style="color: #1a5c2a;">hello@goimomi.com</a>
    </p>
  </div>
  <div style="background: #f9f9f9; padding: 12px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 11px; color: #aaa; margin: 0;">
      &copy; 2025 Goimomi Holidays | <a href="https://www.goimomi.com" style="color: #1a5c2a;">www.goimomi.com</a>
    </p>
  </div>
</body>
</html>"""

            msg = EmailMultiAlternatives(
                subject=subject,
                body=body,  # plain text fallback
                from_email=sender,
                to=[email],
                headers={
                    'X-Mailer': 'Goimomi-Holidays-Mailer/1.0',
                    'List-Unsubscribe': '<mailto:hello@goimomi.com?subject=unsubscribe>',
                }
            )
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
            return Response({"success": "Email sent successfully"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SendVisaWhatsAppAPI(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        phone = str(request.data.get("phone") or '').strip()
        title = str(request.data.get("title") or '').strip()
        description = str(request.data.get("description") or '').strip()
        
        if not phone or not title:
            return Response({"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Clean phone number for WhatsApp
        cleaned_phone = "".join(filter(str.isdigit, phone))
        if not cleaned_phone.startswith("+"):
            cleaned_phone = f"+{cleaned_phone}"
            
        message_body = f"*{title}*\n\n"
        if description:
            message_body += f"{description}\n\n"
        message_body += "Shared via Goimomi Holidays."
        
        try:
            from Holidays.utils import _send_twilio_whatsapp

            message_id = _send_twilio_whatsapp(cleaned_phone, message_body)
            if not message_id:
                return Response(
                    {"error": "WhatsApp delivery is not configured or failed."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response({"success": "WhatsApp message sent successfully", "message_id": message_id})
        except Exception as e:
            print(f"Error sending WhatsApp: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CruiseCalendarViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = CruiseCalendar.objects.all().order_by('-created_at')
    serializer_class = CruiseCalendarSerializer
    pagination_class = None

class HotelMasterViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = HotelMaster.objects.all().order_by('name')
    serializer_class = HotelMasterSerializer
    pagination_class = None

class AirlineViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Airline.objects.all().order_by('name')
    serializer_class = AirlineSerializer
    pagination_class = None

class SightseeingMasterViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = SightseeingMaster.objects.all()
    serializer_class = SightseeingMasterSerializer
    pagination_class = None

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Handle 'city_link' name to ID mapping if ID is not provided
        dest_id = data.get('city_link')
        if not dest_id or dest_id == "":
            dest_name = data.get('city')
            if dest_name:
                dest = City.objects.filter(name=dest_name).first()
                if dest:
                    data['city_link'] = dest.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        sightseeing = serializer.save()

        # Handle multiple images
        images = request.FILES.getlist('gallery_images')
        for img in images:
            SightseeingImage.objects.create(sightseeing=sightseeing, image=img)
            
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()
        
        dest_id = data.get('city_link')
        if not dest_id or dest_id == "":
            dest_name = data.get('city')
            if dest_name:
                dest = City.objects.filter(name=dest_name).first()
                if dest:
                    data['city_link'] = dest.id

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        sightseeing = serializer.save()

        # Handle multiple images (optional: clear existing or just append)
        images = request.FILES.getlist('gallery_images')
        if images:
            # Optionally clear existing gallery if needed
            # sightseeing.images.all().delete()
            for img in images:
                SightseeingImage.objects.create(sightseeing=sightseeing, image=img)

        return Response(serializer.data)

class MealMasterViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = MealMaster.objects.all()
    serializer_class = MealMasterSerializer
    pagination_class = None

class VehicleBrandViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = VehicleBrand.objects.all().order_by('name')
    serializer_class = VehicleBrandSerializer
    pagination_class = None

class AccommodationViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = Accommodation.objects.all().order_by('-created_at')
    serializer_class = AccommodationSerializer
    pagination_class = None

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        accommodation = serializer.save()

        # Handle multiple images
        images = request.FILES.getlist('accommodation_images')
        for img in images:
            AccommodationImage.objects.create(accommodation=accommodation, image=img)
            
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        accommodation = serializer.save()

        # Handle multiple images
        images = request.FILES.getlist('accommodation_images')
        if images:
            # Optionally clear existing images if needed
            # accommodation.images.all().delete()
            for img in images:
                AccommodationImage.objects.create(accommodation=accommodation, image=img)

        return Response(serializer.data)

class RoomTypeViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = RoomType.objects.all()
    serializer_class = RoomTypeSerializer
    pagination_class = None

class VehicleMasterViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = VehicleMaster.objects.all().order_by('-created_at')
    serializer_class = VehicleMasterSerializer
    pagination_class = None

class DriverMasterViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = DriverMaster.objects.all().order_by('-created_at')
    serializer_class = DriverMasterSerializer
    pagination_class = None

class VehicleRateCardViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = VehicleRateCard.objects.all().order_by('-created_at')
    serializer_class = VehicleRateCardSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        name = self.request.query_params.get('name')
        vehicle_id = self.request.query_params.get('vehicle')
        if name:
            queryset = queryset.filter(name=name)
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        return queryset
class PickupPointMasterViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    serializer_class = PickupPointMasterSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = PickupPointMaster.objects.all().order_by('name')
        country_id = self.request.query_params.get('country_id')
        if country_id and country_id != 'undefined':
            queryset = queryset.filter(city__country_id=country_id)
        return queryset







class CabBookingViewSet(ModelViewSet):

    permission_classes = [IsAdminUser]
    queryset = CabBooking.objects.all().order_by('-created_at')
    serializer_class = CabBookingSerializer
    pagination_class = None

    def get_permissions(self):
        public_actions = {
            'create', 'send_otp', 'verify_otp', 'create_zoho_payment_session',
            'verify_zoho_payment', 'zoho_webhook', 'download_voucher_public',
            'download_invoice_public',
        }
        if self.action in public_actions:
            return [AllowAny()]
        return [IsAdminUser()]

    def get_throttles(self):
        if self.action == 'send_otp':
            return [EmailSharingRateThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=['post'], url_path='send-otp', permission_classes=[AllowAny])
    def send_otp(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate 6 digit OTP
        import secrets
        otp = str(secrets.randbelow(900000) + 100000)
        
        # Save or update OTP in the database
        OTPVerification.objects.update_or_create(
            email=email,
            defaults={'otp': otp, 'is_verified': False}
        )
        
        subject = "Verification Code - Goimomi Holidays"
        message = f"Hello,\n\nPlease use the following verification code to confirm your email address on Goimomi Holidays:\n\n{otp}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nGoimomi Holidays Team"
        
        # Clean, modern, minimal HTML template with low spam score
        html_message = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px 0; color: #333333;">
            <p style="font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">Hello,</p>
            <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">Please use the following verification code to confirm your email address on Goimomi Holidays:</p>
            
            <div style="margin: 24px 0; padding: 16px; background-color: #f4f5f7; border-radius: 6px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #111111; font-family: monospace;">
                {otp}
            </div>
            
            <p style="font-size: 14px; line-height: 20px; color: #666666; margin: 0 0 24px 0;">
                This code is valid for 5 minutes. For security, please do not share this code with anyone.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 24px 0;" />
            
            <p style="font-size: 12px; line-height: 16px; color: #888888; margin: 0;">
                Goimomi Holidays Travel Desk
            </p>
        </div>
        """
        
        from .otp_email import deliver_otp
        return deliver_otp(email, otp, subject, message, html_message)

    @action(detail=False, methods=['post'], url_path='verify-otp', permission_classes=[AllowAny])
    def verify_otp(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        otp_input = str(request.data.get('otp') or '').strip()
        
        if not email or not otp_input:
            return Response({'error': 'Email and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from datetime import timedelta
        try:
            otp_obj = OTPVerification.objects.get(email=email)
            # Check if expired (5 minutes = 300 seconds)
            if timezone.now() - otp_obj.created_at > timedelta(minutes=5):
                return Response({'error': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
            
            if otp_obj.otp == otp_input:
                otp_obj.is_verified = True
                otp_obj.save()
                return Response({'message': 'OTP verified successfully.'}, status=status.HTTP_200_OK)
        except OTPVerification.DoesNotExist:
            pass
            
        return Response({'error': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        is_staff_user = bool(request.user and request.user.is_authenticated and request.user.is_staff)
        verified_otp = None
        if not is_staff_user:
            email = str(request.data.get('email') or '').strip().lower()
            try:
                # First check for any verified OTP record for this email
                otp_obj = OTPVerification.objects.filter(email__iexact=email, is_verified=True).order_by('-created_at').first()
                if not otp_obj:
                    otp_obj = OTPVerification.objects.filter(email__iexact=email).order_by('-created_at').first()

                from datetime import timedelta
                if not otp_obj or not otp_obj.is_verified or (timezone.now() - otp_obj.created_at > timedelta(hours=24)):
                    logger.warning("Cab booking rejected: email verification is required")
                    return Response({'error': 'Email verification is required before submitting a booking. Please verify your email with OTP.'}, status=status.HTTP_400_BAD_REQUEST)
                verified_otp = otp_obj
            except Exception as otp_err:
                print(f"[CabBooking Error] OTP check exception: {otp_err}", flush=True)
                return Response({'error': 'Email verification is required before submitting a booking. Please verify your email with OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()
        if not is_staff_user:
            vehicle, fare = quote_cab_fare(
                data.get('vehicle_id'),
                data.get('from_city'),
                data.get('to_city'),
                data.get('pickup_date'),
                data.get('pickup_point'),
                data.get('drop_point'),
            )
            if not vehicle or fare is None:
                return Response(
                    {'error': 'No valid fare is available for this vehicle, route, and date. Please search again.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if vehicle:
                data['vehicle_name'] = vehicle.name or 'Standard Vehicle'
                data['vehicle_category'] = vehicle.brand.name if (vehicle.brand_id and hasattr(vehicle, 'brand') and vehicle.brand) else 'Standard'
            else:
                data['vehicle_name'] = 'Standard Cab'
                data['vehicle_category'] = 'Standard'

            data['price'] = str(fare)
            data['status'] = 'Booking Requested'

            if not data.get('first_name'):
                data['first_name'] = 'Customer'
            if not data.get('last_name'):
                data['last_name'] = data.get('first_name') or 'Customer'

            for field in (
                'booking_id', 'driver', 'invoice_number', 'zoho_payment_session_id',
                'zoho_access_key', 'created_at', 'vehicle_id', 'pickup_point', 'drop_point',
            ):
                data.pop(field, None)

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            print(f"[CabBooking Serializer Error] {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        response = Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=self.get_success_headers(serializer.data),
        )

        # After successful creation, generate Zoho payment session and return it directly
        if response.status_code == 201:
            try:
                booking_id = response.data.get('booking_id')
                booking_pk = response.data.get('id')
                if booking_id and booking_pk:
                    booking_obj = CabBooking.objects.get(pk=booking_pk)
                    
                    # Sync Lead to Zoho CRM
                    try:
                        from Holidays.utils import create_zoho_crm_lead
                        import threading
                        cust_name = f"{booking_obj.first_name or ''} {booking_obj.last_name or ''}".strip() or 'Cab Customer'
                        lead_data = {
                            'name': cust_name,
                            'email': booking_obj.email or '',
                            'phone': booking_obj.phone or '',
                            'city': booking_obj.from_city or '',
                            'description': f"Cab Booking: {booking_obj.from_city} to {booking_obj.to_city}\nVehicle: {booking_obj.vehicle_name}\nPickup Date: {booking_obj.pickup_date}\nPrice: ₹{booking_obj.price}\nBooking ID: {booking_obj.booking_id}\nPickup Details: {booking_obj.pickup_location_details or ''}\nSpecial Requirements: {booking_obj.special_requirements or ''}",
                            'lead_source': 'Website Cab Booking',
                            'company': 'Individual'
                        }
                        threading.Thread(target=create_zoho_crm_lead, args=(lead_data,)).start()
                    except Exception as crm_err:
                        print(f"Error syncing lead to Zoho CRM for Cab Booking: {crm_err}")
                    
                    from Holidays.services.zoho_payment import ZohoPaymentService
                    from django.shortcuts import reverse

                    # Construct backend verify URL dynamically
                    try:
                        verify_path = reverse('cab-booking-verify-zoho-payment')
                        backend_verify_url = request.build_absolute_uri(verify_path)
                    except Exception:
                        backend_verify_url = request.build_absolute_uri('/api/cab-bookings/verify-zoho-payment/')

                    # Append booking_id query parameter so it is passed back in redirect URL
                    if '?' in backend_verify_url:
                        backend_verify_url = f"{backend_verify_url}&booking_id={booking_obj.booking_id}"
                    else:
                        backend_verify_url = f"{backend_verify_url}?booking_id={booking_obj.booking_id}"

                    if backend_verify_url.startswith('http://'):
                        backend_verify_url = backend_verify_url.replace('http://', 'https://', 1)

                    # Failure URL redirects to the dedicated frontend /payment-failed page
                    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
                    frontend_failure_url = f"{frontend_url}/payment-failed?booking_id={booking_obj.booking_id}"

                    # Create payment session via Zoho Payment Service
                    session = ZohoPaymentService.create_checkout_session(
                        booking=booking_obj,
                        success_url=backend_verify_url,
                        failure_url=frontend_failure_url
                    )

                    payments_session_id = getattr(session, 'payments_session_id', None)
                    access_key = getattr(session, 'access_key', None)

                    if payments_session_id and access_key:
                        # Store in the booking
                        booking_obj.zoho_payment_session_id = payments_session_id
                        booking_obj.zoho_access_key = access_key
                        booking_obj.save()

                        # Determine hosted checkout page domain based on edition
                        edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
                        if edition_str == 'IN':
                            checkout_domain = 'payments.zoho.in'
                        elif edition_str == 'US':
                            checkout_domain = 'payments.zoho.com'
                        else:
                            checkout_domain = 'paymentssandbox.zoho.in'

                        redirect_url = f"https://{checkout_domain}/hostedcheckout/{access_key}"
                        response.data['payment_url'] = redirect_url
                    else:
                        # Fallback to failed page if we can't create session
                        response.data['payment_url'] = f"{frontend_url}/payment-failed?booking_id={booking_obj.booking_id}"
            except Exception as e:
                print(f"Error generating Zoho payment session during booking creation: {e}")
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
                response.data['payment_url'] = f"{frontend_url}/payment-failed?booking_id={booking_id}"

        return response

    @action(detail=True, methods=['post'], url_path='confirm-payment', permission_classes=[IsAdminUser])
    def confirm_payment(self, request, pk=None):
        try:
            booking = self.get_object()
            import random
            invoice_number = f"GM-TXN-{random.randint(100000, 999999)}"
            confirmed_count = 0
            if booking.status == 'Booking Requested':
                booking.status = 'Confirmed'
                booking.invoice_number = invoice_number
                booking.save()
                confirmed_count += 1
                
            # Sync user to Zoho CRM Contact list
            try:
                from Holidays.utils import upsert_zoho_crm_contact
                crm_data = {
                    'first_name': booking.first_name,
                    'last_name': booking.last_name or 'Customer',
                    'email': booking.email,
                    'phone': booking.phone
                }
                if crm_data['email']:
                    import threading
                    threading.Thread(target=upsert_zoho_crm_contact, args=(crm_data,)).start()
            except Exception as crm_err:
                print(f"Error syncing contact to Zoho CRM: {crm_err}")

            # Send booking confirmation email with voucher PDF
            try:
                from Holidays.utils import send_booking_voucher
                import threading
                threading.Thread(target=send_booking_voucher, args=(booking,)).start()
            except Exception as email_err:
                print(f"Error sending booking confirmation email: {email_err}")

            return Response({
                'message': f'Confirmed {confirmed_count} bookings successfully.',
                'invoice_number': invoice_number,
                'status': 'Confirmed'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='create-zoho-payment-session', permission_classes=[AllowAny])
    def create_zoho_payment_session(self, request, pk=None):
        try:
            booking = self.get_object()
            from Holidays.services.zoho_payment import ZohoPaymentService
            from django.shortcuts import reverse
            
            # Construct backend verify URL dynamically
            try:
                verify_path = reverse('cab-booking-verify-zoho-payment')
                backend_verify_url = request.build_absolute_uri(verify_path)
            except Exception:
                backend_verify_url = request.build_absolute_uri('/api/cab-bookings/verify-zoho-payment/')

            # Append booking_id query parameter so it is passed back in redirect URL
            if '?' in backend_verify_url:
                backend_verify_url = f"{backend_verify_url}&booking_id={booking.booking_id}"
            else:
                backend_verify_url = f"{backend_verify_url}?booking_id={booking.booking_id}"

            if backend_verify_url.startswith('http://'):
                backend_verify_url = backend_verify_url.replace('http://', 'https://', 1)

            # Failure URL (on frontend payment failed page)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
            frontend_failure_url = f"{frontend_url}/payment-failed?booking_id={booking.booking_id}"

            # Create payment session via Zoho Payment Service
            session = ZohoPaymentService.create_checkout_session(
                booking=booking,
                success_url=backend_verify_url,
                failure_url=frontend_failure_url
            )

            payments_session_id = getattr(session, 'payments_session_id', None)
            access_key = getattr(session, 'access_key', None)

            if not payments_session_id or not access_key:
                return Response(
                    {'error': 'Failed to retrieve session ID or access key from Zoho Payments.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Store in the booking
            booking.zoho_payment_session_id = payments_session_id
            booking.zoho_access_key = access_key
            booking.save()

            # Determine hosted checkout page domain based on edition
            edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
            if edition_str == 'IN':
                checkout_domain = 'payments.zoho.in'
            elif edition_str == 'US':
                checkout_domain = 'payments.zoho.com'
            else:
                checkout_domain = 'paymentssandbox.zoho.in'

            redirect_url = f"https://{checkout_domain}/hostedcheckout/{access_key}"

            return Response({
                'payments_session_id': payments_session_id,
                'access_key': access_key,
                'redirect_url': redirect_url
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error creating Zoho Payment Session: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='verify-zoho-payment', permission_classes=[AllowAny])
    def verify_zoho_payment(self, request):
        from django.http import HttpResponseRedirect
        import random

        booking_id = request.GET.get('booking_id')
        callback_session_id = request.GET.get('session_id') or request.GET.get('payments_session_id')

        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')

        booking = None
        if booking_id:
            try:
                booking = CabBooking.objects.get(booking_id=booking_id)
            except CabBooking.DoesNotExist:
                pass

        if not booking and callback_session_id:
            try:
                booking = CabBooking.objects.get(zoho_payment_session_id=callback_session_id)
            except CabBooking.DoesNotExist:
                pass

        if not booking:
            return HttpResponseRedirect(f"{frontend_url}/cab?error=booking_not_found")

        frontend_failure_url = f"{frontend_url}/payment-failed?booking_id={booking.booking_id}"

        if not verify_zoho_payment_session(
            callback_session_id,
            booking.zoho_payment_session_id,
            booking.booking_id,
            booking.price,
        ):
            return HttpResponseRedirect(frontend_failure_url)

        try:
            newly_confirmed = booking.status == 'Booking Requested'
            if newly_confirmed:
                invoice_number = f"GM-TXN-{random.randint(100000, 999999)}"
                booking.status = 'Confirmed'
                booking.invoice_number = invoice_number
                booking.save()

            if newly_confirmed:
                try:
                    from Holidays.utils import upsert_zoho_crm_contact
                    crm_data = {
                        'first_name': booking.first_name,
                        'last_name': booking.last_name or 'Customer',
                        'email': booking.email,
                        'phone': booking.phone
                    }
                    if crm_data['email']:
                        import threading
                        threading.Thread(target=upsert_zoho_crm_contact, args=(crm_data,)).start()
                except Exception as crm_err:
                    print(f"Error syncing contact to Zoho CRM: {crm_err}")

                # Send booking confirmation email with voucher PDF after successful payment
                try:
                    from Holidays.utils import send_booking_voucher
                    import threading
                    threading.Thread(target=send_booking_voucher, args=(booking,)).start()
                except Exception as email_err:
                    print(f"Error sending booking confirmation email after Zoho payment: {email_err}")

            from urllib.parse import urlencode
            query = urlencode({
                'payment_success': 'true',
                'booking_id': booking.booking_id,
                'document_token': build_cab_document_token(booking),
            })
            return HttpResponseRedirect(f"{frontend_url}/cab?{query}")

        except Exception as e:
            print(f"Error verifying Zoho Payment: {e}")
            return HttpResponseRedirect(frontend_failure_url)

    @action(detail=False, methods=['post'], url_path='zoho-webhook', permission_classes=[AllowAny])
    def zoho_webhook(self, request):
        import hmac
        import hashlib
        import json
        import random
        from django.http import HttpResponse

        signature_header = request.headers.get('X-Zoho-Webhook-Signature')
        if not signature_header:
            print("Webhook Error: Missing X-Zoho-Webhook-Signature header")
            return HttpResponse("Missing signature header", status=400)

        signing_key = getattr(settings, 'ZOHO_PAYMENTS_WEBHOOK_SIGNING_KEY', '')
        if not signing_key:
            print("Webhook Error: Webhook signing key not configured in settings")
            return HttpResponse("Signing key not configured", status=500)

        # Get raw request body
        raw_body = request.body.decode('utf-8')

        try:
            # Parse header: "t=TIMESTAMP,v=SIGNATURE"
            parts = {part.split('=')[0]: part.split('=')[1] for part in signature_header.split(',')}
            timestamp = parts.get('t')
            received_signature = parts.get('v')

            if not timestamp or not received_signature:
                print("Webhook Error: Invalid signature header format")
                return HttpResponse("Invalid signature header format", status=400)

            # Verify signature: "timestamp.raw_body"
            data_to_verify = f"{timestamp}.{raw_body}"
            expected_signature = hmac.new(
                signing_key.encode('utf-8'),
                data_to_verify.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(expected_signature, received_signature):
                print("Webhook Error: Signature verification failed")
                return HttpResponse("Unauthorized signature", status=401)

            # Parse event payload
            payload = json.loads(raw_body)
            event_type = payload.get('event_type')
            event_object = payload.get('event_object', {})
            payment = event_object.get('payment', {})

            print(f"Webhook Received: Event {event_type} for Payment Session {payment.get('payments_session_id')}")

            if event_type == 'payment.succeeded':
                booking_id = payment.get('reference_number')
                session_id = payment.get('payments_session_id')
                invoice_no = payment.get('invoice_number')

                booking = None
                if booking_id:
                    try:
                        booking = CabBooking.objects.get(booking_id=booking_id)
                    except CabBooking.DoesNotExist:
                        pass

                if not booking and session_id:
                    try:
                        booking = CabBooking.objects.get(zoho_payment_session_id=session_id)
                    except CabBooking.DoesNotExist:
                        pass

                if booking:
                    if not session_id or not verify_zoho_payment_session(
                        session_id,
                        booking.zoho_payment_session_id,
                        booking.booking_id,
                        booking.price,
                    ):
                        return HttpResponse("Payment session verification failed", status=400)

                    if booking.status == 'Booking Requested':
                        invoice_number = invoice_no or f"GM-TXN-{random.randint(100000, 999999)}"
                        booking.status = 'Confirmed'
                        booking.invoice_number = invoice_number
                        booking.save()
                        print(f"Webhook Success: Booking {booking.booking_id} confirmed via webhook")

                        # Send booking confirmation email with voucher PDF
                        try:
                            from Holidays.utils import send_booking_voucher
                            import threading
                            threading.Thread(target=send_booking_voucher, args=(booking,)).start()
                        except Exception as email_err:
                            print(f"Error sending booking confirmation email via webhook: {email_err}")
                else:
                    print(f"Webhook Warning: Booking not found for reference_number={booking_id} or session_id={session_id}")

            return HttpResponse("Webhook processed successfully", status=200)

        except Exception as e:
            print(f"Webhook Exception: {e}")
            return HttpResponse(str(e), status=400)

    def perform_create(self, serializer):
        booking = serializer.save()
        booking.refresh_from_db()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        data = request.data.copy()
        
        # Handle confirmation_doc if it's a file
        confirmation_doc = request.FILES.get('confirmation_doc')
        if confirmation_doc:
            data['confirmation_doc'] = confirmation_doc
        elif 'confirmation_doc' in request.data and not request.data.get('confirmation_doc'):
            # If the field is present but empty/falsey, it means removal
            data['confirmation_doc'] = None
            
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        # If status updated to Confirmed or Completed, automatically send Voucher & Invoice email
        if old_status != booking.status and booking.status in ['Confirmed', 'Completed', 'confirmed', 'completed']:
            try:
                from Holidays.utils import send_booking_voucher
                import threading
                threading.Thread(target=send_booking_voucher, args=(booking,)).start()
                print(f"Cab booking voucher & invoice email triggered for booking {booking.booking_id}")
            except Exception as mail_err:
                print(f"Error triggering cab booking email on status update: {mail_err}")

        # Handle additional documents
        docs_count = request.data.get('additional_docs_count', 0)
        try:
            docs_count = int(docs_count)
        except:
            docs_count = 0
            
        for i in range(docs_count):
            file = request.FILES.get(f'additional_doc_{i}')
            name = request.data.get(f'additional_doc_name_{i}', f'Document {i+1}')
            if file:
                CabAdditionalDocument.objects.create(
                    booking=booking,
                    document_name=name,
                    file=file
                )
        
        # Handle removals
        remove_ids = request.data.get('remove_doc_ids')
        if remove_ids:
            try:
                ids = json.loads(remove_ids) if isinstance(remove_ids, str) else remove_ids
                if ids:
                    CabAdditionalDocument.objects.filter(id__in=ids, booking=booking).delete()
            except:
                pass

        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='send-email', permission_classes=[IsAuthenticated])
    def send_email(self, request, pk=None):
        booking = self.get_object()
        try:
            from .utils import send_booking_voucher
            success = send_booking_voucher(booking)
            if success:
                return Response({"message": "Email sent successfully!"}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Failed to send email. Check backend log for errors."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='download-voucher', permission_classes=[IsAuthenticated])
    def download_voucher(self, request, pk=None):
        booking = self.get_object()
        try:
            from .utils import generate_booking_pdf
            pdf_bytes = generate_booking_pdf(booking)
            from django.http import HttpResponse
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            b_id = booking.booking_id or f"GO-TRN-{str(booking.pk).zfill(4)}"
            response['Content-Disposition'] = f'attachment; filename="Voucher_{b_id}.pdf"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='download-voucher-public', permission_classes=[AllowAny])
    def download_voucher_public(self, request):
        token = request.query_params.get('token')
        booking = get_cab_document_booking(token)
        if not booking:
            return Response({"error": "A valid document link is required."}, status=status.HTTP_403_FORBIDDEN)
        try:
            from .utils import generate_booking_pdf
            pdf_bytes = generate_booking_pdf(booking)
            from django.http import HttpResponse
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            b_id = booking.booking_id or f"GO-TRN-{str(booking.pk).zfill(4)}"
            response['Content-Disposition'] = f'attachment; filename="Voucher_{b_id}.pdf"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='download-invoice-public', permission_classes=[AllowAny])
    def download_invoice_public(self, request):
        token = request.query_params.get('token')
        booking = get_cab_document_booking(token)
        if not booking:
            return Response({"error": "A valid document link is required."}, status=status.HTTP_403_FORBIDDEN)
        try:
            from .utils import generate_booking_invoice_pdf
            pdf_bytes = generate_booking_invoice_pdf(booking)
            from django.http import HttpResponse
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            invoice_no = booking.invoice_number or f"INV-{booking.booking_id}"
            response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice_no}.pdf"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CabAdditionalDocumentViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = CabAdditionalDocument.objects.all()
    serializer_class = CabAdditionalDocumentSerializer
    pagination_class = None

class CabSearchAPI(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        # Extract and clean parameters
        from_city = request.query_params.get('from_city', '').split('(')[0].split(',')[0].strip().lower()
        if not from_city:
            from_city = request.query_params.get('from_city', '').strip().lower()
            
        to_city = request.query_params.get('to_city', '').split('(')[0].split(',')[0].strip().lower()
        if not to_city:
            to_city = request.query_params.get('to_city', '').strip().lower()

        # Normalize city name aliases so search always matches DB records
        CITY_ALIASES = {
            'makkah': 'mecca',
            'mekka':  'mecca',
            'medina': 'madinah',
            'madina': 'madinah',
        }
        from_city = CITY_ALIASES.get(from_city, from_city)
        to_city   = CITY_ALIASES.get(to_city,   to_city)

            
        pickup_date = request.query_params.get('pickup_date')
        pickup_point = request.query_params.get('pickup_point', '').strip().lower()
        drop_point = request.query_params.get('drop_point', '').strip().lower()

        if not from_city or not to_city or not pickup_date:
            return Response({"error": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            p_date = timezone.datetime.strptime(pickup_date, '%Y-%m-%d').date()
        except:
            return Response({"error": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST)

        # Find rate cards valid for the date
        rate_cards = VehicleRateCard.objects.filter(
            validity_start__lte=p_date,
            validity_end__gte=p_date
        )

        available_options = []
        for rc in rate_cards:
            routes = rc.routes
            col_vehicles = rc.column_vehicles
            import json
            if isinstance(routes, str):
                try:
                    routes = json.loads(routes)
                except Exception:
                    routes = []
            if isinstance(col_vehicles, str):
                try:
                    col_vehicles = json.loads(col_vehicles)
                except Exception:
                    col_vehicles = []

            if not isinstance(routes, list) or not isinstance(col_vehicles, list):
                continue
            column_vehicles = [str(v).strip() if v else "" for v in col_vehicles]
            
            for route in (routes or []):
                if not isinstance(route, dict):
                    continue
                # Case-insensitive city matching with stripping
                rc_from = _normalise_cab_city(route.get('start_city'))
                rc_to = _normalise_cab_city(route.get('drop_city'))
                if not rc_from or not rc_to:
                    continue

                # Robust matching: match if both cities are found (exact or partial)
                from_matched = (rc_from == from_city) or (rc_from in from_city) or (from_city in rc_from)
                to_matched = (rc_to == to_city) or (rc_to in to_city) or (to_city in rc_to)
                
                # Check optional pickup & drop points if they were searched
                rc_pickup = str(route.get('start_from', '')).strip().lower()
                rc_drop = str(route.get('drop_to', '')).strip().lower()
                
                pickup_matched = not pickup_point or (rc_pickup == pickup_point) or (rc_pickup in pickup_point) or (pickup_point in rc_pickup)
                drop_matched = not drop_point or (rc_drop == drop_point) or (rc_drop in drop_point) or (drop_point in rc_drop)
                
                if from_matched and to_matched and pickup_matched and drop_matched:
                    # Found a match!
                    for i, v_name in enumerate(column_vehicles):
                        if not v_name: continue
                        
                        price = route.get(f'v{i+1}')
                        try:
                            fare = Decimal(str(price))
                        except (InvalidOperation, TypeError, ValueError):
                            continue
                        if fare.is_finite() and fare > 0:
                            # Try exact model match first, then full name match
                            vehicle = VehicleMaster.objects.filter(name__iexact=v_name).first()
                            if not vehicle:
                                # Try matching against brand + name
                                all_v = VehicleMaster.objects.all()
                                for v in all_v:
                                    full_name = f"{v.brand.name} {v.name}" if v.brand else v.name
                                    if full_name.lower() == v_name.lower():
                                        vehicle = v
                                        break
                            
                            if vehicle:
                                available_options.append({
                                    "id": vehicle.id,
                                    "name": vehicle.name,
                                    "category": vehicle.brand.name if vehicle.brand else "Standard",
                                    "passengers": vehicle.seating_capacity,
                                    "bags": vehicle.luggage_capacity,
                                    "price": price,
                                    "pickup_point": route.get('start_from'),
                                    "drop_point": route.get('drop_to'),
                                    "image": vehicle.photo.url if vehicle.photo else None,
                                    "description": vehicle.description
                                })
        
        # Deduplicate by name and points to show all unique route options fed in
        unique_options = {}
        for opt in available_options:
            key = f"{opt['name']}_{opt['pickup_point']}_{opt['drop_point']}"
            try:
                # Ensure price is handled safely
                raw_price = opt.get('price')
                if raw_price is None or str(raw_price).strip() == "":
                    price_val = 0.0
                elif isinstance(raw_price, (int, float)):
                    price_val = float(raw_price)
                else:
                    price_val = float(str(raw_price))
                
                if key not in unique_options or price_val < float(unique_options[key].get('price', float('inf'))):
                    unique_options[key] = opt
            except (ValueError, TypeError):
                if key not in unique_options:
                    unique_options[key] = opt

        return Response(list(unique_options.values()))


import os
import re
from html import escape as html_escape
from django.http import HttpResponse
from django.utils.safestring import mark_safe

@authentication_classes([])
@permission_classes([AllowAny])
class DynamicSEOView(APIView):
    """
    Experimental View to serve index.html with dynamic meta tags for crawlers.
    This helps social media previews (WhatsApp/FB) show correct titles/descriptions.
    """
    def get(self, request, path=""):
        # 1. Default fallback values
        title = "Goimomi Holidays | Premium Travel Experiences"
        description = "Plan holidays with Goimomi Holidays—custom travel packages, family vacations, honeymoon escapes, visa assistance, cruises and business journeys designed around you."
        keywords = "goimomi holidays, travel agency, international tours, domestic holidays, visa services, holiday packages"
        image = "https://goimomi.com/logo.png"

        def frontend_asset_url(stem):
            assets_path = os.path.join(settings.BASE_DIR, '..', 'goimomifrontend', 'dist', 'assets')
            if not os.path.isdir(assets_path):
                assets_path = os.path.join(settings.BASE_DIR, 'dist', 'assets')
            image_extensions = {'.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'}
            try:
                for filename in os.listdir(assets_path):
                    if (filename.lower().startswith(stem.lower())
                            and os.path.splitext(filename)[1].lower() in image_extensions):
                        return request.build_absolute_uri(f"/assets/{filename}")
            except OSError:
                pass
            return request.build_absolute_uri('/logo.png')
        
        # 2. Dynamic content based on path
        # Holiday Details: /holiday/123
        if path.startswith('holiday/'):
            try:
                pkg_id = path.split('/')[-1]
                pkg = HolidayPackage.objects.get(id=pkg_id)
                title = f"{pkg.title} | Goimomi Holidays"
                plain_desc = re.sub('<[^<]+?>', '', pkg.description or '')
                description = (plain_desc[:160] + '...') if len(plain_desc) > 160 else plain_desc
                if pkg.card_image:
                    image = request.build_absolute_uri(pkg.card_image.url)
                # Maybe add dynamic keywords if model had it
            except:
                pass
        
        # Chithirai Global: /chithirai-global
        elif path.lower() == 'chithirai-global':
            title = "Chithirai Global | Global Networking for Tamil Businesses"
            description = "Meet Chithirai Global, a trusted network for Tamil entrepreneurs and professionals, with curated journeys, partnerships and global business opportunities."
            keywords = "Chithirai Global, Tamil business community, Tamil entrepreneurs, global business networking, business collaboration"
            image = frontend_asset_url('chithirai-global-hero')

        # Chithirai Global journeys
        elif path.lower().startswith('chithirai-global/sri-lanka'):
            title = "Sri Lanka Business Journey | Chithirai Global"
            description = "Explore Chithirai Global's 22–24 October 2026 Sri Lanka journey from Colombo to Hatton, including networking, meals, hotel stays and scenic tea-country travel."
            keywords = "Chithirai Global Sri Lanka journey, Colombo Hatton itinerary, Tamil entrepreneur networking, Sri Lanka business trip"
            image = frontend_asset_url('sri-lanka')

        elif path.lower().startswith('chithirai-global/yelagiri'):
            title = "Yelagiri Business Retreat | Chithirai Global"
            description = "Join Chithirai Global in Yelagiri from 18–20 September 2026 for a refreshing business retreat with Tamil entrepreneur networking at AGS Holiday Resorts."
            keywords = "Chithirai Global Yelagiri journey, AGS Holiday Resorts, Tamil entrepreneur networking, Yelagiri business retreat"
            image = frontend_asset_url('yelagiri-hero')

        # Canton: /canton
        elif 'canton' in path.lower():
            title = "Canton Fair 2026 | Register Now with Goimomi Holidays"
            description = "Join the prestigious Canton Fair 2026 with Goimomi Holidays. Experience the world's largest trade fair with our premium all-inclusive travel packages: luxury 4-star stays, seamless visa assistance, and expert business guidance."
            keywords = "Canton Fair 2026, Canton Fair registration, Canton Fair travel package, Goimomi Holidays, Guangzhou trade fair, Business travel China"
            image = frontend_asset_url('canton-hero')
            
        # Cabs: /cab
        elif 'cab' in path.lower():
            title = "Premium Cab & Transfer Services | Goimomi Holidays"
            description = "Book reliable and comfortable airport transfers and intercity cabs with Goimomi Holidays. Professional drivers, clean vehicles, and 24/7 support for all your travel needs."
            keywords = "Premium cab service, airport transfers, intercity taxi, Goimomi Holidays, Jeddah airport transfer, Makkah taxi service, Madinah cab booking"
            
        # Umrah: /umrah
        elif 'umrah' in path.lower():
            title = "Customized Umrah Packages | Sacred Spiritual Journey | Goimomi Holidays"
            description = "Experience a blessed pilgrimage with Goimomi Holidays' customized Umrah packages. Premium accommodation, expert guidance, and seamless travel for your spiritual journey."
            keywords = "Customized Umrah packages, Umrah pilgrimage 2026, Umrah from India, luxury Umrah stay, economy Umrah package, Makkah Madinah Ziyarat"
            
        # Customized Holidays: /customized-holidays
        elif 'customized-holidays' in path.lower():
            title = "Customized Holiday Packages | Goimomi Holidays"
            description = "Design your perfect vacation with our fully customizable holiday packages. Tailor-made itineraries, luxury stays, and seamless travel planning for your dream getaway."
            keywords = "Customized holiday packages, tailor-made travel, personalized vacation planning, Goimomi Holidays, luxury travel packages"

        # Holidays List: /holidays
        elif 'holidays' in path.lower() or 'packages' in path.lower():
            title = "Premium Holiday Packages | Goimomi Holidays"
            description = "Browse our collection of premium tour packages. From exotic beach escapes to mountain adventures, find your perfect travel experience."
            keywords = "Goimomi Holidays, holiday packages, tour packages, travel agency, premium vacations"

        # European Tours: /Europeantours
        elif 'europe' in path.lower():
            title = "European Tour Packages | Goimomi Holidays"
            description = "Explore the best of Europe with Goimomi Holidays. From Paris to Rome, discover our comprehensive tour packages for your dream European vacation."
            keywords = "European tour packages, Europe vacation, Paris Rome tours, Switzerland holiday, Goimomi Holidays"

        # Cruise: /cruise
        elif 'cruise' in path.lower():
            title = "Luxury Cruise Holidays | Goimomi Holidays"
            description = "Sail the high seas in style with Goimomi Holidays. Discover luxury cruise voyages with world-class dining, premium suites, and unforgettable destinations."
            keywords = "Luxury cruise holidays, Cordelia Cruises, cruise booking India, ocean-view suites, Goimomi Holidays"

        # Plan Your Trip: /form
        elif 'form' in path.lower() or 'plan' in path.lower():
            title = "Plan Your Trip | Custom Travel Planner | Goimomi Holidays"
            description = "Customize your dream holiday with Goimomi Holidays. Use our trip planner to select destinations, flights, and activities tailored to your budget."
            keywords = "Plan your trip, travel planner, custom holiday, vacation inquiry, Goimomi Holidays"

        # About Us: /aboutus
        elif 'about' in path.lower():
            title = "About Goimomi Holidays | Our Journey & Commitment"
            description = "Learn about Goimomi Holidays, our mission, and our decade-long journey as a trusted travel partner in India."
            keywords = "About Goimomi Holidays, travel agency India, trusted travel partner, corporate travel services"

        # Business Home: /businesshome
        elif 'business' in path.lower():
            title = "Elevate Your Business Travel | Goimomi Business"
            description = "Empower your enterprise with Goimomi Business Solutions. Strategic corporate travel management and global sourcing support."
            keywords = "Corporate travel solutions, business travel management, Goimomi Business, Canton Fair sourcing"

        # Contact Us: /contactus
        elif 'contact' in path.lower():
            title = "Contact Goimomi Holidays | 24/7 Travel Support"
            description = "Connect with Goimomi Holidays for expert travel guidance. Our team is available 24/7 to assist with your holiday and business travel needs."
            keywords = "Contact Goimomi Holidays, travel support, holiday inquiry, visa consultation"

        # Holiday Home: /holidayhome
        elif 'holidayhome' in path.lower():
            title = "Plan Your Perfect Holiday | Goimomi Holidays"
            description = "Explore curated domestic and international holiday collections. Your gateway to extraordinary travel experiences."
            keywords = "Holiday packages, international tours, domestic travel, Goimomi Holidays"

        # Hotel: /hotel
        elif 'hotel' in path.lower():
            title = "Premium Hotel Bookings | Goimomi Holidays"
            description = "Book handpicked luxury hotels and resorts worldwide with Goimomi Holidays. Best rates and 24/7 support guaranteed."
            keywords = "Hotel booking, luxury stays, resort booking, Goimomi hotel deals"

        # Privacy Policy: /privacy-policy
        elif 'privacy' in path.lower():
            title = "Privacy Policy | Goimomi Holidays"
            description = "Learn about our commitment to protecting your personal data and privacy at Goimomi Holidays."
            keywords = "Privacy policy, data protection, Goimomi Holidays"

        # Terms & Conditions: /terms-and-conditions
        elif 'terms' in path.lower():
            title = "Terms & Conditions | Goimomi Holidays"
            description = "Read the terms and conditions for using Goimomi Holidays services and our guest user agreement."
            keywords = "Terms and conditions, user agreement, Goimomi Holidays"

        # Cancellation Policy: /cancellation-policy
        elif 'cancellation' in path.lower():
            title = "Cancellation Policy | Goimomi Holidays"
            description = "Understand the cancellation and refund rules for your travel bookings with Goimomi Holidays."
            keywords = "Cancellation policy, refund rules, Goimomi Holidays"

        # Package Enquiry: /enquiry
        elif 'enquiry' in path.lower():
            title = "Holiday Package Enquiry | Goimomi Holidays"
            description = "Enquire about our international and domestic holiday packages. Get personalized quotes and travel expert advice."
            keywords = "holiday enquiry, travel quote, package booking, vacation planning, goimomi holidays"

        # Contact Success: /contact/success
        elif 'success' in path.lower():
            title = "Message Sent Successfully | Goimomi Holidays"
            description = "Thank you for contacting Goimomi Holidays. Your enquiry has been received, and our travel experts will get back to you shortly."
            keywords = "contact success, enquiry submitted, thank you, goimomi holidays"

        # Umrah Group Ticket B2B: /umrahgroupticketb2b
        elif 'umrahgroupticket' in path.lower() or 'umrah-group-ticket' in path.lower() or ('umrah' in path.lower() and ('groupticket' in path.lower() or 'b2b' in path.lower())):
            title = "B2B Umrah Group Tickets | Goimomi Holidays"
            description = "Official Goimomi Holidays B2B Umrah Group Tickets with live seat availability, group flight departures, and partner pricing for travel agents."
            keywords = "Umrah group ticket, B2B Umrah tickets, Umrah group flight departures, travel agent Umrah rates, Goimomi Holidays"

        # Visa Services: /visa
        elif 'visa' in path.lower():
            if 'ratecard' in path.lower() or 'rate-card' in path.lower():
                title = "B2B Visa Rate Card | Goimomi Holidays"
                description = "Official Goimomi Holidays B2B Visa Rate Card with live updated partner pricing, processing times, and document requirements for travel agents."
                keywords = "B2B visa rate card, visa partner pricing, travel agent visa rates, visa processing fees, Goimomi Holidays"
                image = frontend_asset_url('visa-hero')
            elif 'apply' in path.lower():
                try:
                    visa_id = path.split('/')[-1]
                    from .models import Visa
                    v = Visa.objects.get(id=visa_id)
                    title = f"Apply for {v.title} | Goimomi Holidays"
                    description = f"Submit your application for {v.title} for {v.country}. Fast and secure online visa processing."
                    keywords = f"apply for {v.title}, {v.country} visa, online visa form"
                    if v.card_image:
                        image = request.build_absolute_uri(v.card_image.url)
                except:
                    title = "Visa Application | Goimomi Holidays"
                    description = "Complete your international visa application with Goimomi Holidays."
            elif 'results' in path.lower():
                title = "Visa Search Results | Goimomi Holidays"
                description = "Explore visa options for your next trip. Get details on fees, processing time, and documents required."
                keywords = "visa search, travel visa search, visa explorer"
                image = frontend_asset_url('visa-hero')
            else:
                title = "Online Visa Services | Fast & Reliable Processing | Goimomi Holidays"
                description = "Apply for international visas online with Goimomi Holidays. Get expert assistance and fast, hassle-free visa processing for over 100+ countries."
                keywords = "online visa, visa application, travel visa services, fast visa processing, international visa assistance"
                image = frontend_asset_url('visa-hero')

        # Admin Login: /adminLogin
        elif 'adminlogin' in path.lower():
            title = "Admin Login | Goimomi Holidays"
            description = "Secure portal for Goimomi Holidays administration."
            keywords = "Admin login, Goimomi portal"

        # 3. Load the index.html
        # Note: Set frontend_dist_path correctly in your settings.py or use an absolute path
        frontend_dist_path = os.path.join(settings.BASE_DIR, '..', 'goimomifrontend', 'dist', 'index.html')
        
        # Fallback for local dev or different structure
        if not os.path.exists(frontend_dist_path):
            frontend_dist_path = os.path.join(settings.BASE_DIR, 'dist', 'index.html')

        try:
            with open(frontend_dist_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                page_url = request.build_absolute_uri(f"/{path.strip('/')}")
                is_noindex = path.lower().startswith(('visa/apply/', 'admin/'))

                def replace_meta(html, attribute, name, value):
                    safe_value = html_escape(str(value), quote=True)
                    pattern = rf'<meta\s+{attribute}="{re.escape(name)}"\s+content="[^"]*"\s*/?>'
                    replacement = f'<meta {attribute}="{name}" content="{safe_value}" />'
                    return re.sub(pattern, replacement, html, count=1, flags=re.IGNORECASE)

                # Replace crawler-facing metadata with escaped values.
                content = re.sub(r'<title>[\s\S]*?</title>', f'<title>{html_escape(title)}</title>', content, count=1, flags=re.IGNORECASE)
                content = replace_meta(content, 'property', 'og:url', page_url)
                content = replace_meta(content, 'property', 'og:title', title)
                content = replace_meta(content, 'property', 'og:description', description)
                content = replace_meta(content, 'property', 'og:image', image)
                content = replace_meta(content, 'property', 'og:image:alt', f'{title} | Goimomi Holidays')
                content = replace_meta(content, 'name', 'description', description)
                content = replace_meta(content, 'name', 'keywords', keywords)
                content = replace_meta(content, 'name', 'twitter:url', page_url)
                content = replace_meta(content, 'name', 'twitter:title', title)
                content = replace_meta(content, 'name', 'twitter:description', description)
                content = replace_meta(content, 'name', 'twitter:image', image)
                content = replace_meta(content, 'name', 'twitter:image:alt', f'{title} | Goimomi Holidays')
                content = replace_meta(content, 'name', 'robots', 'noindex, nofollow' if is_noindex else 'index, follow')
                content = replace_meta(content, 'itemprop', 'name', title)
                content = replace_meta(content, 'itemprop', 'description', description)
                content = replace_meta(content, 'itemprop', 'image', image)
                content = re.sub(
                    r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>',
                    f'<link rel="canonical" href="{html_escape(page_url, quote=True)}" />',
                    content,
                    count=1,
                    flags=re.IGNORECASE,
                )
                
                return HttpResponse(content)
        except Exception as e:
            # If index.html not found, return a basic error or redirect to frontend
            return HttpResponse(f"Error loading frontend: {str(e)}", status=500)

class DestinationHierarchyAPI(APIView):
    """
    Optimized API to return the hierarchy for Country Management with pagination and search.
    Supports tabs: all, countries, nationalities, regions, cities, airports, pickup-points, terminals
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        tab = request.query_params.get('tab', 'all')
        search = request.query_params.get('search', '')
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
        except (TypeError, ValueError):
            return Response({'error': 'Page and page size must be positive integers.'}, status=status.HTTP_400_BAD_REQUEST)
        if page < 1 or page_size < 1:
            return Response({'error': 'Page and page size must be positive integers.'}, status=status.HTTP_400_BAD_REQUEST)
        page_size = min(page_size, 200)

        # 1. Determine base queryset based on tab
        if tab == 'countries':
            queryset = Country.objects.prefetch_related('nationalities').all().order_by('name')
            if search:
                queryset = queryset.filter(name__icontains=search)
        elif tab == 'nationalities':
            queryset = Nationality.objects.select_related('country').all().order_by('name')
            if search:
                queryset = queryset.filter(Q(name__icontains=search) | Q(country__name__icontains=search))
        elif tab == 'regions':
            queryset = Region.objects.select_related('country').all().order_by('name')
            if search:
                queryset = queryset.filter(Q(name__icontains=search) | Q(country__name__icontains=search))
        elif tab == 'cities':
            queryset = City.objects.select_related('region', 'country').prefetch_related('country__nationalities').all().order_by('name')
            if search:
                queryset = queryset.filter(Q(name__icontains=search) | Q(region__name__icontains=search) | Q(country__name__icontains=search))
        elif tab == 'airports':
            queryset = Airport.objects.select_related('city__region', 'city__country').all().order_by('name')
            if search:
                queryset = queryset.filter(Q(name__icontains=search) | Q(iata_code__icontains=search) | Q(city__name__icontains=search))
        elif tab == 'pickup-points':
            queryset = PickupPointMaster.objects.select_related('city').all().order_by('name')
            if search:
                queryset = queryset.filter(Q(name__icontains=search) | Q(city__name__icontains=search))
        elif tab == 'terminals':
            queryset = CruiseTerminal.objects.all().order_by('terminal_name')
            if search:
                queryset = queryset.filter(Q(terminal_name__icontains=search) | Q(cruise_name__icontains=search))
        else: # 'all'
            queryset = City.objects.select_related('region', 'country').prefetch_related('country__nationalities').all().order_by('country__name', 'region__name', 'name')
            if search:
                queryset = queryset.filter(Q(name__icontains=search) | Q(region__name__icontains=search) | Q(country__name__icontains=search))

        # 2. Pagination
        total_count = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        paged_queryset = queryset[start:end]

        # 3. Build Response Hierarchy
        results = []
        
        # Pre-fetch sub-items for the current page to avoid N+1
        city_ids = [c.id for c in paged_queryset if isinstance(c, City)]
        city_list = [c for c in paged_queryset if isinstance(c, City)]
        
        airports_map = {}
        pickup_map = {}
        terminal_map = {}
        
        if city_ids:
            # Efficiently batch fetch airports
            for a in Airport.objects.filter(city_id__in=city_ids).values('id', 'name', 'iata_code', 'city_id'):
                cid = a['city_id']
                if cid not in airports_map: airports_map[cid] = []
                airports_map[cid].append(a)

            # Batch fetch pickups by city ID
            for p in PickupPointMaster.objects.filter(city_id__in=city_ids).values('id', 'name', 'city_id'):
                cid = p['city_id']
                if cid not in pickup_map: pickup_map[cid] = []
                pickup_map[cid].append(p)

            # Batch fetch terminals by city ID
            for t in CruiseTerminal.objects.filter(city_id__in=city_ids).values('id', 'terminal_name', 'cruise_name', 'cruise_code', 'city_id'):
                cid = t['city_id']
                if cid not in terminal_map: terminal_map[cid] = []
                terminal_map[cid].append(t)

        # Construct rows
        for item in paged_queryset:
            if isinstance(item, Country):
                row = self._build_country_row(item)
            elif isinstance(item, Nationality):
                row = self._build_nationality_row(item)
            elif isinstance(item, Region):
                row = self._build_region_row(item)
            elif isinstance(item, City):
                row = self._build_city_row(item, airports_map, pickup_map, terminal_map)
            elif isinstance(item, Airport):
                row = self._build_airport_row(item)
            elif isinstance(item, PickupPointMaster):
                row = self._build_pickup_row(item)
            elif isinstance(item, CruiseTerminal):
                row = self._build_terminal_row(item)
            else:
                row = {}
            
            results.append(row)

        return Response({
            "count": total_count,
            "next_page": page + 1 if end < total_count else None,
            "prev_page": page - 1 if page > 1 else None,
            "results": results,
            "total_pages": max(1, (total_count + page_size - 1) // page_size)
        })

    def _get_country_info(self, country):
        if not country:
            return None, "—", "—"
        
        # Get nationalities from country if prefetched/pre-related
        # In many cases, we can't do .nationalities.all() easily without hits, 
        # but the view already prefetches country__nationalities
        nationalities = "—"
        if hasattr(country, 'nationalities'):
            # This handles both prefetch_related and related_name.all()
            try:
                nats = [n.name for n in country.nationalities.all()]
                if nats:
                    nationalities = ", ".join(nats)
            except:
                pass
        
        return country.id, country.name, nationalities

    def _build_country_row(self, country):
        cid, cname, nat = self._get_country_info(country)
        return {
            "country_id": cid,
            "country_name": cname,
            "nationality": nat,
            "region_name": "—",
            "city_name": "—",
            "airports_count": 0,
            "pickup_points_count": 0,
            "cruise_terminals_count": 0
        }

    def _build_nationality_row(self, nationality):
        cid, cname, _ = self._get_country_info(nationality.country)
        return {
            "country_id": cid,
            "country_name": cname,
            "nationality": nationality.name,
            "region_name": "—",
            "city_name": "—",
            "airports_count": 0,
            "pickup_points_count": 0,
            "cruise_terminals_count": 0
        }

    def _build_region_row(self, region):
        cid, cname, nat = self._get_country_info(region.country)
        return {
            "country_id": cid,
            "country_name": cname,
            "nationality": nat,
            "region_id": region.id,
            "region_name": region.name,
            "city_name": "—",
            "airports_count": 0,
            "pickup_points_count": 0,
            "cruise_terminals_count": 0
        }

    def _build_city_row(self, city, airports_map, pickup_map, terminal_map):
        cid, cname, nat = self._get_country_info(city.country)
        
        airports = airports_map.get(city.id, [])
        pickups = pickup_map.get(city.id, [])
        terminals = terminal_map.get(city.id, [])
        
        return {
            "country_id": cid,
            "country_name": cname,
            "nationality": nat,
            "region_id": city.region.id if city.region else None,
            "region_name": city.region.name if city.region else "—",
            "city_id": city.id,
            "city_name": city.name,
            "airports": airports,
            "airports_count": len(airports),
            "pickup_points": pickups,
            "pickup_points_count": len(pickups),
            "cruise_terminals": terminals,
            "cruise_terminals_count": len(terminals)
        }

    def _build_airport_row(self, airport):
        city = airport.city
        cid, cname, nat = self._get_country_info(city.country if city else None)
        return {
            "country_id": cid,
            "country_name": cname,
            "nationality": nat,
            "region_id": city.region.id if city and city.region else None,
            "region_name": city.region.name if city and city.region else "—",
            "city_id": city.id if city else None,
            "city_name": city.name if city else "—",
            "displayed_name": f"{airport.name} ({airport.iata_code})",
            "airports_count": 1
        }

    def _build_pickup_row(self, pickup):
        city = pickup.city
        cid, cname, nat = self._get_country_info(city.country if city else None)
        return {
            "country_id": cid,
            "country_name": cname,
            "nationality": nat,
            "region_id": city.region.id if city and city.region else None,
            "region_name": city.region.name if city and city.region else "—",
            "city_id": city.id if city else None,
            "city_name": city.name if city else "—",
            "displayed_name": pickup.name,
            "pickup_points_count": 1
        }

    def _build_terminal_row(self, terminal):
        city = terminal.city
        cid, cname, nat = self._get_country_info(city.country if city else None)
        return {
            "country_id": cid,
            "country_name": cname,
            "nationality": nat,
            "region_id": city.region.id if city and city.region else None,
            "region_name": city.region.name if city and city.region else "—",
            "city_id": city.id if city else None,
            "city_name": city.name if city else "—",
            "displayed_name": f"{terminal.terminal_name} - {terminal.cruise_name}" if terminal.cruise_name else terminal.terminal_name,
            "cruise_terminals_count": 1
        }


def payment_callback(request):
    from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
    import requests
    from django.conf import settings

    if not request.user.is_authenticated or not request.user.is_staff:
        return HttpResponseForbidden("Staff access is required.")

    code = request.GET.get('code')
    if not code:
        return HttpResponseBadRequest("Missing Zoho authorization code.")

    zoho_client_id = getattr(settings, 'ZOHO_CRM_CLIENT_ID', '').strip()
    zoho_client_secret = getattr(settings, 'ZOHO_CRM_CLIENT_SECRET', '').strip()
    
    # Target exact redirect URI
    zoho_redirect_uri = 'https://goimomi.com/payment/callback'

    payload = {
        'code': code,
        'client_id': zoho_client_id,
        'client_secret': zoho_client_secret,
        'redirect_uri': zoho_redirect_uri,
        'grant_type': 'authorization_code',
    }

    try:
        response = requests.post('https://accounts.zoho.in/oauth/v2/token', data=payload, timeout=15)
        token_data = response.json()

        if response.status_code >= 400 or 'error' in token_data:
            return HttpResponse("Zoho OAuth authorization failed.", status=502)
            
        refresh_token = token_data.get('refresh_token')
        if not refresh_token:
            return HttpResponse("Zoho OAuth did not return a refresh token.", status=502)

        from Holidays.utils import update_env_file
        update_env_file('ZOHO_CRM_REFRESH_TOKEN', refresh_token)
        setattr(settings, 'ZOHO_CRM_REFRESH_TOKEN', refresh_token)
        return HttpResponse("Zoho CRM authorization completed. You can close this window.")
    except (requests.RequestException, ValueError):
        return HttpResponse("Unable to exchange the Zoho authorization code.", status=502)



# ─────────────────────────────────────────────────────────────────────────────
# Goimomi Product
# ─────────────────────────────────────────────────────────────────────────────

class GoimomiProductViewSet(ModelViewSet):
    """
    ViewSet for GoimomiProduct.
    - List / Retrieve: public (no auth needed)
    - Create / Update / Destroy: admin authenticated only
    """
    serializer_class = GoimomiProductSerializer
    queryset = GoimomiProduct.objects.all()
    pagination_class = None

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdminUser()]

    def get_queryset(self):
        queryset = GoimomiProduct.objects.all()
        stock_status = self.request.query_params.get('stock_status')
        if stock_status:
            queryset = queryset.filter(stock_status=stock_status)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()

        # Handle multiple images
        images = request.FILES.getlist('product_images')
        for idx, img in enumerate(images):
            GoimomiProductImage.objects.create(product=product, image=img, order=idx)
            
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()

        # Handle multiple images (append new ones)
        images = request.FILES.getlist('product_images')
        if images:
            # Get current max order
            max_order = getattr(product.images.order_by('-order').first(), 'order', -1)
            for idx, img in enumerate(images):
                GoimomiProductImage.objects.create(product=product, image=img, order=max_order + 1 + idx)

        # Handle removals of specific images
        remove_ids = request.data.get('remove_image_ids')
        if remove_ids:
            try:
                ids = json.loads(remove_ids) if isinstance(remove_ids, str) else remove_ids
                if ids:
                    GoimomiProductImage.objects.filter(id__in=ids, product=product).delete()
            except Exception as e:
                print(f"Error removing images: {e}")
        # Re-fetch instance to serialize updated images list
        serializer = self.get_serializer(product)
        return Response(serializer.data)


class GoimomiProductOrderViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    queryset = GoimomiProductOrder.objects.all().order_by('-created_at')
    serializer_class = GoimomiProductOrderSerializer
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.action in {'create', 'send_otp', 'verify_otp', 'verify_zoho_payment', 'zoho_webhook'}:
            return [AllowAny()]
        return [IsAdminUser()]

    def get_throttles(self):
        if self.action == 'send_otp':
            return [EmailSharingRateThrottle()]
        return super().get_throttles()

    @action(detail=False, methods=['post'], url_path='send-otp', permission_classes=[AllowAny])
    def send_otp(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'error': 'Email ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        import secrets
        otp = str(secrets.randbelow(900000) + 100000)
        
        OTPVerification.objects.update_or_create(
            email=email,
            defaults={'otp': otp, 'is_verified': False}
        )
        
        subject = "Verification Code - Goimomi Products Order"
        message = f"Hello,\n\nYour OTP for Goimomi Products order verification is:\n\n{otp}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nGoimomi Holidays Team"
        
        html_message = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px 0; color: #333333;">
            <p style="font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">Hello,</p>
            <p style="font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">Please use the following verification code to confirm your email address on Goimomi Products:</p>
            
            <div style="margin: 24px 0; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #14532d; font-family: monospace;">
                {otp}
            </div>
            
            <p style="font-size: 14px; line-height: 20px; color: #666666; margin: 0 0 24px 0;">
                This code is valid for 5 minutes. For security, please do not share this code with anyone.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 24px 0;" />
            
            <p style="font-size: 12px; line-height: 16px; color: #888888; margin: 0;">
                Goimomi Products | support@goimomi.com
            </p>
        </div>
        """
        
        from .otp_email import deliver_otp
        return deliver_otp(email, otp, subject, message, html_message)

    @action(detail=False, methods=['post'], url_path='verify-otp', permission_classes=[AllowAny])
    def verify_otp(self, request):
        email = str(request.data.get('email') or '').strip().lower()
        otp_input = str(request.data.get('otp') or '').strip()
        
        if not email or not otp_input:
            return Response({'error': 'Email address and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from datetime import timedelta
        try:
            otp_obj = OTPVerification.objects.get(email=email)
            if timezone.now() - otp_obj.created_at > timedelta(minutes=5):
                return Response({'error': 'OTP has expired. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)
            
            if otp_obj.otp == otp_input:
                otp_obj.is_verified = True
                otp_obj.save()
                return Response({'message': 'Email address verified successfully.'}, status=status.HTTP_200_OK)
        except OTPVerification.DoesNotExist:
            pass
            
        return Response({'error': 'Invalid or expired OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

    def _deduct_stock_and_notify(self, order):
        """
        Deducts stock once for an order and records the deduction durably.

        Payment callbacks can be delivered more than once, so the order row is
        locked before checking or writing the marker. This keeps duplicate
        callbacks from reducing inventory more than once.
        """
        with transaction.atomic():
            locked_order = GoimomiProductOrder.objects.select_for_update().get(pk=order.pk)
            if locked_order.stock_deducted_at:
                order.stock_deducted_at = locked_order.stock_deducted_at
                return False

            requirements = {}
            if locked_order.product_id:
                if locked_order.quantity < 1:
                    raise InsufficientProductStock('Order quantity must be at least one.')
                requirements[locked_order.product_id] = locked_order.quantity
            elif locked_order.cart_items:
                for item in locked_order.cart_items:
                    try:
                        product_id = int(item.get('product_id'))
                        quantity = int(item.get('quantity'))
                    except (AttributeError, TypeError, ValueError):
                        raise InsufficientProductStock('Order contains an invalid product quantity.')
                    if quantity < 1:
                        raise InsufficientProductStock('Order quantity must be at least one.')
                    requirements[product_id] = requirements.get(product_id, 0) + quantity
            else:
                raise InsufficientProductStock('Order has no products to fulfil.')

            products = {
                product.pk: product
                for product in GoimomiProduct.objects.select_for_update().filter(
                    pk__in=sorted(requirements)
                ).order_by('pk')
            }
            for product_id, quantity in requirements.items():
                product = products.get(product_id)
                if not product:
                    raise InsufficientProductStock('A product in this order no longer exists.')
                if product.stock_status == 'out_of_stock' or product.quantity < quantity:
                    raise InsufficientProductStock(
                        f"Insufficient stock for {product.title}. Available: {product.quantity}, requested: {quantity}."
                    )

            for product_id, quantity in requirements.items():
                product = products[product_id]
                product.quantity -= quantity
                product.save()  # Updates stock_status when quantity reaches zero.

            locked_order.stock_deducted_at = timezone.now()
            locked_order.save(update_fields=['stock_deducted_at', 'updated_at'])
            order.stock_deducted_at = locked_order.stock_deducted_at

        return True

    def _confirm_paid_order(self, order):
        """Confirm a pending paid order and deduct stock as one database transaction."""
        with transaction.atomic():
            locked_order = GoimomiProductOrder.objects.select_for_update().get(pk=order.pk)
            if (locked_order.status or '').lower() != 'pending':
                return False, locked_order

            self._deduct_stock_and_notify(locked_order)
            locked_order.status = 'Confirmed'
            locked_order.invoice_number = locked_order.order_id or f"GO-ORD-{locked_order.id}"
            locked_order.save(update_fields=['status', 'invoice_number', 'updated_at'])
            return True, locked_order

    @action(detail=True, methods=['get'], url_path='download-invoice', permission_classes=[IsAdminUser])
    def download_invoice(self, request, pk=None):
        order = self.get_object()
        from Holidays.utils import generate_product_order_invoice_pdf
        pdf_bytes = generate_product_order_invoice_pdf(order)
        if not pdf_bytes:
            return Response({'error': 'Failed to generate PDF invoice.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        order_ref = order.order_id or f"GO-ORD-{order.id}"
        filename = f"Invoice_{order_ref}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'], url_path='download-packing-slip', permission_classes=[IsAdminUser])
    def download_packing_slip(self, request, pk=None):
        order = self.get_object()
        from Holidays.utils import generate_product_order_packing_slip_pdf
        pdf_bytes = generate_product_order_packing_slip_pdf(order)
        if not pdf_bytes:
            return Response({'error': 'Failed to generate Packing Slip PDF.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        order_ref = order.order_id or f"GO-ORD-{order.id}"
        filename = f"Packing_Slip_{order_ref}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'], url_path='download-packing-slip-public', permission_classes=[AllowAny])
    def download_packing_slip_public(self, request, pk=None):
        try:
            order = self.get_object()
        except Exception:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        from Holidays.utils import generate_product_order_packing_slip_pdf
        pdf_bytes = generate_product_order_packing_slip_pdf(order)
        if not pdf_bytes:
            return Response({'error': 'Failed to generate Packing Slip PDF.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        order_ref = order.order_id or f"GO-ORD-{order.id}"
        filename = f"Packing_Slip_{order_ref}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'], url_path='send-shipping-email', permission_classes=[IsAdminUser])
    def send_shipping_email_action(self, request, pk=None):
        order = self.get_object()
        logistics_provider = request.data.get('logistics_provider')
        tracking_number = request.data.get('tracking_number')
        book_invoice_number = request.data.get('book_invoice_number')

        if logistics_provider is not None:
            order.logistics_provider = str(logistics_provider).strip()
        if tracking_number is not None:
            order.tracking_number = str(tracking_number).strip()
        if book_invoice_number is not None:
            order.book_invoice_number = str(book_invoice_number).strip()
        if 'bill_copy' in request.FILES:
            order.bill_copy = request.FILES['bill_copy']

        order.status = 'Shipped'
        try:
            with transaction.atomic():
                if order.product_id or any(item.get('product_id') for item in (order.cart_items or [])):
                    self._deduct_stock_and_notify(order)
                order.save()
        except InsufficientProductStock as stock_error:
            return Response({'error': str(stock_error)}, status=status.HTTP_400_BAD_REQUEST)

        from Holidays.utils import send_product_shipped_email
        sent = send_product_shipped_email(order)

        from Holidays.serializers import GoimomiProductOrderSerializer
        serialized_order = GoimomiProductOrderSerializer(order, context={'request': request}).data

        return Response({
            'success': True,
            'sent': sent,
            'message': f"Shipping email dispatched to {order.email or 'customer'} (Result: {'Success' if sent else 'Failed'})",
            'order': serialized_order
        })



    def create(self, request, *args, **kwargs):
        is_staff_user = bool(request.user and request.user.is_authenticated and request.user.is_staff)
        is_manual = str(request.data.get('is_manual') or '').lower() in ('true', '1', 'yes')
        if is_manual and not is_staff_user:
            return Response({'error': 'Only staff can create manual orders.'}, status=status.HTTP_403_FORBIDDEN)
        product_id = request.data.get('product')  # None if cart checkout
        cart_items = request.data.get('cart_items')
        has_product_id = product_id not in (None, '')
        try:
            quantity = int(request.data.get('quantity', 1))
        except (TypeError, ValueError):
            return Response({'error': 'Quantity must be a whole number.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1:
            return Response({'error': 'Quantity must be at least one.'}, status=status.HTTP_400_BAD_REQUEST)
        name = str(request.data.get('name') or '').strip()
        email = str(request.data.get('email') or '').strip()
        phone = str(request.data.get('phone') or '').strip()
        address = str(request.data.get('address') or '').strip()
        address_line1 = str(request.data.get('address_line1') or '').strip()
        address_line2 = str(request.data.get('address_line2') or '').strip()
        city = str(request.data.get('city') or '').strip()
        state = str(request.data.get('state') or '').strip()
        pincode = str(request.data.get('pincode') or '').strip()

        if not address:
            address = ", ".join([s for s in [address_line1, address_line2, city, state, pincode] if s])

        # Manual Order Creation Flow (For Admin / Manual Add Details)
        if is_manual:
            if not name or not phone or not address:
                return Response({'error': 'Customer Name, phone number, and delivery address are required for manual order.'}, status=status.HTTP_400_BAD_REQUEST)
            
            status_val = str(request.data.get('status') or 'Confirmed').strip()
            if status_val not in dict(GoimomiProductOrder._meta.get_field('status').choices):
                return Response({'error': 'Invalid order status.'}, status=status.HTTP_400_BAD_REQUEST)
            book_invoice_number = str(request.data.get('book_invoice_number') or '').strip()
            logistics_provider = str(request.data.get('logistics_provider') or '').strip()
            tracking_number = str(request.data.get('tracking_number') or '').strip()
            bill_copy_file = request.FILES.get('bill_copy')
            custom_product_title = str(request.data.get('custom_product_title') or request.data.get('product_title') or '').strip()
            
            product_obj = None
            if has_product_id:
                try:
                    product_obj = GoimomiProduct.objects.get(pk=int(product_id))
                except (GoimomiProduct.DoesNotExist, TypeError, ValueError):
                    return Response({'error': 'Selected product does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

            # Price determination
            raw_price = request.data.get('price')
            if raw_price not in (None, '', 'undefined'):
                try:
                    order_price = Decimal(str(raw_price))
                except (InvalidOperation, TypeError, ValueError):
                    return Response({'error': 'Invalid price format.'}, status=status.HTTP_400_BAD_REQUEST)
            elif product_obj:
                order_price = product_obj.price
            else:
                order_price = Decimal('0')

            raw_total = request.data.get('total_amount')
            if raw_total not in (None, '', 'undefined'):
                try:
                    total_amount = Decimal(str(raw_total))
                except (InvalidOperation, TypeError, ValueError):
                    return Response({'error': 'Invalid total amount format.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                total_amount = order_price * quantity

            if any(not value.is_finite() or value < 0 or value > Decimal('99999999.99')
                   for value in (order_price, total_amount)):
                return Response({'error': 'Price and total must be valid non-negative amounts.'}, status=status.HTTP_400_BAD_REQUEST)

            cart_items_data = None
            if not product_obj and custom_product_title:
                cart_items_data = [{
                    'title': custom_product_title,
                    'price': float(order_price),
                    'quantity': quantity
                }]

            try:
                with transaction.atomic():
                    order = GoimomiProductOrder.objects.create(
                        product=product_obj,
                        name=name,
                        email=email or None,
                        phone=phone,
                        quantity=quantity,
                        price=order_price,
                        total_amount=total_amount,
                        address=address,
                        address_line1=address_line1 or None,
                        address_line2=address_line2 or None,
                        city=city or None,
                        state=state or None,
                        pincode=pincode or None,
                        cart_items=cart_items_data,
                        status=status_val,
                        book_invoice_number=book_invoice_number or None,
                        logistics_provider=logistics_provider or None,
                        tracking_number=tracking_number or None,
                        bill_copy=bill_copy_file
                    )
                    if product_obj and status_val in ('Confirmed', 'Shipped', 'Delivered'):
                        self._deduct_stock_and_notify(order)
            except InsufficientProductStock as stock_error:
                return Response({'error': str(stock_error)}, status=status.HTTP_400_BAD_REQUEST)

            # Record in Enquiry table for admin tracking
            try:
                prod_info = product_obj.title if product_obj else (custom_product_title or "Manual Order Item")
                Enquiry.objects.create(
                    name=name,
                    email=email or "",
                    phone=phone,
                    destination=f"Manual Product Order: {prod_info}",
                    purpose=f"Address: {address} | Quantity: {order.quantity} | Total: ₹{total_amount} | Order ID: {order.order_id}",
                    enquiry_type="General"
                )
            except Exception as eq_err:
                print(f"Error creating general enquiry backup for manual order: {eq_err}")

            # Trigger Initial Order Status email to customer with CC to hello@goimomi.com & support@goimomi.com
            sent_email = False
            try:
                if status_val == 'Shipped':
                    from Holidays.utils import send_product_shipped_email
                    sent_email = send_product_shipped_email(order)
                elif status_val == 'Delivered':
                    from Holidays.utils import send_product_delivered_email
                    sent_email = send_product_delivered_email(order)
                elif status_val == 'Cancelled':
                    from Holidays.utils import send_product_cancelled_email
                    sent_email = send_product_cancelled_email(order)
                else:
                    from Holidays.utils import send_product_order_email
                    sent_email = send_product_order_email(order)
                print(f"Manual Product Order status email sent for Order {order.order_id} (Status: {status_val}) to customer '{order.email}' with CC to hello@goimomi.com & support@goimomi.com. Result: {sent_email}")
            except Exception as mail_err:
                print(f"Error sending manual order status email: {mail_err}")

            from Holidays.serializers import GoimomiProductOrderSerializer
            serialized_data = GoimomiProductOrderSerializer(order, context={'request': request}).data
            target_recipient = order.email or 'hello@goimomi.com'
            msg_text = f"Manual product order #{order.order_id} created successfully! Initial order status ('{status_val}') email sent to {target_recipient} with CC to hello@goimomi.com & support@goimomi.com."
            return Response({'message': msg_text, 'order': serialized_data, 'sent_email': sent_email}, status=status.HTTP_201_CREATED)

        if not name or not phone or not address or not email:
            return Response({'error': 'Name, phone, email, and delivery address are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.is_authenticated:
            try:
                otp_obj = OTPVerification.objects.get(email=email.lower())
                if not otp_obj.is_verified:
                    return Response({'error': 'Please verify your email address via OTP before placing order.'}, status=status.HTTP_400_BAD_REQUEST)
            except OTPVerification.DoesNotExist:
                return Response({'error': 'Email address has not been verified with OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        if has_product_id and cart_items:
            return Response({'error': 'Provide either a single product or cart items, not both.'}, status=status.HTTP_400_BAD_REQUEST)
        if not has_product_id and not cart_items:
            return Response({'error': 'Either a single product or cart items must be provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if has_product_id and quantity < 1:
            return Response({'error': 'Quantity must be at least one.'}, status=status.HTTP_400_BAD_REQUEST)
        if not has_product_id and (not isinstance(cart_items, list) or not cart_items):
            return Response({'error': 'Cart items must be a non-empty list.'}, status=status.HTTP_400_BAD_REQUEST)

        total_amount = 0
        order_price = 0
        product_obj = None
        validated_items = []

        if has_product_id:
            # Single product checkout
            try:
                product_obj = GoimomiProduct.objects.get(pk=int(product_id))
            except (GoimomiProduct.DoesNotExist, TypeError, ValueError):
                return Response({'error': 'Selected product does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

            if product_obj.stock_status == 'out_of_stock' or product_obj.quantity < quantity:
                return Response({'error': f'Product is out of stock or requested quantity ({quantity}) exceeds available stock ({product_obj.quantity}).'}, status=status.HTTP_400_BAD_REQUEST)

            order_price = product_obj.price
            total_amount = order_price * quantity
            
            order = GoimomiProductOrder.objects.create(
                product=product_obj,
                name=name,
                email=email,
                phone=phone,
                quantity=quantity,
                price=order_price,
                total_amount=total_amount,
                address=address,
                address_line1=address_line1,
                address_line2=address_line2,
                city=city,
                state=state,
                pincode=pincode,
                status='Pending'
            )
        else:
            requested_quantities = {}
            for item in cart_items:
                if not isinstance(item, dict):
                    return Response({'error': 'Each cart item must be an object.'}, status=status.HTTP_400_BAD_REQUEST)
                try:
                    product_key = int(item.get('product_id'))
                    item_quantity = int(item.get('quantity'))
                except (TypeError, ValueError):
                    return Response({'error': 'Each cart item needs a valid product and quantity.'}, status=status.HTTP_400_BAD_REQUEST)
                if item_quantity < 1:
                    return Response({'error': 'Each cart item quantity must be at least one.'}, status=status.HTTP_400_BAD_REQUEST)
                requested_quantities[product_key] = requested_quantities.get(product_key, 0) + item_quantity

            products = GoimomiProduct.objects.in_bulk(requested_quantities)
            for product_key, item_quantity in requested_quantities.items():
                p_obj = products.get(product_key)
                if not p_obj:
                    return Response({'error': f"Product with ID {product_key} in cart does not exist."}, status=status.HTTP_400_BAD_REQUEST)
                if p_obj.stock_status == 'out_of_stock' or p_obj.quantity < item_quantity:
                    return Response({'error': f"Product '{p_obj.title}' is out of stock or requested quantity ({item_quantity}) exceeds available stock ({p_obj.quantity})."}, status=status.HTTP_400_BAD_REQUEST)

                total_amount += p_obj.price * item_quantity
                validated_items.append({
                    'product_id': p_obj.id,
                    'title': p_obj.title,
                    'price': float(p_obj.price),
                    'quantity': item_quantity,
                })

            # Product prices and quantities are derived from database records, never the cart payload.
            validated_items.sort(key=lambda item: item['product_id'])
            order = GoimomiProductOrder.objects.create(
                product=None,
                name=name,
                email=email,
                phone=phone,
                quantity=sum(i['quantity'] for i in validated_items),
                price=0,
                total_amount=total_amount,
                address=address,
                address_line1=address_line1,
                address_line2=address_line2,
                city=city,
                state=state,
                pincode=pincode,
                cart_items=validated_items,
                status='Pending'
            )

        order.refresh_from_db()

        # Record in Enquiry table so admin sees customer details in Enquiries
        try:
            prod_info = product_obj.title if product_obj else ", ".join([f"{item['title']} (x{item['quantity']})" for item in validated_items])
            Enquiry.objects.create(
                name=name,
                email=email or "",
                phone=phone,
                destination=f"Product Order: {prod_info}",
                purpose=f"Address: {address} | Quantity: {order.quantity} | Total: ₹{total_amount} | Order ID: {order.order_id}",
                enquiry_type="General"
            )
        except Exception as eq_err:
            print(f"Error creating general enquiry backup: {eq_err}")

        # Automatically sync lead to Zoho CRM Leads
        try:
            from Holidays.utils import create_zoho_crm_lead
            import threading

            lead_description = f"Product: {prod_info}\nQuantity: {order.quantity}\nTotal Amount: ₹{total_amount}\nOrder ID: {order.order_id}\nAddress: {address}"
            lead_data = {
                'name': name,
                'email': email or '',
                'phone': phone,
                'street': f"{address_line1 or ''}, {address_line2 or ''}".strip(' ,') or address,
                'city': city or '',
                'state': state or '',
                'zip_code': pincode or '',
                'description': lead_description,
                'lead_source': 'Goimomi Product Checkout',
                'company': 'Individual'
            }
            threading.Thread(target=create_zoho_crm_lead, args=(lead_data,)).start()
        except Exception as crm_err:
            print(f"Error initiating Zoho CRM Lead sync for product order: {crm_err}")

        # Generate Zoho Payments session
        try:
            from Holidays.services.zoho_payment import ZohoPaymentService

            # Success & failure redirect URLs
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')
            
            # Construct backend verify URL dynamically
            try:
                from django.shortcuts import reverse
                verify_path = reverse('goimomi-product-order-verify-zoho-payment')
                backend_verify_url = request.build_absolute_uri(verify_path)
            except Exception:
                backend_verify_url = request.build_absolute_uri('/api/goimomi-product-orders/verify-zoho-payment/')

            if '?' in backend_verify_url:
                backend_verify_url = f"{backend_verify_url}&order_id={order.order_id}"
            else:
                backend_verify_url = f"{backend_verify_url}?order_id={order.order_id}"

            # Force HTTPS for Zoho Payments redirect callback URL
            if backend_verify_url.startswith('http://'):
                backend_verify_url = backend_verify_url.replace('http://', 'https://', 1)

            frontend_failure_url = f"{frontend_url}/payment-failed?order_id={order.order_id}"
            if frontend_failure_url.startswith('http://'):
                frontend_failure_url = frontend_failure_url.replace('http://', 'https://', 1)

            session = ZohoPaymentService.create_product_checkout_session(
                order=order,
                success_url=backend_verify_url,
                failure_url=frontend_failure_url
            )

            payments_session_id = getattr(session, 'payments_session_id', None)
            access_key = getattr(session, 'access_key', None)

            if payments_session_id and access_key:
                order.zoho_payment_session_id = payments_session_id
                order.zoho_access_key = access_key
                order.save()

                # Hosted checkout page domain based on edition
                edition_str = getattr(settings, 'ZOHO_PAYMENTS_EDITION', 'IN_SANDBOX').upper()
                if edition_str == 'IN':
                    checkout_domain = 'payments.zoho.in'
                elif edition_str == 'US':
                    checkout_domain = 'payments.zoho.com'
                else:
                    checkout_domain = 'paymentssandbox.zoho.in'

                payment_url = f"https://{checkout_domain}/hostedcheckout/{access_key}"
                
                serializer = self.get_serializer(order)
                response_data = serializer.data
                response_data['payment_url'] = payment_url
                return Response(response_data, status=status.HTTP_201_CREATED)
            return Response(
                {'error': 'Unable to start the payment session. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception as e:
            print(f"Zoho payment session notice: {e}")
            return Response(
                {'error': 'Unable to start the payment session. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=['get'], url_path='verify-zoho-payment', permission_classes=[AllowAny])
    def verify_zoho_payment(self, request):
        from django.http import HttpResponseRedirect

        order_id = request.GET.get('order_id')
        callback_session_id = request.GET.get('session_id') or request.GET.get('payments_session_id')

        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://goimomi.com').rstrip('/')

        order = None
        if order_id:
            try:
                order = GoimomiProductOrder.objects.get(order_id=order_id)
            except GoimomiProductOrder.DoesNotExist:
                pass

        if not order and callback_session_id:
            try:
                order = GoimomiProductOrder.objects.get(zoho_payment_session_id=callback_session_id)
            except GoimomiProductOrder.DoesNotExist:
                pass

        if not order:
            return HttpResponseRedirect(f"{frontend_url}/goimomi-product?error=order_not_found")

        frontend_failure_url = f"{frontend_url}/payment-failed?order_id={order.order_id}"

        if not verify_zoho_payment_session(
            callback_session_id,
            order.zoho_payment_session_id,
            order.order_id,
            order.total_amount,
        ):
            return HttpResponseRedirect(frontend_failure_url)

        try:
            newly_confirmed, order = self._confirm_paid_order(order)
            if newly_confirmed:
                try:
                    from Holidays.utils import upsert_zoho_crm_contact
                    crm_data = {
                        'first_name': order.name.split(' ')[0] if ' ' in order.name else order.name,
                        'last_name': order.name.split(' ', 1)[1] if ' ' in order.name else 'Customer',
                        'email': order.email,
                        'phone': order.phone
                    }
                    if crm_data['email']:
                        import threading
                        threading.Thread(target=upsert_zoho_crm_contact, args=(crm_data,)).start()
                except Exception as crm_err:
                    print(f"Error syncing product customer to Zoho CRM: {crm_err}")

                try:
                    from Holidays.utils import send_product_order_email
                    send_product_order_email(order)
                except Exception as mail_err:
                    print(f"Error sending product order email: {mail_err}")

            return HttpResponseRedirect(f"{frontend_url}/goimomi-product?payment_success=true&order_id={order.order_id}")

        except InsufficientProductStock as stock_error:
            print(f"Product payment received but inventory is unavailable for {order.order_id}: {stock_error}")
            return HttpResponseRedirect(frontend_failure_url)
        except Exception as e:
            print(f"Error verifying Zoho Product Payment: {e}")
            return HttpResponseRedirect(frontend_failure_url)

    @action(detail=False, methods=['post'], url_path='zoho-webhook', permission_classes=[AllowAny])
    def zoho_webhook(self, request):
        import hmac
        import hashlib
        import json
        from django.http import HttpResponse

        signature_header = request.headers.get('X-Zoho-Webhook-Signature')
        signing_key = getattr(settings, 'ZOHO_PAYMENTS_WEBHOOK_SIGNING_KEY', '')
        if not signature_header:
            return HttpResponse("Missing signature header", status=400)
        if not signing_key:
            return HttpResponse("Signing key not configured", status=500)

        try:
            parts = {}
            for part in signature_header.split(','):
                key, separator, value = part.strip().partition('=')
                if separator:
                    parts[key] = value
            timestamp = parts.get('t')
            received_signature = parts.get('v')
            if not timestamp or not received_signature:
                return HttpResponse("Invalid signature header format", status=400)

            raw_body_bytes = request.body
            data_to_verify = timestamp.encode('utf-8') + b'.' + raw_body_bytes
            expected_signature = hmac.new(
                signing_key.encode('utf-8'),
                data_to_verify,
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected_signature, received_signature):
                print("Webhook Error: Product signature verification failed")
                return HttpResponse("Unauthorized signature", status=401)
            raw_body = raw_body_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return HttpResponse("Webhook body must be UTF-8", status=400)
        except Exception as signature_error:
            print(f"Webhook signature check failed: {signature_error}")
            return HttpResponse("Invalid signature header", status=400)

        try:
            payload = json.loads(raw_body)
            event_type = payload.get('event_type')
            event_object = payload.get('event_object', {})
            payment = event_object.get('payment', {}) or event_object.get('payment_session', {}) or event_object

            print(f"Webhook Received: Event {event_type} for Product Order")

            if event_type == 'payment.succeeded':
                order_id = payment.get('reference_number') or event_object.get('reference_number')
                session_id = payment.get('payments_session_id') or event_object.get('payments_session_id')

                if not session_id:
                    return HttpResponse("Missing payment session ID", status=400)

                order = None
                if order_id:
                    try:
                        order = GoimomiProductOrder.objects.get(order_id=order_id)
                    except GoimomiProductOrder.DoesNotExist:
                        pass

                if not order and session_id:
                    try:
                        order = GoimomiProductOrder.objects.get(zoho_payment_session_id=session_id)
                    except GoimomiProductOrder.DoesNotExist:
                        pass

                if order:
                    if not verify_zoho_payment_session(
                        session_id,
                        order.zoho_payment_session_id,
                        order.order_id,
                        order.total_amount,
                    ):
                        return HttpResponse("Payment session verification failed", status=400)

                    newly_confirmed, order = self._confirm_paid_order(order)
                    if newly_confirmed:
                        print(f"Webhook Success: Product Order {order.order_id} confirmed via webhook")

                        # Sync user to Zoho CRM Contact list
                        try:
                            from Holidays.utils import upsert_zoho_crm_contact
                            crm_data = {
                                'first_name': order.name.split(' ')[0] if ' ' in order.name else order.name,
                                'last_name': order.name.split(' ', 1)[1] if ' ' in order.name else 'Customer',
                                'email': order.email,
                                'phone': order.phone
                            }
                            if crm_data['email']:
                                import threading
                                threading.Thread(target=upsert_zoho_crm_contact, args=(crm_data,)).start()
                        except Exception as crm_err:
                            print(f"Error syncing product customer to Zoho CRM via webhook: {crm_err}")

                        # Send Product Order confirmation email
                        try:
                            from Holidays.utils import send_product_order_email
                            send_product_order_email(order)
                        except Exception as mail_err:
                            print(f"Error sending product order email via webhook: {mail_err}")
                else:
                    print(f"Webhook Warning: Product Order not found for reference_number={order_id} or session_id={session_id}")

            return HttpResponse("Webhook processed successfully", status=200)

        except Exception as e:
            print(f"Webhook Exception: {e}")
            return HttpResponse(str(e), status=400)

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        inventory_fields = {'product', 'quantity', 'cart_items'}
        if order.stock_deducted_at and inventory_fields.intersection(request.data.keys()):
            return Response(
                {'error': 'Product, quantity, and cart items cannot change after stock has been deducted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                old_status = order.status
                response = super().update(request, *args, **kwargs)
                order.refresh_from_db()

                status_changed = old_status != order.status
                new_status_normalized = (order.status or '').lower()
                enters_fulfilment = (
                    status_changed
                    and new_status_normalized in {'confirmed', 'shipped', 'delivered', 'completed'}
                )
                if enters_fulfilment:
                    self._deduct_stock_and_notify(order)
        except InsufficientProductStock as stock_error:
            return Response({'error': str(stock_error)}, status=status.HTTP_400_BAD_REQUEST)

        raw_trigger = request.data.get('trigger_shipped_email', '')
        if isinstance(raw_trigger, (list, tuple)):
            raw_trigger = raw_trigger[0] if raw_trigger else ''
        trigger_shipped_email = str(raw_trigger).lower() in ('true', '1')

        if (status_changed and new_status_normalized == 'shipped') or trigger_shipped_email:
            try:
                from Holidays.tasks import send_product_shipped_email_task
                send_product_shipped_email_task.delay(order.pk)
                print(f"Product shipping email queued for Order {order.order_id} (Provider: {order.logistics_provider}, Ref: {order.tracking_number}) to {order.email}")
            except Exception as celery_error:
                try:
                    from Holidays.utils import send_product_shipped_email
                    send_product_shipped_email(order)
                    print(f"Product shipping email sent directly for Order {order.order_id}; Celery was unavailable: {celery_error}")
                except Exception as ship_error:
                    print(f"Error sending shipping email on status change: {ship_error}")
        elif status_changed:
            try:
                if new_status_normalized == 'delivered':
                    from Holidays.utils import send_product_delivered_email
                    sent = send_product_delivered_email(order)
                    print(f"Product Delivered email triggered for Order {order.order_id} to {order.email}, Result: {sent}")
                elif new_status_normalized == 'cancelled':
                    from Holidays.utils import send_product_cancelled_email
                    sent = send_product_cancelled_email(order)
                    print(f"Product Cancelled email triggered for Order {order.order_id} to {order.email}, Result: {sent}")
                elif new_status_normalized in {'confirmed', 'completed'}:
                    from Holidays.utils import send_product_order_email
                    send_product_order_email(order)
                    print(f"Product order email triggered for Order {order.order_id} (Status: {order.status}) to {order.email}")
            except Exception as mail_error:
                print(f"Error sending product status email on partial_update: {mail_error}")

        return response


class LogisticsProviderViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = LogisticsProvider.objects.all().order_by('name')
    serializer_class = LogisticsProviderSerializer
    pagination_class = None


class CatalogueMasterViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = CatalogueMaster.objects.all().order_by('name')
    serializer_class = CatalogueMasterSerializer
    pagination_class = None

    @action(detail=True, methods=['post'], url_path='addsubcatalogues')
    def add_sub_catalogues(self, request, pk=None):
        """
        API endpoint to add multiple sub-catalogues to a Catalogue Master.
        Accepts a list of sub-catalogues or a dictionary with 'sub_catalogues' key in request data.
        Payload Examples:
        [
            {"name": "Sub 1", "description": "Desc 1"},
            {"name": "Sub 2", "description": "Desc 2"}
        ]
        or
        {"sub_catalogues": [{"name": "Sub 1"}, {"name": "Sub 2"}]}
        """
        catalogue = self.get_object()
        data = request.data

        if isinstance(data, dict) and 'sub_catalogues' in data:
            sub_items = data['sub_catalogues']
        elif isinstance(data, list):
            sub_items = data
        elif isinstance(data, dict):
            sub_items = [data]
        else:
            return Response({'error': 'Invalid payload format.'}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(sub_items, list) or not sub_items or not all(isinstance(item, dict) for item in sub_items):
            return Response({'error': 'Sub-catalogues must be a non-empty list of objects.'}, status=status.HTTP_400_BAD_REQUEST)

        created_subs = []
        errors = []

        for index, item in enumerate(sub_items):
            item_data = item.copy()
            item_data['catalogue'] = catalogue.id
            serializer = SubCatalogueSerializer(data=item_data)
            if serializer.is_valid():
                sub_instance = serializer.save()
                created_subs.append(SubCatalogueSerializer(sub_instance).data)
            else:
                errors.append({'index': index, 'errors': serializer.errors})

        if errors and not created_subs:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': f'Successfully added {len(created_subs)} sub-catalogue(s).',
            'created_sub_catalogues': created_subs,
            'errors': errors if errors else None
        }, status=status.HTTP_201_CREATED)


class SubCatalogueViewSet(ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = SubCatalogue.objects.all().order_by('order', 'name')
    serializer_class = SubCatalogueSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        catalogue_id = self.request.query_params.get('catalogue')
        if catalogue_id:
            queryset = queryset.filter(catalogue_id=catalogue_id)
        return queryset


# ─────────────────────────────────────────────────────────────────────────────
# Zoho CRM Inbound Webhook Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@api_view(['POST', 'GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def zoho_crm_webhook(request):
    """
    Receives incoming webhook events from Zoho CRM (Leads, Contacts, Deals).
    Authenticates via X-Zoho-Webhook-Secret header or ?secret= query param.
    Extracts customer lead data and syncs with Enquiry model while logging to ZohoWebhookLog.
    """
    import hmac

    # 1. Security & Authentication Check
    expected_secret = getattr(settings, 'ZOHO_CRM_WEBHOOK_SECRET', '').strip()
    received_secret = (
        request.headers.get('X-Zoho-Webhook-Secret') or 
        request.headers.get('X-ZOHO-WEBHOOK-SECRET') or 
        request.META.get('HTTP_X_ZOHO_WEBHOOK_SECRET') or
        request.query_params.get('secret') or
        (request.data.get('secret') if isinstance(request.data, dict) else '') or
        request.POST.get('secret') or
        ''
    ).strip()

    # Keep authentication credentials out of the audit trail.
    log_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() in ('content-type', 'user-agent', 'x-forwarded-for', 'host')
    }

    # Handle health-check GET probe
    if request.method == 'GET':
        return Response({
            "status": "ready",
            "message": "Zoho CRM Webhook endpoint is active and listening for POST requests."
        }, status=status.HTTP_200_OK)

    if not expected_secret:
        logger.error("Zoho CRM webhook secret is not configured")
        return Response({"error": "Webhook is not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if not received_secret or not hmac.compare_digest(expected_secret.encode(), received_secret.encode()):
        logger.warning("Zoho CRM webhook rejected: missing or invalid secret")
        try:
            ZohoWebhookLog.objects.create(
                event_type='unauthorized_access',
                module='CRM',
                payload={},
                headers=log_headers,
                status='unauthorized',
                response_message='Missing or invalid webhook secret'
            )
        except Exception:
            logger.exception("Unable to create CRM webhook audit log")
        return Response(
            {"error": "Unauthorized: Missing or invalid webhook secret"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # 2. Extract and Merge Data Payload (Supports JSON, Form-data, and Query params)
    data = {}
    if isinstance(request.data, dict):
        data.update(request.data)
    elif hasattr(request.data, 'dict'):
        data.update(request.data.dict())

    if hasattr(request, 'POST') and request.POST:
        data.update(request.POST.dict())

    if hasattr(request, 'query_params') and request.query_params:
        data.update(request.query_params.dict())

    if not data and request.body:
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            data = {}

    data.pop('secret', None)

    module = str(data.get('module') or request.query_params.get('module') or 'Leads').strip()
    event_type = str(data.get('event') or data.get('action') or 'record_triggered').strip()

    # Normalize fields from Zoho merge fields or standard JSON/Form keys
    def get_field(*keys):
        for k in keys:
            val = data.get(k)
            if val is not None and str(val).strip():
                return str(val).strip()
        return ''

    first_name = get_field('First_Name', 'first_name', 'First Name', 'First_name')
    last_name = get_field('Last_Name', 'last_name', 'Last Name', 'Last_name')
    full_name = get_field('Full_Name', 'full_name', 'Name', 'name', 'Full Name')
    if not full_name and (first_name or last_name):
        full_name = f"{first_name} {last_name}".strip()
    if not full_name:
        full_name = 'Zoho CRM Lead'

    email = get_field('Email', 'email', 'Email_Address', 'email_address')
    phone = get_field('Phone', 'phone', 'Mobile', 'mobile', 'Phone_Number', 'phone_number')
    lead_source = get_field('Lead_Source', 'lead_source', 'Lead Source', 'Source', 'source') or 'Zoho CRM'
    city = get_field('City', 'city', 'Destination', 'destination', 'State', 'state', 'Country', 'country')
    description = get_field('Description', 'description', 'Notes', 'notes', 'Message', 'message')

    created_enquiry = None
    try:
        if full_name or email or phone:
            purpose_parts = [f"Source: {lead_source}"]
            if description:
                purpose_parts.append(f"Notes: {description}")
            if city:
                purpose_parts.append(f"Location: {city}")
            purpose_text = " | ".join(purpose_parts)

            created_enquiry = Enquiry.objects.create(
                name=full_name,
                email=email or None,
                phone=phone or "N/A",
                destination=city or "Zoho CRM Lead",
                purpose=purpose_text,
                enquiry_type="General"
            )
            logger.info("CRM webhook recorded enquiry %s", created_enquiry.id)

        log_entry = ZohoWebhookLog.objects.create(
            event_type=event_type,
            module=module,
            payload=data,
            headers=log_headers,
            status='success',
            response_message=f"Successfully processed and recorded Enquiry #{created_enquiry.id if created_enquiry else 'N/A'}"
        )

        return Response({
            "status": "success",
            "message": "Zoho CRM webhook received and processed successfully",
            "enquiry_id": created_enquiry.id if created_enquiry else None,
            "log_id": log_entry.id
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[Zoho CRM Webhook] Error processing payload: {e}")
        try:
            ZohoWebhookLog.objects.create(
                event_type=event_type,
                module=module,
                payload=data,
                headers=log_headers,
                status='error',
                response_message=f"Processing exception: {str(e)}"
            )
        except Exception:
            pass

        return Response({
            "status": "error",
            "message": f"Failed to process webhook data: {str(e)}"
        }, status=status.HTTP_400_BAD_REQUEST)




