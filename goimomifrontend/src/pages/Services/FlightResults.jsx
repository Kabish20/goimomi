import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plane, ChevronLeft, ChevronRight, Clock, Zap, SlidersHorizontal, X, Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { searchFlights, reviewFlights } from './flightApi';
import { money, today, dayLabel, shiftDate, duration, fareTotal, tripDuration, layoverDuration, stopCount, cabinLabel, flightError, readSession, saveSession } from './flightUtils';
import FlightFareRules from './FlightFareRules';
import './Flights.css';

const blankFilters = { stops: [], airlines: [], departure: [], arrival: [], terminals: [], airports: [], layovers: [], fareTypes: [], baggage: false, number: '', airlineText: '', price: '', duration: '', layover: '' };
const unique = values => [...new Set(values.filter(Boolean))];
const hourBand = value => Math.floor(Number(value?.slice(11, 13)) / 6);
const terminalKeys = trip => [`Departure: ${trip.sI?.[0]?.da?.terminal || ''}`, `Arrival: ${trip.sI?.at(-1)?.aa?.terminal || ''}`].filter(key => !key.endsWith(': '));
const airportKeys = trip => [`Departure: ${trip.sI?.[0]?.da?.code}`, `Arrival: ${trip.sI?.at(-1)?.aa?.code}`];
const matchesDirections = (selected, available) => ['Departure:', 'Arrival:'].every(direction => {
  const values = selected.filter(value => value.startsWith(direction));
  return !values.length || values.some(value => available.includes(value));
});
const emptyMessage = <div className="flight-empty"><h1>Start with a flight search</h1><p>Select your route and travel dates to view available flights.</p><Link to="/flights" className="flight-primary">Search flights</Link></div>;

function FilterSection({ title, children, open = false }) {
  return <details className="flight-filter-section" open={open || undefined}><summary>{title}<span className="filter-toggle" /></summary><div>{children}</div></details>;
}

