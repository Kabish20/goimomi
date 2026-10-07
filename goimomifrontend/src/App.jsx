import React, { useState, useEffect, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { lazyRetry } from './utils/lazyRetry'

import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import ScrollToTop from './components/common/ScrollToTop.jsx'
import ComingSoon from './components/common/ComingSoon.jsx'
import EnquiryForm from './components/forms/EnquiryForm.jsx'

// Lazy Load Pages
const Home = lazyRetry(() => import('./pages/General/Home/Home.jsx'));
const About = lazyRetry(() => import('./pages/General/Aboutus/Aboutus.jsx'));
const Contact = lazyRetry(() => import('./pages/General/Contactus/Contactus.jsx'));
const ContactSuccess = lazyRetry(() => import('./pages/General/ContactSuccess/ContactSuccess.jsx'));
const PaymentFailed = lazyRetry(() => import('./pages/General/PaymentFailed/PaymentFailed.jsx'));
const PaymentCheckout = lazyRetry(() => import('./pages/General/PaymentCheckout/PaymentCheckout.jsx'));
const CustomizedHolidays = lazyRetry(() => import('./pages/Holidays/CustomizedHolidays/CustomizedHolidays.jsx'));
const CustomizedUmrah = lazyRetry(() => import('./pages/Umrah/CustomizedUmrah/CustomizedUmrah.jsx'));
const Holidays = lazyRetry(() => import('./pages/Holidays/Holidays/Holidays.jsx'));
const TrendingDomestic = lazyRetry(() => import('./pages/Holidays/TrendingDestinations/TrendingDomestic.jsx'));
const TrendingInternational = lazyRetry(() => import('./pages/Holidays/TrendingDestinations/TrendingInternational.jsx'));
const Kashmir = lazyRetry(() => import('./pages/Holidays/Kashmir/Kashmir.jsx'));
const Manali = lazyRetry(() => import('./pages/Holidays/Manali/Manali.jsx'));
const Sikkim = lazyRetry(() => import('./pages/Holidays/Sikkim/Sikkim.jsx'));
const Goa = lazyRetry(() => import('./pages/Holidays/Goa/Goa.jsx'));
const Kerala = lazyRetry(() => import('./pages/Holidays/Kerala/Kerala.jsx'));
const Bali = lazyRetry(() => import('./pages/Holidays/Bali/Bali.jsx'));
const Thailand = lazyRetry(() => import('./pages/Holidays/Thailand/Thailand.jsx'));
const Dubai = lazyRetry(() => import('./pages/Holidays/Dubai/Dubai.jsx'));
const Azerbaijan = lazyRetry(() => import('./pages/Holidays/Azerbaijan/azerbaijan.jsx'));
const Andaman = lazyRetry(() => import('./pages/Holidays/Andaman/andaman.jsx'));
const GoldenTriangle = lazyRetry(() => import('./pages/Holidays/GoldenTriangle/GoldenTriangle.jsx'));
const PlanTrip = lazyRetry(() => import('./pages/Holidays/Holidaysform/Holidaysform.jsx'));
const Cab = lazyRetry(() => import('./pages/Services/Cab/Cab.jsx'));
const Flights = lazyRetry(() => import('./pages/Services/Flights.jsx'));
const FlightResults = lazyRetry(() => import('./pages/Services/FlightResults.jsx'));
const FlightReview = lazyRetry(() => import('./pages/Services/FlightReview.jsx'));
const Cruise = lazyRetry(() => import('./pages/Services/Cruise/Cruise.jsx'));
const Hotel = lazyRetry(() => import('./pages/Services/Hotel/Hotel.jsx'));
const HotelReview = lazyRetry(() => import('./pages/Services/Hotel/HotelReview.jsx'));
const VisaSearch = lazyRetry(() => import('./pages/Visa/VisaSearch/VisaSearch.jsx'));
const VisaResults = lazyRetry(() => import('./pages/Visa/VisaResults/VisaResults.jsx'));
const VisaApplication = lazyRetry(() => import('./pages/Visa/VisaApplication/VisaApplication.jsx'));
const VisaRateCardB2B = lazyRetry(() => import('./pages/Visa/VisaRateCardB2B/VisaRateCardB2B.jsx'));
const UmrahGroupTicketB2B = lazyRetry(() => import('./pages/Umrah/UmrahGroupTicketB2B/UmrahGroupTicketB2B.jsx'));
const Europeantours = lazyRetry(() => import('./pages/Holidays/Europeantours/Europeantours.jsx'));
const PrivacyPolicy = lazyRetry(() => import('./pages/Policies/PrivacyPolicy/PrivacyPolicy.jsx'));
const TermsConditions = lazyRetry(() => import('./pages/Policies/TermsConditions/TermsConditions.jsx'));
const CancellationPolicy = lazyRetry(() => import('./pages/Policies/CancellationPolicy/CancellationPolicy.jsx'));
const HolidayDetails = lazyRetry(() => import("./pages/Holidays/HolidayDetails/HolidayDetails.jsx"));
const Canton = lazyRetry(() => import("./pages/Business/Canton/Canton.jsx"));
const MegaShowBangkok = lazyRetry(() => import("./pages/Business/MegaShowBangkok/MegaShowBangkok.jsx"));
const ChithiraiGlobal = lazyRetry(() => import("./pages/Business/ChithiraiGlobal.jsx"));
const SriLankaJourney = lazyRetry(() => import("./pages/Business/SriLanka.jsx"));
const GlobalHorizonsSrilanka = lazyRetry(() => import('./pages/Business/GlobalHorizonsSrilanka.jsx'));
const GlobalHorizonsManage = lazyRetry(() => import('./pages/admin/GlobalHorizonsManage/GlobalHorizonsManage.jsx'));
const YelagiriJourney = lazyRetry(() => import("./pages/Business/Yelagiri.jsx"));
const PondicherryJourney = lazyRetry(() => import("./pages/Business/Pondicherry.jsx"));
const DubaiJourney = lazyRetry(() => import("./pages/Business/Dubai.jsx"));
const HolidayHome = lazyRetry(() => import("./pages/Holidays/HolidayHome/HolidayHome.jsx"));
const PackageEnquiryPage = lazyRetry(() => import("./pages/Holidays/PackageEnquiryPage/PackageEnquiryPage.jsx"));
const BusinessHome = lazyRetry(() => import("./pages/Business/BusinessHome/BusinessHome.jsx"));
const Blog = lazyRetry(() => import("./pages/General/Blog/Blog.jsx"));
const GoimomiProduct = lazyRetry(() => import("./pages/General/GoimomiProduct/GoimomiProduct.jsx"));
const TravelBot = lazyRetry(() => import("./pages/Services/TravelBot/TravelBot.jsx"));

// Admin Pages
const AdminDashboard = lazyRetry(() => import("./pages/admin/AdminDashboard/AdminDashboard.jsx"));
const HolidayPackageAdd = lazyRetry(() => import("./pages/admin/HolidayPackageAdd/HolidayPackageAdd.jsx"));
const HolidayPackageEdit = lazyRetry(() => import("./pages/admin/HolidayPackageEdit/HolidayPackageEdit.jsx"));
const HolidayPackageManage = lazyRetry(() => import("./pages/admin/HolidayPackageManage/HolidayPackageManage.jsx"));
const EnquiryManage = lazyRetry(() => import("./pages/admin/EnquiryManage/EnquiryManage.jsx"));
const HolidayEnquiryManage = lazyRetry(() => import("./pages/admin/HolidayEnquiryManage/HolidayEnquiryManage.jsx"));
const HolidayEnquiryAdd = lazyRetry(() => import("./pages/admin/HolidayEnquiryAdd/HolidayEnquiryAdd.jsx"));
const UmrahEnquiryAdd = lazyRetry(() => import("./pages/admin/UmrahEnquiryAdd/UmrahEnquiryAdd.jsx"));
const UmrahEnquiryManage = lazyRetry(() => import("./pages/admin/UmrahEnquiryManage/UmrahEnquiryManage.jsx"));
const ItineraryMasterManage = lazyRetry(() => import("./pages/admin/ItineraryMasterManage/ItineraryMasterManage.jsx"));
const ItineraryMasterEdit = lazyRetry(() => import("./pages/admin/ItineraryMasterEdit/ItineraryMasterEdit.jsx"));
const ItineraryMasterAdd = lazyRetry(() => import("./pages/admin/ItineraryMasterAdd/ItineraryMasterAdd.jsx"));
const SightseeingMasterManage = lazyRetry(() => import("./pages/admin/SightseeingMasterManage/SightseeingMasterManage.jsx"));
const SightseeingMasterAdd = lazyRetry(() => import("./pages/admin/SightseeingMasterAdd/SightseeingMasterAdd.jsx"));
const SightseeingMasterEdit = lazyRetry(() => import("./pages/admin/SightseeingMasterEdit/SightseeingMasterEdit.jsx"));
const UsersList = lazyRetry(() => import("./pages/admin/UsersList/UsersList.jsx"));
const UserAdd = lazyRetry(() => import("./pages/admin/UserAdd/UserAdd.jsx"));
const UserEdit = lazyRetry(() => import("./pages/admin/UserEdit/UserEdit.jsx"));
const AdminVisaManage = lazyRetry(() => import("./pages/admin/AdminVisaManage/AdminVisaManage.jsx"));
const AdminVisaAdd = lazyRetry(() => import("./pages/admin/AdminVisaAdd/AdminVisaAdd.jsx"));
const AdminVisaEdit = lazyRetry(() => import("./pages/admin/AdminVisaEdit/AdminVisaEdit.jsx"));
const VisaApplicationManage = lazyRetry(() => import("./pages/admin/VisaApplicationManage/VisaApplicationManage.jsx"));
const VisaApplicationEdit = lazyRetry(() => import("./pages/admin/VisaApplicationEdit/VisaApplicationEdit.jsx"));
const CantonEnquiryManage = lazyRetry(() => import("./pages/admin/CantonEnquiryManage/CantonEnquiryManage.jsx"));
const BusinessJourneyRegistrationManage = lazyRetry(() => import("./pages/admin/BusinessJourneyRegistrationManage/BusinessJourneyRegistrationManage.jsx"));
const CabEnquiryManage = lazyRetry(() => import("./pages/admin/CabEnquiryManage/CabEnquiryManage.jsx"));
const CabBookingManage = lazyRetry(() => import("./pages/admin/CabBookingManage/CabBookingManage.jsx"));
const CruiseEnquiryManage = lazyRetry(() => import("./pages/admin/CruiseEnquiryManage/CruiseEnquiryManage.jsx"));
const HotelEnquiryManage = lazyRetry(() => import("./pages/admin/HotelEnquiryManage/HotelEnquiryManage.jsx"));
const GeneralEnquiryManage = lazyRetry(() => import("./pages/admin/GeneralEnquiryManage/GeneralEnquiryManage.jsx"));
const SupplierManage = lazyRetry(() => import("./pages/admin/SupplierManage/SupplierManage.jsx"));
const SupplierAdd = lazyRetry(() => import("./pages/admin/SupplierAdd/SupplierAdd.jsx"));
const SupplierEdit = lazyRetry(() => import("./pages/admin/SupplierEdit/SupplierEdit.jsx"));
const CruiseCalendarManage = lazyRetry(() => import("./pages/admin/CruiseCalendarManage/CruiseCalendarManage.jsx"));
const CruiseCalendarAdd = lazyRetry(() => import("./pages/admin/CruiseCalendarAdd/CruiseCalendarAdd.jsx"));
const CruiseCalendarEdit = lazyRetry(() => import("./pages/admin/CruiseCalendarEdit/CruiseCalendarEdit.jsx"));
const AccommodationManage = lazyRetry(() => import("./pages/admin/AccommodationManage/AccommodationManage.jsx"));
const AccommodationAdd = lazyRetry(() => import("./pages/admin/AccommodationAdd/AccommodationAdd.jsx"));
const AccommodationEdit = lazyRetry(() => import("./pages/admin/AccommodationEdit/AccommodationEdit.jsx"));
const VehicleMasterManage = lazyRetry(() => import("./pages/admin/VehicleMasterManage/VehicleMasterManage.jsx"));
const VehicleMasterAdd = lazyRetry(() => import("./pages/admin/VehicleMasterAdd/VehicleMasterAdd.jsx"));
const VehicleMasterEdit = lazyRetry(() => import("./pages/admin/VehicleMasterEdit/VehicleMasterEdit.jsx"));
const DriverMasterManage = lazyRetry(() => import("./pages/admin/DriverMasterManage/DriverMasterManage.jsx"));
const DriverMasterAdd = lazyRetry(() => import("./pages/admin/DriverMasterAdd/DriverMasterAdd.jsx"));
const DriverMasterEdit = lazyRetry(() => import("./pages/admin/DriverMasterEdit/DriverMasterEdit.jsx"));
const VehicleRateCardManage = lazyRetry(() => import("./pages/admin/VehicleRateCardManage/VehicleRateCardManage.jsx"));
const VehicleRateCardAdd = lazyRetry(() => import("./pages/admin/VehicleRateCardAdd/VehicleRateCardAdd.jsx"));
const VehicleRateCardEdit = lazyRetry(() => import("./pages/admin/VehicleRateCardEdit/VehicleRateCardEdit.jsx"));
const PickupPointManage = lazyRetry(() => import("./pages/admin/PickupPointManage/PickupPointManage.jsx"));
const CountryManagement = lazyRetry(() => import("./pages/admin/CountryManagement/CountryManagement.jsx"));
const CountryAdd = lazyRetry(() => import("./pages/admin/CountryAdd/CountryAdd.jsx"));
const CountryEdit = lazyRetry(() => import("./pages/admin/CountryEdit/CountryEdit.jsx"));
const NationalityManage = lazyRetry(() => import("./pages/admin/NationalityManage/NationalityManage.jsx"));
const NationalityAdd = lazyRetry(() => import("./pages/admin/NationalityAdd/NationalityAdd.jsx"));
const NationalityEdit = lazyRetry(() => import("./pages/admin/NationalityEdit/NationalityEdit.jsx"));
const RegionManage = lazyRetry(() => import("./pages/admin/RegionManage/RegionManage.jsx"));
const RegionAdd = lazyRetry(() => import("./pages/admin/RegionAdd/RegionAdd.jsx"));
const RegionEdit = lazyRetry(() => import("./pages/admin/RegionEdit/RegionEdit.jsx"));
const CityManage = lazyRetry(() => import("./pages/admin/CityManage/CityManage.jsx"));
const CityAdd = lazyRetry(() => import("./pages/admin/CityAdd/CityAdd.jsx"));
const CityEdit = lazyRetry(() => import("./pages/admin/CityEdit/CityEdit.jsx"));
const AirportManage = lazyRetry(() => import("./pages/admin/AirportManage/AirportManage.jsx"));
const CruiseTerminalManage = lazyRetry(() => import("./pages/admin/CruiseTerminalManage/CruiseTerminalManage.jsx"));
const ProductManage = lazyRetry(() => import("./pages/admin/ProductManage/ProductManage.jsx"));
const ProductAdd    = lazyRetry(() => import("./pages/admin/ProductAdd/ProductAdd.jsx"));
const ProductEdit   = lazyRetry(() => import("./pages/admin/ProductEdit/ProductEdit.jsx"));
const LogisticsProviderManage = lazyRetry(() => import("./pages/admin/LogisticsProviderManage/LogisticsProviderManage.jsx"));
const CatalogueMasterManage = lazyRetry(() => import("./pages/admin/CatalogueMasterManage/CatalogueMasterManage.jsx"));



import AdminLogin from "./pages/General/AdminLogin/AdminLogin.jsx";
import ProtectedRoute from "./components/admin/ProtectedRoute/ProtectedRoute";

import ErrorBoundary from './components/common/ErrorBoundary.jsx'

// Loading component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[75vh] gap-4 animate-fadeIn">
    <div className="relative flex items-center justify-center">
      <div className="w-14 h-14 border-4 border-emerald-200 border-t-[#14532d] rounded-full animate-spin"></div>
      <div className="absolute w-8 h-8 bg-[#14532d]/10 rounded-full animate-ping"></div>
    </div>
    <span className="text-xs uppercase tracking-widest font-black text-[#14532d] animate-pulse">Loading Goimomi...</span>
  </div>
);

