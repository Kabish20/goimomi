import json
from datetime import date

# Rest Framework Imports
from rest_framework import serializers
from .models import GlobalHorizonsProfile
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Django Imports
from django.core.files.base import ContentFile
from django.contrib.auth.models import User
from django.db import transaction

# Local App Imports
from .models import (
    HolidayEnquiry, UmrahEnquiry, Enquiry, HolidayPackage, PackageDestination,
    ItineraryDay, ItineraryMaster, Inclusion, Exclusion, Highlight, CancellationPolicy,
    Visa, VisaApplication, VisaApplicant,
    VisaAdditionalDocument, Supplier, CruiseCalendar, HotelMaster,
    Accommodation, AccommodationImage, Airline, HolidayVehicle,
    SightseeingMaster, SightseeingImage, MealMaster, VehicleBrand,
    RoomType, VehicleMaster, DriverMaster, VehicleRateCard,
    PickupPointMaster, CabBooking, CabAdditionalDocument, CantonEnquiry, BusinessJourneyRegistration, City, Region, Nationality, Country, Airport, CruiseTerminal,
    GoimomiProduct, GoimomiProductImage, GoimomiProductOrder, LogisticsProvider, PackageBooking,
    CatalogueMaster, SubCatalogue
)

class GlobalHorizonsProfileSerializer(serializers.ModelSerializer):
    website = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def create(self, validated_data):
        from .profile_documents import prepare_profile_documents
        profile = super().create(validated_data)
        prepare_profile_documents(profile)
        return profile

    def update(self, instance, validated_data):
        from .profile_documents import prepare_profile_documents
        profile = super().update(instance, validated_data)
        prepare_profile_documents(profile)
        return profile

    def validate_website(self, value):
        from django.core.exceptions import ValidationError
        from .profile_links import normalize_profile_link
        try:
            return normalize_profile_link(value)
        except ValidationError as error:
            raise serializers.ValidationError(error.messages)

    ticket_status = serializers.ChoiceField(choices=GlobalHorizonsProfile._meta.get_field('ticket_status').choices, required=True)

    def validate(self, attrs):
        ticket_status = attrs.get('ticket_status', getattr(self.instance, 'ticket_status', 'not_booked'))
        flight_fields = ('arrival_date', 'arrival_flight_no', 'arrival_time', 'return_date', 'return_flight_no', 'return_time')
        if ticket_status == 'not_booked':
            for field in flight_fields:
                attrs[field] = '' if field.endswith('_no') else None
        else:
            values = {field: attrs.get(field, getattr(self.instance, field, None)) for field in flight_fields}
            errors = {field: 'This field is required when tickets are booked.' for field, value in values.items() if not value}
            if errors:
                raise serializers.ValidationError(errors)
            if values['return_date'] < values['arrival_date']:
                raise serializers.ValidationError({'return_date': 'Return date cannot be before arrival date.'})
        return attrs

    class Meta:
        model = GlobalHorizonsProfile
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'attending_poster', 'profile_booklet', 'attending_poster_image')


class BusinessJourneyRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessJourneyRegistration
        fields = "__all__"

class CantonEnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = CantonEnquiry
        fields = "__all__"

class CruiseTerminalSerializer(serializers.ModelSerializer):
    city_name = serializers.ReadOnlyField(source='city.name')
    region_name = serializers.ReadOnlyField(source='city.region.name')
    class Meta:
        model = CruiseTerminal
        fields = "__all__"

class AirportSerializer(serializers.ModelSerializer):
    city_name = serializers.ReadOnlyField(source='city.name')
    region_name = serializers.ReadOnlyField(source='city.region.name')
    country_name = serializers.SerializerMethodField()

    class Meta:
        model = Airport
        fields = "__all__"

    def get_country_name(self, obj):
        if obj.city and obj.city.country:
            return obj.city.country.name
        return ""

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = "__all__"

