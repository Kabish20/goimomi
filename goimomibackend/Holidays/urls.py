from rest_framework.routers import DefaultRouter, SimpleRouter
from django.urls import path, include
from django.conf import settings
from . import views

if settings.DEBUG:
    router = DefaultRouter()
else:
    router = SimpleRouter()

# Form & Enquiry Endpoints
router.register('global-horizons-srilanka', views.GlobalHorizonsProfileViewSet, basename='global-horizons-srilanka')

router.register("holidayform", views.HolidayEnquiryAPI, basename="holidayform")
router.register("holiday-form", views.HolidayEnquiryAPI, basename="holiday-enquiry")

router.register("umrahform", views.UmrahEnquiryAPI, basename="umrahform")
router.register("umrah-form", views.UmrahEnquiryAPI, basename="umrah-enquiry")

router.register("enquiryform", views.EnquiryAPI, basename="enquiryform")
router.register("enquiry-form", views.EnquiryAPI, basename="enquiry-form")

router.register("cantonenquiries", views.CantonEnquiryAPI, basename="cantonenquiries")
router.register("canton-enquiries", views.CantonEnquiryAPI, basename="canton-enquiry")

router.register("business-journey-registrations", views.BusinessJourneyRegistrationViewSet, basename="business-journey-registrations")
router.register("businessjourneyregistrations", views.BusinessJourneyRegistrationViewSet, basename="businessjourneyregistrations")
router.register("chithirai-registrations", views.BusinessJourneyRegistrationViewSet, basename="chithirai-registrations")
router.register("chithirairegistrations", views.BusinessJourneyRegistrationViewSet, basename="chithirairegistrations")
router.register("chithirai-enquiries", views.BusinessJourneyRegistrationViewSet, basename="chithirai-enquiries")
router.register("chithiraienquiries", views.BusinessJourneyRegistrationViewSet, basename="chithiraienquiries")

router.register("cruiseterminals", views.CruiseTerminalViewSet, basename="cruiseterminals")
router.register("cruise-terminals", views.CruiseTerminalViewSet, basename="cruise-terminal")

router.register("airports", views.AirportViewSet, basename="airport")

# Geography & Destinations
router.register("countries", views.CountryViewSet, basename="country")
router.register("nationalities", views.NationalityViewSet, basename="nationality")
router.register("regions", views.RegionViewSet, basename="region")
router.register("destinations", views.RegionViewSet, basename="destination")
router.register("cities", views.CityViewSet, basename="city")

# Packages & Masters
router.register("packages", views.HolidayPackageViewSet, basename="package")
router.register("itinerarymasters", views.ItineraryMasterViewSet, basename="itinerarymasters")
router.register("itinerary-masters", views.ItineraryMasterViewSet, basename="itinerary-master")

router.register("users", views.UserViewSet, basename="user")
router.register("visas", views.VisaViewSet, basename="visa")

router.register("visaapplications", views.VisaApplicationViewSet, basename="visaapplications")
router.register("visa-applications", views.VisaApplicationViewSet, basename="visa-application")

router.register("visaapplicants", views.VisaApplicantViewSet, basename="visaapplicants")
router.register("visa-applicants", views.VisaApplicantViewSet, basename="visa-applicant")

router.register("additionaldocuments", views.VisaAdditionalDocumentViewSet, basename="additionaldocuments")
router.register("additional-documents", views.VisaAdditionalDocumentViewSet, basename="additional-document")

router.register("suppliers", views.SupplierViewSet, basename="supplier")

router.register("cruisecalendar", views.CruiseCalendarViewSet, basename="cruisecalendar")
router.register("cruise-calendar", views.CruiseCalendarViewSet, basename="cruise-calendar")

router.register("hotelmasters", views.HotelMasterViewSet, basename="hotelmasters")
router.register("hotel-masters", views.HotelMasterViewSet, basename="hotel-master")

router.register("airlines", views.AirlineViewSet, basename="airline")

router.register("sightseeingmasters", views.SightseeingMasterViewSet, basename="sightseeingmasters")
router.register("sightseeing-masters", views.SightseeingMasterViewSet, basename="sightseeing-master")

router.register("mealmasters", views.MealMasterViewSet, basename="mealmasters")
router.register("meal-masters", views.MealMasterViewSet, basename="meal-master")

router.register("vehiclebrands", views.VehicleBrandViewSet, basename="vehiclebrands")
router.register("vehicle-brands", views.VehicleBrandViewSet, basename="vehiclebrand")

router.register("accommodations", views.AccommodationViewSet, basename="accommodation")

router.register("roomtypes", views.RoomTypeViewSet, basename="roomtypes")
router.register("room-types", views.RoomTypeViewSet, basename="room-type")

