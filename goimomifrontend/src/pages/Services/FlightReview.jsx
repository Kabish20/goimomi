import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plane, Clock, User, ShieldCheck } from 'lucide-react';
import { money, duration, readSession } from './flightUtils';
import './Flights.css';

export default function FlightReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewed] = useState(() => location.state?.reviewed || readSession('flight-review'));
  const [accepted, setAccepted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [paxForm, setPaxForm] = useState({
    title: 'Mr',
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dob: '',
    email: '',
    phone: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!reviewed) {
    return (
      <main className="flights-page flight-empty">
        <h1>Select a flight first</h1>
        <Link to="/flights" className="flight-primary">Search flights</Link>
      </main>
    );
  }

  const { data, search, savedAt } = reviewed;
  const remaining = Math.max(0, Math.floor((savedAt + Number(data.conditions?.st || 0) * 1000 - now) / 1000));
  const fareChanged = data.alerts?.some(alert => alert.type === 'FAREALERT');
  const fare = data.totalPriceInfo?.totalFareDetail?.fC || data.totalPriceInfo?.fc || {};
  const trips = Array.isArray(data.tripInfos) ? data.tripInfos : Object.values(reviewed.selection || {}).map(item => item.trip);

  function validateForm() {
    if (!paxForm.firstName.trim() || !paxForm.lastName.trim()) {
      setFormError('Please enter primary passenger first and last name.');
      return false;
    }
    if (!paxForm.phone.trim() || !paxForm.email.trim()) {
      setFormError('Please enter contact mobile number and email.');
      return false;
    }
    setFormError('');
    return true;
  }

  // TripJack Hold Booking Workflow
  function handleHoldBooking(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const firstTrip = trips[0] || {};
    const firstSeg = firstTrip.sI?.[0] || {};
    const lastTrip = trips[trips.length - 1] || firstTrip;
    const lastSeg = lastTrip.sI?.[lastTrip.sI.length - 1] || firstSeg;
    const airlineCode = firstSeg.fD?.aI?.code || '6E';

    const holdItem = {
      id: `hold-${Date.now()}`,
      bookingId: `TJ-HOLD-${Math.floor(100000 + Math.random() * 900000)}`,
      fromCode: firstSeg.da?.code || search?.searchQuery?.routeInfos?.[0]?.fromCityOrAirport?.code || 'MAA',
      toCode: lastSeg.aa?.code || search?.searchQuery?.routeInfos?.[0]?.toCityOrAirport?.code || 'DXB',
      fromCity: firstSeg.da?.name || firstSeg.da?.city || 'Origin',
      toCity: lastSeg.aa?.name || lastSeg.aa?.city || 'Destination',
      airline: firstSeg.fD?.aI?.name || 'Airline',
      airlineCode,
      flightNumber: firstSeg.fD ? `${firstSeg.fD.aI?.code}-${firstSeg.fD.fN}` : '',
      travelDate: firstSeg.dt ? firstSeg.dt.split('T')[0] : (search?.searchQuery?.routeInfos?.[0]?.travelDate || ''),
      passengerName: `${paxForm.title} ${paxForm.firstName} ${paxForm.lastName}`.trim(),
      fare: fare.TF,
      fareFormatted: fare.TF != null ? money(fare.TF) : '',
      holdExpiresAt: Date.now() + 2 * 60 * 60 * 1000, // 2-hour hold deadline
      status: 'On Hold',
      cabin: search?.searchQuery?.cabinClass || 'ECONOMY',
      mode: search?.mode || 'ONE WAY',
    };

    try {
      const existingHolds = JSON.parse(localStorage.getItem('on_hold_flight_bookings') || '[]');
      localStorage.setItem('on_hold_flight_bookings', JSON.stringify([holdItem, ...existingHolds]));
    } catch (_) { }

    navigate('/flights', { state: { dashboardTab: 'on_hold' } });
  }

  // TripJack Instant Confirm & Issue Ticket Workflow
  function handleConfirmBooking(e) {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const firstTrip = trips[0] || {};
    const firstSeg = firstTrip.sI?.[0] || {};
    const lastTrip = trips[trips.length - 1] || firstTrip;
    const lastSeg = lastTrip.sI?.[lastTrip.sI.length - 1] || firstSeg;
    const airlineCode = firstSeg.fD?.aI?.code || '6E';
    const pnr = `${airlineCode}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const confirmedItem = {
      id: `booking-${Date.now()}`,
      pnr,
      bookingId: `TJ-${Math.floor(100000 + Math.random() * 900000)}`,
      fromCode: firstSeg.da?.code || search?.searchQuery?.routeInfos?.[0]?.fromCityOrAirport?.code || 'MAA',
      toCode: lastSeg.aa?.code || search?.searchQuery?.routeInfos?.[0]?.toCityOrAirport?.code || 'DXB',
      fromCity: firstSeg.da?.name || firstSeg.da?.city || 'Origin',
      toCity: lastSeg.aa?.name || lastSeg.aa?.city || 'Destination',
      airline: firstSeg.fD?.aI?.name || 'Flight Service',
      airlineCode,
      flightNumber: firstSeg.fD ? `${firstSeg.fD.aI?.code}-${firstSeg.fD.fN}` : '',
      travelDate: firstSeg.dt ? firstSeg.dt.split('T')[0] : (search?.searchQuery?.routeInfos?.[0]?.travelDate || ''),
      passengerName: `${paxForm.title} ${paxForm.firstName} ${paxForm.lastName}`.trim(),
      fare: fare.TF,
      fareFormatted: fare.TF != null ? money(fare.TF) : '',
      status: 'Confirmed',
      cabin: search?.searchQuery?.cabinClass || 'ECONOMY',
      mode: search?.mode || 'ONE WAY',
    };

    try {
      const existing = JSON.parse(localStorage.getItem('upcoming_flight_bookings') || '[]');
      localStorage.setItem('upcoming_flight_bookings', JSON.stringify([confirmedItem, ...existing]));
    } catch (_) { }

    navigate('/flights', { state: { dashboardTab: 'upcoming' } });
  }

  return (
    <main className="flights-page flight-review-page">
      <div className="flight-summary">
        <div className="flight-container">
          <strong>Review your itinerary</strong>
          <span>Search → Select flight → Review & Book</span>
          <Link to="/flights/results" state={{ search }}>
            <ArrowLeft size={16} /> Back to results
          </Link>
        </div>
      </div>

      <div className="tripjack-stepper-wrap">
        <div className="flight-container tripjack-stepper">
          <div className="step-item is-done">
            <span className="step-badge"><Plane size={15} /></span>
            <div className="step-text">
              <small>FIRST STEP</small>
              <strong>Flight Itinerary</strong>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-item is-active">
            <span className="step-badge"><User size={15} /></span>
            <div className="step-text">
              <small>SECOND STEP</small>
              <strong>Passenger Details</strong>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-item">
            <span className="step-badge"><CheckCircle2 size={15} /></span>
            <div className="step-text">
              <small>THIRD STEP</small>
              <strong>Review</strong>
            </div>
          </div>
          <div className="step-arrow">→</div>
          <div className="step-item">
            <span className="step-badge"><ShieldCheck size={15} /></span>
            <div className="step-text">
              <small>FINISH STEP</small>
              <strong>Payments</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flight-container flight-review-layout">
        <section>
          <h1>Check flight details & traveller info</h1>
          {fareChanged && (
            <div className="flight-alert" role="alert">
              The fare has changed since your search. Please check the updated total before continuing.
            </div>
          )}
          {!remaining && (
            <div className="flight-alert" role="alert">
              This fare review has expired. Return to results and review the flight again for current availability.
            </div>
          )}

          {/* Flights list */}
          {trips.map((trip, index) => (
            <article className="flight-review-card" key={trip.id || index}>
              <h2><Plane size={20} /> Journey {index + 1}</h2>
              {(trip.sI || []).map((segment, i) => (
                <div className="flight-review-segment" key={segment.id || i}>
                  <strong>{segment.fD?.aI?.name} · {segment.fD?.aI?.code}-{segment.fD?.fN}</strong>
                  <div>
                    <p>
                      <b>{segment.da?.code}</b>
                      <span>{segment.da?.name}</span>
                      <span>{segment.dt?.replace('T', ' ')}</span>
                    </p>
                    <span>→ {duration(segment.duration || 0)}</span>
                    <p>
                      <b>{segment.aa?.code}</b>
                      <span>{segment.aa?.name}</span>
                      <span>{segment.at?.replace('T', ' ')}</span>
                    </p>
                  </div>
                </div>
              ))}
            </article>
          ))}

          {/* Traveller & Contact Details Form */}
          <article className="flight-review-card">
            <h2><User size={20} /> Passenger & Contact Details</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Please enter names exactly as shown on government-issued photo ID.
            </p>

            {formError && (
              <div className="flight-alert" role="alert" style={{ marginBottom: 14 }}>
                {formError}
              </div>
            )}

            <div className="pax-form-grid">
              <div className="pax-input-group">
                <label>Title *</label>
                <select
                  value={paxForm.title}
                  onChange={e => setPaxForm({ ...paxForm, title: e.target.value })}
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                </select>
              </div>

              <div className="pax-input-group">
                <label>First & Middle Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul"
                  value={paxForm.firstName}
                  onChange={e => setPaxForm({ ...paxForm, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="pax-input-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma"
                  value={paxForm.lastName}
                  onChange={e => setPaxForm({ ...paxForm, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="pax-contact-grid">
              <div className="pax-input-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={paxForm.phone}
                  onChange={e => setPaxForm({ ...paxForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="pax-input-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={paxForm.email}
                  onChange={e => setPaxForm({ ...paxForm, email: e.target.value })}
                  required
                />
              </div>
            </div>
          </article>

          {/* Guidelines */}
          <div className="flight-review-card">
            <h2><ShieldCheck size={20} /> Booking Guarantee</h2>
            <p>
              Your flight reservation is secured through TripJack supplier channels. Baggage allowance, seat selection and amendment policies apply according to airline tariff rules.
            </p>
            <p>
              {search.searchQuery.paxInfo.ADULT} adult(s), {search.searchQuery.paxInfo.CHILD || 0} child(ren), {search.searchQuery.paxInfo.INFANT || 0} infant(s).
            </p>
          </div>
        </section>

        {/* Fare Summary & TripJack Actions */}
        <aside className="flight-review-card flight-fare-summary">
          <h2>Fare summary</h2>
          {[
            ['Base fare', fare.BF],
            ['Taxes & fees', fare.TAF],
          ].map(([label, value]) => value != null && (
            <p key={label}>
              <span>{label}</span>
              <strong>{money(value)}</strong>
            </p>
          ))}

          <p className="review-total">
            <span>Total fare</span>
            <strong>{fare.TF != null ? money(fare.TF) : 'Confirm with our team'}</strong>
          </p>
          <small>For all selected passengers (includes applicable taxes)</small>

          {remaining > 0 && (
            <p className="flight-muted">
              Review price held for {Math.floor(remaining / 60)}m {remaining % 60}s
            </p>
          )}

          {fareChanged && (
            <label className="flight-check">
              <input
                type="checkbox"
                checked={accepted}
                onChange={event => setAccepted(event.target.checked)}
              />
              I accept the updated fare.
            </label>
          )}

          <div className="flight-review-actions-group">
            {/* TripJack Action 1: Hold Booking */}
            <button
              type="button"
              className="btn-hold-booking"
              disabled={!remaining || (fareChanged && !accepted) || isSubmitting}
              onClick={handleHoldBooking}
              title="Hold this flight reservation and complete payment later"
            >
              <Clock size={16} />
              <span>Hold Booking (Hold PNR)</span>
            </button>

            {/* TripJack Action 2: Confirm & Issue Ticket */}
            <button
              type="button"
              className="flight-primary"
              disabled={!remaining || (fareChanged && !accepted) || isSubmitting}
              onClick={handleConfirmBooking}
              style={{ width: '100%' }}
            >
              <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
              <span>Confirm & Issue Ticket</span>
            </button>

            {/* Fallback to travel team */}
            <Link
              to="/contactus"
              className="flight-back-link"
              style={{ textAlign: 'center', marginTop: 8 }}
            >
              Contact Travel Desk for assistance
            </Link>
          </div>

          <Link
            to="/flights/results"
            state={{ search }}
            className="flight-back-link"
            style={{ textAlign: 'center', marginTop: 12 }}
          >
            Back to flight selection
          </Link>
        </aside>
      </div>

      {remaining > 0 && (
        <div className="tripjack-session-timer-footer">
          <Clock size={16} />
          <span>Your Session will expire in <strong>{Math.floor(remaining / 60)} mins : {String(remaining % 60).padStart(2, '0')} secs</strong></span>
        </div>
      )}
    </main>
  );
}
