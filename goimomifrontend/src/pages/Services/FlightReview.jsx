import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plane } from 'lucide-react';
import { money, duration, readSession } from './flightUtils';
import './Flights.css';

export default function FlightReview() {
  const location = useLocation();
  const [reviewed] = useState(() => location.state?.reviewed || readSession('flight-review'));
  const [accepted, setAccepted] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  if (!reviewed) return <main className="flights-page flight-empty"><h1>Select a flight first</h1><Link to="/flights" className="flight-primary">Search flights</Link></main>;
  const { data, search, savedAt } = reviewed;
  const remaining = Math.max(0, Math.floor((savedAt + Number(data.conditions?.st || 0) * 1000 - now) / 1000));
  const fareChanged = data.alerts?.some(alert => alert.type === 'FAREALERT');
  const fare = data.totalPriceInfo?.totalFareDetail?.fC || data.totalPriceInfo?.fc || {};
  const trips = Array.isArray(data.tripInfos) ? data.tripInfos : Object.values(reviewed.selection).map(item => item.trip);
  return <main className="flights-page flight-review-page">
    <div className="flight-summary"><div className="flight-container"><strong>Review your itinerary</strong><span>Search → Select flight → Review</span><Link to="/flights/results" state={{ search }}><ArrowLeft size={16} /> Back to results</Link></div></div>
    <div className="flight-container flight-review-layout">
      <section>
        <h1>Check your flight details</h1>
        {fareChanged && <div className="flight-alert" role="alert">The fare has changed since your search. Please check the updated total before continuing.</div>}
        {!remaining && <div className="flight-alert" role="alert">This fare review has expired. Return to results and review the flight again for current availability.</div>}
        {trips.map((trip, index) => <article className="flight-review-card" key={trip.id || index}><h2><Plane size={20} />Journey {index + 1}</h2>{(trip.sI || []).map((segment, i) => <div className="flight-review-segment" key={segment.id || i}><strong>{segment.fD?.aI?.name} · {segment.fD?.aI?.code}-{segment.fD?.fN}</strong><div><p><b>{segment.da?.code}</b><span>{segment.da?.name}</span><span>{segment.dt?.replace('T', ' ')}</span></p><span>→ {duration(segment.duration || 0)}</span><p><b>{segment.aa?.code}</b><span>{segment.aa?.name}</span><span>{segment.at?.replace('T', ' ')}</span></p></div></div>)}</article>)}
        <div className="flight-review-card"><h2><CheckCircle2 size={20} />Before you book</h2><p>Verify your route, dates and passenger count. Your travel advisor will confirm baggage, fare rules and traveller details before ticketing.</p><p>{search.searchQuery.paxInfo.ADULT} adult(s), {search.searchQuery.paxInfo.CHILD || 0} child(ren), {search.searchQuery.paxInfo.INFANT || 0} infant(s).</p></div>
      </section>
      <aside className="flight-review-card flight-fare-summary"><h2>Fare summary</h2>{[['Base fare', fare.BF], ['Taxes & fees', fare.TAF]].map(([label, value]) => value != null && <p key={label}><span>{label}</span><strong>{money(value)}</strong></p>)}<p className="review-total"><span>Total fare</span><strong>{fare.TF != null ? money(fare.TF) : 'Confirm with our team'}</strong></p><small>For all selected passengers</small>{remaining > 0 && <p className="flight-muted">Review valid for {Math.floor(remaining / 60)}m {remaining % 60}s</p>}
        {fareChanged && <label className="flight-check"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />I accept the updated fare.</label>}
        <p>Complete your booking with our travel team. No payment is collected on this page.</p>
        {remaining > 0 && (!fareChanged || accepted) ? <Link className="flight-primary" to="/contactus">Continue to travel team</Link> : <button className="flight-primary" disabled>Continue to travel team</button>}
        <Link to="/flights/results" state={{ search }} className="flight-back-link">Back to flight selection</Link>
      </aside>
    </div>
  </main>;
}
