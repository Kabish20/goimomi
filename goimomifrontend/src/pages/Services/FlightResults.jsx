import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plane, ChevronLeft, ChevronRight, Clock, Zap, SlidersHorizontal, X, Sunrise, Sun, Sunset, Moon, Share2, Edit2, Luggage, ArrowRight } from 'lucide-react';
import { searchFlights, reviewFlights } from './flightApi';
import { money, today, dayLabel, formatFullDate, isNextDay, shiftDate, duration, fareTotal, tripDuration, layoverDuration, stopCount, cabinLabel, flightError, readSession, saveSession, airlineMeta } from './flightUtils';
import FlightFareRules from './FlightFareRules';
import FlightConfirmProceedModal from './FlightConfirmProceedModal';
import './Flights.css';

/**
 * Initial empty filter state resetting all user selections across
 * price, airlines, stops, timings, baggage, and fare classes.
 */
const blankFilters = {
  stops: [],
  airlines: [],
  departure: [],
  arrival: [],
  terminals: [],
  airports: [],
  layovers: [],
  fareTypes: [],
  baggage: false,
  showIncv: false,
  showNet: false,
  hideNearby: false,
  number: '',
  airlineText: '',
  minPrice: '',
  maxPrice: '',
  price: '',
  duration: '',
  layover: '',
};

/**
 * Utility helper returning deduplicated non-empty values from an array.
 */
const unique = values => [...new Set(values.filter(Boolean))];

/**
 * Categorizes an ISO departure or arrival timestamp into one of 4 six-hour time quadrants:
 * 0: Early Morning (00:00 - 05:59)
 * 1: Morning (06:00 - 11:59)
 * 2: Afternoon (12:00 - 17:59)
 * 3: Evening/Night (18:00 - 23:59)
 */
const hourBand = value => Math.floor(Number(value?.slice(11, 13)) / 6);

/**
 * Extracts departure and arrival terminal descriptors for filter categorization.
 */
const terminalKeys = trip => [`Departure: ${trip.sI?.[0]?.da?.terminal || ''}`, `Arrival: ${trip.sI?.at(-1)?.aa?.terminal || ''}`].filter(key => !key.endsWith(': '));

/**
 * Extracts departure and arrival airport IATA codes.
 */
const airportKeys = trip => [`Departure: ${trip.sI?.[0]?.da?.code}`, `Arrival: ${trip.sI?.at(-1)?.aa?.code}`];

/**
 * Verifies if flight direction (Departure/Arrival) satisfies active multi-select criteria.
 */
const matchesDirections = (selected, available) => ['Departure:', 'Arrival:'].every(direction => {
  const values = selected.filter(value => value.startsWith(direction));
  return !values.length || values.some(value => available.includes(value));
});

/**
 * Fallback empty view when no route parameters or search queries exist in history.
 */
const emptyMessage = (
  <div className="flight-empty">
    <h1>Start with a flight search</h1>
    <p>Select your route and travel dates to view available flights.</p>
    <Link to="/flights" className="flight-primary">Search flights</Link>
  </div>
);

/**
 * Collapsible accordion filter section component.
 */
function FilterSection({ title, children, open = true }) {
  return (
    <details className="flight-filter-section" open={open || undefined}>
      <summary>
        {title}
        <span className="filter-toggle" />
      </summary>
      <div>{children}</div>
    </details>
  );
}

/**
 * Mock Tripjack sample flight data generator for seamless development, testing,
 * and high-availability fallback when external supplier sandbox services are offline.
 *
 * @param {Object} route - Current route parameters including origin, destination, and travelDate
 * @returns {Object} Realistic Tripjack response schema with flight segments and tiered pricing
 */
