import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Plane, Clock, User, ShieldCheck,
  ChevronDown, ChevronUp, Search, Luggage, CreditCard,
  Printer, Download, AlertCircle, FileText, Check, Plus, X
} from 'lucide-react';
import { money, duration, readSession, dayLabel, formatFullDate, cabinLabel } from './flightUtils';
import FlightSeatMap from './FlightSeatMap';
import TravellersListModal from './TravellersListModal';
import './Flights.css';

export default function FlightReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewed] = useState(() => location.state?.reviewed || readSession('flight-review'));

  // Workflow Steps: 2 = 'pax' (Passenger Details), 3 = 'review' (Review Itinerary), 4 = 'payments' (Payments), 5 = 'confirmed' (Voucher)
  const [currentStep, setCurrentStep] = useState(2);

  const [accepted, setAccepted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showTravellersModal, setShowTravellersModal] = useState(false);
  const [activeTravellerPaxIdx, setActiveTravellerPaxIdx] = useState(0);

  // Form States
  const [passengers, setPassengers] = useState([
    {
      title: 'Mr',
      firstName: '',
      lastName: '',
      gender: 'MALE',
      dob: '',
      passportNo: '',
      passportExpiry: '',
      ffAirline: '6E',
      ffNumber: '',
      addToTravellerList: true,
      expanded: true,
      ffExpanded: false,
    }
  ]);

  const [contact, setContact] = useState({
    countryCode: '+91',
    countryName: 'India',
    phone: '',
    email: 'hello@goimomi.com',
  });

  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const [gst, setGst] = useState({
    gstNo: '',
    companyName: '',
    address: '',
  });
  const [showGst, setShowGst] = useState(false);

  // Seat Selection State: { [segmentIndex]: { [paxIndex]: seatObject } }
  const [selectedSeats, setSelectedSeats] = useState({});

  // TripSafe Protection Add-on (₹500 per passenger)
  const [tripSafeOpted, setTripSafeOpted] = useState(true);

  // TJ Cash & Voucher state
  const [tjCashApplied, setTjCashApplied] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('tj_balance'); // 'tj_balance' | 'online' | 'hold'

  // Booking Confirmation details
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Session timer ticker
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize passenger list based on search paxInfo count
  useEffect(() => {
    if (reviewed?.search?.searchQuery?.paxInfo) {
      const pInfo = reviewed.search.searchQuery.paxInfo;
      const totalAdults = pInfo.ADULT || 1;
      const totalChildren = pInfo.CHILD || 0;
      const totalInfants = pInfo.INFANT || 0;

      const newPax = [];
      for (let i = 0; i < totalAdults; i++) {
        newPax.push({
          type: 'ADULT',
          label: `ADULT ${i + 1}: (12 + yrs)`,
          title: i === 0 ? 'Mr' : 'Mrs',
          firstName: '',
          lastName: '',
          gender: i === 0 ? 'MALE' : 'FEMALE',
          dob: '',
          passportNo: '',
          passportExpiry: '',
          ffAirline: '6E',
          ffNumber: '',
          addToTravellerList: true,
          expanded: true,
          ffExpanded: false,
        });
      }
      for (let i = 0; i < totalChildren; i++) {
        newPax.push({
          type: 'CHILD',
          label: `CHILD ${i + 1}: (2 - 12 yrs)`,
          title: 'Master',
          firstName: '',
          lastName: '',
          gender: 'MALE',
          dob: '',
          passportNo: '',
          passportExpiry: '',
          ffAirline: '6E',
          ffNumber: '',
          addToTravellerList: true,
          expanded: true,
          ffExpanded: false,
        });
      }
      for (let i = 0; i < totalInfants; i++) {
        newPax.push({
          type: 'INFANT',
          label: `INFANT ${i + 1}: (0 - 2 yrs)`,
          title: 'Master',
          firstName: '',
          lastName: '',
          gender: 'MALE',
          dob: '',
          passportNo: '',
          passportExpiry: '',
          ffAirline: '6E',
          ffNumber: '',
          addToTravellerList: true,
          expanded: true,
          ffExpanded: false,
        });
      }
      setPassengers(newPax);
    }
  }, [reviewed]);

  if (!reviewed) {
    return (
      <main className="flights-page flight-empty">
        <h1>Select a flight first</h1>
        <Link to="/flights" className="flight-primary">Search flights</Link>
      </main>
    );
  }

  const { data, search, savedAt } = reviewed;
  const remaining = Math.max(0, Math.floor((savedAt + Number(data.conditions?.st || 900) * 1000 - now) / 1000));
  const fareChanged = data.alerts?.some(alert => alert.type === 'FAREALERT');
  const fare = data.totalPriceInfo?.totalFareDetail?.fC || data.totalPriceInfo?.fc || {};
  const trips = Array.isArray(data.tripInfos) ? data.tripInfos : Object.values(reviewed.selection || {}).map(item => item.trip);

  // Compute all flight segments across all trips
  const allSegments = trips.flatMap(t => t.sI || []);
  const firstSeg = allSegments[0] || {};
  const lastSeg = allSegments[allSegments.length - 1] || firstSeg;

  // Calculate pricing breakdown
  const baseFare = Number(fare.BF || 3000);
  const taxesAndFees = Number(fare.TAF || 9607.50);
  const tripSafeAmount = tripSafeOpted ? (500 * passengers.length) : 0;

  // Calculate total seat selection add-on price
  const seatAddonTotal = Object.values(selectedSeats).reduce((total, segSeats) => {
    return total + Object.values(segSeats || {}).reduce((sSum, s) => sSum + Number(s?.price || 0), 0);
  }, 0);

  const grossAmountToPay = baseFare + taxesAndFees + tripSafeAmount + seatAddonTotal - voucherDiscount - tjCashApplied;
  const commission = 0.00;
  const tripSafeEarnings = tripSafeOpted ? 318.00 : 0.00;
  const tds = 0.00;
  const netPrice = grossAmountToPay - tripSafeEarnings;

  function updatePax(index, field, value) {
    setPassengers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleSelectSeat(segIdx, paxIdx, seatObj) {
    setSelectedSeats(prev => {
      const copy = { ...prev };
      if (!copy[segIdx]) copy[segIdx] = {};
      if (seatObj === null) {
        delete copy[segIdx][paxIdx];
      } else {
        copy[segIdx][paxIdx] = seatObj;
      }
      return copy;
    });
  }

  function handleApplyVoucher() {
    if (!voucherCode.trim()) return;
    if (voucherCode.toUpperCase() === 'GOIMOMI500' || voucherCode.toUpperCase() === 'FLY500') {
      setVoucherDiscount(500);
      setVoucherMessage('Coupon applied! ₹500 discount added.');
    } else {
      setVoucherDiscount(0);
      setVoucherMessage('Invalid voucher code. Try GOIMOMI500');
    }
  }

  function handleSelectTravellerFromModal(traveller) {
    if (!traveller) return;
    updatePax(activeTravellerPaxIdx, 'title', traveller.title || 'Mr');
    updatePax(activeTravellerPaxIdx, 'firstName', traveller.firstName || '');
    updatePax(activeTravellerPaxIdx, 'lastName', traveller.lastName || '');
    if (traveller.gender) updatePax(activeTravellerPaxIdx, 'gender', traveller.gender);
    if (traveller.phone && !contact.phone) setContact({ ...contact, phone: traveller.phone });
    if (traveller.email && (!contact.email || contact.email === 'hello@goimomi.com')) setContact({ ...contact, email: traveller.email });
    if (traveller.ffNumber) {
      updatePax(activeTravellerPaxIdx, 'ffNumber', traveller.ffNumber);
      if (traveller.ffAirline) updatePax(activeTravellerPaxIdx, 'ffAirline', traveller.ffAirline);
      updatePax(activeTravellerPaxIdx, 'ffExpanded', true);
    }
  }

  function validatePassengersAndContact() {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.firstName.trim() || !p.lastName.trim()) {
        setFormError(`Please enter first and last name for Passenger ${i + 1} (${p.label || 'Traveller'}).`);
        return false;
      }
    }
    if (!contact.phone.trim() || contact.phone.length < 8) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return false;
    }
    if (!contact.email.trim() || !contact.email.includes('@')) {
      setFormError('Please enter a valid email address for booking confirmation.');
      return false;
    }
    setFormError('');
    return true;
  }

  function handleContinueToReview(e) {
    if (e) e.preventDefault();
    if (!validatePassengersAndContact()) return;
    setCurrentStep(3); // Advance to Third Step: Review
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleProceedToPayments(e) {
    if (e) e.preventDefault();
    setCurrentStep(4); // Advance to Finish Step: Payments
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Finalize booking (either Instant Confirm or Hold PNR)
  function handleFinalizeBooking(isHold = false) {
    setIsSubmitting(true);

    const airlineCode = firstSeg.fD?.aI?.code || '6E';
    const pnr = `${airlineCode}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const bookingRefId = `TJ-${Math.floor(100000 + Math.random() * 900000)}`;

    const bookingPayload = {
      id: `booking-${Date.now()}`,
      pnr,
      bookingId: bookingRefId,
      status: isHold ? 'On Hold' : 'Confirmed',
      fromCode: firstSeg.da?.code || 'MAA',
      toCode: lastSeg.aa?.code || 'DXB',
      fromCity: firstSeg.da?.name || firstSeg.da?.city || 'Origin Airport',
      toCity: lastSeg.aa?.name || lastSeg.aa?.city || 'Destination Airport',
      airline: firstSeg.fD?.aI?.name || 'IndiGo',
      airlineCode,
      flightNumber: allSegments.map(s => `${s.fD?.aI?.code}-${s.fD?.fN}`).join(', '),
      travelDate: firstSeg.dt ? firstSeg.dt.split('T')[0] : (search?.searchQuery?.routeInfos?.[0]?.travelDate || ''),
      passengerName: `${passengers[0].title} ${passengers[0].firstName} ${passengers[0].lastName}`.trim(),
      passengersList: passengers.map((p, idx) => ({
        name: `${p.title} ${p.firstName} ${p.lastName}`.trim(),
        type: p.type || 'ADULT',
        ticketNo: `098-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        seats: Object.entries(selectedSeats).map(([segIdx, seatsMap]) => seatsMap[idx]?.code).filter(Boolean).join(', ') || 'Auto-Assigned',
        ff: p.ffNumber ? `${p.ffAirline || '6E'}-${p.ffNumber}` : '',
      })),
      fare: grossAmountToPay,
      fareFormatted: money(grossAmountToPay),
      holdExpiresAt: isHold ? Date.now() + 2 * 60 * 60 * 1000 : null,
      cabin: search?.searchQuery?.cabinClass || 'ECONOMY',
      mode: search?.mode || 'ONE WAY',
      contact,
      gst: showGst ? gst : null,
      notes: showNotes ? notes : '',
      issuedAt: new Date().toISOString(),
    };

    try {
      const storageKey = isHold ? 'on_hold_flight_bookings' : 'upcoming_flight_bookings';
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localStorage.setItem(storageKey, JSON.stringify([bookingPayload, ...existing]));
    } catch (_) {}

    // Save passengers to saved frequent flyer list if checked
    try {
      const existingTravellers = JSON.parse(localStorage.getItem('goimomi_saved_travellers') || '[]');
      const newlySaved = passengers
        .filter(p => p.addToTravellerList && p.firstName && p.lastName)
        .map(p => ({
          id: `t-${Date.now()}-${Math.random()}`,
          title: p.title,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          phone: contact.phone,
          email: contact.email,
          ffAirline: p.ffAirline,
          ffNumber: p.ffNumber,
        }));
      if (newlySaved.length) {
        localStorage.setItem('goimomi_saved_travellers', JSON.stringify([...newlySaved, ...existingTravellers]));
      }
    } catch (_) {}

    setConfirmedBooking(bookingPayload);
    setCurrentStep(5); // Show Confirmation Voucher screen
    setIsSubmitting(false);
  }

  return (
    <main className="flights-page flight-review-page tj-review-page">
      {/* 4-Step TripJack Stepper Bar (Screenshots 2 & 4) */}
      <div className="tripjack-stepper-wrap">
        <div className="flight-container tripjack-stepper">
          {/* Step 1 */}
          <div
            className={`step-item ${currentStep >= 2 ? 'is-done' : ''}`}
            onClick={() => navigate('/flights/results', { state: { search } })}
            style={{ cursor: 'pointer' }}
          >
            <span className="step-badge">
              {currentStep >= 2 ? <Check size={16} strokeWidth={3} /> : <Plane size={15} />}
            </span>
            <div className="step-text">
              <small>FIRST STEP</small>
              <strong>Flight Itinerary</strong>
            </div>
          </div>

          <div className="step-arrow">→</div>

          {/* Step 2 */}
          <div
            className={`step-item ${currentStep === 2 ? 'is-active' : currentStep > 2 ? 'is-done' : ''}`}
            onClick={() => currentStep > 2 && setCurrentStep(2)}
            style={{ cursor: currentStep > 2 ? 'pointer' : 'default' }}
          >
            <span className="step-badge">
              {currentStep > 2 ? <Check size={16} strokeWidth={3} /> : <User size={15} />}
            </span>
            <div className="step-text">
              <small>SECOND STEP</small>
              <strong>Passenger Details</strong>
            </div>
          </div>

          <div className="step-arrow">→</div>

          {/* Step 3 */}
          <div
            className={`step-item ${currentStep === 3 ? 'is-active' : currentStep > 3 ? 'is-done' : ''}`}
            onClick={() => currentStep > 3 && setCurrentStep(3)}
            style={{ cursor: currentStep > 3 ? 'pointer' : 'default' }}
          >
            <span className="step-badge">
              {currentStep > 3 ? <Check size={16} strokeWidth={3} /> : <FileText size={15} />}
            </span>
            <div className="step-text">
              <small>THIRD STEP</small>
              <strong>Review</strong>
            </div>
          </div>

          <div className="step-arrow">→</div>

          {/* Step 4 */}
          <div className={`step-item ${currentStep >= 4 ? 'is-active' : ''}`}>
            <span className="step-badge">
              <CreditCard size={15} />
            </span>
            <div className="step-text">
              <small>FINISH STEP</small>
              <strong>Payments</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flight-container flight-review-layout tj-review-layout">
        {/* Left Column: Flow Steps */}
        <section className="tj-review-main-col">
          {fareChanged && (
            <div className="flight-alert" role="alert">
              <AlertCircle size={17} />
              <span>The fare has been updated by supplier tariff rules. Please review the updated total before continuing.</span>
            </div>
          )}

          {formError && (
            <div className="flight-alert tj-error-alert" role="alert">
              <AlertCircle size={17} />
              <span>{formError}</span>
            </div>
          )}

          {/* Mini Flight Itinerary Recap Bar (Screenshot 4) */}
          <div className="tj-itinerary-recap-bar">
            <div className="tj-recap-airline-icon">
              <Plane size={20} />
            </div>
            <div className="tj-recap-route-info">
              <div className="tj-recap-line1">
                <strong>{firstSeg.da?.code}, {firstSeg.da?.city || firstSeg.da?.name}</strong>
                <span>→</span>
                <strong>{lastSeg.aa?.code}, {lastSeg.aa?.city || lastSeg.aa?.name}</strong>
                <span className="tj-recap-pill">{cabinLabel(search?.searchQuery?.cabinClass || 'ECONOMY')}</span>
                <span className="tj-recap-pill">{search?.mode || 'One Way'}</span>
              </div>
              <div className="tj-recap-line2">
                <span>{allSegments.map(s => `${s.fD?.aI?.name || 'IndiGo'}, ${s.fD?.aI?.code}-${s.fD?.fN}`).join(' | ')}</span>
                <span>•</span>
                <span>{firstSeg.dt?.slice(11, 16)} → {lastSeg.at?.slice(11, 16)}</span>
                <span>•</span>
                <span>{dayLabel(firstSeg.dt)}</span>
                <span>•</span>
                <span>{allSegments.length > 1 ? `${allSegments.length - 1} stop` : 'Non-stop'}</span>
                <span>•</span>
                <span>{duration(trips.reduce((acc, t) => acc + (t.sI || []).reduce((s, seg) => s + (seg.duration || 0), 0), 0))}</span>
              </div>
            </div>
          </div>

          {/* ========================================================
              STEP 2: PASSENGER DETAILS & ADD-ONS (Screenshots 4 & 5)
              ======================================================== */}
          {currentStep === 2 && (
            <>
              <div className="tj-section-header-title">
                <h2>Passenger Details</h2>
              </div>

              {/* Passenger Cards */}
              {passengers.map((pax, pIdx) => (
                <article className="tj-passenger-card" key={pIdx}>
                  <div
                    className="tj-pax-card-header"
                    onClick={() => updatePax(pIdx, 'expanded', !pax.expanded)}
                  >
                    <strong>{pax.label || `ADULT ${pIdx + 1}: (12 + yrs)`}</strong>
                    <div className="tj-pax-header-right">
                      {pax.firstName && <span>{pax.title} {pax.firstName} {pax.lastName}</span>}
                      {pax.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {pax.expanded && (
                    <div className="tj-pax-card-body">
                      {/* Search from Travellers List (Screenshot 4) */}
                      <div className="tj-traveller-list-trigger-row">
                        <span className="tj-traveller-list-label">Traveller List</span>
                        <button
                          type="button"
                          className="tj-btn-search-travellers"
                          onClick={() => {
                            setActiveTravellerPaxIdx(pIdx);
                            setShowTravellersModal(true);
                          }}
                        >
                          <Search size={15} /> Search from Travellers List
                        </button>
                      </div>

                      {/* Name Inputs */}
                      <div className="tj-pax-name-inputs-grid">
                        <div className="tj-input-box">
                          <label>Title *</label>
                          <select
                            value={pax.title}
                            onChange={e => updatePax(pIdx, 'title', e.target.value)}
                          >
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                            <option value="Master">Master</option>
                          </select>
                        </div>

                        <div className="tj-input-box">
                          <label>First &amp; Middle Name *</label>
                          <input
                            type="text"
                            maxLength={32}
                            placeholder="First Name"
                            value={pax.firstName}
                            onChange={e => updatePax(pIdx, 'firstName', e.target.value)}
                            required
                          />
                          <small className="tj-char-counter">{pax.firstName.length}/32</small>
                        </div>

                        <div className="tj-input-box">
                          <label>Last Name *</label>
                          <input
                            type="text"
                            maxLength={32}
                            placeholder="Last Name"
                            value={pax.lastName}
                            onChange={e => updatePax(pIdx, 'lastName', e.target.value)}
                            required
                          />
                          <small className="tj-char-counter">{pax.lastName.length}/32</small>
                        </div>
                      </div>

                      {/* Frequent Flier Accordion (Screenshot 4) */}
                      <div className="tj-ff-accordion">
                        <button
                          type="button"
                          className="tj-ff-toggle-btn"
                          onClick={() => updatePax(pIdx, 'ffExpanded', !pax.ffExpanded)}
                        >
                          <span>FREQUENT FLIER NUMBER (OPTIONAL)</span>
                          {pax.ffExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {pax.ffExpanded && (
                          <div className="tj-ff-inputs-row">
                            <div className="tj-ff-airline-col">
                              <label>Airline</label>
                              <select
                                value={pax.ffAirline}
                                onChange={e => updatePax(pIdx, 'ffAirline', e.target.value)}
                              >
                                <option value="6E">6E (IndiGo)</option>
                                <option value="AI">AI (Air India)</option>
                                <option value="SG">SG (SpiceJet)</option>
                                <option value="QP">QP (Akasa Air)</option>
                              </select>
                            </div>
                            <div className="tj-ff-num-col">
                              <label>FF Number</label>
                              <input
                                type="text"
                                placeholder="Frequent Flier Number"
                                value={pax.ffNumber}
                                onChange={e => updatePax(pIdx, 'ffNumber', e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Add this to My Travellers List Checkbox (Screenshot 4 & 5) */}
                      <div className="tj-add-traveller-check-row">
                        <label className="flight-check">
                          <input
                            type="checkbox"
                            checked={pax.addToTravellerList}
                            onChange={e => updatePax(pIdx, 'addToTravellerList', e.target.checked)}
                          />
                          <span>Add this to My Travellers List (This will avoid session timeout and enable faster bookings)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </article>
              ))}

              {/* Contact Details Card (Screenshot 5) */}
              <article className="tj-contact-details-card">
                <h3>Contact Details</h3>
                <div className="tj-contact-inputs-grid">
                  <div className="tj-input-box">
                    <label>Country Code</label>
                    <select
                      value={contact.countryCode}
                      onChange={e => setContact({ ...contact, countryCode: e.target.value })}
                    >
                      <option value="+91">India (+91)</option>
                      <option value="+971">UAE (+971)</option>
                      <option value="+1">USA (+1)</option>
                      <option value="+44">UK (+44)</option>
                      <option value="+65">Singapore (+65)</option>
                    </select>
                  </div>

                  <div className="tj-input-box">
                    <label>Mobile Number *</label>
                    <input
                      type="tel"
                      placeholder="Mobile Number *"
                      value={contact.phone}
                      onChange={e => setContact({ ...contact, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="tj-input-box">
                    <label>Email ID *</label>
                    <input
                      type="email"
                      placeholder="hello@goimomi.com"
                      value={contact.email}
                      onChange={e => setContact({ ...contact, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Optional Add-on Buttons: Notes & GST Details (Screenshot 5) */}
                <div className="tj-contact-action-buttons">
                  <button
                    type="button"
                    className="tj-btn-outline-orange"
                    onClick={() => setShowNotes(!showNotes)}
                  >
                    + Add notes (Optional)
                  </button>

                  <button
                    type="button"
                    className="tj-btn-outline-orange"
                    onClick={() => setShowGst(!showGst)}
                  >
                    + Add GST Details (Optional)
                  </button>
                </div>

                {showNotes && (
                  <div className="tj-notes-expand-wrap">
                    <label>Booking Notes / Special Request</label>
                    <textarea
                      rows={2}
                      placeholder="Enter special requirements, wheelchair assistance, etc."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                )}

                {showGst && (
                  <div className="tj-gst-expand-wrap">
                    <h4>GST Details for Tax Invoice</h4>
                    <div className="tj-gst-inputs-grid">
                      <div className="tj-input-box">
                        <label>GST Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 29AAAAA0000A1Z5"
                          value={gst.gstNo}
                          onChange={e => setGst({ ...gst, gstNo: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="tj-input-box">
                        <label>Registered Company Name</label>
                        <input
                          type="text"
                          placeholder="Company Name"
                          value={gst.companyName}
                          onChange={e => setGst({ ...gst, companyName: e.target.value })}
                        />
                      </div>
                      <div className="tj-input-box">
                        <label>Company Address</label>
                        <input
                          type="text"
                          placeholder="Registered Address"
                          value={gst.address}
                          onChange={e => setGst({ ...gst, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </article>

              {/* Flight Add On: SELECT SEAT (Screenshot 5) */}
              <FlightSeatMap
                segments={allSegments}
                passengers={passengers}
                selectedSeats={selectedSeats}
                onSelectSeat={handleSelectSeat}
              />
            </>
          )}

          {/* ========================================================
              STEP 3: REVIEW ITINERARY & CONFIRM (Third Step)
              ======================================================== */}
          {currentStep === 3 && (
            <div className="tj-review-step-content">
              <div className="tj-section-header-title">
                <h2>Review Itinerary &amp; Traveller Info</h2>
                <p>Please double-check passenger details and flight sectors before payment.</p>
              </div>

              {/* Flight Schedule Card */}
              <article className="tj-passenger-card">
                <div className="tj-pax-card-header">
                  <strong>Flight Itinerary Details</strong>
                  <span className="tj-recap-pill">{search?.mode || 'One Way'}</span>
                </div>
                <div className="tj-pax-card-body">
                  {allSegments.map((seg, sIdx) => (
                    <div key={sIdx} className="tj-review-leg-row">
                      <div className="tj-review-leg-badge">
                        <Plane size={16} />
                        <span>Leg {sIdx + 1}</span>
                      </div>
                      <div className="tj-review-leg-info">
                        <strong>{seg.fD?.aI?.name} ({seg.fD?.aI?.code}-{seg.fD?.fN})</strong>
                        <p>
                          <b>{seg.da?.code}</b> ({seg.da?.name}) {seg.da?.terminal ? `Terminal ${seg.da.terminal}` : ''} at {seg.dt?.replace('T', ' ')}
                          <span style={{ margin: '0 8px' }}>→</span>
                          <b>{seg.aa?.code}</b> ({seg.aa?.name}) {seg.aa?.terminal ? `Terminal ${seg.aa.terminal}` : ''} at {seg.at?.replace('T', ' ')}
                        </p>
                        <small>Duration: {duration(seg.duration || 0)} · Cabin: {cabinLabel(search?.searchQuery?.cabinClass || 'ECONOMY')}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              {/* Passengers Review Card */}
              <article className="tj-passenger-card">
                <div className="tj-pax-card-header">
                  <strong>Traveller Manifest ({passengers.length} Passenger{passengers.length > 1 ? 's' : ''})</strong>
                  <button
                    type="button"
                    className="tj-edit-step-link"
                    onClick={() => setCurrentStep(2)}
                  >
                    Edit Travellers
                  </button>
                </div>
                <div className="tj-pax-card-body">
                  <table className="tj-review-pax-table">
                    <thead>
                      <tr>
                        <th>Traveller Name</th>
                        <th>Type</th>
                        <th>Assigned Seat(s)</th>
                        <th>Frequent Flyer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengers.map((p, idx) => {
                        const assignedSeatsList = Object.entries(selectedSeats)
                          .map(([segIdx, seatsMap]) => seatsMap[idx]?.code)
                          .filter(Boolean);

                        return (
                          <tr key={idx}>
                            <td><strong>{p.title} {p.firstName} {p.lastName}</strong></td>
                            <td>{p.type || 'Adult'}</td>
                            <td>
                              {assignedSeatsList.length ? (
                                <span className="tj-assigned-seat-pill">{assignedSeatsList.join(', ')}</span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>Auto-assigned at check-in</span>
                              )}
                            </td>
                            <td>{p.ffNumber ? `${p.ffAirline || '6E'} - ${p.ffNumber}` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>

              {/* Contact Details Review */}
              <article className="tj-passenger-card">
                <div className="tj-pax-card-header">
                  <strong>Communication Details</strong>
                </div>
                <div className="tj-pax-card-body tj-contact-review-grid">
                  <div>
                    <span>Mobile Number:</span>
                    <strong>{contact.countryCode} {contact.phone}</strong>
                  </div>
                  <div>
                    <span>Email ID:</span>
                    <strong>{contact.email}</strong>
                  </div>
                  {showGst && gst.gstNo && (
                    <div>
                      <span>GSTIN:</span>
                      <strong>{gst.gstNo} ({gst.companyName})</strong>
                    </div>
                  )}
                </div>
              </article>

              <div className="tj-step-actions-row">
                <button
                  type="button"
                  className="tj-btn-back"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft size={16} /> Back to Passenger Details
                </button>
                <button
                  type="button"
                  className="tj-btn-continue"
                  onClick={handleProceedToPayments}
                >
                  Proceed to Payments →
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 4: PAYMENTS & FINISH STEP (Finish Step)
              ======================================================== */}
          {currentStep === 4 && (
            <div className="tj-payments-step-content">
              <div className="tj-section-header-title">
                <h2>Select Payment Method</h2>
                <p>Choose instant payment or hold the PNR for later ticketing.</p>
              </div>

              <div className="tj-payment-options-grid">
                {/* Option 1: TripJack B2B Balance */}
                <label className={`tj-payment-option-card ${paymentMethod === 'tj_balance' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentOption"
                    value="tj_balance"
                    checked={paymentMethod === 'tj_balance'}
                    onChange={() => setPaymentMethod('tj_balance')}
                  />
                  <div className="tj-pay-card-info">
                    <div className="tj-pay-card-title">
                      <CreditCard size={18} />
                      <strong>TripJack Agency Account Balance</strong>
                    </div>
                    <p>Instant issuance from authorized agency credit balance (Balance: ₹ 5,00,00,000.00)</p>
                    <span className="tj-instant-tag">Instant PNR &amp; E-Ticket</span>
                  </div>
                </label>

                {/* Option 2: Online Payment Gateway */}
                <label className={`tj-payment-option-card ${paymentMethod === 'online' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentOption"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={() => setPaymentMethod('online')}
                  />
                  <div className="tj-pay-card-info">
                    <div className="tj-pay-card-title">
                      <ShieldCheck size={18} />
                      <strong>Online Payment (UPI, Credit/Debit Card, NetBanking)</strong>
                    </div>
                    <p>Secure online payment gateway with instant booking confirmation</p>
                  </div>
                </label>

                {/* Option 3: Hold Booking */}
                <label className={`tj-payment-option-card ${paymentMethod === 'hold' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentOption"
                    value="hold"
                    checked={paymentMethod === 'hold'}
                    onChange={() => setPaymentMethod('hold')}
                  />
                  <div className="tj-pay-card-info">
                    <div className="tj-pay-card-title">
                      <Clock size={18} />
                      <strong>Hold Booking (Hold PNR)</strong>
                    </div>
                    <p>Reserve this itinerary without immediate payment. PNR held for 2 hours before airline auto-release.</p>
                    <span className="tj-hold-tag">2-Hour Hold Window</span>
                  </div>
                </label>
              </div>

              <div className="tj-step-actions-row" style={{ marginTop: 24 }}>
                <button
                  type="button"
                  className="tj-btn-back"
                  onClick={() => setCurrentStep(3)}
                >
                  <ArrowLeft size={16} /> Back to Review
                </button>

                <button
                  type="button"
                  className="tj-btn-book-primary"
                  disabled={isSubmitting}
                  onClick={() => handleFinalizeBooking(paymentMethod === 'hold')}
                >
                  {isSubmitting ? 'Processing…' : paymentMethod === 'hold' ? 'Confirm Hold Booking' : 'Pay & Issue Ticket'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 5: CONFIRMATION / E-TICKET VOUCHER (Success View)
              ======================================================== */}
          {currentStep === 5 && confirmedBooking && (
            <div className="tj-confirmed-voucher-view">
              <div className="tj-confirmation-banner">
                <CheckCircle2 size={36} className="tj-banner-check" />
                <div>
                  <h2>Booking Successfully {confirmedBooking.status === 'On Hold' ? 'Held' : 'Confirmed'}!</h2>
                  <p>Your TripJack flight booking reference has been issued. Details sent to <b>{contact.email}</b>.</p>
                </div>
              </div>

              {/* Printable Official E-Ticket Card */}
              <article className="tj-official-ticket-card" id="printable-flight-ticket">
                <div className="tj-ticket-header">
                  <div className="tj-ticket-agency">
                    <strong>GOIMOMI.COM</strong>
                    <small>Official TripJack B2B Travel Partner</small>
                  </div>
                  <div className="tj-ticket-pnr-box">
                    <span>AIRLINE PNR</span>
                    <strong>{confirmedBooking.pnr}</strong>
                    <small>Booking Ref: {confirmedBooking.bookingId}</small>
                  </div>
                </div>

                <div className="tj-ticket-status-bar">
                  <span className={`tj-ticket-status-pill ${confirmedBooking.status === 'On Hold' ? 'is-hold' : 'is-confirmed'}`}>
                    {confirmedBooking.status.toUpperCase()}
                  </span>
                  {confirmedBooking.status === 'On Hold' && (
                    <small style={{ color: '#006633' }}>
                      <Clock size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> Fare held for 2 hours
                    </small>
                  )}
                  <span>Cabin: <b>{confirmedBooking.cabin}</b></span>
                  <span>Issued: {new Date().toLocaleDateString('en-IN')}</span>
                </div>

                {/* Itinerary */}
                <div className="tj-ticket-route-grid">
                  <div>
                    <span className="tj-t-label">FROM</span>
                    <h3>{confirmedBooking.fromCode}</h3>
                    <p>{confirmedBooking.fromCity}</p>
                    <small>{firstSeg.dt?.replace('T', ' ')}</small>
                  </div>
                  <div className="tj-ticket-flight-mid">
                    <span>{confirmedBooking.airline}</span>
                    <strong>{confirmedBooking.flightNumber}</strong>
                    <div className="tj-t-arrow">✈</div>
                  </div>
                  <div>
                    <span className="tj-t-label">TO</span>
                    <h3>{confirmedBooking.toCode}</h3>
                    <p>{confirmedBooking.toCity}</p>
                    <small>{lastSeg.at?.replace('T', ' ')}</small>
                  </div>
                </div>

                {/* Passenger Manifest */}
                <table className="tj-ticket-manifest-table">
                  <thead>
                    <tr>
                      <th>Passenger Name</th>
                      <th>Type</th>
                      <th>Seat</th>
                      <th>Ticket Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(confirmedBooking.passengersList || []).map((p, idx) => (
                      <tr key={idx}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.type}</td>
                        <td><span className="tj-assigned-seat-pill">{p.seats}</span></td>
                        <td><code>{p.ticketNo}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Fare and Barcode */}
                <div className="tj-ticket-footer-grid">
                  <div className="tj-ticket-barcode-sim">
                    <div className="tj-barcode-lines" />
                    <small>ETKT-{confirmedBooking.pnr}</small>
                  </div>
                  <div className="tj-ticket-total-box">
                    <span>Total Amount Paid / Held</span>
                    <strong>{confirmedBooking.fareFormatted}</strong>
                    <small>All taxes &amp; fees included</small>
                  </div>
                </div>
              </article>

              {/* Action Buttons */}
              <div className="tj-confirmation-actions-row">
                <button
                  type="button"
                  className="tj-btn-outline-orange"
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print E-Ticket
                </button>

                <button
                  type="button"
                  className="tj-btn-outline-orange"
                  onClick={() => window.print()}
                >
                  <Download size={16} /> Download PDF
                </button>

                <button
                  type="button"
                  className="tj-btn-continue"
                  onClick={() => navigate('/flights', { state: { dashboardTab: confirmedBooking.status === 'On Hold' ? 'on_hold' : 'upcoming' } })}
                >
                  Go to Bookings Dashboard →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================
            RIGHT COLUMN: FARE SUMMARY & CHECKOUT (Screenshots 4 & 5)
            ======================================================== */}
        <aside className="tj-review-sidebar-col">
          <div className="tj-fare-summary-card">
            <h3>FARE SUMMARY</h3>

            <div className="tj-fare-summary-lines">
              <div className="tj-fare-summary-row">
                <span>Base fare</span>
                <strong>{money(baseFare)}</strong>
              </div>

              <div className="tj-fare-summary-row">
                <div className="tj-tax-label-with-caret">
                  <span>Taxes and fees</span>
                  <ChevronDown size={14} />
                </div>
                <strong>{money(taxesAndFees)}</strong>
              </div>

              {seatAddonTotal > 0 && (
                <div className="tj-fare-summary-row">
                  <span>Seat Selection</span>
                  <strong>{money(seatAddonTotal)}</strong>
                </div>
              )}

              {/* TripSafe insurance toggle (Screenshot 4) */}
              <div className="tj-tripsafe-summary-row">
                <label className="flight-check tj-tripsafe-checkbox">
                  <input
                    type="checkbox"
                    checked={tripSafeOpted}
                    onChange={e => setTripSafeOpted(e.target.checked)}
                  />
                  <span>TripSafe Protection</span>
                </label>
                <strong>{money(tripSafeAmount)}</strong>
              </div>

              {voucherDiscount > 0 && (
                <div className="tj-fare-summary-row tj-discount-row">
                  <span>Promo Voucher</span>
                  <strong>-{money(voucherDiscount)}</strong>
                </div>
              )}

              {tjCashApplied > 0 && (
                <div className="tj-fare-summary-row tj-discount-row">
                  <span>TJ Cash</span>
                  <strong>-{money(tjCashApplied)}</strong>
                </div>
              )}
            </div>

            {/* Total / Amount to Pay */}
            <div className="tj-amount-to-pay-block">
              <div className="tj-amount-header">
                <strong>Amount to Pay ▾</strong>
                <span className="tj-gross-amount">{money(grossAmountToPay)}</span>
              </div>

              <div className="tj-b2b-earnings-breakdown">
                <div className="tj-b2b-row">
                  <span>Commission</span>
                  <span>-{money(commission)}</span>
                </div>
                {tripSafeOpted && (
                  <div className="tj-b2b-row">
                    <span>TripSafe Earnings</span>
                    <span>-{money(tripSafeEarnings)}</span>
                  </div>
                )}
                <div className="tj-b2b-row">
                  <span>TDS</span>
                  <span>+{money(tds)}</span>
                </div>
                <div className="tj-b2b-net-row">
                  <strong>Net Price</strong>
                  <strong>{money(netPrice)}</strong>
                </div>
              </div>
            </div>

            {/* TJ Cash Box (Screenshot 4) */}
            <div className="tj-wallet-box">
              <div className="tj-wallet-header">
                <strong>TJ Cash:</strong>
                <small>Balance : ₹ 0</small>
              </div>
              <div className="tj-wallet-input-row">
                <input
                  type="number"
                  placeholder="Enter Cash Amount"
                  disabled
                />
                <button type="button" disabled>REDEEM</button>
              </div>
            </div>

            {/* Voucher Code Box (Screenshot 4) */}
            <div className="tj-voucher-box">
              <div className="tj-voucher-input-row">
                <input
                  type="text"
                  placeholder="Enter Voucher Code"
                  value={voucherCode}
                  onChange={e => setVoucherCode(e.target.value)}
                />
                <button type="button" onClick={handleApplyVoucher}>APPLY</button>
              </div>
              {voucherMessage && (
                <small className={voucherDiscount ? 'tj-voucher-success' : 'tj-voucher-error'}>
                  {voucherMessage}
                </small>
              )}
            </div>

            {/* Main Action Buttons */}
            {currentStep < 5 && (
              <div className="tj-sidebar-cta-group">
                {currentStep === 2 && (
                  <>
                    <button
                      type="button"
                      className="tj-btn-hold-booking"
                      onClick={() => {
                        if (validatePassengersAndContact()) {
                          handleFinalizeBooking(true);
                        }
                      }}
                    >
                      <Clock size={16} /> Hold Booking (Hold PNR)
                    </button>

                    <button
                      type="button"
                      className="tj-btn-book-primary"
                      onClick={handleContinueToReview}
                    >
                      Continue to Review →
                    </button>
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <button
                      type="button"
                      className="tj-btn-hold-booking"
                      onClick={() => handleFinalizeBooking(true)}
                    >
                      <Clock size={16} /> Hold Booking (Hold PNR)
                    </button>

                    <button
                      type="button"
                      className="tj-btn-book-primary"
                      onClick={handleProceedToPayments}
                    >
                      Proceed to Payments →
                    </button>
                  </>
                )}

                {currentStep === 4 && (
                  <button
                    type="button"
                    className="tj-btn-book-primary"
                    disabled={isSubmitting}
                    onClick={() => handleFinalizeBooking(paymentMethod === 'hold')}
                  >
                    {isSubmitting ? 'Processing…' : paymentMethod === 'hold' ? 'Confirm Hold Booking' : 'Pay & Issue Ticket'}
                  </button>
                )}

                <Link
                  to="/flights/results"
                  state={{ search }}
                  className="tj-back-to-results-link"
                >
                  Back to flight selection
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Floating Session Timer Footer (Screenshots 4 & 5) */}
      {remaining > 0 && currentStep < 5 && (
        <div className="tripjack-session-timer-footer">
          <Clock size={16} />
          <span>
            Your Session will expire in <strong>
              {String(Math.floor(remaining / 60)).padStart(2, '0')} mins : {String(remaining % 60).padStart(2, '0')} secs
            </strong>
          </span>
        </div>
      )}

      {/* Travellers List Modal */}
      <TravellersListModal
        isOpen={showTravellersModal}
        onClose={() => setShowTravellersModal(false)}
        onSelectTraveller={handleSelectTravellerFromModal}
      />
    </main>
  );
}
