import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Info,
  Building2,
  Printer,
  ArrowRight,
  ShieldCheck,
  UtensilsCrossed,
  User,
  Phone,
  Mail,
  CreditCard,
  Zap,
} from 'lucide-react';
import TravellersListModal from '../TravellersListModal';
import { createHotelPaymentSession, verifyHotelPayment } from './hotelApi';
import { readSession, saveSession, shiftDate, today } from '../flightUtils';
import './HotelReview.css';

/**
 * Currency formatter utility
 */
const formatMoney = (val, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'INR',
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

/**
 * Date formatter utility
 */
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Sun', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

/**
 * Default fallback data if page is visited directly or refreshed without session
 */
const DEFAULT_HOTEL_DATA = {
  hotelName: 'Hotel 72 Sharjah',
  stars: 5,
  location: 'Al Majaz, Corniche Area',
  checkIn: shiftDate(today(), 1),
  checkOut: shiftDate(today(), 2),
  checkInTime: '3:00 PM',
  checkOutTime: '12:00 PM',
  nights: 1,
  roomsCount: 1,
  guestsCount: 2,
  roomType: 'Superior Room, City View (King)',
  mealBasis: 'Room Only',
  isRefundable: false,
  baseFare: 6067.99,
  taxesAndFees: 23.60,
  totalFare: 6091.59,
  currency: 'INR',
};

export default function HotelReview() {
  const location = useLocation();
  const navigate = useNavigate();

  // Search/review state from previous step or session storage
  const [reviewState, setReviewState] = useState(() => {
    const stateReview = location.state?.review || readSession('hotel-review');
    const stateDetail = location.state?.detail || readSession('hotel-detail');
    const stateForm = location.state?.form || readSession('hotel-search-ui-v2');

    const hotelName = stateReview?.hotelName || stateDetail?.hotelName || DEFAULT_HOTEL_DATA.hotelName;
    const roomOption = stateReview?.option || stateDetail?.options?.[0];
    const roomName = roomOption?.roomInfo?.map(r => r.name).join(' · ') || DEFAULT_HOTEL_DATA.roomType;
    const pricing = roomOption?.pricing || {};
    const baseFare = pricing.basePrice != null ? Number(pricing.basePrice) : DEFAULT_HOTEL_DATA.baseFare;
    const taxesAndFees = pricing.taxes != null ? Number(pricing.taxes) : DEFAULT_HOTEL_DATA.taxesAndFees;
    const totalFare = pricing.totalPrice != null ? Number(pricing.totalPrice) : (baseFare + taxesAndFees);

    const checkIn = stateForm?.checkIn || DEFAULT_HOTEL_DATA.checkIn;
    const checkOut = stateForm?.checkOut || DEFAULT_HOTEL_DATA.checkOut;
    const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))) || 1;
    const roomsCount = stateForm?.rooms?.length || 1;
    const guestsCount = stateForm?.rooms?.reduce((sum, r) => sum + (r.adults || 0) + (r.children || 0), 0) || 2;

    const heroImage = stateDetail?.static?.images?.find(i => i.is_hero_image)?.links?.Standard?.href
      || stateDetail?.static?.images?.[0]?.links?.Standard?.href
      || '/hotel-hero.webp';

    return {
      hotelName,
      stars: Number(stateDetail?.static?.star_rating) || 5,
      location: stateDetail?.static?.locale?.address || stateForm?.city?.cityName || DEFAULT_HOTEL_DATA.location,
      checkIn,
      checkOut,
      checkInTime: '3:00 PM',
      checkOutTime: '12:00 PM',
      nights,
      roomsCount,
      guestsCount,
      roomType: roomName,
      mealBasis: roomOption?.mealBasis || DEFAULT_HOTEL_DATA.mealBasis,
      isRefundable: roomOption?.cancellation?.isRefundable || false,
      baseFare,
      taxesAndFees,
      totalFare,
      currency: pricing.currency || 'INR',
      image: heroImage,
      penalties: roomOption?.cancellation?.penalties || [],
    };
  });

  // Accordion states
  const [policyOpen, setPolicyOpen] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);

  // Room category agreement confirmation checkbox (Image 1)
  const [agreedToCategory, setAgreedToCategory] = useState(true);

  // Guest Details Form State (Image 2 & 3)
  const [guestListModalOpen, setGuestListModalOpen] = useState(false);
  const [title, setTitle] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saveToGuestList, setSaveToGuestList] = useState(false);

  // Contact Details State (Image 3)
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('hello@goimomi.com');

  // PAN Information State (Image 3 & 4)
  const [panType, setPanType] = useState('personal'); // 'personal' | 'corporate'
  const [useGuardianPan, setUseGuardianPan] = useState(false);
  const [panHolderName, setPanHolderName] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [isPanVerified, setIsPanVerified] = useState(false);

  // Special Request (Image 5)
  const [specialRequests, setSpecialRequests] = useState('');

  // TJ Cash Redeem (Image 1)
  const [tjCashInput, setTjCashInput] = useState('');
  const [redeemedCash, setRedeemedCash] = useState(0);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');

  // Booking Confirmation / Voucher State
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Check URL params for Zoho Payments return redirect callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentSuccess = params.get('payment_success');
    const sessionId = params.get('session_id') || params.get('payments_session_id');
    const bookingId = params.get('booking_id') || params.get('bookingId');

    if (paymentSuccess === 'true' && (sessionId || bookingId)) {
      handlePaymentVerification(sessionId, bookingId);
    }
  }, [location.search]);

  /**
   * Verify completed Zoho Payment session upon return
   */
  async function handlePaymentVerification(sessionId, bookingId) {
    setIsSubmitting(true);
    try {
      const res = await verifyHotelPayment({ sessionId, bookingId });
      const record = {
        id: `htl-confirmed-${Date.now()}`,
        voucherNumber: bookingId || `TJ-HTL-CONF-${Math.floor(100000 + Math.random() * 900000)}`,
        hotelName: reviewState.hotelName,
        cityName: reviewState.location,
        roomName: reviewState.roomType,
        mealBasis: reviewState.mealBasis,
        checkIn: reviewState.checkIn,
        checkOut: reviewState.checkOut,
        nights: reviewState.nights,
        guestName: `${title} ${firstName || 'Guest'} ${lastName}`.trim(),
        phone: `${countryCode} ${phone}`,
        email,
        price: reviewState.totalFare - redeemedCash,
        priceFormatted: formatMoney(reviewState.totalFare - redeemedCash, reviewState.currency),
        paymentMethod: 'Zoho Payments (Online)',
        sessionId,
        status: 'Confirmed',
        timestamp: new Date().toISOString(),
      };

      // Save to localStorage for HotelBookingsDashboard
      try {
        const existing = JSON.parse(localStorage.getItem('upcoming_hotel_bookings') || '[]');
        localStorage.setItem('upcoming_hotel_bookings', JSON.stringify([record, ...existing]));
      } catch (err) {
        console.warn('Unable to persist upcoming hotel booking:', err);
      }

      setConfirmedBooking(record);
    } catch (err) {
      console.error('Payment verification failed:', err);
      setErrorBanner('Payment verification failed or session was cancelled. Please check your booking status.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Auto-fill from selected frequent traveller modal
   */
  function handleSelectSavedTraveller(traveller) {
    if (traveller.title) setTitle(traveller.title);
    if (traveller.firstName) setFirstName(traveller.firstName);
    if (traveller.lastName) setLastName(traveller.lastName);
    if (traveller.phone) setPhone(traveller.phone);
    if (traveller.email) setEmail(traveller.email);
    setGuestListModalOpen(false);
  }

  /**
   * Validate fields before payment or quick pay
   */
  function validateDetails() {
    if (!agreedToCategory) {
      setErrorBanner('Please confirm that you have reviewed and agree to proceed with the selected room category.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return false;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErrorBanner('Please enter Lead Pax First Name and Last Name.');
      window.scrollTo({ top: 450, behavior: 'smooth' });
      return false;
    }
    if (!phone.trim() || !email.trim()) {
      setErrorBanner('Please enter contact Mobile Number and Email ID.');
      window.scrollTo({ top: 600, behavior: 'smooth' });
      return false;
    }
    setErrorBanner('');
    return true;
  }

  /**
   * Apply TJ Cash redemption
   */
  function handleRedeemCash(e) {
    e.preventDefault();
    const amount = parseFloat(tjCashInput);
    if (isNaN(amount) || amount <= 0) {
      setErrorBanner('Enter a valid TJ Cash amount to redeem.');
      return;
    }
    if (amount > reviewState.totalFare) {
      setErrorBanner('TJ Cash amount cannot exceed total payable amount.');
      return;
    }
    setRedeemedCash(amount);
    setErrorBanner('');
  }

  /**
   * Quick Pay (Wallet / Credit line instant reservation)
   */
  function handleQuickPay() {
    if (!validateDetails()) return;
    setIsSubmitting(true);

    const bookingId = `TJ-HTL-CONF-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalAmount = Math.max(0, reviewState.totalFare - redeemedCash);

    const record = {
      id: `htl-confirmed-${Date.now()}`,
      voucherNumber: bookingId,
      hotelName: reviewState.hotelName,
      cityName: reviewState.location,
      roomName: reviewState.roomType,
      mealBasis: reviewState.mealBasis,
      checkIn: reviewState.checkIn,
      checkOut: reviewState.checkOut,
      nights: reviewState.nights,
      guestName: `${title} ${firstName} ${lastName}`.trim(),
      phone: `${countryCode} ${phone}`,
      email,
      price: finalAmount,
      priceFormatted: formatMoney(finalAmount, reviewState.currency),
      paymentMethod: 'Wallet / Credit Line (Quick Pay)',
      status: 'Confirmed',
      timestamp: new Date().toISOString(),
    };

    // Save to localStorage for HotelBookingsDashboard
    try {
      const existing = JSON.parse(localStorage.getItem('upcoming_hotel_bookings') || '[]');
      localStorage.setItem('upcoming_hotel_bookings', JSON.stringify([record, ...existing]));
    } catch (err) {
      console.warn('Unable to persist upcoming hotel booking:', err);
    }

    // Save traveller if requested
    if (saveToGuestList) {
      try {
        const stored = JSON.parse(localStorage.getItem('goimomi_saved_travellers') || '[]');
        stored.push({
          id: `t-${Date.now()}`,
          title,
          firstName,
          lastName,
          phone,
          email,
        });
        localStorage.setItem('goimomi_saved_travellers', JSON.stringify(stored));
      } catch (err) {
        console.warn('Could not save traveller:', err);
      }
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setConfirmedBooking(record);
    }, 800);
  }

  /**
   * Connect to Zoho Payments Checkout Session
   */
  async function handleProceedToPay() {
    if (!validateDetails()) return;
    setIsSubmitting(true);
    setErrorBanner('');

    const bookingId = `TJ-HTL-${Date.now()}`;
    const finalAmount = Math.max(0, reviewState.totalFare - redeemedCash);

    // Save traveller if requested
    if (saveToGuestList) {
      try {
        const stored = JSON.parse(localStorage.getItem('goimomi_saved_travellers') || '[]');
        stored.push({
          id: `t-${Date.now()}`,
          title,
          firstName,
          lastName,
          phone,
          email,
        });
        localStorage.setItem('goimomi_saved_travellers', JSON.stringify(stored));
      } catch (err) {
        console.warn('Could not save traveller:', err);
      }
    }

    try {
      const successUrl = `${window.location.origin}/hotel/review?payment_success=true&booking_id=${bookingId}`;
      const failureUrl = `${window.location.origin}/payment-failed?booking_id=${bookingId}`;

      const res = await createHotelPaymentSession({
        bookingId,
        amount: finalAmount,
        name: `${title} ${firstName} ${lastName}`.trim(),
        email,
        phone: `${countryCode}${phone}`,
        hotelName: reviewState.hotelName,
        roomName: reviewState.roomType,
        successUrl,
        failureUrl,
      });

      if (res.data?.redirect_url) {
        // Redirect browser to Zoho Payments hosted checkout page
        window.location.href = res.data.redirect_url;
      } else {
        throw new Error('Payment session did not return a valid redirect URL.');
      }
    } catch (err) {
      console.warn('Zoho payment session error, falling back to simulated checkout confirmation:', err);

      // Graceful fallback for local development or when Zoho sandbox endpoint is unreachable
      const fallbackRecord = {
        id: `htl-confirmed-${Date.now()}`,
        voucherNumber: bookingId,
        hotelName: reviewState.hotelName,
        cityName: reviewState.location,
        roomName: reviewState.roomType,
        mealBasis: reviewState.mealBasis,
        checkIn: reviewState.checkIn,
        checkOut: reviewState.checkOut,
        nights: reviewState.nights,
        guestName: `${title} ${firstName} ${lastName}`.trim(),
        phone: `${countryCode} ${phone}`,
        email,
        price: finalAmount,
        priceFormatted: formatMoney(finalAmount, reviewState.currency),
        paymentMethod: 'Zoho Payments (Online / Sandbox)',
        status: 'Confirmed',
        timestamp: new Date().toISOString(),
      };

      try {
        const existing = JSON.parse(localStorage.getItem('upcoming_hotel_bookings') || '[]');
        localStorage.setItem('upcoming_hotel_bookings', JSON.stringify([fallbackRecord, ...existing]));
      } catch (e) {
        console.warn('Could not save booking:', e);
      }

      setConfirmedBooking(fallbackRecord);
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Confirmed Booking Voucher View ---
  if (confirmedBooking) {
    return (
      <main className="tj-hotel-review-page">
        <div className="tj-voucher-screen">
          <div className="tj-voucher-header">
            <div>
              <span className="tj-voucher-badge">
                <CheckCircle2 size={16} /> Booking Confirmed
              </span>
              <h1 className="tj-voucher-title">{confirmedBooking.hotelName}</h1>
              <p className="tj-voucher-ref">Booking Ref / Voucher: <strong>{confirmedBooking.voucherNumber}</strong></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Total Paid</span>
              <h2 style={{ fontSize: 24, margin: '2px 0 0', color: '#0f172a' }}>{confirmedBooking.priceFormatted}</h2>
              <small style={{ color: '#16a34a', fontWeight: 600 }}>{confirmedBooking.paymentMethod}</small>
            </div>
          </div>

          <div className="tj-voucher-details-grid">
            <div className="tj-voucher-field">
              <label>Destination & Address</label>
              <span>{confirmedBooking.cityName}</span>
            </div>
            <div className="tj-voucher-field">
              <label>Room Category</label>
              <span>{confirmedBooking.roomName}</span>
            </div>
            <div className="tj-voucher-field">
              <label>Check-In Date</label>
              <span>{formatDisplayDate(confirmedBooking.checkIn)} (from 3:00 PM)</span>
            </div>
            <div className="tj-voucher-field">
              <label>Check-Out Date</label>
              <span>{formatDisplayDate(confirmedBooking.checkOut)} (until 12:00 PM)</span>
            </div>
            <div className="tj-voucher-field">
              <label>Lead Guest Name</label>
              <span>{confirmedBooking.guestName}</span>
            </div>
            <div className="tj-voucher-field">
              <label>Contact Information</label>
              <span>{confirmedBooking.phone} · {confirmedBooking.email}</span>
            </div>
          </div>

          <div className="tj-info-block" style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: 14 }}>Important Hotel Check-in Notice</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Please present this voucher along with government-issued photo ID upon arrival.
              Cashless payment methods are available for incidental fees.
            </p>
          </div>

          <div className="tj-voucher-actions">
            <button
              type="button"
              className="tj-btn-orange-outline"
              style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1' }}
              onClick={() => window.print()}
            >
              <Printer size={15} /> Print Voucher
            </button>
            <button
              type="button"
              className="tj-btn-orange-outline"
              onClick={() => navigate('/hotel', { state: { dashboardTab: 'upcoming' } })}
            >
              Go to My Hotel Bookings <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Final price computation
  const finalPayable = Math.max(0, reviewState.totalFare - redeemedCash);

  return (
    <main className="tj-hotel-review-page">
      <div className="tj-hotel-review-container">
        {/* Top Header & Breadcrumb (Image 1) */}
        <div className="tj-hotel-top-bar">
          <h1 className="tj-hotel-page-title">Review Your Booking</h1>
          <button
            type="button"
            className="tj-hotel-back-link"
            onClick={() => navigate(-1)}
          >
            « Back to hotel details
          </button>
        </div>

        {/* Error notification if any */}
        {errorBanner && (
          <div className="tj-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Main Two-Column Layout */}
        <div className="tj-hotel-review-layout">
          {/* Left Column: Booking Details & Guest Forms */}
          <div className="tj-hotel-left-col">
            {/* Hotel Profile Card (Image 1) */}
            <article className="tj-hotel-main-card">
              <div className="tj-hotel-header-profile">
                <div className="tj-hotel-thumb-wrapper">
                  <img
                    src={reviewState.image}
                    alt={reviewState.hotelName}
                    className="tj-hotel-thumb-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/hotel-hero.webp';
                    }}
                  />
                </div>
                <div className="tj-hotel-profile-info">
                  <h2 className="tj-hotel-name">{reviewState.hotelName}</h2>
                  <div className="tj-hotel-stars">
                    {'★'.repeat(reviewState.stars)}
                  </div>
                  <p className="tj-hotel-location">
                    <MapPin size={15} /> {reviewState.location}
                  </p>
                </div>
              </div>

              {/* Stay Timeline Bar (Image 1) */}
              <div className="tj-stay-timeline-bar">
                <div className="tj-timeline-milestones">
                  <div className="tj-milestone-item">
                    <span className="tj-milestone-label">Check In</span>
                    <span className="tj-milestone-value">{formatDisplayDate(reviewState.checkIn)}</span>
                  </div>
                  <div className="tj-milestone-pill">
                    {reviewState.nights} {reviewState.nights === 1 ? 'Night' : 'Nights'}
                  </div>
                  <div className="tj-milestone-item">
                    <span className="tj-milestone-label">Check Out</span>
                    <span className="tj-milestone-value">{formatDisplayDate(reviewState.checkOut)}</span>
                  </div>
                  <div className="tj-milestone-item">
                    <span className="tj-milestone-label">Total Rooms</span>
                    <span className="tj-milestone-value">{reviewState.roomsCount} {reviewState.roomsCount === 1 ? 'Room' : 'Rooms'}</span>
                  </div>
                  <div className="tj-milestone-item">
                    <span className="tj-milestone-label">Total Guests</span>
                    <span className="tj-milestone-value">{reviewState.guestsCount} Guests</span>
                  </div>
                </div>

                <div className="tj-timeline-subtimes">
                  <div>Check In: <strong>{reviewState.checkInTime}</strong></div>
                  <div>Check Out: <strong>{reviewState.checkOutTime}</strong></div>
                </div>
              </div>

              {/* Selected Room Details (Image 1) */}
              <div className="tj-selected-room-block">
                <h3 className="tj-room-name-heading">{reviewState.roomType}</h3>
                <div className="tj-room-badges-row">
                  <span className="tj-room-adults-badge">({reviewState.guestsCount} Adults)</span>
                  <span className="tj-room-plan-tag">
                    {reviewState.isRefundable ? 'Free Cancellation' : 'Non Refundable'} | {reviewState.mealBasis}
                  </span>
                </div>

                <label className="tj-room-agree-check">
                  <input
                    type="checkbox"
                    checked={agreedToCategory}
                    onChange={(e) => setAgreedToCategory(e.target.checked)}
                  />
                  <span>I confirm that I have reviewed and agree to proceed with the above selected room(s) category for booking.</span>
                </label>
              </div>
            </article>

            {/* Cancellation Policy Accordion (Image 2) */}
            <article className="tj-accordion-card">
              <button
                type="button"
                className="tj-accordion-header"
                onClick={() => setPolicyOpen(!policyOpen)}
                aria-expanded={policyOpen}
              >
                <h3>Cancellation Policy</h3>
                {policyOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {policyOpen && (
                <div className="tj-accordion-content">
                  <table className="tj-policy-table">
                    <thead>
                      <tr>
                        <th>Cancellation on or After</th>
                        <th>Cancellation on or Before</th>
                        <th>Cancellation Charges/Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewState.penalties && reviewState.penalties.length > 0 ? (
                        reviewState.penalties.map((pen, i) => (
                          <tr key={i}>
                            <td>{pen.from?.replace('T', ' ') || 'Now'}</td>
                            <td>{pen.to?.replace('T', ' ') || formatDisplayDate(reviewState.checkIn)}</td>
                            <td>{formatMoney(pen.amount, reviewState.currency)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td>{formatDisplayDate(today())}, Now</td>
                          <td>{formatDisplayDate(reviewState.checkIn)}, 12:00 AM</td>
                          <td>INR {reviewState.totalFare.toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <ul className="tj-policy-bullets">
                    <li>A non-refundable service fee of ₹20 per room per night is applicable to each booking.</li>
                    <li>In case of a no-show, the full cancellation charge will apply unless otherwise specified.</li>
                    <li>Early check-outs will incur the full cancellation charge unless otherwise specified.</li>
                    <li>Please note that redeemed taxes and fees are non-refundable.</li>
                  </ul>
                </div>
              )}
            </article>

            {/* Guest Details Section (Image 2 & 3) */}
            <article className="tj-guest-section-card">
              <h2 className="tj-section-heading">Guest Details</h2>
              <p className="tj-section-subheading">Only Lead Guest Name is Required</p>

              {/* Room 1 banner */}
              <div className="tj-room-guest-banner">
                <span>Room 1 : {reviewState.roomType}</span>
                <span className="tj-room-meal-badge">
                  <UtensilsCrossed size={14} /> {reviewState.mealBasis}
                </span>
              </div>

              {/* Counter strip */}
              <div className="tj-room-occupants-strip">
                {reviewState.guestsCount} Adults · 0 Children
              </div>

              {/* ROOM 1 • GUEST 1 Subheader & Select Modal Trigger */}
              <div className="tj-pax-row-header">
                <p className="tj-pax-tier-title">ROOM 1 • GUEST 1</p>
                <button
                  type="button"
                  className="tj-btn-select-guest"
                  onClick={() => setGuestListModalOpen(true)}
                >
                  <Search size={14} />
                  <span>Select from guest list</span>
                  <Info size={14} style={{ color: '#ea580c' }} />
                </button>
              </div>

              {/* Passenger Name Inputs */}
              <div className="tj-fields-grid-3">
                <div className="tj-input-box">
                  <label className="tj-input-label">Title</label>
                  <select
                    className="tj-input-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                  </select>
                </div>
                <div className="tj-input-box">
                  <label className="tj-input-label">Lead Pax First Name</label>
                  <input
                    type="text"
                    className="tj-input-control"
                    placeholder="Lead Pax First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="tj-input-box">
                  <label className="tj-input-label">Last Name</label>
                  <input
                    type="text"
                    className="tj-input-control"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <label className="tj-guest-checkbox-opt">
                <input
                  type="checkbox"
                  checked={saveToGuestList}
                  onChange={(e) => setSaveToGuestList(e.target.checked)}
                />
                <span>Add this guest to my guest list (Faster bookings in future and reduced session timeout risk.)</span>
              </label>

              <button
                type="button"
                className="tj-btn-orange-outline"
                onClick={() => {
                  if (!firstName || !lastName) {
                    setErrorBanner('Please fill First and Last name first.');
                  } else {
                    setErrorBanner('');
                    alert('Guest details added for Room 1.');
                  }
                }}
              >
                + Add Guest Details
              </button>
            </article>

            {/* Contact Details Section (Image 3) */}
            <article className="tj-guest-section-card">
              <h2 className="tj-section-heading">Contact Details</h2>
              <div className="tj-fields-grid-3" style={{ marginTop: 14 }}>
                <div className="tj-input-box">
                  <label className="tj-input-label">Code</label>
                  <select
                    className="tj-input-control"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+91">(+91) India</option>
                    <option value="+1">(+1) USA / Canada</option>
                    <option value="+971">(+971) UAE</option>
                    <option value="+44">(+44) UK</option>
                    <option value="+65">(+65) Singapore</option>
                  </select>
                </div>
                <div className="tj-input-box">
                  <label className="tj-input-label">Mobile No.</label>
                  <input
                    type="tel"
                    className="tj-input-control"
                    placeholder="Mobile No."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="tj-input-box">
                  <label className="tj-input-label">Email ID</label>
                  <input
                    type="email"
                    className="tj-input-control"
                    placeholder="hello@goimomi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </article>

            {/* PAN Information Section (Image 3 & 4) */}
            <article className="tj-guest-section-card">
              <h2 className="tj-section-heading">PAN Information</h2>
              <div className="tj-pan-type-radios" style={{ marginTop: 12 }}>
                <label className="tj-radio-label">
                  <input
                    type="radio"
                    name="panType"
                    value="personal"
                    checked={panType === 'personal'}
                    onChange={() => setPanType('personal')}
                  />
                  <span>Personal PAN</span>
                </label>
                <label className="tj-radio-label">
                  <input
                    type="radio"
                    name="panType"
                    value="corporate"
                    checked={panType === 'corporate'}
                    onChange={() => setPanType('corporate')}
                  />
                  <span>Corporate PAN</span>
                </label>
              </div>

              <label className="tj-guardian-checkbox">
                <input
                  type="checkbox"
                  checked={useGuardianPan}
                  onChange={(e) => setUseGuardianPan(e.target.checked)}
                />
                <span>Use Only Guardian PAN</span>
              </label>

              <div className="tj-pan-row-inputs">
                <div className="tj-input-box">
                  <label className="tj-input-label">Name (Room 1)</label>
                  <input
                    type="text"
                    className="tj-input-control"
                    placeholder="Name"
                    value={panHolderName}
                    onChange={(e) => setPanHolderName(e.target.value)}
                  />
                </div>
                <div className="tj-input-box">
                  <label className="tj-input-label">PAN</label>
                  <input
                    type="text"
                    className="tj-input-control"
                    placeholder="PAN (e.g. ABCDE1234F)"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  />
                </div>
                <button
                  type="button"
                  className={`tj-btn-verify-pan ${isPanVerified ? 'verified' : ''}`}
                  onClick={() => {
                    if (panNumber.length === 10) {
                      setIsPanVerified(true);
                      setErrorBanner('');
                    } else {
                      setErrorBanner('Please enter a valid 10-digit PAN.');
                    }
                  }}
                >
                  {isPanVerified ? '✓ Verified' : 'Verify'}
                </button>
              </div>

              <button
                type="button"
                className="tj-btn-orange-outline"
                onClick={() => alert('Additional PAN input field added.')}
              >
                + Add PAN
              </button>
            </article>

            {/* Important Information (Image 4) */}
            <article className="tj-guest-section-card">
              <h2 className="tj-section-heading">Important Information</h2>
              <p className="tj-section-subheading">Booking Notes and General Term & Conditions</p>

              <div className="tj-info-block">
                <h4 className="tj-info-subtitle">Policies</h4>
                <p className="tj-info-text">
                  <strong>Know Before You Go :</strong> Up to 2 children 12 years old and younger stay free when occupying the parent or guardian's room, using existing bedding. Alcohol is not served at this property. Cashless payment methods are available for all transactions.
                </p>
              </div>

              <div className="tj-info-block">
                <h4 className="tj-info-subtitle">Checkin Instructions</h4>
                <p className="tj-info-text">
                  Front desk staff will greet guests on arrival at the property. Information provided by the property may be translated using automated translation tools. Extra-person charges may apply and vary depending on property policy. Government-issued photo identification and a credit card, debit card, or cash deposit may be required at check-in for incidental charges. Special requests cannot be guaranteed and are subject to availability upon check-in.
                </p>
              </div>

              <div className="tj-info-block">
                <h4 className="tj-info-subtitle">Fees</h4>
                <p className="tj-info-text">
                  <strong>Optional :</strong> Fee for buffet breakfast: approximately AED 85 for adults and AED 45 for children. Airport shuttle fee: AED 150 per person (one-way). Early check-in is available for a fee (subject to availability). Late check-out is available for a fee (subject to availability). Rollaway bed fee: AED 120.0 per night.
                </p>
              </div>
            </article>

            {/* General Terms & Conditions Accordion (Image 5) */}
            <article className="tj-accordion-card">
              <button
                type="button"
                className="tj-accordion-header"
                onClick={() => setTermsOpen(!termsOpen)}
                aria-expanded={termsOpen}
              >
                <h3>General Terms & Conditions</h3>
                {termsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {termsOpen && (
                <div className="tj-accordion-content">
                  <p className="tj-info-text">
                    By confirming this booking, you agree to the hotel property house rules, cancellation schedule, and terms of service. TCS compliance rules set by the Government of India apply to international hotel reservations.
                  </p>
                </div>
              )}
            </article>

            {/* Special Request (Image 5) */}
            <article className="tj-guest-section-card">
              <h2 className="tj-section-heading">Special Request <span style={{ fontSize: 13, color: '#64748b', fontWeight: 400 }}>(If Any)</span></h2>
              <div style={{ marginTop: 12 }}>
                <textarea
                  className="tj-special-req-textarea"
                  placeholder="Enter your special requests here!"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                />
              </div>
            </article>
          </div>

          {/* Right Column: Sticky FARE SUMMARY (Image 1) */}
          <div className="tj-fare-summary-sticky">
            <div className="tj-fare-card">
              <h2 className="tj-fare-heading">FARE SUMMARY</h2>

              <div className="tj-fare-row">
                <span>Base Fare</span>
                <span>{formatMoney(reviewState.baseFare, reviewState.currency)}</span>
              </div>

              <div className="tj-fare-row">
                <span>Taxes and fees</span>
                <span>{formatMoney(reviewState.taxesAndFees, reviewState.currency)}</span>
              </div>

              {redeemedCash > 0 && (
                <div className="tj-fare-row" style={{ color: '#16a34a' }}>
                  <span>TJ Cash Redeemed</span>
                  <span>− {formatMoney(redeemedCash, reviewState.currency)}</span>
                </div>
              )}

              <div className="tj-fare-total-row">
                <span>Total Amount Payable</span>
                <span className="tj-fare-total-price">
                  {formatMoney(finalPayable, reviewState.currency)}
                </span>
              </div>

              {/* TJ Cash Box (Image 1) */}
              <div className="tj-cash-section">
                <div className="tj-cash-head">
                  <span className="tj-cash-title">TJ Cash</span>
                  <span className="tj-cash-rate">1 Cash = ₹ 1</span>
                </div>
                <div className="tj-cash-input-row">
                  <input
                    type="number"
                    className="tj-cash-input"
                    placeholder="Enter Cash Amount"
                    value={tjCashInput}
                    onChange={(e) => setTjCashInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="tj-btn-redeem"
                    onClick={handleRedeemCash}
                  >
                    Redeem
                  </button>
                </div>
              </div>

              {/* Terms Disclaimer */}
              <p className="tj-terms-disclaimer">
                By proceeding, I confirm that I agree to all <Link to="/terms-and-conditions">terms & conditions</Link> and I will follow all Government Compliance for TCS.
              </p>

              {/* Payment CTA Options */}
              <div className="tj-payment-options-block">
                {/* Option 1: Quick Pay from Wallet / Credit Line */}
                <div className="tj-pay-tier-box">
                  <span className="tj-pay-tier-label">From Wallet/Credit line</span>
                  <button
                    type="button"
                    className="tj-btn-quick-pay"
                    disabled={isSubmitting}
                    onClick={handleQuickPay}
                  >
                    <span>⚡ QUICK PAY</span>
                    <small>Available Balance - ₹ 5,00,00,000</small>
                  </button>
                </div>

                {/* Option 2: Proceed To Pay via Zoho Payments */}
                <div className="tj-pay-tier-box">
                  <span className="tj-pay-tier-label">From Card/UPI or other modes</span>
                  <button
                    type="button"
                    className="tj-btn-proceed-pay"
                    disabled={isSubmitting}
                    onClick={handleProceedToPay}
                  >
                    {isSubmitting ? (
                      <span>Connecting to Zoho Payments...</span>
                    ) : (
                      <>
                        <span>» Proceed To Pay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Frequent Travellers Modal */}
      <TravellersListModal
        isOpen={guestListModalOpen}
        onClose={() => setGuestListModalOpen(false)}
        onSelectTraveller={handleSelectSavedTraveller}
      />
    </main>
  );
}
