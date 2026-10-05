import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, MapPin, Calendar, Users, ArrowLeftRight, Share2, Mail, Eye, MessageCircle, X, Copy, CheckCircle, ShieldCheck, Clock, Headphones, Award, CreditCard, BadgeCheck, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../../api";
import SearchableSelect from "../../../components/admin/SearchableSelect/SearchableSelect";
import CabCruiseForm from "../../../components/forms/CabCruiseForm";
import CabTermsModal from "../../../components/forms/CabTermsModal";
import CabPrivacyModal from "../../../components/forms/CabPrivacyModal";
import cabHero1 from "../../../assets/Hero/CabHeader/cab-hero-01.png";
import cabHero2 from "../../../assets/Hero/CabHeader/cab-hero-02.png";
import cabHero3 from "../../../assets/Hero/CabHeader/cab-hero-03.png";
import cabHero4 from "../../../assets/Hero/CabHeader/cab-hero-04.png";
import cabHero5 from "../../../assets/Hero/CabHeader/cab-hero-05.png";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import usePageSEO from "../../../hooks/usePageSEO";

const cabHeroImages = [cabHero1, cabHero2, cabHero3, cabHero4, cabHero5];

/**
 * Cab & Airport Transfer Booking Page
 * 
 * Features:
 * - Dynamic animated hero carousel of premium vehicle fleet
 * - Origin & Destination search with airport pickup/drop points
 * - Vehicle fleet catalog: Sedans, SUVs, Minivans, and Luxury Coaches
 * - One-Way, Round-Trip, and Hourly Chauffeur rental options
 * - Integrated booking enquiry and Zoho payment gateway flow
 */
