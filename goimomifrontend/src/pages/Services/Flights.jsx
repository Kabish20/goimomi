import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, CalendarDays, ChevronDown, PlaneLanding, PlaneTakeoff, X } from 'lucide-react';
import { getFlightAirports } from './flightApi';
import { readSession, saveSession, today } from './flightUtils';
import FlightPassengerPicker from './FlightPassengerPicker';
import FlightFareOption from './FlightFareOption';
import './Flights.css';

const emptyRoute = () => ({ fromCityOrAirport: { code: '' }, toCityOrAirport: { code: '' }, travelDate: today() });
const airlines = [['6E', 'IndiGo'], ['SG', 'SpiceJet'], ['AI', 'Air India'], ['QP', 'Akasa Air'], ['IX', 'AI Express'], ['EK', 'Emirates Airlines'], ['EY', 'Etihad Airways'], ['SQ', 'Singapore Airlines'], ['QR', 'Qatar Airways'], ['MH', 'Malaysia Airline']];

export default function Flights() {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = location.state?.search || readSession('flight-search');
  const [mode, setMode] = useState(initial?.mode || 'ONE WAY');
  const [routes, setRoutes] = useState(initial?.searchQuery?.routeInfos || [emptyRoute()]);
  const [pax, setPax] = useState(initial?.searchQuery?.paxInfo || { ADULT: 1, CHILD: 0, INFANT: 0 });
  const [cabin, setCabin] = useState(initial?.searchQuery?.cabinClass || 'ECONOMY');
  const [direct, setDirect] = useState(initial?.searchQuery?.searchModifiers?.isDirectFlight || false);
  const [fareType, setFareType] = useState(initial?.searchQuery?.searchModifiers?.pfts || 'REGULAR');
  const [preferred, setPreferred] = useState(initial?.searchQuery?.preferredAirline?.map(a => a.code) || []);
  const [airports, setAirports] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    getFlightAirports(controller.signal).then(({ data }) => setAirports(Array.isArray(data) ? data : data.results || [])).catch(() => {});
    return () => controller.abort();
  }, []);
  function changeMode(next) {
    setMode(next); setError('');
    setRoutes(previous => next === 'ONE WAY' ? [previous[0]] : next === 'ROUND TRIP' ? [previous[0], { fromCityOrAirport: previous[0].toCityOrAirport, toCityOrAirport: previous[0].fromCityOrAirport, travelDate: previous[1]?.travelDate || previous[0].travelDate }] : previous.length > 1 ? previous : [...previous, emptyRoute()]);
  }
  function updateRoute(index, key, value) {
    setRoutes(previous => previous.map((route, i) => i === index ? { ...route, [key]: key === 'travelDate' ? value : { code: value.toUpperCase() } } : route));
  }
  function submit(event) {
    event.preventDefault();
    if (Object.values(pax).some(value => !Number.isInteger(value) || value < 0) || pax.ADULT < 1 || pax.INFANT > pax.ADULT || pax.CHILD > pax.ADULT || pax.ADULT + pax.CHILD > 9) {
      setError('Select up to nine seated passengers. Children and infants cannot exceed adults.'); return;
    }
    const journey = mode === 'ROUND TRIP' ? [routes[0], { fromCityOrAirport: routes[0].toCityOrAirport, toCityOrAirport: routes[0].fromCityOrAirport, travelDate: routes[1].travelDate }] : routes;
    if (journey.some((route, index) => route.fromCityOrAirport.code === route.toCityOrAirport.code || route.travelDate < today() || (index && route.travelDate < journey[index - 1].travelDate))) {
      setError('Choose different origin and destination airports and travel dates in ascending order.'); return;
    }
    const search = { mode, searchQuery: { cabinClass: cabin, paxInfo: pax, routeInfos: journey, searchModifiers: { isDirectFlight: direct, pfts: fareType }, ...(preferred.length ? { preferredAirline: preferred.map(code => ({ code })) } : {}) } };
    saveSession('flight-search', search);
    navigate('/flights/results', { state: { search } });
  }
  return <main className="flights-page flight-search-page">
    <section className="flight-hero">
      <div className="flight-container">
        <h1>Book flights and explore the world with us.</h1>
        <div className="journey-tabs" role="group" aria-label="Journey type">{['ONE WAY', 'ROUND TRIP', 'MULTI CITY'].map(item => <button key={item} type="button" aria-pressed={mode === item} className={mode === item ? 'active' : ''} onClick={() => changeMode(item)}>{item}</button>)}</div>
        <form onSubmit={submit}>
          <datalist id="flight-airports">{airports.map(airport => <option key={airport.id} value={airport.iata_code}>{airport.city_name} — {airport.name}</option>)}</datalist>
          {(mode === 'MULTI CITY' ? routes : [routes[0]]).map((route, index) => <div className="flight-search-row" key={index}>
            <div className="flight-route-inputs">
              <label><PlaneTakeoff aria-hidden="true" /><input aria-label={`Journey ${index + 1} origin`} list="flight-airports" placeholder="Where From ?" required pattern="[A-Za-z]{3}" maxLength={3} value={route.fromCityOrAirport.code} onChange={event => updateRoute(index, 'fromCityOrAirport', event.target.value)} /></label>
              <button type="button" className="flight-swap" aria-label={`Swap journey ${index + 1} airports`} onClick={() => setRoutes(routes.map((item, i) => i === index ? { ...item, fromCityOrAirport: item.toCityOrAirport, toCityOrAirport: item.fromCityOrAirport } : item))}><ArrowLeftRight size={20} /></button>
              <label><PlaneLanding aria-hidden="true" /><input aria-label={`Journey ${index + 1} destination`} list="flight-airports" placeholder="Where To ?" required pattern="[A-Za-z]{3}" maxLength={3} value={route.toCityOrAirport.code} onChange={event => updateRoute(index, 'toCityOrAirport', event.target.value)} /></label>
            </div>
            <div className="flight-dates"><CalendarDays aria-hidden="true" /><input aria-label={`Journey ${index + 1} departure date`} type="date" required min={index ? routes[index - 1].travelDate : today()} value={route.travelDate} onChange={event => updateRoute(index, 'travelDate', event.target.value)} />{mode === 'ROUND TRIP' ? <><input aria-label="Return date" type="date" required min={routes[0].travelDate} value={routes[1].travelDate} onChange={event => updateRoute(1, 'travelDate', event.target.value)} /><button type="button" aria-label="Remove return journey" onClick={() => changeMode('ONE WAY')}><X size={18} /></button></> : mode === 'ONE WAY' && <button type="button" className="add-return" onClick={() => changeMode('ROUND TRIP')}>Add return</button>}</div>
            {index === 0 ? <>
              <FlightPassengerPicker pax={pax} setPax={setPax} cabin={cabin} setCabin={setCabin} />
              <button className="flight-primary search-button" type="submit">Search</button>
            </> : <div className="flight-extra-actions">{routes.length < 6 && index === routes.length - 1 && <button type="button" onClick={() => setRoutes([...routes, emptyRoute()])}>ADD ONE MORE</button>}{routes.length > 2 && <button type="button" aria-label={`Remove journey ${index + 1}`} onClick={() => setRoutes(routes.filter((_, i) => i !== index))}><X /></button>}</div>}
          </div>)}
          <div className="flight-search-options">
            <details className="flight-airline-menu"><summary>Select Preferred Airline <ChevronDown size={18} /></summary><div>{airlines.map(([code, name]) => <label key={code}><input type="checkbox" checked={preferred.includes(code)} onChange={() => setPreferred(preferred.includes(code) ? preferred.filter(item => item !== code) : [...preferred, code])} />{name}</label>)}</div></details>
            <span>Select Fare Type:</span>
            <div className="flight-fare-types">{[['REGULAR', 'Regular'], ['STUDENT', 'Student'], ['SENIOR_CITIZEN', 'Senior Citizen']].map(([value, label]) => <FlightFareOption key={value} value={value} label={label} selected={fareType === value} onChange={() => setFareType(value)} />)}{['SOTO', 'NDC'].map(label => <label key={label} className="unavailable-option" title="Not available in the current flight service"><input type="checkbox" disabled />{label}<span className="sr-only"> — unavailable</span></label>)}</div>
            <label className="direct-option"><input type="checkbox" checked={direct} onChange={event => setDirect(event.target.checked)} />Direct Flight</label>
          </div>
          {error && <p className="flight-error" role="alert">{error}</p>}
        </form>
      </div>
    </section>
    <div className="flight-search-note flight-container"><PlaneTakeoff /><div><h2>Your journey starts here</h2><p>Search flights, compare fares and review your itinerary. Choose an airport code or select an airport from the suggestions.</p></div></div>
  </main>;
}