router.register("vehiclemasters", views.VehicleMasterViewSet, basename="vehiclemasters")
router.register("vehicle-masters", views.VehicleMasterViewSet, basename="vehicle-master")

router.register("drivermasters", views.DriverMasterViewSet, basename="drivermasters")
router.register("driver-masters", views.DriverMasterViewSet, basename="driver-master")

router.register("vehicleratecards", views.VehicleRateCardViewSet, basename="vehicleratecards")
router.register("vehicle-rate-cards", views.VehicleRateCardViewSet, basename="vehicle-rate-card")

router.register("pickuppointmasters", views.PickupPointMasterViewSet, basename="pickuppointmasters")
router.register("pickup-point-masters", views.PickupPointMasterViewSet, basename="pickup-point-master")

router.register("cabbookings", views.CabBookingViewSet, basename="cabbookings")
router.register("cab-bookings", views.CabBookingViewSet, basename="cab-booking")

router.register("cabadditionaldocuments", views.CabAdditionalDocumentViewSet, basename="cabadditionaldocuments")
router.register("cab-additional-documents", views.CabAdditionalDocumentViewSet, basename="cab-additional-document")

router.register("goimomiproducts", views.GoimomiProductViewSet, basename="goimomiproducts")
router.register("goimomi-products", views.GoimomiProductViewSet, basename="goimomi-product")

router.register("goimomiproductorders", views.GoimomiProductOrderViewSet, basename="goimomiproductorders")
router.register("goimomi-product-orders", views.GoimomiProductOrderViewSet, basename="goimomi-product-order")

router.register("logisticsproviders", views.LogisticsProviderViewSet, basename="logisticsproviders")
router.register("logistics-providers", views.LogisticsProviderViewSet, basename="logistics-provider")

router.register("packagebookings", views.PackageBookingViewSet, basename="packagebookings")
router.register("package-bookings", views.PackageBookingViewSet, basename="package-booking")

router.register("cataloguemasters", views.CatalogueMasterViewSet, basename="cataloguemaster")
router.register("cataloguemaster", views.CatalogueMasterViewSet, basename="cataloguemaster-single")
router.register("catalogue-masters", views.CatalogueMasterViewSet, basename="catalogue-master")

router.register("subcatalogues", views.SubCatalogueViewSet, basename="subcatalogue")
router.register("subcatalogue", views.SubCatalogueViewSet, basename="subcatalogue-single")
router.register("sub-catalogues", views.SubCatalogueViewSet, basename="sub-catalogue")


urlpatterns = [
    path('', include(router.urls)),
    path('adminlogin/', views.AdminLoginView.as_view(), name='adminlogin'),
    path('admin-login/', views.AdminLoginView.as_view(), name='admin-login'),

    path('dashboardstats/', views.DashboardStatsAPI.as_view(), name='dashboardstats'),
    path('dashboard-stats/', views.DashboardStatsAPI.as_view(), name='dashboard-stats'),

    path('sendvisadetails/', views.SendVisaDetailsAPI.as_view(), name='sendvisadetails'),
    path('send-visa-details/', views.SendVisaDetailsAPI.as_view(), name='send-visa-details'),

    path('sendvisawhatsapp/', views.SendVisaWhatsAppAPI.as_view(), name='sendvisawhatsapp'),
    path('send-visa-whatsapp/', views.SendVisaWhatsAppAPI.as_view(), name='send-visa-whatsapp'),

    path('cabsearch/', views.CabSearchAPI.as_view(), name='cabsearch'),
    path('cab-search/', views.CabSearchAPI.as_view(), name='cab-search'),

    path('destinationhierarchy/', views.DestinationHierarchyAPI.as_view(), name='destinationhierarchy'),
    path('destination-hierarchy/', views.DestinationHierarchyAPI.as_view(), name='destination-hierarchy'),

    path('zoho/crm-webhook/', views.zoho_crm_webhook, name='zoho-crm-webhook'),
    path('zoho/webhook/', views.zoho_crm_webhook, name='zoho-webhook'),
    path('zoho-crm-webhook/', views.zoho_crm_webhook, name='zoho-crm-webhook-alt'),
    path('zoho-webhook/', views.zoho_crm_webhook, name='zoho-webhook-alt'),
    path('zoho/lead-webhook/', views.zoho_lead_submission_webhook, name='zoho-lead-submission-webhook'),
    path('leads/submit/', views.zoho_lead_submission_webhook, name='leads-submit-webhook'),

    path('share/<path:path>/', views.DynamicSEOView.as_view(), name='dynamic-seo-share'),
]