class NationalitySerializer(serializers.ModelSerializer):
    country_name = serializers.ReadOnlyField(source='country.name')
    class Meta:
        model = Nationality
        fields = "__all__"

class RegionSerializer(serializers.ModelSerializer):
    country_name = serializers.ReadOnlyField(source='country.name')
    class Meta:
        model = Region
        fields = "__all__"

class CitySerializer(serializers.ModelSerializer):
    region_name = serializers.ReadOnlyField(source='region.name')
    country_name = serializers.ReadOnlyField(source='country.name')
    class Meta:
        model = City
        fields = "__all__"



class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field, '').strip()
        if username:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user_obj = User.objects.filter(username__iexact=username).first()
            if user_obj:
                attrs[self.username_field] = user_obj.get_username()

        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['email'] = user.email

        return token






class HolidayEnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = HolidayEnquiry
        fields = "__all__"


class UmrahEnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = UmrahEnquiry
        fields = "__all__"


class EnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = Enquiry
        fields = "__all__"


# ItineraryDaySerializer moved after all dependencies


class InclusionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inclusion
        fields = ["text"]


class SightseeingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SightseeingImage
        fields = "__all__"

class SightseeingMasterSerializer(serializers.ModelSerializer):
    images = SightseeingImageSerializer(many=True, read_only=True)
    city_name = serializers.ReadOnlyField(source='city_link.name')
    country_name = serializers.ReadOnlyField(source='city_link.country.name')
    region_name = serializers.ReadOnlyField(source='city_link.region.name')
    region_id = serializers.ReadOnlyField(source='city_link.region.id')
    class Meta:
        model = SightseeingMaster
        fields = "__all__"

class MealMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealMaster
        fields = "__all__"


class ExclusionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exclusion
        fields = ["text"]


class HighlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Highlight
        fields = ["text"]

class CancellationPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = CancellationPolicy
        fields = ["text"]

class HolidayVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = HolidayVehicle
        fields = "__all__"


class PackageDestinationSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='destination.name', read_only=True)
    class Meta:
        model = PackageDestination
        fields = ["name", "nights"]


class ItineraryDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = ItineraryDay
        fields = "__all__"