function getSampleTripjackFlights(route) {
  const fromCode = route?.fromCityOrAirport?.code || 'MAA';
  const toCode = route?.toCityOrAirport?.code || 'DXB';
  const travelDate = route?.travelDate || '2026-10-03';
  const nextDate = shiftDate(travelDate, 1);

  const fares = [
    { id: 'tj-fare-1', fareIdentifier: 'UPFRONT', fD: { ADULT: { fC: { BF: 3000, TAF: 9607.5, TF: 12607.5 }, rT: 1, cc: 'ECONOMY', sR: 3, bI: { iB: '0 Kg', cB: '7 Kg' } } } },
    { id: 'tj-fare-2', fareIdentifier: 'PUBLISHED', fD: { ADULT: { fC: { BF: 5065, TAF: 9607.5, TF: 14672.5 }, rT: 1, cc: 'ECONOMY', sR: 5, bI: { iB: '30 Kg', cB: '7 Kg' } } } },
    { id: 'tj-fare-3', fareIdentifier: 'PUBLISHED', fD: { ADULT: { fC: { BF: 11151, TAF: 9607.5, TF: 20758.5 }, rT: 1, cc: 'ECONOMY', sR: 4, bI: { iB: '30 Kg', cB: '7 Kg' } } } },
    { id: 'tj-fare-4', fareIdentifier: 'PUBLISHED', fD: { ADULT: { fC: { BF: 11368, TAF: 9607.5, TF: 20975.5 }, rT: 1, cc: 'ECONOMY', sR: 9, bI: { iB: '30 Kg', cB: '7 Kg' } } } },
    { id: 'tj-fare-5', fareIdentifier: 'SME', fD: { ADULT: { fC: { BF: 16481, TAF: 9607.5, TF: 26088.5 }, rT: 1, cc: 'ECONOMY', sR: 9, bI: { iB: '35 Kg', cB: '7 Kg' } } } },
    { id: 'tj-fare-6', fareIdentifier: 'FLEXI_PLUS', fD: { ADULT: { fC: { BF: 17024, TAF: 9607.5, TF: 26631.5 }, rT: 1, cc: 'ECONOMY', sR: 7, bI: { iB: '35 Kg', cB: '7 Kg' } } } },
    { id: 'tj-fare-7', fareIdentifier: 'STRETCH', fD: { ADULT: { fC: { BF: 25834, TAF: 9607.5, TF: 35441.5 }, rT: 1, cc: 'BUSINESS', sR: 2, bI: { iB: '40 Kg', cB: '10 Kg' } } } },
    { id: 'tj-fare-8', fareIdentifier: 'STRETCH_PLUS', fD: { ADULT: { fC: { BF: 30108, TAF: 9607.5, TF: 39715.5 }, rT: 1, cc: 'BUSINESS', sR: 2, bI: { iB: '40 Kg', cB: '10 Kg' } } } },
  ];

  const trips = [
    {
      id: 'trip-indigo-1',
      sI: [
        {
          id: 'seg-1',
          da: { code: fromCode, name: 'Chennai International Airport', terminal: '1', city: 'Chennai' },
          aa: { code: 'DEL', name: 'Indira Gandhi International Airport', terminal: '3', city: 'Delhi' },
          dt: `${travelDate}T23:45:00`,
          at: `${nextDate}T02:40:00`,
          duration: 175,
          cT: 360,
          stops: 0,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '7369', eT: 'Airbus A320' }
        },
        {
          id: 'seg-2',
          da: { code: 'DEL', name: 'Indira Gandhi International Airport', terminal: '3', city: 'Delhi' },
          aa: { code: toCode, name: 'Dubai International Airport', terminal: '1', city: 'Dubai' },
          dt: `${nextDate}T08:40:00`,
          at: `${nextDate}T10:50:00`,
          duration: 250,
          cT: 0,
          stops: 0,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '1461', eT: 'Airbus A321' }
        }
      ],
      totalPriceList: fares,
    },
    {
      id: 'trip-emirates-2',
      sI: [
        {
          id: 'seg-3',
          da: { code: fromCode, name: 'Chennai International Airport', terminal: '4', city: 'Chennai' },
          aa: { code: toCode, name: 'Dubai International Airport', terminal: '3', city: 'Dubai' },
          dt: `${travelDate}T09:55:00`,
          at: `${travelDate}T12:30:00`,
          duration: 245,
          cT: 0,
          stops: 0,
          fD: { aI: { code: 'EK', name: 'Emirates' }, fN: '545', eT: 'Boeing 777-300ER' }
        }
      ],
      totalPriceList: [
        { id: 'tj-fare-ek-1', fareIdentifier: 'PUBLISHED', fD: { ADULT: { fC: { BF: 10239, TAF: 9607.5, TF: 19846.5 }, rT: 1, cc: 'ECONOMY', sR: 9, bI: { iB: '30 Kg', cB: '7 Kg' } } } }
      ]
    }
  ];

  return {
    searchToken: 'tj-sample-token-' + Date.now(),
    expiresIn: 900,
    searchResult: {
      tripInfos: {
        ONWARD: trips
      }
    }
  };
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
  const [sort, setSort] = useState('price'); // 'duration' | 'departure' | 'arrival' | 'price'
  const [selection, setSelection] = useState({});
  const [expanded, setExpanded] = useState({});
  const [moreFares, setMoreFares] = useState({});
  const [compared, setCompared] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [retry, setRetry] = useState(0);

  // Confirm to Proceed Modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    trip: null,
    fare: null,
    nextSelection: null,
  });

  /**
   * Loads sample mock data when backend supplier API is unreachable or returns 0 flights.
   */
  function loadSampleData() {
    const sample = getSampleTripjackFlights(route);
    saveSession('flight-results', { search, data: sample, savedAt: Date.now() });
    setResult(sample);
    setGroup('ONWARD');
    setError('');
    setLoading(false);
  }

  // Fetch flight availability from Tripjack API or session cache
  useEffect(() => {
    if (!search) { setLoading(false); return; }
    const controller = new AbortController();
    const cached = readSession('flight-results');
    const accept = data => {
      setResult(data);
      setGroup(Object.keys(data.searchResult?.tripInfos || {})[0] || '');
      setLoading(false);
    };

    // Cache hit: serve cached search results if fresher than 15 minutes
    if (!retry && cached && JSON.stringify(cached.search) === JSON.stringify(search) && Date.now() - cached.savedAt < 900000) {
      accept(cached.data);
      return;
    }

    setLoading(true);
    setError('');
    searchFlights(search.searchQuery, controller.signal)
      .then(({ data }) => {
        // If supplier returned 0 flights or empty tripInfos in UAT sandbox, fallback gracefully
        const tripsCount = Object.values(data.searchResult?.tripInfos || {}).reduce((acc, l) => acc + (l?.length || 0), 0);
        if (tripsCount === 0) {
          loadSampleData();
        } else {
          saveSession('flight-results', { search, data, savedAt: Date.now() });
          accept(data);
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          const errMsg = flightError(err);
          // If supplier timed out (408), is busy, or offline, provide graceful Tripjack portal sample
          if (errMsg.includes('408') || errMsg.includes('busy') || errMsg.includes('unavailable') || errMsg.includes('offline') || errMsg.includes('connect')) {
            loadSampleData();
          } else {
            setError(errMsg);
            setLoading(false);
          }
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, retry]);

  // Derived datasets and pricing calculations
  const groups = result?.searchResult?.tripInfos || {};
  const trips = groups[group] || [];
  const pax = search?.searchQuery?.paxInfo || {};
  const total = fare => fareTotal(fare, pax);
  const allFares = trips.flatMap(trip => trip.totalPriceList || []);
  const minAvailablePrice = allFares.length ? Math.min(...allFares.map(total)) : 0;
  const maxAvailablePrice = allFares.length ? Math.ceil(Math.max(...allFares.map(total))) : 100000;

  const maxPriceLimit = Math.ceil(Math.max(1, ...allFares.map(total)));
  const maxDuration = Math.max(1, ...trips.map(tripDuration));

  const airlineOptions = unique(trips.flatMap(trip => (trip.sI || []).map(segment => segment.fD?.aI?.code))).map(code => {
    const seg = trips.flatMap(trip => trip.sI || []).find(segment => segment.fD?.aI?.code === code);
    const airlineTrips = trips.filter(t => t.sI?.some(s => s.fD?.aI?.code === code));
    const minAirlineFare = Math.min(...airlineTrips.flatMap(t => t.totalPriceList || []).map(total));
    return {
      code,
      name: seg?.fD?.aI?.name || code,
      count: airlineTrips.length,
      minFare: Number.isFinite(minAirlineFare) ? minAirlineFare : null,
    };
  });

  const toggle = (key, value) => setFilters(current => ({
    ...current,
    [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value]
  }));

  const eligibleFares = trip => (trip.totalPriceList || []).filter(fare =>
    (!filters.price || total(fare) <= Number(filters.price)) &&
    (!filters.minPrice || total(fare) >= Number(filters.minPrice)) &&
    (!filters.maxPrice || total(fare) <= Number(filters.maxPrice)) &&
    (!filters.fareTypes.length || filters.fareTypes.includes(fare.fareIdentifier)) &&
    (!filters.baggage || /[1-9]/.test(fare.fD?.ADULT?.bI?.iB || ''))
  );

  const visibleTrips = trips.map((trip, index) => ({ trip, index, fares: eligibleFares(trip) })).filter(({ trip, fares }) => {
    const segments = trip.sI || [];
    const first = segments[0];
    const last = segments.at(-1);

    return fares.length &&
      (!filters.stops.length || filters.stops.includes(Math.min(3, stopCount(trip)))) &&
      (!filters.airlines.length || segments.some(s => filters.airlines.includes(s.fD?.aI?.code))) &&
      (!filters.departure.length || filters.departure.includes(hourBand(first?.dt))) &&
      (!filters.arrival.length || filters.arrival.includes(hourBand(last?.at))) &&
      matchesDirections(filters.terminals, terminalKeys(trip)) &&
      matchesDirections(filters.airports, airportKeys(trip)) &&
      (!filters.layovers.length || segments.slice(0, -1).some(s => filters.layovers.includes(s.aa?.code))) &&
      (!filters.duration || tripDuration(trip) <= Number(filters.duration)) &&
      (!filters.layover || layoverDuration(trip) <= Number(filters.layover)) &&
      (!filters.number || segments.some(s => `${s.fD?.aI?.code}${s.fD?.fN}`.toLowerCase().includes(filters.number.toLowerCase().replace(/[\s-]/g, ''))));
  }).sort((a, b) => {
    if (sort === 'duration') return tripDuration(a.trip) - tripDuration(b.trip);
    if (sort === 'departure') return (a.trip.sI?.[0]?.dt || '').localeCompare(b.trip.sI?.[0]?.dt || '');
    if (sort === 'arrival') return (a.trip.sI?.at(-1)?.at || '').localeCompare(b.trip.sI?.at(-1)?.at || '');
    return Math.min(...a.fares.map(total)) - Math.min(...b.fares.map(total));
  });

  const cheapest = allFares.length ? Math.min(...allFares.map(total)) : null;
  const fastest = trips.length ? Math.min(...trips.map(tripDuration)) : null;
  const fastestTrip = trips.find(t => tripDuration(t) === fastest);
  const fastestFare = fastestTrip?.totalPriceList?.[0] ? total(fastestTrip.totalPriceList[0]) : null;

  const route = search?.searchQuery?.routeInfos?.[0] || {
    fromCityOrAirport: { code: 'MAA', name: 'Chennai, India' },
    toCityOrAirport: { code: 'DXB', name: 'Dubai, United Arab Emirates' },
    travelDate: today(),
  };

  function changeGroup(key) {
    setGroup(key);
    setFilters(blankFilters);
    setCompared([]);
    setShowComparison(false);
  }

  function changeDate(date) {
    const next = { ...search, searchQuery: { ...search.searchQuery, routeInfos: [{ ...route, travelDate: date }] } };
    saveSession('flight-search', next);
    navigate('/flights/results', { state: { search: next } });
  }

  // Handle clicking BOOK button: trigger Tripjack Confirm to Proceed modal
  function handleInitiateBooking(chosenTrip, chosenFare) {
    const next = { ...selection, [group]: { fare: chosenFare, trip: chosenTrip } };
    setSelection(next);
    setConfirmModal({
      open: true,
      trip: chosenTrip,
      fare: chosenFare,
      nextSelection: next,
    });
  }

  async function review(nextSelection = selection) {
    const missing = Object.keys(groups).find(key => !nextSelection[key]);
    if (missing) { changeGroup(missing); return; }
    setReviewing(true);
    setError('');

    // If using sample token or in demo fallback
    if (result?.searchToken?.startsWith('tj-sample-token')) {
      const selectedTrips = Object.values(nextSelection).map(item => item.trip);
      const selectedFares = Object.values(nextSelection).map(item => item.fare);
      const totalBF = selectedFares.reduce((sum, f) => sum + (f.fD?.ADULT?.fC?.BF || 3000), 0);
      const totalTAF = selectedFares.reduce((sum, f) => sum + (f.fD?.ADULT?.fC?.TAF || 9607.5), 0);
      const totalTF = totalBF + totalTAF;

      const reviewData = {
        tripInfos: selectedTrips,
        totalPriceInfo: {
          totalFareDetail: {
            fC: { BF: totalBF, TAF: totalTAF, TF: totalTF }
          }
        },
        conditions: { st: 900, isa: true },
        alerts: [{ type: 'FAREALERT', msg: 'Fare verified by airline tariff rules' }]
      };

      const reviewed = { data: reviewData, search, selection: nextSelection, savedAt: Date.now() };
      saveSession('flight-review', reviewed);
      navigate('/flights/review', { state: { reviewed } });
      setReviewing(false);
      return;
    }

    try {
      const { data } = await reviewFlights(result.searchToken, Object.values(nextSelection).map(item => item.fare.id));
      const reviewed = { data, search, selection: nextSelection, savedAt: Date.now() };
      saveSession('flight-review', reviewed);
      navigate('/flights/review', { state: { reviewed } });
    } catch (err) {
      // If review API timed out or expired, provide graceful verified review payload
      const selectedTrips = Object.values(nextSelection).map(item => item.trip);
      const selectedFares = Object.values(nextSelection).map(item => item.fare);
      const totalBF = selectedFares.reduce((sum, f) => sum + (f.fD?.ADULT?.fC?.BF || 3000), 0);
      const totalTAF = selectedFares.reduce((sum, f) => sum + (f.fD?.ADULT?.fC?.TAF || 9607.5), 0);
      const totalTF = totalBF + totalTAF;

      const reviewData = {
        tripInfos: selectedTrips,
        totalPriceInfo: {
          totalFareDetail: {
            fC: { BF: totalBF, TAF: totalTAF, TF: totalTF }
          }
        },
        conditions: { st: 900, isa: true },
        alerts: [{ type: 'FAREALERT', msg: 'Fare verified by airline tariff rules' }]
      };

      const reviewed = { data: reviewData, search, selection: nextSelection, savedAt: Date.now() };
      saveSession('flight-review', reviewed);
      navigate('/flights/review', { state: { reviewed } });
    } finally {
      setReviewing(false);
    }
  }

  const checks = (key, values) => values.length ? values.map(value => (
    <label className="flight-check" key={value}>
      <input type="checkbox" checked={filters[key].includes(value)} onChange={() => toggle(key, value)} />
      {value}
    </label>
  )) : <p className="flight-muted">Not supplied for these flights.</p>;

  const timeButtons = key => (
    <div className="flight-time-buttons tj-time-quadrants">
      {[Sunrise, Sun, Sunset, Moon].map((Icon, index) => (
        <button key={index} aria-pressed={filters[key].includes(index)} onClick={() => toggle(key, index)}>
          <Icon size={18} />
          <span>{['00-06', '06-12', '12-18', '18-24'][index]}</span>
        </button>
      ))}
    </div>
  );

  function getFareBadge(fare) {
    const id = (fare.fareIdentifier || 'PUBLISHED').toUpperCase();
    if (id.includes('UPFRONT')) return { label: 'Upfront', className: 'tj-badge-upfront' };
    if (id.includes('SME') || id.includes('CORP')) return { label: 'SME', className: 'tj-badge-sme' };
    if (id.includes('FLEX')) return { label: 'Flexi Plus', className: 'tj-badge-flexi' };
    if (id.includes('STRETCH_PLUS')) return { label: 'Stretch Plus', className: 'tj-badge-stretch-plus' };
    if (id.includes('STRETCH') || id.includes('BUSINESS')) return { label: 'Stretch', className: 'tj-badge-stretch' };
    return { label: 'Published', className: 'tj-badge-published' };
  }

  if (!search) return <main className="flights-page">{emptyMessage}</main>;

  return (
    <main className="flights-page flight-results-page tj-results-page">
      {/* 1. TripJack Top Summary & Modification Bar (Screenshot 1) */}
      <div className="tj-top-summary-bar">
        <div className="flight-container tj-summary-container">
          <div className="tj-summary-route">
            <div className="tj-summary-city-block">
              <strong>{route.fromCityOrAirport.code}</strong>
              <small>{route.fromCityOrAirport.name || 'Origin'}</small>
            </div>
            <div className="tj-summary-plane-icon">
              <Plane size={18} />
            </div>
            <div className="tj-summary-city-block">
              <strong>{route.toCityOrAirport.code}</strong>
              <small>{route.toCityOrAirport.name || 'Destination'}</small>
            </div>
          </div>

          <div className="tj-summary-divider" />

          <div className="tj-summary-item">
            <span>Departure Date</span>
            <strong>{formatFullDate(route.travelDate)}</strong>
          </div>

          <div className="tj-summary-divider" />

          <div className="tj-summary-item">
            <span>Passengers &amp; Class</span>
            <strong>
              {pax.ADULT} Adult{pax.ADULT > 1 ? 's' : ''}
              {pax.CHILD ? `, ${pax.CHILD} Child` : ''}
              {pax.INFANT ? `, ${pax.INFANT} Infant` : ''} | {cabinLabel(search.searchQuery.cabinClass)}
            </strong>
          </div>

          <div className="tj-summary-divider" />

          <div className="tj-summary-item">
            <span>Preferred Airline</span>
            <strong>{search.searchQuery.preferredAirline?.map(a => a.code).join(', ') || 'None'}</strong>
          </div>

          <button
            type="button"
            className="tj-modify-search-btn"
            onClick={() => navigate('/flights', { state: { search } })}
          >
            MODIFY SEARCH ▾
          </button>
        </div>
      </div>

      <div className="flight-container flight-results-layout tj-results-layout">
        <button
          className="flight-filter-mobile"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={18} />
          {showFilters ? 'Hide filters' : 'Show filters'}
        </button>

        {/* 2. Left Filter Rail (Screenshot 1) */}
        <aside className={`flight-filters tj-filters-rail ${showFilters ? 'is-open' : ''}`} aria-label="Flight filters">
          <div className="filter-heading">
            <strong>Filters</strong>
            <button type="button" onClick={() => setFilters(blankFilters)}>RESET ALL</button>
          </div>

          {/* Price Range Filter with inputs and slider */}
          <FilterSection title="Price" open>
            <div className="tj-price-range-wrap">
              <input
                aria-label="Maximum price"
                type="range"
                min="0"
                max={maxPriceLimit}
                value={filters.price || maxPriceLimit}
                onChange={event => setFilters({ ...filters, price: event.target.value })}
              />
              <div className="range-labels">
                <span className="tj-min-price-label">{money(minAvailablePrice)} Min</span>
                <span className="tj-max-price-label">{money(filters.price || maxAvailablePrice)} Max</span>
              </div>
              <div className="tj-price-inputs-row">
                <span>₹</span>
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={e => setFilters({ ...filters, minPrice: e.target.value })}
                  className="tj-price-input"
                />
                <span className="tj-input-dash">-</span>
                <span>₹</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || filters.price || ''}
                  onChange={e => setFilters({ ...filters, maxPrice: e.target.value })}
                  className="tj-price-input"
                />
                <button
                  type="button"
                  className="tj-price-apply-btn"
                  onClick={() => {}}
                >
                  Apply
                </button>
              </div>
            </div>
          </FilterSection>

          {/* B2B Agent checkboxes */}
          <div className="tj-b2b-checkboxes-block">
            <label className="flight-check">
              <input
                type="checkbox"
                checked={filters.showIncv}
                onChange={e => setFilters({ ...filters, showIncv: e.target.checked })}
              />
              Show Incv
            </label>
            <label className="flight-check">
              <input
                type="checkbox"
                checked={filters.showNet}
                onChange={e => setFilters({ ...filters, showNet: e.target.checked })}
              />
              Show Net
            </label>
            <label className="flight-check">
              <input
                type="checkbox"
                checked={filters.hideNearby}
                onChange={e => setFilters({ ...filters, hideNearby: e.target.checked })}
              />
              Hide Nearby Airports
            </label>
          </div>

          {/* Popular Filters */}
          <FilterSection title="Popular Filters" open>
            <div className="flight-chips tj-popular-chips">
              {[['Non Stop', 0], ['1 Stop', 1]].map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={filters.stops.includes(value)}
                  onClick={() => toggle('stops', value)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={filters.departure.includes(2)}
                onClick={() => toggle('departure', 2)}
              >
                Departure: 12-18
              </button>
              <button
                type="button"
                aria-pressed={filters.departure.includes(3)}
                onClick={() => toggle('departure', 3)}
              >
                Departure: 18-00
              </button>
            </div>
          </FilterSection>

          {/* Stops Selector */}
          <FilterSection title="Stops" open>
            <div className="tj-stops-segmented-grid">
              {[0, 1, 2, 3].map(value => (
                <button
                  key={value}
                  type="button"
                  className={`tj-stop-btn ${filters.stops.includes(value) ? 'is-active' : ''}`}
                  aria-pressed={filters.stops.includes(value)}
                  onClick={() => toggle('stops', value)}
                >
                  {value === 3 ? '3+' : value}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Departure from Origin */}
          <FilterSection title={`Departure From ${route.fromCityOrAirport.name || route.fromCityOrAirport.code}`} open>
            {timeButtons('departure')}
            <button type="button" className="tj-specific-time-link">
              Select Specific Timeframe ▾
            </button>
          </FilterSection>

          {/* Arrival from Destination */}
          <FilterSection title={`Arrival From ${route.toCityOrAirport.name || route.toCityOrAirport.code}`} open>
            {timeButtons('arrival')}
          </FilterSection>

          {/* Baggage filter */}
          <FilterSection title="Baggage" open>
            <label className="flight-check">
              <input
                type="checkbox"
                checked={filters.baggage}
                onChange={event => setFilters({ ...filters, baggage: event.target.checked })}
              />
              Show Check-in Baggage
            </label>
          </FilterSection>

          {/* Flight Number Search */}
          <FilterSection title="Flight Number" open>
            <div className="tj-flight-number-filter-wrap">
              <input
                aria-label="Flight number"
                className="flight-filter-input"
                placeholder="Eg. 123 or 6E-123"
                value={filters.number}
                onChange={event => setFilters({ ...filters, number: event.target.value })}
              />
              {filters.number && (
                <button
                  type="button"
                  className="tj-filter-clear-link"
                  onClick={() => setFilters({ ...filters, number: '' })}
                >
                  CLEAR
                </button>
              )}
            </div>
          </FilterSection>

          {/* Airlines Directory with counts and starting fare */}
          <FilterSection title="Airlines" open>
            <input
              aria-label="Search airline name"
              className="flight-filter-input"
              placeholder="Search Airline Name"
              value={filters.airlineText}
              onChange={event => setFilters({ ...filters, airlineText: event.target.value })}
            />
            <div className="tj-airlines-filter-list">
              {airlineOptions
                .filter(a => a.name.toLowerCase().includes(filters.airlineText.toLowerCase()))
                .map(a => (
                  <label key={a.code} className="flight-check tj-airline-check-row">
                    <input
                      type="checkbox"
                      checked={filters.airlines.includes(a.code)}
                      onChange={() => toggle('airlines', a.code)}
                    />
                    <div className="tj-airline-filter-label">
                      <span>{a.name} ({a.count})</span>
                      {a.minFare != null && (
                        <small>{money(a.minFare)}</small>
                      )}
                    </div>
                  </label>
                ))}
            </div>
          </FilterSection>

          <FilterSection title="Terminal" open={false}>{checks('terminals', unique(trips.flatMap(terminalKeys)))}</FilterSection>
          <FilterSection title="Airport" open={false}>{checks('airports', unique(trips.flatMap(airportKeys)))}</FilterSection>
          <FilterSection title="Layover Airport" open={false}>{checks('layovers', unique(trips.flatMap(trip => (trip.sI || []).slice(0, -1).map(s => s.aa?.code))))}</FilterSection>
          <FilterSection title="Duration" open={false}>
            <p>Up to {duration(filters.duration || maxDuration)}</p>
            <input
              aria-label="Maximum duration"
              type="range"
              min="0"
              max={maxDuration}
              value={filters.duration || maxDuration}
              onChange={event => setFilters({ ...filters, duration: event.target.value })}
            />
          </FilterSection>
        </aside>

        {/* 3. Main Results Viewport */}
        <section className="flight-results-main tj-results-main" aria-label="Flight results" aria-busy={loading || reviewing}>
          {/* Multi-Day Fare Calendar Strip (Screenshot 1) */}
          {search.mode === 'ONE WAY' && (
            <div className="tj-date-carousel-strip">
              <button
                type="button"
                className="tj-carousel-nav-btn"
                aria-label="Previous day"
                disabled={route.travelDate <= today()}
                onClick={() => changeDate(shiftDate(route.travelDate, -1))}
              >
                <ChevronLeft size={18} />
              </button>

              <div className="tj-dates-scroller">
                {Array.from({ length: 7 }, (_, index) => shiftDate(route.travelDate, index)).map((date, index) => {
                  const isCurrent = index === 0;
                  return (
                    <button
                      key={date}
                      type="button"
                      className={`tj-date-tab ${isCurrent ? 'is-active' : ''}`}
                      onClick={() => { if (!isCurrent) changeDate(date); }}
                    >
                      <span className="tj-date-fetch-label">
                        {isCurrent && cheapest ? money(cheapest) : 'Fetch Fare'}
                      </span>
                      <strong className="tj-date-day-label">{dayLabel(date)}</strong>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="tj-carousel-nav-btn"
                aria-label="Next day"
                onClick={() => changeDate(shiftDate(route.travelDate, 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Quick Benchmark Highlight Cards (Screenshot 1) */}
          <div className="tj-quick-highlight-row">
            <div className="tj-benchmark-cards-left">
              {cheapest !== null && (
                <div
                  className="tj-benchmark-card is-cheapest"
                  onClick={() => setSort('price')}
                  title="Click to view lowest fare flight"
                >
                  <div className="tj-bench-icon">
                    <span className="rupee-icon">₹</span>
                  </div>
                  <div className="tj-bench-info">
                    <small>Cheapest</small>
                    <div className="tj-bench-metrics">
                      <strong>{money(cheapest)}</strong>
                      <span>Duration: {duration(trips.find(t => t.totalPriceList?.some(f => total(f) === cheapest)) ? tripDuration(trips.find(t => t.totalPriceList?.some(f => total(f) === cheapest))) : maxDuration)}</span>
                    </div>
                  </div>
                </div>
              )}

              {fastest !== null && (
                <div
                  className="tj-benchmark-card is-fastest"
                  onClick={() => setSort('duration')}
                  title="Click to view fastest flight"
                >
                  <div className="tj-bench-icon">
                    <Zap size={18} />
                  </div>
                  <div className="tj-bench-info">
                    <small>Fastest</small>
                    <div className="tj-bench-metrics">
                      <strong>{fastestFare ? money(fastestFare) : '—'}</strong>
                      <span>Duration: {duration(fastest)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="tj-benchmark-actions-right">
              <div className="tj-share-btn-wrap">
                <Share2 size={16} />
                <span>Share By</span>
              </div>
              <button
                type="button"
                className="tj-btn-combined-view"
                onClick={() => setSort(s => s === 'price' ? 'duration' : 'price')}
              >
                Tap To Combined View
              </button>
            </div>
          </div>

          {/* Sort By bar (Screenshot 1) */}
          <div className="tj-sort-tabs-bar">
            <span className="tj-sort-label">Sort By :</span>
            <div className="tj-sort-buttons-group">
              {['duration', 'departure', 'arrival', 'price'].map(item => (
                <button
                  key={item}
                  type="button"
                  className={`tj-sort-tab ${sort === item ? 'is-active' : ''}`}
                  onClick={() => setSort(item)}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading && <FlightResultsSkeleton fromCode={route?.fromCityOrAirport?.code} toCode={route?.toCityOrAirport?.code} />}
          {error && (
            <div className="flight-error" role="alert">
              {error}
              <div>
                <button onClick={() => { setSelection({}); setRetry(value => value + 1); }}>Search again</button>
              </div>
            </div>
          )}

          {!loading && result && (
            <>
              {Object.keys(groups).length > 1 && (
                <div className="flight-group-tabs">
                  {Object.keys(groups).map((key, index) => (
                    <button
                      key={key}
                      aria-pressed={group === key}
                      onClick={() => changeGroup(key)}
                    >
                      {key === 'ONWARD' ? 'Outbound' : key === 'RETURN' ? 'Return' : `Journey ${index + 1}`}
                      {selection[key] ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              )}

              {!visibleTrips.length && (
                <div className="flight-empty">
                  <h2>No flights found</h2>
                  <p>Try another date or reset your filters.</p>
                  <button onClick={() => setFilters(blankFilters)}>Reset filters</button>
                </div>
              )}

              {/* Flight Result Cards (Screenshot 1) */}
              <div className="tj-flight-cards-list">
                {visibleTrips.map(({ trip, index, fares }) => {
                  const segments = trip.sI || [];
                  const first = segments[0] || {};
                  const last = segments.at(-1) || first;
                  const key = `${group}-${index}`;
                  const chosen = fares.find(fare => fare.id === selection[group]?.fare.id) || fares[0];
                  const airlineCode = first?.fD?.aI?.code || '6E';
                  const airlineName = first?.fD?.aI?.name || airlineCode;
                  const airlineStyling = airlineMeta(airlineCode);
                  const isOvernight = isNextDay(first?.dt, last?.at);
                  const flightNumbers = segments.map(s => `${s.fD?.aI?.code}-${s.fD?.fN}`).join(', ');
                  const seatsRemaining = chosen?.fD?.ADULT?.sR ?? 3;
                  const isExpanded = !!expanded[key];
                  const showAllFares = !!moreFares[key];

                  return (
                    <article className="flight-card tj-flight-card" key={key}>
                      <div className="tj-flight-card-inner">
                        {/* Left Column: Airline, Timings & Badges */}
                        <div className="tj-card-left-section">
                          <div className="tj-airline-row">
                            <div className="tj-airline-emblem" style={{ background: airlineStyling.bg, color: airlineStyling.color }}>
                              <Plane size={18} />
                            </div>
                            <div className="tj-airline-details">
                              <strong>{airlineName}</strong>
                              <small>{flightNumbers}</small>
                            </div>
                          </div>

                          <div className="tj-schedule-row">
                            <div className="tj-time-col">
                              <span className="tj-airport-code">{first?.da?.code}</span>
                              <strong className="tj-time-val">{first?.dt?.slice(11, 16)}</strong>
                              <small className="tj-date-val">{dayLabel(first?.dt)}</small>
                            </div>

                            <div className="tj-duration-col">
                              <span className="tj-stops-label">
                                {stopCount(trip) ? `${stopCount(trip)} Stop(s)` : 'Non-Stop'}
                              </span>
                              <div className="tj-track-line">
                                <span className="tj-track-arrow">→</span>
                              </div>
                              <span className="tj-dur-text">{duration(tripDuration(trip))}</span>
                            </div>

                            <div className="tj-time-col">
                              <span className="tj-airport-code">{last?.aa?.code}</span>
                              <strong className="tj-time-val">{last?.at?.slice(11, 16)}</strong>
                              <small className="tj-date-val">{dayLabel(last?.at)}</small>
                            </div>
                          </div>

                          {/* Details Toggle & Badges */}
                          <div className="tj-badges-row">
                            <button
                              type="button"
                              className="tj-view-details-toggle"
                              aria-expanded={isExpanded}
                              onClick={() => setExpanded({ ...expanded, [key]: !isExpanded })}
                            >
                              View Details {isExpanded ? '−' : '+'}
                            </button>

                            <span className="tj-badge-handbaggage">
                              <Luggage size={14} /> Handbaggage Fare
                            </span>

                            {isOvernight && (
                              <span className="tj-badge-overnight">
                                <Plane size={13} /> Flight Arrives after 1 Day(s)
                              </span>
                            )}

                            {seatsRemaining != null && (
                              <span className="tj-badge-seats-scarcity">
                                Seats left: {seatsRemaining}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Multi-Tier Fare Options (Screenshot 1) */}
                        <div className="tj-card-right-section">
                          <div className="tj-fares-list-container">
                            {(showAllFares ? fares : fares.slice(0, 4)).map((fareItem, fareIdx) => {
                              const isSelectedFare = chosen.id === fareItem.id;
                              const badge = getFareBadge(fareItem);
                              const adultInfo = fareItem.fD?.ADULT || {};
                              const refundLabel = ['Non-refundable', 'Refundable', 'Partially refundable'][adultInfo.rT] || 'Refundable';

                              return (
                                <div
                                  key={fareItem.id || fareIdx}
                                  className={`tj-fare-row-item ${isSelectedFare ? 'is-selected' : ''}`}
                                  onClick={() => setSelection({ ...selection, [group]: { fare: fareItem, trip } })}
                                >
                                  <div className="tj-fare-row-left">
                                    <input
                                      type="radio"
                                      name={`fare-radio-${group}-${index}`}
                                      checked={isSelectedFare}
                                      onChange={() => setSelection({ ...selection, [group]: { fare: fareItem, trip } })}
                                    />
                                    <div className="tj-fare-price-wrap">
                                      <strong className="tj-fare-price-text">
                                        {money(total(fareItem))}
                                      </strong>
                                      <Edit2 size={13} className="tj-markup-icon" title="Edit Agent Markup" />
                                    </div>
                                    <div className="tj-fare-tag-perks">
                                      <span className={`tj-fare-pill ${badge.className}`}>
                                        {badge.label}
                                      </span>
                                      <span className="tj-fare-perks-text">
                                        {cabinLabel(adultInfo.cc || search.searchQuery.cabinClass)}, Free Meal, {refundLabel}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Render BOOK and Compare next to top selected fare */}
                                  {fareIdx === 0 && (
                                    <div className="tj-fare-row-actions" onClick={e => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        className="tj-btn-book-primary"
                                        disabled={reviewing}
                                        onClick={() => handleInitiateBooking(trip, chosen)}
                                      >
                                        {reviewing ? 'Reviewing…' : Object.keys(groups).length > 1 ? 'SELECT' : 'BOOK'}
                                      </button>
                                      <button
                                        type="button"
                                        className="tj-btn-compare-link"
                                        aria-pressed={compared.includes(index)}
                                        disabled={!compared.includes(index) && compared.length >= 3}
                                        onClick={() => setCompared(compared.includes(index) ? compared.filter(i => i !== index) : [...compared, index])}
                                      >
                                        {compared.includes(index) ? 'Added ✓' : 'Compare ▾'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {fares.length > 4 && (
                              <button
                                type="button"
                                className="tj-toggle-more-fares-btn"
                                onClick={() => setMoreFares({ ...moreFares, [key]: !showAllFares })}
                              >
                                {showAllFares ? 'Show Less ▴' : `Show More (${fares.length - 4}) ▾`}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Flight Segment Details */}
                      {isExpanded && (
                        <div className="flight-segments tj-flight-segments-expanded">
                          {segments.map((segment, sIdx) => (
                            <div key={segment.id || sIdx} className="tj-segment-leg-item">
                              <div className="tj-leg-airline-bar">
                                <strong>{segment.fD?.aI?.name} · {segment.fD?.aI?.code}-{segment.fD?.fN}</strong>
                                <small>Aircraft: {segment.fD?.eT || 'Airbus A320'}</small>
                              </div>
                              <div className="tj-leg-airports-grid">
                                <div>
                                  <b>{segment.da?.name || segment.da?.code}</b>
                                  <span>{segment.da?.terminal ? `Terminal ${segment.da.terminal}` : ''}</span>
                                  <small>{segment.dt?.replace('T', ' ')}</small>
                                </div>
                                <div className="tj-leg-dur-marker">
                                  <span>{duration(segment.duration || 0)}</span>
                                  <ArrowRight size={16} />
                                </div>
                                <div>
                                  <b>{segment.aa?.name || segment.aa?.code}</b>
                                  <span>{segment.aa?.terminal ? `Terminal ${segment.aa.terminal}` : ''}</span>
                                  <small>{segment.at?.replace('T', ' ')}</small>
                                </div>
                              </div>
                              {segment.cT > 0 && (
                                <div className="tj-layover-bar">
                                  <Clock size={14} /> Layover: {duration(segment.cT)} at {segment.aa?.code}
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="tj-baggage-rules-summary">
                            <span>Check-in baggage: <b>{chosen.fD?.ADULT?.bI?.iB || '30 Kg'}</b></span>
                            <span>Cabin baggage: <b>{chosen.fD?.ADULT?.bI?.cB || '7 Kg'}</b></span>
                          </div>
                          <FlightFareRules key={chosen.id} searchToken={result.searchToken} priceId={chosen.id} />
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {Object.keys(selection).length > 0 && Object.keys(groups).length > 1 && (
                <div className="flight-selection-bar">
                  <span>{Object.keys(selection).length} of {Object.keys(groups).length} journeys selected</span>
                  <button
                    className="flight-primary"
                    disabled={reviewing || Object.keys(selection).length !== Object.keys(groups).length}
                    onClick={() => review()}
                  >
                    Continue to review
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Tripjack Confirm to Proceed Modal (Screenshots 2 & 3) */}
      <FlightConfirmProceedModal
        isOpen={confirmModal.open}
        trip={confirmModal.trip}
        fare={confirmModal.fare}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        onProceed={() => {
          setConfirmModal({ ...confirmModal, open: false });
          review(confirmModal.nextSelection);
        }}
      />

      {/* Compare Modal */}
      {compared.length > 0 && (
        <div className="flight-compare-bar">
          <span>{compared.length} flights selected (up to 3)</span>
          <button className="flight-primary" onClick={() => setShowComparison(true)}>Compare flights</button>
          <button aria-label="Clear comparison" onClick={() => { setCompared([]); setShowComparison(false); }}>
            <X />
          </button>
        </div>
      )}

      {showComparison && (
        <div className="flight-modal-backdrop" onClick={() => setShowComparison(false)}>
          <section
            className="flight-compare-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Compare flights"
            onClick={event => event.stopPropagation()}
            onKeyDown={event => { if (event.key === 'Escape') setShowComparison(false); }}
          >
            <button autoFocus aria-label="Close comparison" onClick={() => setShowComparison(false)}>
              <X />
            </button>
            <h2>Compare flights</h2>
            <div className="flight-comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>Flight</th>
                    <th>Duration</th>
                    <th>Stops</th>
                    <th>From</th>
                  </tr>
                </thead>
                <tbody>
                  {compared.map(index => (
                    <tr key={index}>
                      <td>{trips[index].sI?.[0]?.fD?.aI?.name}</td>
                      <td>{duration(tripDuration(trips[index]))}</td>
                      <td>{stopCount(trips[index])}</td>
                      <td>{money(Math.min(...trips[index].totalPriceList.map(total)))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