const App = () => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const isProfileFormPath = ['/globalhorizonssrilanka', '/global-horizons-srilanka'].includes(location.pathname.replace(/\/$/, ''));
  const isDestinationLandingPath = /^\/(kashmir|manali|azerbaijan|sikkim|andaman|goa|kerala|bali|dubai|golden-triangle|goldentriangle|delhi-agra-jaipur|trendingdomesticdestination|trendinginternationaldestination)\/?$/i.test(location.pathname);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);

  useEffect(() => {
    // Only show if not on admin path and hasn't been shown before
    if (!isAdminPath && !isDestinationLandingPath && !isProfileFormPath) {
      const hasShown = sessionStorage.getItem("generalEnquiryShown");
      if (!hasShown) {
        const timer = setTimeout(() => {
          setIsEnquiryOpen(true);
          sessionStorage.setItem("generalEnquiryShown", "true");
        }, 3000); // Open after 3 seconds
        return () => clearTimeout(timer);
      }
    }
  }, [isAdminPath, isDestinationLandingPath, isProfileFormPath]);

  // Global IntersectionObserver for .fade-up animations
  useEffect(() => {
    // Safety check for environments without IntersectionObserver (or before hydration / during testing)
    if (typeof window !== 'undefined' && !window.IntersectionObserver) {
      document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const handleIntersect = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    const setupElement = (el) => {
      try {
        if (el && el.classList && typeof el.classList.contains === 'function' && !el.classList.contains('visible')) {
          const delay = el.style?.animationDelay || el.style?.transitionDelay;
          if (delay) {
            el.style.setProperty('--delay', delay);
          }
          observer.observe(el);
        }
      } catch (e) {
        // Safe catch
      }
    };

    const observeSubtree = (container) => {
      try {
        if (!container || container.nodeType !== 1) return;
        if (container.classList && typeof container.classList.contains === 'function' && container.classList.contains('fade-up')) {
          setupElement(container);
        }
        if (container.querySelectorAll) {
          const elements = container.querySelectorAll('.fade-up:not(.visible)');
          elements.forEach(setupElement);
        }
      } catch (e) {
        // Safe catch
      }
    };

    // Initial run on mount
    if (document && document.body) {
      observeSubtree(document.body);
    }

    // Dynamic subtree monitoring (highly optimized - runs querySelector only on new nodes)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              observeSubtree(node);
            }
          });
        }
      });
    });

    if (document && document.body) {
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [location.pathname]);

  return (
    <div className={`flex flex-col ${isAdminPath ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <ScrollToTop />

      {!isAdminPath && <Navbar />}

      <main className={`flex-1 ${isAdminPath ? 'flex flex-col min-h-0 overflow-hidden' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/canton" element={<Canton />} />
              <Route path="/megashowbangkok" element={<MegaShowBangkok />} />
              <Route path="/chithirai-global" element={<ChithiraiGlobal />} />
              <Route path="/chithirai-global/sri-lanka" element={<SriLankaJourney />} />
              <Route path="/globalhorizonssrilanka" element={<GlobalHorizonsSrilanka />} />
              <Route path="/global-horizons-srilanka" element={<Navigate to="/globalhorizonssrilanka" replace />} />
              <Route path="/chithirai-global/yelagiri" element={<YelagiriJourney />} />
              <Route path="/chithirai-global/pondicherry" element={<PondicherryJourney />} />
              <Route path="/chithirai-global/dubai" element={<DubaiJourney />} />
              <Route path="/" element={<Home />} />
            <Route path="/aboutus" element={<About />} />
            <Route path="/contactus" element={<Contact />} />
            <Route path="/contact/success" element={<ContactSuccess />} />
            <Route path="/payment-failed" element={<PaymentFailed />} />
            <Route path="/payment/failed" element={<PaymentFailed />} />
            <Route path="/payment-checkout" element={<PaymentCheckout />} />
            <Route path="/payment/checkout" element={<PaymentCheckout />} />
            <Route path="/holidayhome" element={<HolidayHome />} />
            <Route path="/businesshome" element={<BusinessHome />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/holidays" element={<Holidays />} />
            <Route path="/trendingdomesticdestination" element={<TrendingDomestic />} />
            <Route path="/trendinginternationaldestination" element={<TrendingInternational />} />
            <Route path="/kashmir" element={<Kashmir />} />
            <Route path="/manali" element={<Manali />} />
            <Route path="/sikkim" element={<Sikkim />} />
            <Route path="/goa" element={<Goa />} />
            <Route path="/kerala" element={<Kerala />} />
            <Route path="/bali" element={<Bali />} />
            <Route path="/thailand" element={<Thailand />} />
            <Route path="/dubai" element={<Dubai />} />
            <Route path="/azerbaijan" element={<Azerbaijan />} />
            <Route path="/andaman" element={<Andaman />} />
            <Route path="/golden-triangle" element={<GoldenTriangle />} />
            <Route path="/goldentriangle" element={<Navigate to="/golden-triangle" replace />} />
            <Route path="/delhi-agra-jaipur" element={<Navigate to="/golden-triangle" replace />} />

            <Route path="/customizedHolidays" element={<CustomizedHolidays />} />
            <Route
              path="/umrah-package"
              element={
                <ComingSoon
                  title="Umrah Packages"
                  description="We are curating special Umrah packages for you. Stay tuned for the launch!"
                />
              }
            />
            <Route path="/customizedumrah" element={<CustomizedUmrah />} />
            <Route path="/form" element={<PlanTrip isOpen={true} onClose={() => window.history.back()} />} />
            <Route path="/cab" element={<Cab />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/flights/results" element={<FlightResults />} />
            <Route path="/flights/review" element={<FlightReview />} />
            <Route path="/cruise" element={<Cruise />} />
            <Route path="/travel-agent" element={<TravelBot />} />

            <Route path="/hotel" element={<Hotel />} />
            <Route path="/hotel/results" element={<Hotel />} />
            <Route path="/hotel/review" element={<HotelReview />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsConditions />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />
            <Route path="/holiday/:id" element={<HolidayDetails />} />

            <Route path="/enquiry" element={<PackageEnquiryPage />} />
            <Route path="/visa" element={<VisaSearch />} />
            <Route path="/visa/results" element={<VisaResults />} />
            <Route path="/visa/apply/:id" element={<VisaApplication />} />
            <Route path="/visaratecardb2b" element={<VisaRateCardB2B />} />
            <Route path="/visa-rate-card-b2b" element={<Navigate to="/visaratecardb2b" replace />} />
            <Route path="/visaratecard-b2b" element={<Navigate to="/visaratecardb2b" replace />} />
            <Route path="/visaratecard" element={<Navigate to="/visaratecardb2b" replace />} />
            <Route path="/visa/ratecard" element={<Navigate to="/visaratecardb2b" replace />} />
            <Route path="/visa/b2b" element={<Navigate to="/visaratecardb2b" replace />} />
            <Route path="/umrahgroupticketb2b" element={<UmrahGroupTicketB2B />} />
            <Route path="/umrah-group-ticket-b2b" element={<Navigate to="/umrahgroupticketb2b" replace />} />
            <Route path="/umrahgroupticket" element={<Navigate to="/umrahgroupticketb2b" replace />} />
            <Route path="/umrah-group-ticket" element={<Navigate to="/umrahgroupticketb2b" replace />} />
            <Route path="/umrah/groupticket" element={<Navigate to="/umrahgroupticketb2b" replace />} />
            <Route path="/umrah/b2b" element={<Navigate to="/umrahgroupticketb2b" replace />} />
            <Route path="/Europeantours" element={<Europeantours />} />
            <Route path="/shop" element={<GoimomiProduct />} />
            <Route path="/goimomi-product" element={<GoimomiProduct />} />




            {/* Admin Entry URLs */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/packages/add" element={<HolidayPackageAdd />} />
              <Route path="/admin/packages/edit/:id" element={<HolidayPackageEdit />} />
              <Route path="/admin/packages" element={<HolidayPackageManage />} />
              <Route path="/admin/holidays" element={<HolidayPackageManage />} />
              <Route path="/admin/enquiries" element={<EnquiryManage />} />
              <Route path="/admin/holiday-enquiries/add" element={<HolidayEnquiryAdd />} />
              <Route path="/admin/holiday-enquiries" element={<HolidayEnquiryManage />} />
              <Route path="/admin/holidayenquiries/add" element={<HolidayEnquiryAdd />} />
              <Route path="/admin/holidayenquiries" element={<HolidayEnquiryManage />} />

              <Route path="/admin/umrah-enquiries/add" element={<UmrahEnquiryAdd />} />
              <Route path="/admin/umrah-enquiries" element={<UmrahEnquiryManage />} />
              <Route path="/admin/umrahenquiries/add" element={<UmrahEnquiryAdd />} />
              <Route path="/admin/umrahenquiries" element={<UmrahEnquiryManage />} />

              <Route path="/admin/itinerary-masters" element={<ItineraryMasterManage />} />
              <Route path="/admin/itinerary-masters/add" element={<ItineraryMasterAdd />} />
              <Route path="/admin/itinerary-masters/edit/:id" element={<ItineraryMasterEdit />} />
              <Route path="/admin/itinerarymasters" element={<ItineraryMasterManage />} />
              <Route path="/admin/itinerarymasters/add" element={<ItineraryMasterAdd />} />
              <Route path="/admin/itinerarymasters/edit/:id" element={<ItineraryMasterEdit />} />

              <Route path="/admin/sightseeing-masters" element={<SightseeingMasterManage />} />
              <Route path="/admin/sightseeing-masters/add" element={<SightseeingMasterAdd />} />
              <Route path="/admin/sightseeing-masters/edit/:id" element={<SightseeingMasterEdit />} />
                            <Route path="/admin/sightseeingmasters" element={<SightseeingMasterManage />} />
              <Route path="/admin/sightseeingmasters/add" element={<SightseeingMasterAdd />} />
              <Route path="/admin/sightseeingmasters/edit/:id" element={<SightseeingMasterEdit />} />

              <Route path="/admin/users" element={<UsersList />} />
              <Route path="/admin/users/add" element={<UserAdd />} />
              <Route path="/admin/users/edit/:id" element={<UserEdit />} />

              <Route path="/admin/visas" element={<AdminVisaManage />} />
              <Route path="/admin/visas/add" element={<AdminVisaAdd />} />
              <Route path="/admin/visas/edit/:id" element={<AdminVisaEdit />} />

              <Route path="/admin/visa-applications" element={<VisaApplicationManage />} />
              <Route path="/admin/visa-applications/edit/:id" element={<VisaApplicationEdit />} />
              <Route path="/admin/visaapplications" element={<VisaApplicationManage />} />
              <Route path="/admin/visaapplications/edit/:id" element={<VisaApplicationEdit />} />

              <Route path="/admin/cab-enquiries" element={<CabEnquiryManage />} />
              <Route path="/admin/cab-bookings" element={<CabBookingManage />} />
              <Route path="/admin/cabenquiries" element={<CabEnquiryManage />} />
              <Route path="/admin/cabbookings" element={<CabBookingManage />} />

              <Route path="/admin/canton-enquiries" element={<CantonEnquiryManage />} />
              <Route path="/admin/cantonenquiries" element={<CantonEnquiryManage />} />

              <Route path="/admin/business-journey-registrations" element={<BusinessJourneyRegistrationManage />} />
              <Route path="/admin/global-horizons-srilanka" element={<GlobalHorizonsManage />} />
              <Route path="/admin/businessjourneyregistrations" element={<BusinessJourneyRegistrationManage />} />
              <Route path="/admin/chithirai-registrations" element={<BusinessJourneyRegistrationManage />} />
              <Route path="/admin/chithirairegistrations" element={<BusinessJourneyRegistrationManage />} />
              <Route path="/admin/chithirai-enquiries" element={<BusinessJourneyRegistrationManage />} />
              <Route path="/admin/chithiraienquiries" element={<BusinessJourneyRegistrationManage />} />

              <Route path="/admin/cruise-enquiries" element={<CruiseEnquiryManage />} />
              <Route path="/admin/cruiseenquiries" element={<CruiseEnquiryManage />} />

              <Route path="/admin/hotel-enquiries" element={<HotelEnquiryManage />} />
              <Route path="/admin/hotelenquiries" element={<HotelEnquiryManage />} />

              <Route path="/admin/general-enquiries" element={<GeneralEnquiryManage />} />
              <Route path="/admin/generalenquiries" element={<GeneralEnquiryManage />} />

              <Route path="/admin/suppliers" element={<SupplierManage />} />
              <Route path="/admin/suppliers/add" element={<SupplierAdd />} />
              <Route path="/admin/suppliers/edit/:id" element={<SupplierEdit />} />

              <Route path="/admin/cruise-calendar" element={<CruiseCalendarManage />} />
              <Route path="/admin/cruise-calendar/add" element={<CruiseCalendarAdd />} />
              <Route path="/admin/cruise-calendar/edit/:id" element={<CruiseCalendarEdit />} />
              <Route path="/admin/cruisecalendar" element={<CruiseCalendarManage />} />
              <Route path="/admin/cruisecalendar/add" element={<CruiseCalendarAdd />} />
              <Route path="/admin/cruisecalendar/edit/:id" element={<CruiseCalendarEdit />} />

              <Route path="/admin/accommodations" element={<AccommodationManage />} />
              <Route path="/admin/accommodations/add" element={<AccommodationAdd />} />
              <Route path="/admin/accommodations/edit/:id" element={<AccommodationEdit />} />

              <Route path="/admin/vehicle-masters" element={<VehicleMasterManage />} />
              <Route path="/admin/vehicle-masters/add" element={<VehicleMasterAdd />} />
              <Route path="/admin/vehicle-masters/edit/:id" element={<VehicleMasterEdit />} />
              <Route path="/admin/vehiclemasters" element={<VehicleMasterManage />} />
              <Route path="/admin/vehiclemasters/add" element={<VehicleMasterAdd />} />
              <Route path="/admin/vehiclemasters/edit/:id" element={<VehicleMasterEdit />} />

              <Route path="/admin/driver-masters" element={<DriverMasterManage />} />
              <Route path="/admin/driver-masters/add" element={<DriverMasterAdd />} />
              <Route path="/admin/driver-masters/edit/:id" element={<DriverMasterEdit />} />
              <Route path="/admin/drivermasters" element={<DriverMasterManage />} />
              <Route path="/admin/drivermasters/add" element={<DriverMasterAdd />} />
              <Route path="/admin/drivermasters/edit/:id" element={<DriverMasterEdit />} />

              <Route path="/admin/vehicle-rate-cards" element={<VehicleRateCardManage />} />
              <Route path="/admin/vehicle-rate-cards/add" element={<VehicleRateCardAdd />} />
              <Route path="/admin/vehicle-rate-cards/edit/:id" element={<VehicleRateCardEdit />} />
              <Route path="/admin/vehicleratecards" element={<VehicleRateCardManage />} />
              <Route path="/admin/vehicleratecards/add" element={<VehicleRateCardAdd />} />
              <Route path="/admin/vehicleratecards/edit/:id" element={<VehicleRateCardEdit />} />

              <Route path="/admin/pickup-point-masters" element={<PickupPointManage />} />
              <Route path="/admin/pickuppointmasters" element={<PickupPointManage />} />

              {/* Management Country Routes */}
              <Route path="/admin/management-country" element={<CountryManagement />} />
              <Route path="/admin/managementcountry" element={<CountryManagement />} />
              <Route path="/admin/management-country/countries/add" element={<CountryAdd />} />
              <Route path="/admin/management-country/countries/edit/:id" element={<CountryEdit />} />

              <Route path="/admin/management-country/nationalities" element={<NationalityManage />} />
              <Route path="/admin/management-country/nationalities/add" element={<NationalityAdd />} />
              <Route path="/admin/management-country/nationalities/edit/:id" element={<NationalityEdit />} />

              <Route path="/admin/management-country/regions" element={<RegionManage />} />
              <Route path="/admin/management-country/regions/add" element={<RegionAdd />} />
              <Route path="/admin/management-country/regions/edit/:id" element={<RegionEdit />} />

              <Route path="/admin/management-country/cities" element={<CityManage />} />
              <Route path="/admin/management-country/cities/add" element={<CityAdd />} />
              <Route path="/admin/management-country/cities/edit/:id" element={<CityEdit />} />

              <Route path="/admin/management-country/airports" element={<AirportManage />} />
              <Route path="/admin/management-country/pickup-points" element={<PickupPointManage />} />
              <Route path="/admin/management-country/cruise-terminals" element={<CruiseTerminalManage />} />
              <Route path="/admin/products" element={<ProductManage />} />
              <Route path="/admin/products/add" element={<ProductAdd />} />
              <Route path="/admin/products/edit/:id" element={<ProductEdit />} />
              <Route path="/admin/logisticsmaster" element={<LogisticsProviderManage />} />
              <Route path="/admin/logistics-master" element={<LogisticsProviderManage />} />
              <Route path="/admin/logistics-providers" element={<LogisticsProviderManage />} />
              <Route path="/admin/cataloguemaster" element={<CatalogueMasterManage />} />
              <Route path="/admin/catalogue-master" element={<CatalogueMasterManage />} />
              <Route path="/admin/catalogue-masters" element={<CatalogueMasterManage />} />



            </Route>

            {/* User-friendly aliases and catch-all */}
            <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admindashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin%20dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </main>

    {!isAdminPath && <Footer />}
      <EnquiryForm isOpen={isEnquiryOpen && !isDestinationLandingPath && !isProfileFormPath} onClose={() => setIsEnquiryOpen(false)} />
    </div>
  );
};

export default App