class HolidayPackageSerializer(serializers.ModelSerializer):
    itinerary = serializers.SerializerMethodField()
    inclusions = InclusionSerializer(many=True, read_only=True)
    exclusions = ExclusionSerializer(many=True, read_only=True)
    highlights = HighlightSerializer(many=True, read_only=True)
    cancellation_policies = CancellationPolicySerializer(many=True, read_only=True)
    destinations = PackageDestinationSerializer(source='extra_destinations', many=True, read_only=True)
    nights = serializers.SerializerMethodField()
    fixed_departure_data = serializers.JSONField(required=False)
    # Write-only fields for nested data handling
    package_destinations = serializers.JSONField(write_only=True, required=False)
    itinerary_days = serializers.JSONField(write_only=True, required=False)
    
    # Raw data fields for frontend-backend sync
    accommodations_raw = serializers.JSONField(required=False, allow_null=True)
    vehicles_raw = serializers.JSONField(required=False, allow_null=True)
    inclusions_raw = serializers.JSONField(required=False, allow_null=True)
    exclusions_raw = serializers.JSONField(required=False, allow_null=True)
    highlights_raw = serializers.JSONField(required=False, allow_null=True)
    cancellation_policies_raw = serializers.JSONField(required=False, allow_null=True)
    terms_and_policies_raw = serializers.JSONField(required=False, allow_null=True)
    
    vehicles = HolidayVehicleSerializer(many=True, read_only=True)

    class Meta:
        model = HolidayPackage
        fields = "__all__"

    def to_representation(self, instance):
        """
        Custom representation to apply filtering to fixed_departure_data
        while keeping it writable via JSONField.
        """
        data = super().to_representation(instance)
        
        # Apply the filtering logic for fixed_departure_data if it's not an admin request
        fd_data = data.get('fixed_departure_data')
        if fd_data:
            if isinstance(fd_data, str):
                try: fd_data = json.loads(fd_data)
                except: pass
            
            if isinstance(fd_data, list):
                request = self.context.get('request')
                is_admin = request and (
                    request.query_params.get('admin', 'false').lower() == 'true' or
                    request.query_params.get('all', 'false').lower() == 'true'
                )
                if not is_admin:
                    today = date.today()
                    filtered = []
                    for slot in fd_data:
                        valid_to_str = slot.get('valid_to')
                        if valid_to_str:
                            try:
                                valid_to = date.fromisoformat(valid_to_str)
                                if valid_to >= today:
                                    filtered.append(slot)
                            except (ValueError, TypeError):
                                filtered.append(slot)
                        else:
                            filtered.append(slot)
                    data['fixed_departure_data'] = filtered
                else:
                    data['fixed_departure_data'] = fd_data
        
        return data

    def get_nights(self, obj):
        return sum(d.nights for d in obj.extra_destinations.all())

    def get_itinerary(self, obj):
        # Return all itinerary items belonging to this package
        qs = obj.itinerary.all()
        return ItineraryDaySerializer(qs, many=True, context=self.context).data


    def create(self, validated_data):
        # Handle stringified data from FormData
        cat_data = validated_data.get('package_categories')
        if isinstance(cat_data, str):
            try: validated_data['package_categories'] = json.loads(cat_data)
            except: validated_data['package_categories'] = []
            
        fixed_dep = validated_data.get('fixed_departure')
        if isinstance(fixed_dep, str):
            validated_data['fixed_departure'] = fixed_dep.lower() == 'true'

        fixed_data = validated_data.get('fixed_departure_data')
        if isinstance(fixed_data, str):
            try: validated_data['fixed_departure_data'] = json.loads(fixed_data)
            except: validated_data['fixed_departure_data'] = []

        # Extract nested data
        package_destinations_data = validated_data.pop('package_destinations', [])
        itinerary_days_data = validated_data.pop('itinerary_days', [])
        inclusions_data = validated_data.pop('inclusions_raw', [])
        exclusions_data = validated_data.pop('exclusions_raw', [])
        highlights_data = validated_data.pop('highlights_raw', [])
        cancellation_policies_data = validated_data.pop('cancellation_policies_raw', [])
        terms_and_policies_data = validated_data.pop('terms_and_policies_raw', [])
        vehicles_data = validated_data.pop('vehicles_raw', [])
        
        # Create the package
        package = HolidayPackage.objects.create(**validated_data)
        
        self._handle_nested_data(package, package_destinations_data, itinerary_days_data, inclusions_data, exclusions_data, highlights_data, vehicles_data, cancellation_policies_data, accommodations_data=None, terms_and_policies_data=terms_and_policies_data)
        return package

    def update(self, instance, validated_data):
        # Handle stringified data from FormData
        cat_data = validated_data.get('package_categories')
        if isinstance(cat_data, str):
            try: validated_data['package_categories'] = json.loads(cat_data)
            except: validated_data['package_categories'] = []
            
        fixed_dep = validated_data.get('fixed_departure')
        if isinstance(fixed_dep, str):
            validated_data['fixed_departure'] = fixed_dep.lower() == 'true'

        fixed_data = validated_data.get('fixed_departure_data')
        if isinstance(fixed_data, str):
            try: validated_data['fixed_departure_data'] = json.loads(fixed_data)
            except: validated_data['fixed_departure_data'] = []

        # Extract nested data with None as default to detect if they were provided
        package_destinations_data = validated_data.pop('package_destinations', None)
        itinerary_days_data = validated_data.pop('itinerary_days', None)
        inclusions_data = validated_data.pop('inclusions_raw', None)
        exclusions_data = validated_data.pop('exclusions_raw', None)
        highlights_data = validated_data.pop('highlights_raw', None)
        cancellation_policies_data = validated_data.pop('cancellation_policies_raw', None)
        terms_and_policies_data = validated_data.pop('terms_and_policies_raw', None)
        accommodations_data = validated_data.pop('accommodations_raw', None)
        vehicles_data = validated_data.pop('vehicles_raw', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # ONLY update nested data if it was explicitly provided in the request
        # This prevents data loss when updating only basic fields (like is_active)
        if any(x is not None for x in [package_destinations_data, itinerary_days_data, inclusions_data, exclusions_data, highlights_data, cancellation_policies_data, accommodations_data, vehicles_data, terms_and_policies_data]):
            
            # Clear existing simple relations ONLY if provided
            if package_destinations_data is not None:
                instance.extra_destinations.all().delete()
            if inclusions_data is not None:
                instance.inclusions.all().delete()
            if exclusions_data is not None:
                instance.exclusions.all().delete()
            if highlights_data is not None:
                instance.highlights.all().delete()
            if cancellation_policies_data is not None:
                instance.cancellation_policies.all().delete()
            if vehicles_data is not None:
                instance.vehicles.all().delete()
            # accommodations_raw is stored in the model now, no need to clear separate model

            # The _handle_nested_data method already handles itinerary deletion/preservation logic
            self._handle_nested_data(instance, package_destinations_data, itinerary_days_data, inclusions_data, exclusions_data, highlights_data, vehicles_data, cancellation_policies_data, accommodations_data, terms_and_policies_data=terms_and_policies_data)
        
        return instance

    def _handle_nested_data(self, package, package_destinations_data, itinerary_days_data, inclusions_data, exclusions_data, highlights_data, vehicles_data, cancellation_policies_data, accommodations_data=None, terms_and_policies_data=None):
        # Helper to ensure we have a list/dict, but ONLY if not None
        def ensure_json(data):
            if data is None: return None
            if isinstance(data, str):
                try: return json.loads(data)
                except: return []
            return data

        package_destinations_data = ensure_json(package_destinations_data)
        itinerary_days_data = ensure_json(itinerary_days_data)
        inclusions_data = ensure_json(inclusions_data)
        exclusions_data = ensure_json(exclusions_data)
        highlights_data = ensure_json(highlights_data)
        cancellation_policies_data = ensure_json(cancellation_policies_data)
        vehicles_data = ensure_json(vehicles_data)
        accommodations_data = ensure_json(accommodations_data)
        terms_and_policies_data = ensure_json(terms_and_policies_data)

        # 1. Package Destinations (only if provided)
        if package_destinations_data is not None and isinstance(package_destinations_data, list):
            for dest_data in package_destinations_data:
                if isinstance(dest_data, dict) and dest_data.get('destination'):
                    dest_obj = City.objects.filter(name=dest_data.get('destination')).first()
                    if dest_obj:
                        PackageDestination.objects.create(
                            package=package,
                            destination=dest_obj,
                            nights=int(dest_data.get('nights', 1)) if isinstance(dest_data, dict) else 1
                        )

        # 2. Itinerary Days (only if provided)
        if itinerary_days_data is not None:
            request = self.context.get('request')
            primary_dest = None
            
            # Get primary destination from input or existing if input missing destinations
            if package_destinations_data and len(package_destinations_data) > 0:
                first_dest = package_destinations_data[0]
                dest_name = first_dest.get('destination') if isinstance(first_dest, dict) else first_dest
                primary_dest = City.objects.filter(name=dest_name).first()
            if not primary_dest:
                p_dest_obj = package.extra_destinations.first()
                if p_dest_obj: primary_dest = p_dest_obj.destination

            # Capture existing itinerary days to preserve images
            existing_days = {d.day_number: d for d in package.itinerary.all()}
            # We will delete them but keep references to their image files
            package.itinerary.all().delete()

            current_day_num = 0
            for i, day_data in enumerate(itinerary_days_data):
                title = day_data.get('title', '').strip()
                # Relaxed title check - allow empty titles if description exists
                if not title and not day_data.get('description'): continue

                current_day_num += 1
                day_num = current_day_num

                # Handle Image
                image_file = None
                if request and request.FILES:
                    image_file = request.FILES.get(f'itinerary_image_{i}')

                # Master Template logic
                master_template_obj = None
                master_id = day_data.get('master_template')
                if master_id:
                    master_template_obj = ItineraryMaster.objects.filter(id=master_id).first()

                if master_template_obj:
                    # Update existing master
                    master_template_obj.title = title[:200]
                    master_template_obj.description = day_data.get('description', '')
                    master_template_obj.details_json = day_data.get('details_json', {})
                    if image_file:
                        try:
                            if hasattr(image_file, 'open'): image_file.open()
                            file_content = image_file.read()
                            master_template_obj.image.save(image_file.name, ContentFile(file_content), save=False)
                            image_file.seek(0)
                        except: pass
                    master_template_obj.save()
                else:
                    # Create NEW master
                    try:
                        master_image = None
                        if image_file:
                            try:
                                if hasattr(image_file, 'open'): image_file.open()
                                file_content = image_file.read()
                                master_image = ContentFile(file_content, name=image_file.name)
                                image_file.seek(0)
                            except: pass
                        
                        master_template_obj = ItineraryMaster.objects.create(
                            city=primary_dest,
                            name=title[:200],
                            title=title[:200],
                            description=day_data.get('description', ''),
                            details_json=day_data.get('details_json', {}),
                            image=master_image
                        )
                    except Exception:
                        pass

                # Preserve old image if no new one uploaded
                if not image_file and day_num in existing_days:
                    image_file = existing_days[day_num].image

                ItineraryDay.objects.create(
                    package=package,
                    day_number=day_num,
                    title=title,
                    description=day_data.get('description', ''),
                    details_json=day_data.get('details_json', {}),
                    master_template=master_template_obj,
                    image=image_file or (master_template_obj.image if master_template_obj else None)
                )

        # 3. Simple list fields (only if provided)
        if inclusions_data is not None:
            for text in inclusions_data:
                if text: Inclusion.objects.create(package=package, text=text)
        if exclusions_data is not None:
            for text in exclusions_data:
                if text: Exclusion.objects.create(package=package, text=text)
        if highlights_data is not None:
            for text in highlights_data:
                if text: Highlight.objects.create(package=package, text=text)

        if cancellation_policies_data is not None:
            for text in cancellation_policies_data:
                if text: CancellationPolicy.objects.create(package=package, text=text)

        # 4. Detailed Vehicles (only if provided)
        if vehicles_data is not None:
            for v in vehicles_data:
                if isinstance(v, dict):
                    HolidayVehicle.objects.create(
                        package=package,
                        category=v.get('category', ''),
                        vehicle_type=v.get('vehicle_type', ''),
                        no_of_vehicles=v.get('no_of_vehicles', 1),
                        pickup_date=v.get('pickup_date') or None,
                        pickup_location=v.get('pickup_location', ''),
                        dropoff_date=v.get('dropoff_date') or None,
                        dropoff_location=v.get('dropoff_location', ''),
                        vehicle_brand=v.get('vehicle_brand', ''),
                        pickup_time=v.get('pickup_time') or None,
                        dropoff_time=v.get('dropoff_time') or None,
                        remarks=v.get('remarks', '')
                    )

        # 5. Save Raw Data Fields to Model
        if inclusions_data is not None:
            package.inclusions_raw = inclusions_data
        if exclusions_data is not None:
            package.exclusions_raw = exclusions_data
        if highlights_data is not None:
            package.highlights_raw = highlights_data
        if cancellation_policies_data is not None:
            package.cancellation_policies_raw = cancellation_policies_data
        if vehicles_data is not None:
            package.vehicles_raw = vehicles_data
        if accommodations_data is not None:
            package.accommodations_raw = accommodations_data
        if terms_and_policies_data is not None:
            package.terms_and_policies_raw = terms_and_policies_data
        
        package.save()










class ItineraryMasterSerializer(serializers.ModelSerializer):
    destination = serializers.SerializerMethodField()

    class Meta:
        model = ItineraryMaster
        fields = "__all__"

    def get_destination(self, obj):
        if obj.city:
            if obj.city.region:
                return obj.city.region.id
            return obj.city.id
        return None

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        destination_val = mutable_data.pop('destination', None)
        internal_data = super().to_internal_value(mutable_data)
        if destination_val:
            from Holidays.models import City, Region
            city = None
            if isinstance(destination_val, list):
                destination_val = destination_val[0] if destination_val else None
            if destination_val:
                if str(destination_val).isdigit():
                    region = Region.objects.filter(id=int(destination_val)).first()
                    if region:
                        city = City.objects.filter(name__iexact=region.name).first()
                        if not city:
                            city = City.objects.filter(region=region).first()
                    else:
                        city = City.objects.filter(id=int(destination_val)).first()
                else:
                    city = City.objects.filter(name__iexact=str(destination_val)).first()
                if city:
                    internal_data['city'] = city
        return internal_data


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'is_active', 'last_login', 'date_joined', 'password']
        read_only_fields = ['last_login', 'date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if 'is_staff' not in validated_data:
            validated_data['is_staff'] = True
        user = User.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance





class VisaSerializer(serializers.ModelSerializer):
    supplier_details = serializers.SerializerMethodField()

    class Meta:
        model = Visa
        fields = [
            'id', 'country', 'title', 'entry_type', 'validity', 'duration', 
            'processing_time', 'cost_price', 'service_charge', 'selling_price', 
            'documents_required', 'photography_required', 
            'visa_type', 'card_image', 'is_active', 'is_popular', 'supplier', 'supplier_details',
            'created_at'
        ]



    def get_supplier_details(self, obj):
        if obj.supplier:
            return {
                'id': obj.supplier.id,
                'company_name': obj.supplier.company_name,
                'contact_person': obj.supplier.contact_person,
                'contact_no': obj.supplier.contact_no
            }
        return None


class VisaAdditionalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisaAdditionalDocument
        fields = "__all__"


class VisaApplicantSerializer(serializers.ModelSerializer):
    additional_documents = VisaAdditionalDocumentSerializer(many=True, read_only=True)
    passport_front = serializers.ImageField(allow_null=True, required=False)
    photo = serializers.ImageField(allow_null=True, required=False)

    class Meta:
        model = VisaApplicant
        fields = "__all__"


class VisaApplicantSubmissionSerializer(VisaApplicantSerializer):
    class Meta(VisaApplicantSerializer.Meta):
        read_only_fields = ['application']


class VisaDocumentSubmissionSerializer(VisaAdditionalDocumentSerializer):
    class Meta(VisaAdditionalDocumentSerializer.Meta):
        read_only_fields = ['applicant']


class VisaApplicationSerializer(serializers.ModelSerializer):
    applicants = VisaApplicantSerializer(many=True, read_only=True)
    visa_country = serializers.CharField(source='visa.country', read_only=True)
    visa_title = serializers.CharField(source='visa.title', read_only=True)
    visa_cost_price = serializers.IntegerField(source='visa.cost_price', read_only=True)
    visa_service_charge = serializers.IntegerField(source='visa.service_charge', read_only=True)

    class Meta:
        model = VisaApplication
        fields = [
            'id', 'visa', 'application_type', 'internal_id', 'group_name', 
            'departure_date', 'return_date', 'total_price', 'status', 'payment_status',
            'zoho_payment_session_id', 'zoho_access_key', 'invoice_number',
            'created_at', 'applicants', 'visa_country', 'visa_title',
            'visa_cost_price', 'visa_service_charge'
        ]


class PackageBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PackageBooking
        fields = "__all__"




class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"

class CruiseCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = CruiseCalendar
        fields = "__all__"

class HotelMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelMaster
        fields = "__all__"

class AirlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airline
        fields = "__all__"

class VehicleBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleBrand
        fields = "__all__"

class AccommodationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationImage
        fields = "__all__"

class AccommodationSerializer(serializers.ModelSerializer):
    images = AccommodationImageSerializer(many=True, read_only=True)
    class Meta:
        model = Accommodation
        fields = "__all__"

class RoomTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomType
        fields = "__all__"

class VehicleMasterSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    driver_name = serializers.CharField(source='driver.name', read_only=True)
    latest_rate_card_file = serializers.SerializerMethodField()
    class Meta:
        model = VehicleMaster
        fields = "__all__"

    def to_internal_value(self, data):
        if hasattr(data, 'dict'):
            data = data.dict()
        elif hasattr(data, 'copy'):
            data = data.copy()
        
        for field in ['brand', 'driver', 'photo']:
            if field in data:
                val = data.get(field)
                if val == '' or val == 'null' or val == 'undefined' or val is None:
                    data[field] = None
                    
        return super().to_internal_value(data)

    def get_latest_rate_card_file(self, obj):
        latest_card = obj.rate_cards.order_by('-created_at').first()
        if latest_card and latest_card.rate_card_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(latest_card.rate_card_file.url)
            return latest_card.rate_card_file.url
        return None

class DriverMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverMaster
        fields = "__all__"

class VehicleRateCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleRateCard
        fields = "__all__"

    def to_internal_value(self, data):
        # Convert QueryDict to standard dict to avoid list-wrapping issues in DRF fields
        if hasattr(data, 'dict'):
            data = data.dict()
        elif hasattr(data, 'copy'):
            data = data.copy()
        
        for field in ['supplier', 'vehicle']:
            if field in data:
                val = data.get(field)
                if val == '' or val == 'null' or val == 'undefined' or val is None:
                    data[field] = None

        import json
        for field in ['routes', 'column_vehicles']:
            if field in data:
                val = data.get(field)
                if isinstance(val, str):
                    try:
                        data[field] = json.loads(val)
                    except Exception:
                        pass
                    
        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        import json
        for field in ['routes', 'column_vehicles']:
            val = ret.get(field)
            if isinstance(val, str):
                try:
                    ret[field] = json.loads(val)
                except Exception:
                    pass
        return ret
class PickupPointMasterSerializer(serializers.ModelSerializer):
    city_name = serializers.ReadOnlyField(source='city.name')
    region_name = serializers.ReadOnlyField(source='city.region.name')
    class Meta:
        model = PickupPointMaster
        fields = "__all__"

class CabAdditionalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CabAdditionalDocument
        fields = "__all__"

class CabBookingSerializer(serializers.ModelSerializer):
    additional_documents = CabAdditionalDocumentSerializer(many=True, read_only=True)
    class Meta:
        model = CabBooking
        fields = "__all__"



class GoimomiProductSerializer(serializers.ModelSerializer):
    discount_percent = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    catalogue_name = serializers.ReadOnlyField(source='catalogue.name', default=None)
    sub_catalogue_name = serializers.ReadOnlyField(source='sub_catalogue.name', default=None)
    sub_catalogue_details = serializers.SerializerMethodField()

    product_id = serializers.SerializerMethodField()

    class Meta:
        model = GoimomiProduct
        fields = [
            'id', 'product_id', 'title', 'description', 'price', 'mrp',
            'quantity', 'stock_status', 'image',
            'catalogue', 'sub_catalogue', 'sub_catalogues',
            'catalogue_name', 'sub_catalogue_name', 'sub_catalogue_details',
            'discount_percent', 'images', 'created_at', 'updated_at',
        ]

    def get_product_id(self, obj):
        return obj.product_id or f'GO-PRO-{str(obj.pk).zfill(4)}'

    def get_sub_catalogue_details(self, obj):
        res = []
        if obj.sub_catalogue:
            res.append({'id': obj.sub_catalogue.id, 'name': obj.sub_catalogue.name})
        for sc in obj.sub_catalogues.all():
            if not any(item['id'] == sc.id for item in res):
                res.append({'id': sc.id, 'name': sc.name})
        return res

    def get_discount_percent(self, obj):
        return obj.discount_percent

    def get_images(self, obj):
        request = self.context.get('request')
        return [
            {
                'id': img.id,
                'image': request.build_absolute_uri(img.image.url) if request and img.image else img.image.url if img.image else None,
                'order': img.order,
            }
            for img in obj.images.all()
        ]


class GoimomiProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoimomiProductImage
        fields = ['id', 'product', 'image', 'order', 'created_at']


class GoimomiProductOrderSerializer(serializers.ModelSerializer):
    product_details = GoimomiProductSerializer(source='product', read_only=True)
    product_title = serializers.SerializerMethodField()

    class Meta:
        model = GoimomiProductOrder
        fields = "__all__"
        read_only_fields = ['stock_deducted_at']

    def get_product_title(self, obj):
        if obj.product:
            return obj.product.title
        if obj.cart_items:
            return ", ".join([item.get('title', '') for item in obj.cart_items if item.get('title')])
        return "N/A"


class LogisticsProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogisticsProvider
        fields = "__all__"


class SubCatalogueSerializer(serializers.ModelSerializer):
    catalogue_name = serializers.ReadOnlyField(source='catalogue.name')

    class Meta:
        model = SubCatalogue
        fields = "__all__"
        extra_kwargs = {
            'catalogue': {'required': False}
        }


class NestedSubCatalogueSerializer(SubCatalogueSerializer):
    id = serializers.IntegerField(required=False, min_value=1)

    class Meta(SubCatalogueSerializer.Meta):
        read_only_fields = ['catalogue']


class CatalogueMasterSerializer(serializers.ModelSerializer):
    sub_catalogues = NestedSubCatalogueSerializer(many=True, required=False)

    class Meta:
        model = CatalogueMaster
        fields = "__all__"

    def validate_sub_catalogues(self, items):
        ids = [item['id'] for item in items if 'id' in item]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError('A sub-catalogue may only be included once.')
        if ids:
            if self.instance is None or self.instance.sub_catalogues.filter(pk__in=ids).count() != len(ids):
                raise serializers.ValidationError('Sub-catalogue IDs must belong to this catalogue.')
        return items

    @transaction.atomic
    def create(self, validated_data):
        sub_catalogues_data = validated_data.pop('sub_catalogues', [])
        catalogue = CatalogueMaster.objects.create(**validated_data)
        for sub_data in sub_catalogues_data:
            SubCatalogue.objects.create(catalogue=catalogue, **sub_data)
        return catalogue

    @transaction.atomic
    def update(self, instance, validated_data):
        sub_catalogues_data = validated_data.pop('sub_catalogues', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if sub_catalogues_data is not None:
            for sub_data in sub_catalogues_data:
                sub_id = sub_data.pop('id', None)
                if sub_id:
                    sub_obj = SubCatalogue.objects.filter(id=sub_id, catalogue=instance).first()
                    if sub_obj:
                        for sub_attr, sub_val in sub_data.items():
                            setattr(sub_obj, sub_attr, sub_val)
                        sub_obj.save()
                    else:
                        raise serializers.ValidationError({'sub_catalogues': 'Sub-catalogue no longer exists.'})
                else:
                    SubCatalogue.objects.create(catalogue=instance, **sub_data)

        return instance