const Cab = () => {
  usePageSEO(
    "Premium Cab & Transfer Services | Goimomi Holidays",
    "Experience seamless travel with Goimomi Holidays' premium cab and transfer services. Whether it's a luxury airport pickup, intercity travel, or specialized transfers in Saudi Arabia (Jeddah, Makkah, Madinah), we ensure professional drivers and ultimate comfort for your journey.",
    null,
    "Premium cab service, airport transfers, intercity taxi, Goimomi Holidays, Jeddah airport transfer, Makkah taxi service, Madinah cab booking, professional travel transfers, luxury car rental with driver"
  );
  const navigate = useNavigate();
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % cabHeroImages.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const [showSuccessModal, setShowSuccessModal] = useState(
    urlSearchParams.get("payment_success") === "true" || urlSearchParams.get("status") === "success"
  );
  const successBookingId = urlSearchParams.get("booking_id") || urlSearchParams.get("booking");
  const successDocumentToken = urlSearchParams.get("document_token");

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Clear search parameters from URL without full reload
    const newParams = new URLSearchParams(urlSearchParams);
    newParams.delete("payment_success");
    newParams.delete("status");
    newParams.delete("booking_id");
    newParams.delete("booking");
    newParams.delete("document_token");
    setUrlSearchParams(newParams, { replace: true });
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [isGuestsOpen, setIsGuestsOpen] = useState(false);
  const [isSearched, setIsSearched] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [phone, setPhone] = useState("");
  const [bookingStatus, setBookingStatus] = useState({ loading: false, success: false, error: null });
  const [confirmedBookingIds, setConfirmedBookingIds] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [, setAirports] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [viewDetailsCar, setViewDetailsCar] = useState(null);
  const [emailModalCar, setEmailModalCar] = useState(null);
  const [sharingEmail, setSharingEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [noCabModalOpen, setNoCabModalOpen] = useState(false);
  const [noCabRouteInfo, setNoCabRouteInfo] = useState({ from: "", to: "" });

  // OTP Verification States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  // Form State
  const [bookingFormData, setBookingFormData] = useState({
    gender: "Male",
    title: "Mr.",
    firstName: "",
    lastName: "",
    email: "",
    pickupPoint: "",
    dropPoint: "",
    luggageCount: "",
    flightNumber: "",
    terminal: "",
    airportName: "",
    arrivalDate: "",
    arrivalTime: "",
    departureDate: "",
    departureTime: "",
    pickupLocationDetails: "",
    pickupDate: "",
    pickupTime: "",
    specialRequirements: ""
  });

  const guestPopoverRef = useRef(null);

  const handleGenderChange = (e) => {
    const newGender = e.target.value;
    setBookingFormData(prev => ({
      ...prev,
      gender: newGender,
      title: newGender === "Female"
        ? (["Ms.", "Mrs.", "Miss"].includes(prev.title) ? prev.title : "Ms.")
        : (["Mr.", "Master"].includes(prev.title) ? prev.title : "Mr.")
    }));
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    const inferredGender = ["Ms.", "Mrs.", "Miss"].includes(newTitle) ? "Female" : "Male";
    setBookingFormData(prev => ({
      ...prev,
      title: newTitle,
      gender: inferredGender
    }));
  };

  const handleSendOtp = async () => {
    if (!bookingFormData.email) {
      alert("Please enter your email address first.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(bookingFormData.email)) {
      alert("Please enter a valid email address.");
      return;
    }

    setSendingOtp(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      await api.post("/api/cab-bookings/send-otp/", { email: bookingFormData.email });
      setIsOtpSent(true);
      setOtpSuccess("OTP sent successfully. Please check your email inbox.");
    } catch (err) {
      console.error("Error sending OTP:", err);
      setOtpError(err.response?.data?.error || "Failed to send OTP. Please check your email and try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.trim().length !== 6) {
      alert("Please enter the 6-digit OTP code.");
      return;
    }

    setVerifyingOtp(true);
    setOtpError("");
    setOtpSuccess("");

    try {
      await api.post("/api/cab-bookings/verify-otp/", {
        email: bookingFormData.email,
        otp: otpValue.trim()
      });
      setIsEmailVerified(true);
      setOtpSuccess("Email verified successfully!");
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setOtpError(err.response?.data?.error || "Invalid or expired OTP code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setBookingFormData(prev => ({ ...prev, email: val }));
    // Reset verification state if they modify the email
    setIsOtpSent(false);
    setIsEmailVerified(false);
    setOtpValue("");
    setOtpError("");
    setOtpSuccess("");
  };

  const handleConfirmBooking = async () => {
    if (!isAgreed) {
      alert("Please agree to the Terms & Conditions");
      return;
    }

    // Phone validation: MUST be at least 10 digits total, and exactly 10 after +91
    const phoneDigits = (phone || "").replace(/\D/g, "");
    if (!bookingFormData.firstName || !bookingFormData.lastName || !phone || !bookingFormData.email) {
      alert("Please fill in all mandatory fields (First Name, Last Name, Email, Phone)");
      return;
    }

    if (!isEmailVerified) {
      alert("Please verify your email address via OTP before requesting a booking.");
      return;
    }
    
    if (phoneDigits.length < 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    if (phoneDigits.startsWith("91") && phoneDigits.length !== 12) {
      alert("Please enter exactly 10 digits after the country code (+91)");
      return;
    }

    if (cart.length !== 1) {
      alert("Please book one cab at a time.");
      return;
    }

    setBookingStatus({ loading: true, success: false, error: null });

    try {
      const item = cart[0];
      const payload = {
        vehicle_id: item.id,
        price: item.price,
        from_city: item.fromCity || searchParams.fromName,
        to_city: item.toCity || searchParams.toName,
        pickup_date: item.pickupDate || searchParams.pickupDate,
        pickup_point: item.pickupPoint || "",
        drop_point: item.dropPoint || "",
        guests: searchParams.guests,
        gender: bookingFormData.gender || (["Ms.", "Mrs.", "Miss"].includes(bookingFormData.title) ? "Female" : "Male"),
        title: bookingFormData.title,
        first_name: bookingFormData.firstName,
        last_name: bookingFormData.lastName,
        email: bookingFormData.email,
        phone,
        luggage_count: bookingFormData.luggageCount,
        transfer_type: item.transferType,
        flight_number: item.flightNumber || "",
        terminal: item.terminal || "",
        airport_name: item.airportName || "",
        arrival_time: item.transferType === 'airport' ? `${item.arrivalDate || ""} ${item.arrivalTime || ""}`.trim() : "",
        departure_time: item.transferType === 'airport' ? `${item.departureDate || ""} ${item.departureTime || ""}`.trim() : "",
        pickup_location_details: item.transferType === 'intercity' ? `Pickup: ${item.pickupPoint}, Drop: ${item.dropPoint}. ${item.pickupLocationDetails || ""}` : `Pickup: ${item.pickupPoint}, Drop: ${item.dropPoint}.`,
        pickup_time: item.transferType === 'intercity' ? `${item.pickupDate || ""} ${item.pickupTime || ""}`.trim() : "",
        special_requirements: bookingFormData.specialRequirements
      };
      const response = await api.post("/api/cab-bookings/", payload);
      const bookingId = response?.data?.booking_id;
      const paymentUrl = response?.data?.payment_url;
      setConfirmedBookingIds(bookingId ? [bookingId] : []);

      // Redirect only after the server returns a checkout URL for this booking.
      const firstPaymentUrl = paymentUrl;
      if (firstPaymentUrl) {
        // Brief status update so user sees feedback before redirect
        setBookingStatus({ loading: true, success: false, error: null });
        setTimeout(() => {
          const isLocalPath = firstPaymentUrl.includes("/payment-failed") || 
                              firstPaymentUrl.includes("/payment-checkout") || 
                              firstPaymentUrl.includes("/cab");
          if (isLocalPath) {
            try {
              // Extract the path and query parameters for local navigation
              const urlObj = new URL(firstPaymentUrl, window.location.origin);
              navigate(`${urlObj.pathname}${urlObj.search}`);
            } catch (e) {
              // Fallback to direct navigation if parsing fails
              window.location.href = firstPaymentUrl;
            }
          } else {
            window.location.href = firstPaymentUrl;
          }
        }, 800);
        return;
      }

      // Fallback: no payment link — show booking request confirmed modal
      setBookingStatus({ loading: false, success: false, error: "Unable to start the payment session. Please try again." });

    } catch (err) {
      console.error("Booking error:", err);
      const serverMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to confirm booking. Please try again.";
      setBookingStatus({ loading: false, success: false, error: serverMsg });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isGuestsOpen && !event.target.closest('.guest-selector')) {
        setIsGuestsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isGuestsOpen]);

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [searchParams, setSearchParams] = useState({
    fromId: "",
    toId: "",
    fromName: "",
    toName: "",
    pickupPoint: "",
    dropPoint: "",
    pickupDate: getTomorrowDate(),
    guests: 1
  });

  const selectedVehicleId = selectedVehicle?.id;

  useEffect(() => {
    if (!isBooking || !selectedVehicleId) return;
    const controller = new AbortController();

    const fetchUpdatedPrice = async () => {
      try {
        const response = await api.get("/api/cab-search/", {
          signal: controller.signal,
          params: {
            from_city: searchParams.fromName,
            to_city: searchParams.toName,
            pickup_date: searchParams.pickupDate,
            pickup_point: bookingFormData.pickupPoint || "",
            drop_point: bookingFormData.dropPoint || ""
          }
        });
        
        if (!controller.signal.aborted && Array.isArray(response.data)) {
          const matchedVehicle = response.data.find(v => v.id === selectedVehicleId);
          if (matchedVehicle) {
            setSelectedVehicle(prev => {
              if (!prev || prev.id !== selectedVehicleId) return prev;
              return {
                ...prev,
                price: matchedVehicle.price
              };
            });
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error updating price for points:", err);
      }
    };

    fetchUpdatedPrice();
    return () => controller.abort();
  }, [bookingFormData.pickupPoint, bookingFormData.dropPoint, isBooking,
    selectedVehicleId, searchParams.fromName, searchParams.toName, searchParams.pickupDate]);




  useEffect(() => {
    loadDestinations();
    fetchPickupPoints();
    fetchAirports();
  }, []);

  const fetchAirports = async () => {
    try {
      const response = await api.get("/api/airports/");
      setAirports(response.data);
    } catch (err) {
      console.error("Error fetching airports:", err);
    }
  };

  const fetchPickupPoints = async () => {
    try {
      const response = await api.get("/api/pickup-point-masters/");
      setPickupPoints(response.data);
    } catch (err) {
      console.error("Error fetching pickup points:", err);
    }
  };

  // Hardcoded destinations for cab service (Saudi Arabia cities only)
  // These are fixed cities where Goimomi provides cab transfers
  const loadDestinations = () => {
    const cabCities = [
      { label: "Jeddah",  value: "10243", subtitle: "Mecca Region, Saudi Arabia" },
      { label: "Mecca",   value: "13797", subtitle: "Mecca Region, Saudi Arabia" },
      { label: "Madinah", value: "13628", subtitle: "Medina Region, Saudi Arabia" },
      { label: "Taif",    value: "30048", subtitle: "Saudi Arabia" },
    ];
    setDestinations(cabCities);
  };



  const handleSwap = () => {
    setSearchParams(prev => ({
      ...prev,
      fromId: prev.toId,
      toId: prev.fromId,
      fromName: prev.toName,
      toName: prev.fromName,
      pickupPoint: prev.dropPoint,
      dropPoint: prev.pickupPoint
    }));
  };

  const getPickupOptionsForCity = (cityName) => {
    if (!cityName) return [];
    const filtered = pickupPoints.filter(p => p.city_name?.toLowerCase().trim() === cityName.toLowerCase().trim());
    const seen = new Set();
    const options = [];
    filtered.forEach(p => {
      const nameKey = p.name.toLowerCase().trim();
      if (!seen.has(nameKey)) {
        seen.add(nameKey);
        options.push({
          label: p.name,
          value: p.name,
          subtitle: p.city_name
        });
      }
    });
    return options;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchParams.fromName || !searchParams.toName) {
      alert("Please select both From and To cities.");
      return;
    }
    setSearchLoading(true);
    setIsSearched(true);
    try {
      const response = await api.get("/api/cab-search/", {
        params: {
          from_city: searchParams.fromName,
          to_city: searchParams.toName,
          pickup_date: searchParams.pickupDate,
          pickup_point: searchParams.pickupPoint || "",
          drop_point: searchParams.dropPoint || ""
        }
      });
      setSearchResults(response.data);
      if (response.data.length === 0) {
        setNoCabRouteInfo({
          from: searchParams.fromName,
          to: searchParams.toName
        });
        setNoCabModalOpen(true);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (car) => {
    if (cart.length > 0) {
      alert("Please complete or remove the current cab booking before adding another.");
      return;
    }
    const newItem = {
      cartId: Date.now() + Math.random(),
      ...car,
      fromCity: searchParams.fromName,
      toCity: searchParams.toName,
      pickupPoint: searchParams.pickupPoint || car.pickup_point || searchParams.fromName,
      dropPoint: searchParams.dropPoint || car.drop_point || searchParams.toName,
      pickupDate: searchParams.pickupDate,
      pickupTime: "",
      transferType: "airport", // default to airport
      flightNumber: "",
      terminal: "",
      airportName: "",
      arrivalDate: searchParams.pickupDate,
      arrivalTime: "",
      departureDate: searchParams.pickupDate,
      departureTime: "",
      pickupLocationDetails: ""
    };
    setCart([newItem]);
    alert(`${car.name} added to cart!`);
  };

  const handleBookNow = (car) => {
    const newItem = {
      cartId: Date.now() + Math.random(),
      ...car,
      fromCity: searchParams.fromName,
      toCity: searchParams.toName,
      pickupPoint: searchParams.pickupPoint || car.pickup_point || searchParams.fromName,
      dropPoint: searchParams.dropPoint || car.drop_point || searchParams.toName,
      pickupDate: searchParams.pickupDate,
      pickupTime: "",
      transferType: "airport", // default to airport
      flightNumber: "",
      terminal: "",
      airportName: "",
      arrivalDate: searchParams.pickupDate,
      arrivalTime: "",
      departureDate: searchParams.pickupDate,
      departureTime: "",
      pickupLocationDetails: ""
    };
    setCart([newItem]);
    setIsBooking(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const vehicles = searchResults;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Hero Section or Compact Search */}
      {!isSearched ? (
        <div
          className="relative flex flex-col items-center justify-center px-4 overflow-hidden pt-10 pb-36"
        >
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {cabHeroImages.map((image, index) => (
              <img
                key={image}
                src={image}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                  index === heroImageIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
                }`}
              />
            ))}
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/75 to-slate-900/90" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

          <div className="w-full max-w-6xl z-10 flex flex-col items-center">
            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center text-white mb-8 w-full"
            >
              <div className="flex items-center justify-center gap-3 text-emerald-400 mb-4">
                <div className="w-10 h-[2px] bg-emerald-400" />
                <span className="text-[11px] uppercase tracking-[0.5em] font-black">Professional Transfer Services</span>
                <div className="w-10 h-[2px] bg-emerald-400" />
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.85] mb-4">
                PREMIUM
                <br />
                <span className="text-white/25">TRANSFERS</span>
              </h1>
              <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-5">
                Airport pickups, intercity rides, and pilgrimage transfers across Saudi Arabia — driven by verified professional chauffeurs and managed by Goimomi's expert travel desk.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-5">
                {["Verified Drivers", "Free 30 Min Wait", "Free Cancellation", "All-Inclusive Pricing"].map(badge => (
                  <div key={badge} className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{badge}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Announcement Banner */}
            <div className="mb-5 w-full overflow-hidden rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl group/ad">
              <div className="flex items-center py-3 px-6 cursor-default overflow-hidden">
                <div className="flex-shrink-0 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter mr-4 z-10 shadow-lg animate-pulse">
                  New
                </div>
                <div className="flex-1 overflow-hidden pointer-events-none relative h-full flex items-center">
                  <div className="animate-marquee w-max group-hover/ad:[animation-play-state:paused] pointer-events-auto">
                    <p className="text-white text-xs md:text-sm font-bold tracking-wide whitespace-nowrap pr-24 flex items-center">
                      🚀 Now providing premium cab transfers in <span className="text-yellow-400 mx-1">Jeddah</span>, <span className="text-yellow-400 mx-1">Makkah</span>, <span className="text-yellow-400 mx-1">Madinah</span>, and <span className="text-yellow-400 mx-1">Taif</span>. Book your spiritual journey with comfort!
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      🚀 Now providing premium cab transfers in <span className="text-yellow-400 mx-1">Jeddah</span>, <span className="text-yellow-400 mx-1">Makkah</span>, <span className="text-yellow-400 mx-1">Madinah</span>, and <span className="text-yellow-400 mx-1">Taif</span>. Book your spiritual journey with comfort!
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="w-full"
            >
              <div className="flex mb-[-1px] relative z-20">
                <div className="bg-white px-6 py-2.5 rounded-t-xl font-bold text-[#14532d] flex items-center gap-2 shadow-sm border-b-2 border-white text-sm">
                  Transfers
                </div>
              </div>
              <div className="bg-white rounded-r-xl rounded-bl-xl shadow-2xl p-3 md:p-4">
                <form onSubmit={handleSearch}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-12 lg:col-span-6 grid grid-cols-1 md:grid-cols-4 gap-1.5 relative">
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#14532d] z-10 pointer-events-none">
                          <MapPin size={16} />
                        </div>
                        <SearchableSelect
                          options={destinations}
                          value={searchParams.fromId}
                          onChange={(val) => {
                            const opt = destinations.find(d => d.value === val);
                            setSearchParams(prev => ({ ...prev, fromId: val, fromName: opt?.label || "", pickupPoint: "" }));
                          }}
                          placeholder="From city"
                          size="compact"
                          className="!pl-9 !py-2.5 !text-xs !border-2 !border-gray-200 !rounded-lg"
                          uniqueByLabel={true}
                        />
                      </div>

                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#14532d] z-10 pointer-events-none">
                          <MapPin size={16} className="text-emerald-500" />
                        </div>
                        <SearchableSelect
                          options={getPickupOptionsForCity(searchParams.fromName)}
                          value={searchParams.pickupPoint}
                          onChange={(val) => {
                            setSearchParams(prev => ({ ...prev, pickupPoint: val }));
                          }}
                          placeholder="Pickup point"
                          disabled={!searchParams.fromName}
                          size="compact"
                          className="!pl-9 !py-2.5 !text-xs !border-2 !border-gray-200 !rounded-lg"
                          uniqueByLabel={true}
                        />
                      </div>

                      <div
                        onClick={handleSwap}
                        className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white p-0.5 rounded-md border border-gray-100 shadow-sm text-gray-400 hover:text-[#14532d] cursor-pointer transition-colors active:scale-90"
                      >
                        <ArrowLeftRight size={12} />
                      </div>

                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#14532d] z-10 pointer-events-none">
                          <MapPin size={16} />
                        </div>
                        <SearchableSelect
                          options={destinations}
                          value={searchParams.toId}
                          onChange={(val) => {
                            const opt = destinations.find(d => d.value === val);
                            setSearchParams(prev => ({ ...prev, toId: val, toName: opt?.label || "", dropPoint: "" }));
                          }}
                          placeholder="To city"
                          size="compact"
                          className="!pl-9 !py-2.5 !text-xs !border-2 !border-gray-200 !rounded-lg"
                          uniqueByLabel={true}
                        />
                      </div>

                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#14532d] z-10 pointer-events-none">
                          <MapPin size={16} className="text-emerald-500" />
                        </div>
                        <SearchableSelect
                          options={getPickupOptionsForCity(searchParams.toName)}
                          value={searchParams.dropPoint}
                          onChange={(val) => {
                            setSearchParams(prev => ({ ...prev, dropPoint: val }));
                          }}
                          placeholder="Drop point"
                          disabled={!searchParams.toName}
                          size="compact"
                          className="!pl-9 !py-2.5 !text-xs !border-2 !border-gray-200 !rounded-lg"
                          uniqueByLabel={true}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-4 lg:col-span-2">
                      <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#14532d] transition-colors pointer-events-none">
                          <Calendar size={16} />
                        </div>
                        <input
                          type="date"
                          value={searchParams.pickupDate}
                          onChange={(e) => setSearchParams({ ...searchParams, pickupDate: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-[#14532d]/5 focus:border-[#14532d] transition-all text-xs font-bold text-gray-900"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-4 lg:col-span-2 relative group guest-selector">
                      <div
                        onClick={() => setIsGuestsOpen(!isGuestsOpen)}
                        className="flex items-center gap-3 w-full pl-9 pr-3 py-2.5 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#14532d] transition-all"
                      >
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                          <Users size={16} />
                        </div>
                        <span className="text-xs font-bold text-gray-900">{searchParams.guests} guests</span>
                      </div>

                      {isGuestsOpen && (
                        <div
                          ref={guestPopoverRef}
                          className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-4 z-50 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200"
                        >
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-sm font-bold text-gray-500">Guests</span>
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => setSearchParams(prev => ({ ...prev, guests: Math.max(1, prev.guests - 1) }))}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                              >
                                <span className="text-xl font-light">−</span>
                              </button>
                              <span className="text-sm font-bold text-gray-900 min-w-[12px] text-center">{searchParams.guests}</span>
                              <button
                                type="button"
                                onClick={() => setSearchParams(prev => ({ ...prev, guests: prev.guests + 1 }))}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                              >
                                <span className="text-xl font-light">+</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-4 lg:col-span-2 self-end">
                      <button
                        type="submit"
                        className="w-full h-[42px] bg-gradient-to-r from-[#14532d] to-[#15803d] text-white rounded-lg font-bold uppercase tracking-wider shadow-md hover:shadow-[#14532d]/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <Search size={16} />
                        Search
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      ) : isBooking ? (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => setIsBooking(false)}
            className="flex items-center gap-2 text-[#14532d] font-bold text-[10px] mb-4 hover:underline"
          >
            <ArrowLeftRight size={14} className="rotate-180" />
            Back to Search Results
          </button>

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Main Booking Form */}
            <div className="lg:w-2/3 space-y-6">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                Review Selected Vehicles
              </h2>

              {cart.map((item, index) => (
                <div key={item.cartId} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCart(prev => prev.filter(c => c.cartId !== item.cartId));
                      if (cart.length === 1) {
                        setIsBooking(false);
                      }
                    }}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove Vehicle"
                  >
                    <X size={16} />
                  </button>

                  <div className="flex flex-col md:flex-row gap-4 items-center pr-8">
                    <div className="w-full md:w-32 h-24 md:h-20 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center p-2 shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <div className="text-3xl">🚗</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-50 text-[#14532d] text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
                          Vehicle #{index + 1}
                        </span>
                        <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">
                          {item.name}
                        </h2>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.category}</p>
                      <div className="flex flex-wrap gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                          <span className="text-sm leading-none">🧳</span>
                          {item.bags} Bags
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={12} className="text-gray-400" />
                          Max {item.passengers} Pax
                        </div>
                        <div className="text-emerald-600 font-black">
                          ₹{Number(item.price || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Transfer Type Selector */}
                  <div className="pt-2 border-t border-gray-50">
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, transferType: "airport" } : c));
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${item.transferType === "airport"
                          ? "bg-emerald-800 text-white shadow-sm"
                          : "bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100"
                          }`}
                      >
                        Airport Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, transferType: "intercity" } : c));
                        }}
                        className={`flex-1 py-1.5 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${item.transferType === "intercity"
                          ? "bg-emerald-800 text-white shadow-sm"
                          : "bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100"
                          }`}
                      >
                        Inter-city Transfer
                      </button>
                    </div>

                    {/* Route Timeline with Pickup/Drop Points */}
                    <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 relative overflow-hidden space-y-3">
                      <div className="absolute left-0 top-0 w-1 h-full bg-[#14532d]/10"></div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest opacity-80">
                          Route Details
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">Travel Date:</span>
                          <input
                            type="date"
                            value={item.pickupDate}
                            disabled={true}
                            className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] font-black text-gray-500 cursor-not-allowed outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 relative">
                        <div className="absolute left-[7px] top-1.5 bottom-1.5 w-0.5 border-l-2 border-dashed border-gray-200"></div>

                        <div className="flex gap-4 relative items-center">
                          <div className="w-4 h-4 rounded-full border-2 border-green-600 bg-white z-10 flex-shrink-0"></div>
                          <div className="flex-1">
                            <select
                              className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10"
                              value={item.pickupPoint || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, pickupPoint: val } : c));
                              }}
                            >
                              <option value="">Select Pickup Point in {item.fromCity || searchParams.fromName}</option>
                              {pickupPoints.filter(p => p.city_name === (item.fromCity || searchParams.fromName)).map(p => (
                                <option key={p.id} value={p.name}>{p.name} ({p.city_name})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-4 relative items-center">
                          <div className="w-4 h-4 rounded-full border-2 border-[#14532d] bg-[#14532d] z-10 flex-shrink-0"></div>
                          <div className="flex-1">
                            <select
                              className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10"
                              value={item.dropPoint || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, dropPoint: val } : c));
                              }}
                            >
                              <option value="">Select Drop Point in {item.toCity || searchParams.toName}</option>
                              {pickupPoints.filter(p => p.city_name === (item.toCity || searchParams.toName)).map(p => (
                                <option key={p.id} value={p.name}>{p.name} ({p.city_name})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub-form based on transfer type */}
                    {item.transferType === "airport" ? (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50/30 rounded-xl border border-gray-100/50 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Flight Number</label>
                          <input
                            type="text"
                            placeholder="Eg. AB153"
                            value={item.flightNumber || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, flightNumber: val } : c));
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-gray-800 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Terminal</label>
                          <input
                            type="text"
                            placeholder="Eg. T3"
                            value={item.terminal || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, terminal: val } : c));
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-gray-800 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Arrival Time</label>
                          <input
                            type="time"
                            value={item.arrivalTime || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, arrivalTime: val } : c));
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-gray-800 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Departure Time</label>
                          <input
                            type="time"
                            value={item.departureTime || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, departureTime: val } : c));
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-gray-800 focus:outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50/30 rounded-xl border border-gray-100/50 animate-in fade-in duration-200">
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Pickup Location Details</label>
                          <textarea
                            rows="2"
                            placeholder="Enter complete pickup address with landmarks"
                            value={item.pickupLocationDetails || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, pickupLocationDetails: val } : c));
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-gray-800 placeholder:text-gray-300 focus:outline-none resize-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Pickup Time</label>
                          <input
                            type="time"
                            value={item.pickupTime || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCart(prev => prev.map(c => c.cartId === item.cartId ? { ...c, pickupTime: val } : c));
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-black text-gray-800 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Guest Details Form */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-base font-black text-gray-900 tracking-tight">Primary Guest Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Gender</label>
                    <select
                      value={bookingFormData.gender || "Male"}
                      onChange={handleGenderChange}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[11px] font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10 cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Title</label>
                    <select
                      value={bookingFormData.title}
                      onChange={handleTitleChange}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[11px] font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10 cursor-pointer"
                    >
                      {bookingFormData.gender === "Female" ? (
                        <>
                          <option value="Ms.">Ms.</option>
                          <option value="Mrs.">Mrs.</option>
                          <option value="Miss">Miss</option>
                        </>
                      ) : (
                        <>
                          <option value="Mr.">Mr.</option>
                          <option value="Master">Master</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">First Name</label>
                    <input
                      type="text"
                      placeholder="Enter First Name"
                      value={bookingFormData.firstName}
                      onChange={(e) => setBookingFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[11px] font-black text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10"
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Enter Last Name"
                      value={bookingFormData.lastName}
                      onChange={(e) => setBookingFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[11px] font-black text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 relative">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 flex justify-between items-center">
                      <span>Email ID</span>
                      {isEmailVerified && <span className="text-[9px] text-green-600 font-black uppercase tracking-widest flex items-center gap-0.5"><CheckCircle size={10} /> Verified</span>}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        placeholder="Enter Email Address"
                        value={bookingFormData.email}
                        onChange={handleEmailChange}
                        disabled={isEmailVerified}
                        className={`w-full bg-gray-50 border border-gray-100 rounded-lg p-2.5 pr-20 text-[11px] font-black text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10 ${isEmailVerified ? "bg-green-50/50 border-green-200 text-green-800 cursor-not-allowed" : ""}`}
                      />
                      {!isEmailVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp || !bookingFormData.email}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#14532d] hover:bg-[#0f4022] disabled:bg-gray-300 text-white rounded px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          {sendingOtp ? "Sending..." : isOtpSent ? "Resend" : "Send OTP"}
                        </button>
                      )}
                    </div>
                    {/* OTP Entry Block */}
                    {isOtpSent && !isEmailVerified && (
                      <div className="mt-2 p-3 bg-green-50/30 border border-green-100/50 rounded-xl space-y-2 animate-in slide-in-from-top-2 duration-200">
                        <p className="text-[9px] font-black text-[#14532d] uppercase tracking-widest">Enter 6-Digit Code</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength="6"
                            placeholder="------"
                            value={otpValue}
                            onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                            className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-center text-xs font-black tracking-[0.5em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            disabled={verifyingOtp || otpValue.length !== 6}
                            className="bg-[#14532d] hover:bg-[#0f4022] disabled:bg-gray-300 text-white rounded-lg px-4 py-2 text-[9px] font-black uppercase tracking-wider transition-all"
                          >
                            {verifyingOtp ? "Verifying..." : "Verify Code"}
                          </button>
                        </div>
                      </div>
                    )}
                    {otpError && <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1 px-1">{otpError}</p>}
                    {otpSuccess && <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mt-1 px-1">{otpSuccess}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Guest Phone Number</label>
                    <PhoneInput
                      country={"in"}
                      value={phone}
                      onChange={(phone) => setPhone(phone)}
                      enableSearch={true}
                      disableSearchIcon={true}
                      searchPlaceholder="Search country..."
                      inputClass="!w-full !h-[34px] !text-[11px] !font-black !rounded-lg !border-gray-100 !bg-gray-50 focus:!ring-2 focus:!ring-[#14532d]/10 focus:!border-gray-200 transition-all font-sans"
                      containerClass="!w-full"
                      buttonClass="!rounded-l-lg !border-gray-100 !bg-gray-50 hover:!bg-gray-100 transition-colors"
                      dropdownClass="!rounded-xl !shadow-2xl !border-gray-100 !text-xs !font-black !font-sans !py-2 !w-[250px]"
                      searchClass="!mx-2 !my-1 !p-2 !rounded-lg !text-xs !font-sans !border-gray-100 focus:!border-green-600 !w-[calc(100%-16px)]"
                      searchStyle={{
                        margin: '8px',
                        width: 'calc(100% - 16px)',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '900',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Total Luggage (Optional)</label>
                    <input
                      type="text"
                      placeholder="Enter total number of Bags"
                      value={bookingFormData.luggageCount}
                      onChange={(e) => setBookingFormData(prev => ({ ...prev, luggageCount: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[11px] font-black text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Special Requirements (Optional)</label>
                  <textarea
                    rows="2"
                    placeholder="Enter any special requests for the drivers"
                    value={bookingFormData.specialRequirements}
                    onChange={(e) => setBookingFormData(prev => ({ ...prev, specialRequirements: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-[11px] font-black text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#14532d]/10 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-gray-900 tracking-tight">Please Note</h3>
                <div className="bg-green-50/30 border border-green-100 p-4 rounded-2xl space-y-2">
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded-full border border-green-300 flex items-center justify-center text-green-400 text-[9px] font-bold flex-shrink-0 mt-0.5">i</div>
                    <p className="text-[10px] font-bold text-gray-500 leading-tight">
                      In case of flight delays or cancellations, kindly inform Goimomi Helpline to ensure timely updates.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded-full border border-green-300 flex items-center justify-center text-green-400 text-[9px] font-bold flex-shrink-0 mt-0.5">i</div>
                    <p className="text-[10px] font-bold text-gray-500 leading-tight">
                      To ensure comfort and safety, book a bigger vehicle if your guest or luggage count is close to the limit.
                    </p>
                  </div>
                </div>
              </div>

              {/* T&C Acknowledge */}
              <div className="flex items-center gap-3 p-2">
                <div
                  onClick={() => setIsAgreed(!isAgreed)}
                  className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center transition-all ${isAgreed ? "border-green-600 bg-green-600 text-white" : "border-gray-300 bg-white text-transparent"
                    }`}
                >
                  <span className="text-[10px] font-black">✓</span>
                </div>
                <p
                  className="text-[11px] font-black text-gray-400 select-none"
                >
                  By proceeding, I acknowledge that I have read and agree to the <span className="text-green-500 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsTermsOpen(true); }}>Terms & Conditions</span> and <span className="text-green-500 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsPrivacyOpen(false); }}>Privacy Policy</span>
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 pt-2 pb-8">
                <div className="flex justify-center w-full">
                  <button
                    onClick={handleConfirmBooking}
                    disabled={bookingStatus.loading || bookingStatus.success}
                    className={`min-w-[220px] py-2.5 px-8 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-100 ${bookingStatus.success
                      ? "bg-green-500 text-white cursor-default"
                      : "bg-green-600 text-white hover:bg-green-700"
                      } ${bookingStatus.loading ? "opacity-70 cursor-wait" : ""}`}
                  >
                    {bookingStatus.loading ? "Processing..." : bookingStatus.success ? "Booking Requested!" : "Pay Now"}
                  </button>
                </div>
                {bookingStatus.error && (
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-bounce">
                    {bookingStatus.error}
                  </p>
                )}
                {bookingStatus.success && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col items-center p-8 shadow-2xl relative">
                      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle size={40} className="text-green-500" />
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight text-center mb-2">Booking Requested!</h2>
                      <p className="text-sm font-bold text-gray-500 text-center mb-4 px-2 leading-relaxed">
                        Your bookings have been sent successfully. Our team will reach out to you shortly.
                      </p>
                      {/* Show Booking IDs */}
                      {confirmedBookingIds.length > 0 && (
                        <div className="w-full mb-6 space-y-2">
                          {confirmedBookingIds.map((bid, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-[#14532d]/5 border border-[#14532d]/20 rounded-xl px-4 py-3">
                              <div>
                                <p className="text-[9px] font-black text-[#14532d]/60 uppercase tracking-widest">Booking ID</p>
                                <p className="text-base font-black text-[#14532d] tracking-widest mt-0.5">{bid}</p>
                              </div>
                              <BadgeCheck size={22} className="text-[#14532d]/60" />
                            </div>
                          ))}
                          <p className="text-[10px] text-gray-400 font-medium text-center">Save this ID for your reference</p>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setBookingStatus({ loading: false, success: false, error: null });
                          setIsBooking(false);
                          setCart([]);
                          setConfirmedBookingIds([]);
                          window.scrollTo(0, 0);
                        }}
                        className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-100 transition-all active:scale-95"
                      >
                        Back to Search
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="lg:w-1/3 space-y-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-base font-black text-gray-900 mb-4 tracking-tight">Fare Summary</h3>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.cartId} className="flex justify-between items-center text-[11px] font-black">
                      <span className="text-gray-400 uppercase tracking-widest">{item.name}</span>
                      <span className="text-gray-900">₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-black text-green-700 uppercase tracking-[0.1em]">Total Amount</span>
                    <span className="text-lg font-black text-green-700">
                      ₹{cart.reduce((sum, item) => sum + Number(item.price || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !isBooking ? (
        <div className="bg-white border-b border-gray-100 py-1.5 sticky top-16 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex align-center flex-1 min-w-[300px] border border-gray-200 rounded-lg divide-x divide-gray-100">
                {/* From City */}
                <div className="flex-1 p-1 px-2 relative group min-w-[140px]">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0">Where from?</p>
                  <SearchableSelect
                    options={destinations}
                    value={searchParams.fromId}
                    onChange={(val) => {
                      const opt = destinations.find(d => d.value === val);
                      setSearchParams(prev => ({ ...prev, fromId: val, fromName: opt?.label || "", pickupPoint: "" }));
                    }}
                    placeholder="From city"
                    size="compact"
                    className="!pl-0 !py-0 !h-6 !text-[11px] !border-none !bg-transparent !font-black !text-gray-800 focus:!ring-0"
                    uniqueByLabel={true}
                  />
                </div>

                {/* Pickup Point */}
                <div className="flex-1 p-1 px-2 relative group min-w-[140px]">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0">Pickup Point</p>
                  <SearchableSelect
                    options={getPickupOptionsForCity(searchParams.fromName)}
                    value={searchParams.pickupPoint}
                    onChange={(val) => {
                      setSearchParams(prev => ({ ...prev, pickupPoint: val }));
                    }}
                    placeholder="Pickup point"
                    disabled={!searchParams.fromName}
                    size="compact"
                    className="!pl-0 !py-0 !h-6 !text-[11px] !border-none !bg-transparent !font-black !text-gray-800 focus:!ring-0"
                    uniqueByLabel={true}
                  />
                </div>

                {/* To City */}
                <div className="flex-1 p-1 px-2 relative group min-w-[140px]">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0">Where to?</p>
                  <SearchableSelect
                    options={destinations}
                    value={searchParams.toId}
                    onChange={(val) => {
                      const opt = destinations.find(d => d.value === val);
                      setSearchParams(prev => ({ ...prev, toId: val, toName: opt?.label || "", dropPoint: "" }));
                    }}
                    placeholder="To city"
                    size="compact"
                    className="!pl-0 !py-0 !h-6 !text-[11px] !border-none !bg-transparent !font-black !text-gray-800 focus:!ring-0"
                    uniqueByLabel={true}
                  />
                </div>

                {/* Drop Point */}
                <div className="flex-1 p-1 px-2 relative group min-w-[140px]">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0">Drop Point</p>
                  <SearchableSelect
                    options={getPickupOptionsForCity(searchParams.toName)}
                    value={searchParams.dropPoint}
                    onChange={(val) => {
                      setSearchParams(prev => ({ ...prev, dropPoint: val }));
                    }}
                    placeholder="Drop point"
                    disabled={!searchParams.toName}
                    size="compact"
                    className="!pl-0 !py-0 !h-6 !text-[11px] !border-none !bg-transparent !font-black !text-gray-800 focus:!ring-0"
                    uniqueByLabel={true}
                  />
                </div>

                {/* Date */}
                <div className="flex-1 p-1 px-2 min-w-[120px]">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0">Onward journey</p>
                  <div className="flex items-center">
                    <input
                      type="date"
                      value={searchParams.pickupDate}
                      onChange={(e) => setSearchParams({ ...searchParams, pickupDate: e.target.value })}
                      className="w-full bg-transparent border-none p-0 h-6 text-[11px] font-black text-gray-800 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Guests */}
                <div className="flex-1 p-1 px-2 relative guest-selector min-w-[100px]">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0">Guests</p>
                  <div
                    onClick={() => setIsGuestsOpen(!isGuestsOpen)}
                    className="flex justify-between items-center h-6 cursor-pointer"
                  >
                    <span className="text-[11px] font-black text-gray-800">{searchParams.guests} Guest</span>
                    <Users size={12} className="text-gray-400" />
                  </div>

                  {isGuestsOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-xl p-3 z-50 min-w-[180px] animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Pax</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSearchParams(prev => ({ ...prev, guests: Math.max(1, prev.guests - 1) }))}
                            className="w-7 h-7 flex items-center justify-center rounded border border-gray-100 text-gray-400 hover:bg-gray-50 active:scale-95 transition-all font-black"
                          >
                            −
                          </button>
                          <span className="text-[12px] font-black text-gray-800 min-w-[12px] text-center">{searchParams.guests}</span>
                          <button
                            type="button"
                            onClick={() => setSearchParams(prev => ({ ...prev, guests: prev.guests + 1 }))}
                            className="w-7 h-7 flex items-center justify-center rounded border border-gray-100 text-gray-400 hover:bg-gray-50 active:scale-95 transition-all font-black"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleSearch}
                className="bg-[#14532d] text-white px-6 py-3 rounded-lg font-black flex items-center gap-2 hover:bg-[#0f4022] transition-all shadow-md active:scale-95 text-[11px] uppercase tracking-wider h-[46px]"
              >
                <Search size={14} />
                Search
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Content Area */}
      {!isSearched ? (
        <div>

          {/* ── STATS STRIP ─────────────────────────────── */}
          <div className="bg-emerald-800 py-8 px-6">
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: "5,000+", label: "Transfers Completed" },
                { value: "50+", label: "Cities Covered" },
                { value: "100%", label: "Verified Drivers" },
                { value: "24/7", label: "Support Desk" },
              ].map(s => (
                <div key={s.label} className="text-white">
                  <p className="text-3xl font-black italic tracking-tighter text-white">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── WHY BOOK WITH US (DARK) ──────────────────── */}
          <div className="py-20 px-6 bg-slate-900 relative overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-700/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-emerald-900/30 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-14">
                <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-400 font-black">Why Travel With Goimomi</span>
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none mt-2 mb-4">
                  More Than Just <span className="text-emerald-400">A Cab Booking</span>
                </h2>
                <p className="max-w-2xl mx-auto text-slate-400 text-sm leading-relaxed">
                  Booking a transfer through Goimomi means a verified professional chauffeur, transparent pricing, real-time
                  coordination, and a dedicated travel desk — not just a random car from an app.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  {
                    icon: <ShieldCheck className="w-5 h-5" />,
                    title: "Verified Professional Drivers",
                    desc: "Every chauffeur on our platform is background-verified, licensed, and trained in professional conduct — so you travel with complete confidence."
                  },
                  {
                    icon: <CreditCard className="w-5 h-5" />,
                    title: "All-Inclusive Transparent Pricing",
                    desc: "The price you see is the price you pay. No surge charges, no hidden airport fees, no surprise toll additions — complete cost transparency from the start."
                  },
                  {
                    icon: <Clock className="w-5 h-5" />,
                    title: "Complimentary Wait Time",
                    desc: "We include 30 minutes of free waiting time on all airport pickups — because flight delays happen. No extra charges for the first 30 minutes."
                  },
                  {
                    icon: <Headphones className="w-5 h-5" />,
                    title: "24/7 Travel Desk Support",
                    desc: "Our team is available around the clock to handle last-minute changes, flight delays, route modifications, or any transfer-related emergency."
                  },
                  {
                    icon: <Award className="w-5 h-5" />,
                    title: "Meet & Greet Service",
                    desc: "Your driver will be waiting with a name board at the arrival hall — guiding you smoothly to the vehicle without any confusing waits or calls."
                  },
                  {
                    icon: <BadgeCheck className="w-5 h-5" />,
                    title: "Free Cancellation Policy",
                    desc: "Cancel up to 48 hours before your pickup at zero cost. Modify your booking details anytime without penalty — complete flexibility for your plans."
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="p-7 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-700/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                      {item.icon}
                    </div>
                    <h3 className="text-base font-bold uppercase tracking-tight text-white mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-[13px] leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SERVICE TYPES ────────────────────────────── */}
          <div className="py-20 px-6 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-14">
                <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Our Services</span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
                  Transfer Solutions <span className="text-emerald-700">For Every Journey</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  {
                    emoji: "✈️",
                    title: "Airport Transfers",
                    desc: "Punctual, stress-free pickups and drop-offs at all major domestic and international airports. Flight tracking included — your driver waits even if your flight is late.",
                    tags: ["Arrival", "Departure", "Layover"],
                    color: "from-blue-50 to-indigo-50 border-blue-100",
                  },
                  {
                    emoji: "🏙️",
                    title: "Intercity Transfers",
                    desc: "Comfortable point-to-point rides between cities with professional drivers, air-conditioned vehicles, and flexible departure times. Ideal for group travel.",
                    tags: ["Sedan", "SUV", "Minivan"],
                    color: "from-emerald-50 to-green-50 border-emerald-100",
                  },
                  {
                    emoji: "💼",
                    title: "Corporate Travel",
                    desc: "Premium executive transfers for business travellers — quiet, punctual, and professional. Ideal for client pickups, site visits, and conference transfers.",
                    tags: ["Executive", "Group", "Recurring"],
                    color: "from-orange-50 to-amber-50 border-orange-100",
                  },
                  {
                    emoji: "🕌",
                    title: "Pilgrimage Transfers",
                    desc: "Specialised transfers in Jeddah, Makkah, Madinah & Taif for Umrah and Hajj pilgrims. Managed with reverence, punctuality, and deep spiritual understanding.",
                    tags: ["Makkah", "Madinah", "Jeddah", "Taif"],
                    color: "from-rose-50 to-pink-50 border-rose-100",
                  },
                  {
                    emoji: "🗺️",
                    title: "City & Sightseeing Tours",
                    desc: "Explore cities with knowledgeable local drivers on custom hourly or full-day hire basis. Perfect for tourists and first-time visitors.",
                    tags: ["Hourly", "Full Day", "Custom"],
                    color: "from-violet-50 to-purple-50 border-violet-100",
                  },
                  {
                    emoji: "👨‍👩‍👧‍👦",
                    title: "Group & Event Transfers",
                    desc: "Coordinated multi-vehicle transfers for large groups, weddings, conferences, or sporting events. Single-point booking with synchronized arrivals.",
                    tags: ["Fleet", "Events", "MICE"],
                    color: "from-teal-50 to-cyan-50 border-teal-100",
                  },
                ].map((svc, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className={`p-7 rounded-2xl border bg-gradient-to-br ${svc.color} hover:shadow-lg transition-all`}
                  >
                    <div className="text-3xl mb-4">{svc.emoji}</div>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 mb-2">{svc.title}</h3>
                    <p className="text-slate-600 text-[13px] leading-relaxed mb-4">{svc.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {svc.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-black uppercase tracking-widest bg-white/70 px-2.5 py-1 rounded-full text-slate-600">{tag}</span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* ── HOW TO BOOK ──────────────────────────────── */}
          <div className="py-20 px-6 bg-slate-50">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Simple Process</span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
                  Book Your Transfer <span className="text-emerald-700">In 4 Steps</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { step: "01", emoji: "🔍", title: "Search Your Route", desc: "Enter your pickup city, destination, travel date, and number of passengers above to see available vehicles instantly." },
                  { step: "02", emoji: "🚗", title: "Choose Your Vehicle", desc: "Select from Sedans, SUVs, and Minivans based on your group size, luggage, and budget — all transparently priced." },
                  { step: "03", emoji: "📋", title: "Fill Your Details", desc: "Enter your contact information, flight details, and any special requirements. Our team reviews every booking personally." },
                  { step: "04", emoji: "✅", title: "Confirmed & Ready", desc: "Receive instant booking confirmation. Your verified driver will be at your pickup point on time — with your name on a board." },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative flex flex-col items-start p-7 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all group"
                  >
                    {i < 3 && <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-200 hidden lg:block z-10" />}
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-4xl font-black italic text-slate-100 group-hover:text-emerald-100 transition-colors">{s.step}</span>
                      <span className="text-2xl">{s.emoji}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight mb-2">{s.title}</h3>
                    <p className="text-slate-500 text-[13px] leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CTA STRIP ────────────────────────────────── */}
          <div className="py-16 px-6 bg-gradient-to-br from-emerald-800 to-emerald-950 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-[60px]" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-[60px]" />
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-300 font-black mb-2">Need help booking?</p>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
                  Talk to Our Transfer <span className="text-emerald-300">Specialists</span>
                </h2>
                <p className="text-emerald-100/70 text-sm mt-2 max-w-lg">
                  For group bookings, custom routes, pilgrimage transfers, or corporate accounts — our travel desk is ready to help.
                </p>
                <div className="flex flex-wrap gap-5 mt-4">
                  {["Free Cancellation", "No Hidden Fees", "Instant Confirmation"].map(b => (
                    <div key={b} className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a
                  href="tel:+918110082222"
                  className="px-8 py-4 bg-white text-emerald-800 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all shadow-xl rounded-sm whitespace-nowrap text-center"
                >
                  📞 CALL US NOW
                </a>
                <a
                  href="https://wa.me/918110082222"
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 py-4 bg-transparent border-2 border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all rounded-sm whitespace-nowrap text-center"
                >
                  💬 WHATSAPP US
                </a>
              </div>
            </div>
          </div>

        </div>
      ) : !isBooking ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-1/4 space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="text-base font-black text-gray-900 mb-5 tracking-tight">Why Book with Us?</h3>
                <div className="space-y-4">
                  {[
                    { title: "All-inclusive pricing", desc: "No hidden fees or surprises at checkout", icon: "💵" },
                    { title: "Free wait time", desc: "Complimentary wait time up to 60 min", icon: "🕒" },
                    { title: "Flexible Changes", desc: "Modify booking details with ease", icon: "🔄" },
                    { title: "Free Cancellation", desc: "Cancel your booking easily up to 24 hrs before pickup", icon: "📅" },
                    { title: "Meet & Greet included", desc: "Driver will welcome you at pickup", icon: "👥" },
                    { title: "Delay compensation", desc: "Get covered for flight delays", icon: "✈️" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-black text-gray-900 leading-tight mb-0.5">{item.title}</h4>
                        <p className="text-[12px] text-gray-500 leading-normal font-bold">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4 space-y-6">

              {/* Vehicle List */}
              <div className="space-y-4">
                {searchLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white rounded-2xl h-48 animate-pulse border border-gray-100 flex shadow-sm">
                        <div className="w-[28%] bg-gray-50"></div>
                        <div className="flex-1 p-5 space-y-4">
                          <div className="h-6 bg-gray-100 w-1/3 rounded"></div>
                          <div className="h-4 bg-gray-100 w-1/2 rounded"></div>
                          <div className="flex gap-4">
                            <div className="h-4 bg-gray-100 w-16 rounded"></div>
                            <div className="h-4 bg-gray-100 w-16 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : vehicles.length > 0 ? (
                  vehicles.map((car) => (
                    <div key={car.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow max-w-4xl mx-auto">
                      {/* Share Bar - TOP */}
                      <div className="bg-white border-b border-gray-100 flex items-center justify-end gap-3 px-3 py-1.5 rounded-t-xl">
                        <div className="flex items-center gap-1.5 text-[#14532d] font-bold text-[9px] uppercase tracking-wider">
                          <Share2 size={11} className="text-[#14532d]/70" />
                          <span className="hidden sm:inline">Share By :</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const text = `Hello, please find details for the following cab transfer:\n\nVehicle: ${car.name}\nCategory: ${car.category}\nPassengers: ${car.passengers} Pax\nBags: ${car.bags}\nRoute: ${searchParams.fromName} → ${searchParams.toName}\nDate: ${searchParams.pickupDate}\nGuests: ${searchParams.guests}\nPrice: ₹${Number(car.price || 0).toLocaleString('en-IN')}\n\nFree cancellation till ${new Date(new Date(searchParams.pickupDate).getTime() - 172800000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n\nThank you for choosing goimomi.com\nContact: +91 8110082222\nEmail: hello@goimomi.com`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="flex items-center gap-1 text-[#14532d] hover:text-[#14532d]/80 font-bold text-[9px] md:text-[10px] transition-colors"
                          >
                            <MessageCircle size={12} />
                            WhatsApp
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmailModalCar(car);
                              setSharingEmail("");
                            }}
                            className="flex items-center gap-1 text-[#14532d] hover:text-[#14532d]/80 font-bold text-[9px] md:text-[10px] transition-colors"
                          >
                            <Mail size={12} />
                            Email
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewDetailsCar(car);
                            }}
                            className="flex items-center gap-1 text-yellow-500 hover:text-yellow-600 font-bold text-[9px] md:text-[10px] transition-colors"
                          >
                            <Eye size={12} />
                            View
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 divide-gray-100 h-auto md:h-36">
                        {/* Image */}
                        <div className="md:w-[28%] relative overflow-hidden bg-white flex items-center justify-center h-48 md:h-full p-3 shrink-0">
                          {car.image ? (
                            <img
                              src={car.image}
                              alt={car.name}
                              className="w-full h-full object-contain rounded-2xl"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-50 rounded-2xl flex items-center justify-center text-4xl">
                              🚗
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 p-3 md:px-5 md:py-3 flex flex-col md:flex-row justify-between gap-2">
                          <div className="flex flex-col justify-center space-y-1.5">
                            <div>
                              <h3 className="text-base font-black text-gray-900 leading-tight uppercase tracking-tight">{car.name}</h3>
                              <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{car.category}</p>
                            </div>

                            <div className="flex flex-wrap gap-3 items-center">
                              <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                <Users size={11} className="text-gray-300" />
                                {car.passengers} Pax
                              </div>
                              <div className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                <span className="text-sm leading-none grayscale opacity-70">🧳</span>
                                {car.bags} Bags
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-600 flex-wrap">
                              <span className="bg-orange-50 text-orange-600 text-[8px] font-black px-1.5 py-0.5 rounded border border-orange-100/50 uppercase tracking-wider">
                                {car.pickup_point}
                              </span>
                              <span className="text-gray-300 text-[8px]">➔</span>
                              <span className="bg-[#14532d]/5 text-[#14532d] text-[8px] font-black px-1.5 py-0.5 rounded border border-[#14532d]/10 uppercase tracking-wider">
                                {car.drop_point}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[8px] font-black text-green-600 bg-green-50/50 px-2.5 py-1 rounded-full w-max border border-green-100 uppercase tracking-widest leading-none">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 text-white flex items-center justify-center text-[5px] font-black">✓</div>
                              Free cancellation till {new Date(new Date(searchParams.pickupDate).getTime() - 172800000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                            </div>

                          </div>

                          {/* Price & Book */}
                          <div className="flex flex-col justify-center items-end gap-2 min-w-[110px]">
                            <div className="text-right">
                              <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest block mb-0.5">Starting from</span>
                              <div className="flex items-baseline gap-0.5 text-[#14532d]">
                                <span className="text-base font-black">₹</span>
                                <span className="text-3xl font-black tracking-tighter">{Number(car?.price || 0).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 w-full mt-2">
                              <button
                                onClick={() => handleBookNow(car)}
                                className="w-full bg-[#14532d] text-white py-1.5 px-3 rounded-lg font-black text-[8px] uppercase tracking-[0.2em] hover:bg-[#0f4022] transition-all shadow-sm active:scale-95 whitespace-nowrap"
                              >
                                Book Now
                              </button>
                              <button
                                onClick={() => handleAddToCart(car)}
                                className="w-full bg-white border border-[#14532d] text-[#14532d] py-1.5 px-3 rounded-lg font-black text-[8px] uppercase tracking-[0.2em] hover:bg-green-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                              >
                                Add to Cart {cart.filter(c => c.id === car.id).length > 0 && `(${cart.filter(c => c.id === car.id).length})`}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🚗</div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No Vehicles Available</h3>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Try changing your route or date</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* View Details Modal */}
      {viewDetailsCar && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewDetailsCar(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-4 py-3 border-b">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const text = `Vehicle: ${viewDetailsCar.name}\nCategory: ${viewDetailsCar.category}\nPassengers: ${viewDetailsCar.passengers} Pax\nBags: ${viewDetailsCar.bags}\nRoute: ${searchParams.fromName} → ${searchParams.toName}\nDate: ${searchParams.pickupDate}\nPrice: ₹${Number(viewDetailsCar.price || 0).toLocaleString('en-IN')}\n\nThank you for choosing goimomi.com\nContact: +91 8110082222\nEmail: hello@goimomi.com`;
                    navigator.clipboard.writeText(text);
                    alert("Details with price copied to clipboard!");
                  }}
                  className="flex items-center gap-1 text-[#14532d] font-bold text-[10px] hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors border border-green-100"
                >
                  <Copy size={12} />
                  With Price
                </button>
                <button
                  onClick={() => {
                    const text = `Vehicle: ${viewDetailsCar.name}\nCategory: ${viewDetailsCar.category}\nPassengers: ${viewDetailsCar.passengers} Pax\nBags: ${viewDetailsCar.bags}\nRoute: ${searchParams.fromName} → ${searchParams.toName}\nDate: ${searchParams.pickupDate}\n\nThank you for choosing goimomi.com\nContact: +91 8110082222\nEmail: hello@goimomi.com`;
                    navigator.clipboard.writeText(text);
                    alert("Details without price copied to clipboard!");
                  }}
                  className="flex items-center gap-1 text-[#14532d] font-bold text-[10px] hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors border border-green-100"
                >
                  <Copy size={12} />
                  Without Price
                </button>
              </div>
              <h3 className="text-base font-bold text-gray-800">View Details</h3>
              <button onClick={() => setViewDetailsCar(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <div className="font-sans text-[12px] text-gray-700 leading-relaxed">
                <p>Hello, please find the cab transfer details:</p>
                <br />
                <p className="text-gray-400 text-[10px]">-------------------------------------------------------------</p>
                <div className="space-y-1.5 mt-2">
                  <p><span className="font-bold">Vehicle:</span> {viewDetailsCar.name}</p>
                  <p><span className="font-bold">Category:</span> {viewDetailsCar.category}</p>
                  <p><span className="font-bold">Passengers:</span> {viewDetailsCar.passengers} Pax</p>
                  <p><span className="font-bold">Bags:</span> {viewDetailsCar.bags}</p>
                  <p><span className="font-bold">From:</span> {searchParams.fromName}</p>
                  <p><span className="font-bold">To:</span> {searchParams.toName}</p>
                  <p><span className="font-bold">Date:</span> {searchParams.pickupDate}</p>
                  <p><span className="font-bold">Guests:</span> {searchParams.guests}</p>
                  <p><span className="font-bold">Price:</span> ₹{Number(viewDetailsCar.price || 0).toLocaleString('en-IN')}</p>
                  <p><span className="font-bold">Free Cancellation till:</span> {new Date(new Date(searchParams.pickupDate).getTime() - 172800000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <p className="text-gray-400 text-[10px] mt-2">-------------------------------------------------------------</p>
                <p className="mt-2">Thank you for choosing goimomi.com</p>
                <p>In case of any support :</p>
                <p>Contact : <span className="font-bold">+91 8110082222</span></p>
                <p>Email : <span className="font-bold">hello@goimomi.com</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Share Modal */}
      {emailModalCar && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEmailModalCar(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Share via Email</h3>
                <button onClick={() => setEmailModalCar(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Enter the email address to share the cab details for <span className="font-bold text-gray-700">{emailModalCar.name}</span>.</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!sharingEmail || !emailModalCar) return;
                  setSendingEmail(true);
                  const subject = `Cab Transfer: ${emailModalCar.name} — ${searchParams.fromName} to ${searchParams.toName}`;
                  const body = `Hello, please find the cab transfer details:\n\nVehicle: ${emailModalCar.name}\nCategory: ${emailModalCar.category}\nPassengers: ${emailModalCar.passengers} Pax\nBags: ${emailModalCar.bags}\nFrom: ${searchParams.fromName}\nTo: ${searchParams.toName}\nDate: ${searchParams.pickupDate}\nGuests: ${searchParams.guests}\nPrice: ₹${Number(emailModalCar.price || 0).toLocaleString('en-IN')}\nFree Cancellation till: ${new Date(new Date(searchParams.pickupDate).getTime() - 172800000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n\nThank you for choosing goimomi.com\nContact: +91 8110082222\nEmail: hello@goimomi.com`;
                  try {
                    await api.post('/api/send-visa-details/', { email: sharingEmail, subject, body });
                    alert("Details sent successfully to " + sharingEmail);
                  } catch {
                    window.location.href = `mailto:${sharingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  } finally {
                    setSendingEmail(false);
                    setEmailModalCar(null);
                    setSharingEmail("");
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="example@email.com"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14532d]/20 focus:border-[#14532d] outline-none transition-all text-sm"
                    value={sharingEmail}
                    onChange={(e) => setSharingEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="w-full py-3 bg-[#14532d] hover:bg-[#0f4a24] text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingEmail ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>) : (<><Mail size={16} />Send Details</>)}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <CabCruiseForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCar("");
        }}
        type="Cab"
        initialDescription={selectedCar}
        initialData={{
          from: searchParams.fromName,
          to: searchParams.toName,
          date: searchParams.pickupDate
        }}
      />

      <CabTermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <CabPrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

      {showSuccessModal && (
        <PaymentSuccessModal bookingId={successBookingId} documentToken={successDocumentToken} onClose={handleCloseSuccessModal} />
      )}

      {/* Floating Cart Bar */}
      {cart.length > 0 && !isBooking && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl shrink-0">
                🛒
              </div>
              <div>
                <p className="text-white text-xs font-black uppercase tracking-widest">{cart.length} Cabs Selected</p>
                <p className="text-emerald-400 text-sm font-black mt-0.5">
                  Total: ₹{cart.reduce((sum, item) => sum + Number(item.price || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCart([])}
                className="px-4 py-2 border border-white/10 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white/5 transition-colors active:scale-95"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsBooking(true);
                  // Reset form data except guest info
                  setBookingFormData(prev => ({
                    ...prev,
                    pickupDate: searchParams.pickupDate
                  }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Checkout Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Popup Modal: No Cab Facility Available */}
      {noCabModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 font-sans animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center border border-gray-100 relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setNoCabModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 border border-amber-100 shadow-xs">
              <span className="text-2xl">🚗</span>
            </div>

            <h3 className="text-base font-black text-gray-900 mb-1.5 tracking-tight">No Cab Facility Available</h3>
            
            <p className="text-xs text-gray-600 mb-5 leading-relaxed font-medium">
              There is no cab facility available in the selected route <span className="font-bold text-gray-900">({noCabRouteInfo.from} → {noCabRouteInfo.to})</span>.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setNoCabModalOpen(false);
                  const fallbackMsg = `Transfer Enquiry: From ${searchParams.fromName} to ${searchParams.toName} on ${searchParams.pickupDate} for ${searchParams.guests} guests.`;
                  setSelectedCar(fallbackMsg);
                  setBookingFormData(prev => ({
                    ...prev,
                    pickupPoint: searchParams.pickupPoint || searchParams.fromName,
                    dropPoint: searchParams.dropPoint || searchParams.toName,
                    pickupDate: searchParams.pickupDate
                  }));
                  setIsFormOpen(true);
                }}
                className="w-full py-2.5 px-4 bg-[#14532d] hover:bg-[#0f3d21] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Submit Custom Enquiry
              </button>
              <button
                onClick={() => setNoCabModalOpen(false)}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const PaymentSuccessModal = ({ bookingId, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-5 md:p-6 text-center border border-slate-100 relative overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Decorative background gradient line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-green-600 to-teal-500"></div>
        
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        
        <h2 className="text-lg font-black text-slate-900 mb-0.5 uppercase tracking-tight">
          Payment Successful
        </h2>
        <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-3">
          Thank you for choosing Goimomi
        </p>

        {bookingId && (
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl py-2 px-3 mb-3">
            <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
              Booking ID
            </span>
            <span className="text-sm font-black text-emerald-950 tracking-wide font-mono">
              {bookingId}
            </span>
          </div>
        )}

        <p className="text-slate-600 mb-4 text-xs leading-relaxed font-medium">
          Thank you for booking with <span className="text-[#14532d] font-bold">Goimomi Holidays</span>. 
          Your payment has been received and your booking is confirmed.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all"
        >
          Back to Cab Booking
        </button>
      </div>
    </div>
  );
};


export default Cab;