function FlightResultsSkeleton({ fromCode, toCode }) {
  return (
    <div className="flight-results-skeleton" role="status" aria-label="Loading flights">
      <div className="flight-skeleton-banner">
        <div className="flight-skeleton-spinner" />
        <div className="flight-skeleton-text">
          <strong>Searching best flights {fromCode && toCode ? `from ${fromCode} to ${toCode}` : ''}...</strong>
          <small>Comparing IndiGo, Air India, SpiceJet, Akasa Air & international carriers</small>
        </div>
      </div>
      {[1, 2, 3, 4].map(n => (
        <article className="flight-card flight-card-skeleton" key={n}>
          <div className="flight-card-grid">
            <div className="flight-airline">
              <div className="skeleton-bar airline-bar" />
              <div className="skeleton-bar flight-no-bar" />
            </div>
            <div className="flight-time">
              <div className="skeleton-bar code-bar" />
              <div className="skeleton-bar time-bar" />
            </div>
            <div className="flight-duration">
              <div className="skeleton-bar stops-bar" />
              <div className="flight-route-line-skeleton" />
              <div className="skeleton-bar dur-bar" />
            </div>
            <div className="flight-time">
              <div className="skeleton-bar code-bar" />
              <div className="skeleton-bar time-bar" />
            </div>
            <div className="flight-fares">
              <div className="skeleton-bar fare-box-bar" />
            </div>
            <div className="flight-card-actions">
              <div className="skeleton-bar btn-bar" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function FlightResults() {
  const location = useLocation();
  return <Results key={location.key} />;
}

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search] = useState(() => location.state?.search || readSession('flight-search'));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [group, setGroup] = useState('');
  const [filters, setFilters] = useState(blankFilters);
  const [sort, setSort] = useState('price');
  const [selection, setSelection] = useState({});
  const [expanded, setExpanded] = useState({});
  const [moreFares, setMoreFares] = useState({});
  const [compared, setCompared] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!search) { setLoading(false); return; }
    const controller = new AbortController();
    const cached = readSession('flight-results');
    const accept = data => { setResult(data); setGroup(Object.keys(data.searchResult?.tripInfos || {})[0] || ''); setLoading(false); };
    if (!retry && cached && JSON.stringify(cached.search) === JSON.stringify(search) && Date.now() - cached.savedAt < 900000) { accept(cached.data); return; }
    setLoading(true); setError('');
    searchFlights(search.searchQuery, controller.signal).then(({ data }) => {
      saveSession('flight-results', { search, data, savedAt: Date.now() }); accept(data);
    }).catch(err => { if (!controller.signal.aborted) { setError(flightError(err)); setLoading(false); } });
    return () => controller.abort();
  }, [search, retry]);
  const groups = result?.searchResult?.tripInfos || {};
  const trips = groups[group] || [];
  const pax = search?.searchQuery?.paxInfo || {};
  const total = fare => fareTotal(fare, pax);
  const allFares = trips.flatMap(trip => trip.totalPriceList || []);
  const maxPrice = Math.ceil(Math.max(1, ...allFares.map(total)));
  const maxDuration = Math.max(1, ...trips.map(tripDuration));
  const maxLayover = Math.max(1, ...trips.map(layoverDuration));
  const airlineOptions = unique(trips.flatMap(trip => (trip.sI || []).map(segment => segment.fD?.aI?.code))).map(code => ({ code, name: trips.flatMap(trip => trip.sI || []).find(segment => segment.fD?.aI?.code === code)?.fD?.aI?.name || code }));
  const toggle = (key, value) => setFilters(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }));
  const eligibleFares = trip => (trip.totalPriceList || []).filter(fare => (!filters.price || total(fare) <= Number(filters.price)) && (!filters.fareTypes.length || filters.fareTypes.includes(fare.fareIdentifier)) && (!filters.baggage || /[1-9]/.test(fare.fD?.ADULT?.bI?.iB || '')));
  const visibleTrips = trips.map((trip, index) => ({ trip, index, fares: eligibleFares(trip) })).filter(({ trip, fares }) => {
    const segments = trip.sI || []; const first = segments[0]; const last = segments.at(-1);
    return fares.length && (!filters.stops.length || filters.stops.includes(Math.min(3, stopCount(trip)))) &&
      (!filters.airlines.length || segments.some(s => filters.airlines.includes(s.fD?.aI?.code))) &&
      (!filters.departure.length || filters.departure.includes(hourBand(first?.dt))) &&
      (!filters.arrival.length || filters.arrival.includes(hourBand(last?.at))) &&
      matchesDirections(filters.terminals, terminalKeys(trip)) &&
      matchesDirections(filters.airports, airportKeys(trip)) &&
      (!filters.layovers.length || segments.slice(0, -1).some(s => filters.layovers.includes(s.aa?.code))) &&
      (!filters.duration || tripDuration(trip) <= Number(filters.duration)) &&
      (!filters.layover || layoverDuration(trip) <= Number(filters.layover)) &&
      (!filters.number || segments.some(s => `${s.fD?.aI?.code}${s.fD?.fN}`.toLowerCase().includes(filters.number.toLowerCase().replace(/[\s-]/g, ''))));
  }).sort((a, b) => sort === 'duration' ? tripDuration(a.trip) - tripDuration(b.trip) : sort === 'departure' ? (a.trip.sI?.[0]?.dt || '').localeCompare(b.trip.sI?.[0]?.dt || '') : Math.min(...a.fares.map(total)) - Math.min(...b.fares.map(total)));
  const cheapest = allFares.length ? Math.min(...allFares.map(total)) : null;
  const fastest = trips.length ? Math.min(...trips.map(tripDuration)) : null;
  const route = search?.searchQuery?.routeInfos?.[0];

  function changeGroup(key) { setGroup(key); setFilters(blankFilters); setCompared([]); setShowComparison(false); }
  function changeDate(date) {
    const next = { ...search, searchQuery: { ...search.searchQuery, routeInfos: [{ ...route, travelDate: date }] } };
    saveSession('flight-search', next); navigate('/flights/results', { state: { search: next } });
  }
  async function review(nextSelection = selection) {
    const missing = Object.keys(groups).find(key => !nextSelection[key]);
    if (missing) { changeGroup(missing); return; }
    setReviewing(true); setError('');
    try {
      const { data } = await reviewFlights(result.searchToken, Object.values(nextSelection).map(item => item.fare.id));
      const reviewed = { data, search, selection: nextSelection, savedAt: Date.now() };
      saveSession('flight-review', reviewed);
      navigate('/flights/review', { state: { reviewed } });
    } catch (err) { setError(flightError(err)); } finally { setReviewing(false); }
  }
  const checks = (key, values) => values.length ? values.map(value => <label className="flight-check" key={value}><input type="checkbox" checked={filters[key].includes(value)} onChange={() => toggle(key, value)} />{value}</label>) : <p className="flight-muted">Not supplied for these flights.</p>;
  const timeButtons = key => <div className="flight-time-buttons">{[Sunrise, Sun, Sunset, Moon].map((Icon, index) => <button key={index} aria-pressed={filters[key].includes(index)} onClick={() => toggle(key, index)}><Icon size={20} />{['00–06', '06–12', '12–18', '18–24'][index]}</button>)}</div>;
  if (!search) return <main className="flights-page">{emptyMessage}</main>;
  return <main className="flights-page flight-results-page">
    <div className="flight-summary"><div className="flight-container">
      <div className="summary-route"><strong>{route.fromCityOrAirport.code}</strong><Plane /><strong>{route.toCityOrAirport.code}</strong><small>{search.mode}</small></div>
      <div><span>Departure Date</span><strong>{dayLabel(route.travelDate)} {route.travelDate.slice(0, 4)}</strong></div>
      <div><span>Passengers &amp; Class</span><strong>{pax.ADULT} Adult{pax.ADULT > 1 ? 's' : ''}{pax.CHILD ? `, ${pax.CHILD} Child` : ''}{pax.INFANT ? `, ${pax.INFANT} Infant` : ''} | {cabinLabel(search.searchQuery.cabinClass)}</strong></div>
      <div><span>Preferred Airline</span><strong>{search.searchQuery.preferredAirline?.map(a => a.code).join(', ') || 'None'}</strong></div>
      <button onClick={() => navigate('/flights', { state: { search } })}>MODIFY SEARCH</button>
    </div></div>
    <div className="flight-results-layout flight-container">
      <button className="flight-filter-mobile" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={18} />{showFilters ? 'Hide filters' : 'Show filters'}</button>
      <aside className={`flight-filters ${showFilters ? 'is-open' : ''}`} aria-label="Flight filters">
        <div className="filter-heading"><strong>Filters</strong><button onClick={() => setFilters(blankFilters)}>RESET ALL</button></div>
        <FilterSection title="Price" open><input aria-label="Maximum price" type="range" min="0" max={maxPrice} value={filters.price || maxPrice} onChange={event => setFilters({ ...filters, price: event.target.value })} /><div className="range-labels"><span>{money(0)}</span><span>{money(filters.price || maxPrice)}</span></div></FilterSection>
        <FilterSection title="Popular Filters" open><div className="flight-chips">{[['Non Stop', 0], ['1 Stop', 1]].map(([label, value]) => <button key={label} aria-pressed={filters.stops.includes(value)} onClick={() => toggle('stops', value)}>{label}</button>)}{airlineOptions.slice(0, 2).map(a => <button key={a.code} aria-pressed={filters.airlines.includes(a.code)} onClick={() => toggle('airlines', a.code)}>{a.name}</button>)}</div></FilterSection>
        <FilterSection title="Stops" open><div className="flight-time-buttons">{[0, 1, 2, 3].map(value => <button key={value} aria-pressed={filters.stops.includes(value)} onClick={() => toggle('stops', value)}>{value === 3 ? '3+' : value}</button>)}</div></FilterSection>
        <FilterSection title="Departure time" open>{timeButtons('departure')}</FilterSection>
        <FilterSection title="Arrival time" open>{timeButtons('arrival')}</FilterSection>
        <FilterSection title="Baggage" open><label className="flight-check"><input type="checkbox" checked={filters.baggage} onChange={event => setFilters({ ...filters, baggage: event.target.checked })} />Show Check-in Baggage</label></FilterSection>
        <FilterSection title="Fare Type" open>{checks('fareTypes', unique(allFares.map(fare => fare.fareIdentifier)))}</FilterSection>
        <FilterSection title="Flight Number" open><input aria-label="Flight number" className="flight-filter-input" placeholder="Eg. 123 or 6E-123" value={filters.number} onChange={event => setFilters({ ...filters, number: event.target.value })} /></FilterSection>
        <FilterSection title="Airlines" open><input aria-label="Search airline name" className="flight-filter-input" placeholder="Search Airline Name" value={filters.airlineText} onChange={event => setFilters({ ...filters, airlineText: event.target.value })} />{airlineOptions.filter(a => a.name.toLowerCase().includes(filters.airlineText.toLowerCase())).map(a => <label key={a.code} className="flight-check"><input type="checkbox" checked={filters.airlines.includes(a.code)} onChange={() => toggle('airlines', a.code)} />{a.name}<small>{trips.filter(t => t.sI?.some(s => s.fD?.aI?.code === a.code)).length}</small></label>)}</FilterSection>
        <FilterSection title="Terminal">{checks('terminals', unique(trips.flatMap(terminalKeys)))}</FilterSection>
        <FilterSection title="Airport">{checks('airports', unique(trips.flatMap(airportKeys)))}</FilterSection>
        <FilterSection title="Layover Airport">{checks('layovers', unique(trips.flatMap(trip => (trip.sI || []).slice(0, -1).map(s => s.aa?.code))))}</FilterSection>
        <FilterSection title="Duration"><p>Up to {duration(filters.duration || maxDuration)}</p><input aria-label="Maximum duration" type="range" min="0" max={maxDuration} value={filters.duration || maxDuration} onChange={event => setFilters({ ...filters, duration: event.target.value })} /></FilterSection>
        <FilterSection title="Layover Duration"><p>Up to {duration(filters.layover || maxLayover)}</p><input aria-label="Maximum layover duration" type="range" min="0" max={maxLayover} value={filters.layover || maxLayover} onChange={event => setFilters({ ...filters, layover: event.target.value })} /></FilterSection>
      </aside>
      <section className="flight-results-main" aria-label="Flight results" aria-busy={loading || reviewing}>
        {search.mode === 'ONE WAY' && <div className="flight-date-strip"><button aria-label="Previous day" disabled={route.travelDate <= today()} onClick={() => changeDate(shiftDate(route.travelDate, -1))}><ChevronLeft /></button>{Array.from({ length: 7 }, (_, index) => shiftDate(route.travelDate, index)).map((date, index) => <button key={date} className={index === 0 ? 'active' : ''} onClick={() => { if (index) changeDate(date); }}><span>{dayLabel(date)}</span><strong>{index === 0 ? 'Selected date' : 'Fetch Fare'}</strong></button>)}<button aria-label="Next week" onClick={() => changeDate(shiftDate(route.travelDate, 7))}><ChevronRight /></button></div>}
        <p className="flight-muted fare-note">Fares are live search results and remain subject to availability. Prices include all selected passengers.</p>
        {loading && <FlightResultsSkeleton fromCode={route?.fromCityOrAirport?.code} toCode={route?.toCityOrAirport?.code} />}
        {error && <div className="flight-error" role="alert">{error}<div><button onClick={() => { setSelection({}); setRetry(value => value + 1); }}>Search again</button></div></div>}
        {!loading && result && <>
          {Object.keys(groups).length > 1 && <div className="flight-group-tabs">{Object.keys(groups).map((key, index) => <button key={key} aria-pressed={group === key} onClick={() => changeGroup(key)}>{key === 'ONWARD' ? 'Outbound' : key === 'RETURN' ? 'Return' : `Journey ${index + 1}`}{selection[key] ? ' ✓' : ''}</button>)}</div>}
          <div className="flight-sort"><button aria-pressed={sort === 'price'} onClick={() => setSort('price')}><span className="rupee-symbol">₹</span><span>Cheapest: <strong>{cheapest !== null ? money(cheapest) : '—'}</strong></span></button><button aria-pressed={sort === 'duration'} onClick={() => setSort('duration')}><Zap size={18} />Fastest: <strong>{fastest !== null ? duration(fastest) : '—'}</strong></button><select aria-label="Sort flights" value={sort} onChange={event => setSort(event.target.value)}><option value="price">Sort by: Price</option><option value="duration">Sort by: Duration</option><option value="departure">Sort by: Departure</option></select></div>
          <div className="flight-result-labels"><span>{visibleTrips.length} flights</span><span>Departure</span><span>Duration</span><span>Arrival</span><span>Price</span></div>
          {!visibleTrips.length && <div className="flight-empty"><h2>No flights found</h2><p>Try another date or reset your filters.</p><button onClick={() => setFilters(blankFilters)}>Reset filters</button></div>}
          {visibleTrips.map(({ trip, index, fares }) => {
            const first = trip.sI?.[0]; const last = trip.sI?.at(-1); const key = `${group}-${index}`;
            const chosen = fares.find(fare => fare.id === selection[group]?.fare.id) || fares[0];
            return <article className="flight-card" key={key}>
              <div className="flight-card-grid">
                <div className="flight-airline"><div><Plane size={22} /><strong>{first?.fD?.aI?.name || first?.fD?.aI?.code}</strong></div><small>{trip.sI?.map(s => `${s.fD?.aI?.code}-${s.fD?.fN}`).join(', ')}</small><button className="flight-details-button" aria-expanded={!!expanded[key]} onClick={() => setExpanded({ ...expanded, [key]: !expanded[key] })}>View Details {expanded[key] ? '−' : '+'}</button>{chosen.fD?.ADULT?.sR != null && <span className="seats-left">Seats left: {chosen.fD.ADULT.sR}</span>}</div>
                <div className="flight-time"><small>{first?.da?.code}</small><strong>{first?.dt?.slice(11, 16)}</strong><small>{dayLabel(first?.dt)}</small></div>
                <div className="flight-duration"><small>{stopCount(trip) ? `${stopCount(trip)} Stop(s)` : 'Non-Stop'}</small><div className="flight-route-line">→</div><span>{duration(tripDuration(trip))}</span></div>
                <div className="flight-time"><small>{last?.aa?.code}</small><strong>{last?.at?.slice(11, 16)}</strong><small>{dayLabel(last?.at)}</small></div>
                <div className="flight-fares">{(moreFares[key] ? fares : fares.slice(0, 3)).map(fare => <label key={fare.id}><div><input type="radio" name={`fare-${group}`} checked={selection[group]?.fare.id === fare.id} onChange={() => setSelection({ ...selection, [group]: { fare, trip } })} /><strong>{money(total(fare))}</strong></div><small><mark>{fare.fareIdentifier?.replaceAll('_', ' ') || 'Published'}</mark> {cabinLabel(fare.fD?.ADULT?.cc || search.searchQuery.cabinClass)}, {['Non-refundable', 'Refundable', 'Partially refundable'][fare.fD?.ADULT?.rT] || 'Check fare rules'}</small></label>)}{fares.length > 3 && <button className="more-fares" onClick={() => setMoreFares({ ...moreFares, [key]: !moreFares[key] })}>{moreFares[key] ? 'Fewer fares' : `+${fares.length - 3} more fares`}</button>}</div>
                <div className="flight-card-actions"><button className="flight-primary" disabled={reviewing} onClick={() => { const next = { ...selection, [group]: { fare: chosen, trip } }; setSelection(next); review(next); }}>{reviewing ? 'Reviewing…' : Object.keys(groups).length > 1 ? 'SELECT' : 'BOOK'}</button><button className="flight-outline" aria-pressed={compared.includes(index)} disabled={!compared.includes(index) && compared.length >= 3} onClick={() => setCompared(compared.includes(index) ? compared.filter(i => i !== index) : [...compared, index])}>{compared.includes(index) ? 'Added ✓' : 'Compare'}</button></div>
              </div>
              {expanded[key] && <div className="flight-segments">{trip.sI?.map((segment, i) => <div key={segment.id || i}><strong>{segment.fD?.aI?.name} {segment.fD?.aI?.code}-{segment.fD?.fN}</strong><p>{segment.da?.name || segment.da?.code} {segment.da?.terminal ? `· Terminal ${segment.da.terminal}` : ''} → {segment.aa?.name || segment.aa?.code} {segment.aa?.terminal ? `· Terminal ${segment.aa.terminal}` : ''}</p><p>{segment.dt?.replace('T', ' ')} → {segment.at?.replace('T', ' ')} · {duration(segment.duration || 0)}</p>{segment.cT > 0 && <p><Clock size={14} /> Layover: {duration(segment.cT)}</p>}</div>)}<p>Check-in baggage: {chosen.fD?.ADULT?.bI?.iB || 'Not supplied'} · Cabin baggage: {chosen.fD?.ADULT?.bI?.cB || 'Not supplied'}</p><FlightFareRules key={chosen.id} searchToken={result.searchToken} priceId={chosen.id} /></div>}
            </article>;
          })}
          {Object.keys(selection).length > 0 && Object.keys(groups).length > 1 && <div className="flight-selection-bar"><span>{Object.keys(selection).length} of {Object.keys(groups).length} journeys selected</span><button className="flight-primary" disabled={reviewing || Object.keys(selection).length !== Object.keys(groups).length} onClick={() => review()}>Continue to review</button></div>}
        </>}
      </section>
    </div>
    {compared.length > 0 && <div className="flight-compare-bar"><span>{compared.length} flights selected (up to 3)</span><button className="flight-primary" onClick={() => setShowComparison(true)}>Compare flights</button><button aria-label="Clear comparison" onClick={() => { setCompared([]); setShowComparison(false); }}><X /></button></div>}
    {showComparison && <div className="flight-modal-backdrop" onClick={() => setShowComparison(false)}><section className="flight-compare-modal" role="dialog" aria-modal="true" aria-label="Compare flights" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') setShowComparison(false); }}><button autoFocus aria-label="Close comparison" onClick={() => setShowComparison(false)}><X /></button><h2>Compare flights</h2><div className="flight-comparison-table"><table><thead><tr><th>Flight</th><th>Duration</th><th>Stops</th><th>From</th></tr></thead><tbody>{compared.map(index => <tr key={index}><td>{trips[index].sI?.[0]?.fD?.aI?.name}</td><td>{duration(tripDuration(trips[index]))}</td><td>{stopCount(trips[index])}</td><td>{money(Math.min(...trips[index].totalPriceList.map(total)))}</td></tr>)}</tbody></table></div></section></div>}
  </main>;
}
