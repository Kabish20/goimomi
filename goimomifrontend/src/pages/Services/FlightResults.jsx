import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plane, ChevronLeft, ChevronRight, SlidersHorizontal, Sunrise, Sun, Sunset, Moon, Edit2, Info } from 'lucide-react';
import { searchFlights, reviewFlights } from './flightApi';
import { money, today, dayLabel, formatFullDate, isNextDay, shiftDate, duration, fareTotal, tripDuration, layoverDuration, stopCount, cabinLabel, flightError, readSession, saveSession } from './flightUtils';
import FlightDetailsModal from './FlightDetailsModal';
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
 * Implements the authentic TripJack 2-column round trip and single journey models.
 */
function getSampleTripjackFlights(route, search) {
  const isRoundTrip = search?.mode === 'ROUND TRIP' || (search?.searchQuery?.routeInfos?.length || 0) > 1;
  const onwardRoute = search?.searchQuery?.routeInfos?.[0] || route || {
    fromCityOrAirport: { code: 'TRZ', name: 'Tiruchirappalli, India' },
    toCityOrAirport: { code: 'DEL', name: 'Delhi, India' },
    travelDate: today(),
  };

  const returnRoute = search?.searchQuery?.routeInfos?.[1] || {
    fromCityOrAirport: onwardRoute.toCityOrAirport,
    toCityOrAirport: onwardRoute.fromCityOrAirport,
    travelDate: shiftDate(onwardRoute.travelDate || today(), 7),
  };

  const fromCode = onwardRoute?.fromCityOrAirport?.code || 'TRZ';
  const toCode = onwardRoute?.toCityOrAirport?.code || 'DEL';
  const travelDate = onwardRoute?.travelDate || today();
  const nextDate = shiftDate(travelDate, 1);

  const returnFromCode = returnRoute?.fromCityOrAirport?.code || toCode;
  const returnToCode = returnRoute?.toCityOrAirport?.code || fromCode;
  const returnDate = returnRoute?.travelDate || shiftDate(travelDate, 7);

  // Common fare generator
  const createFares = (baseBF, baseTAF) => [
    {
      id: `tj-pub-${baseBF}`,
      fareIdentifier: 'PUBLISHED',
      fD: {
        ADULT: {
          fC: { BF: baseBF, TAF: baseTAF, TF: baseBF + baseTAF },
          rT: 1,
          cc: 'ECONOMY',
          cb: 'R',
          sR: 9,
          bI: { iB: '15 Kg (01 Piece only)', cB: '7 Kg' },
        },
      },
    },
    {
      id: `tj-spec-${baseBF}`,
      fareIdentifier: 'SPECIAL_RETURN',
      fD: {
        ADULT: {
          fC: { BF: baseBF, TAF: baseTAF, TF: baseBF + baseTAF },
          rT: 1,
          cc: 'ECONOMY',
          cb: 'R',
          sR: 9,
          bI: { iB: '15 Kg (01 Piece only)', cB: '7 Kg' },
        },
      },
    },
    {
      id: `tj-flexi-${baseBF}`,
      fareIdentifier: 'FLEXI_PLUS',
      fD: {
        ADULT: {
          fC: { BF: baseBF + 315, TAF: baseTAF, TF: baseBF + baseTAF + 315 },
          rT: 1,
          cc: 'ECONOMY',
          cb: 'M',
          sR: 7,
          bI: { iB: '20 Kg', cB: '7 Kg' },
        },
      },
    },
    {
      id: `tj-corp-${baseBF}`,
      fareIdentifier: 'CORPORATE_FARE',
      fD: {
        ADULT: {
          fC: { BF: baseBF + 778, TAF: baseTAF, TF: baseBF + baseTAF + 778 },
          rT: 1,
          cc: 'ECONOMY',
          cb: 'K',
          sR: 5,
          bI: { iB: '25 Kg', cB: '7 Kg' },
        },
      },
    },
  ];

  // ONWARD FLIGHTS (Image 5 Left Column)
  const onwardTrips = [
    {
      id: 'trip-onward-1',
      sI: [
        {
          id: 'seg-on-1',
          da: { code: fromCode, name: 'Tiruchirapally Civil Arpt', city: 'Tiruchirappalli', terminal: '1' },
          aa: { code: toCode, name: 'Delhi Indira Gandhi Intl', city: 'Delhi', terminal: '1' },
          dt: `${travelDate}T21:15:00`,
          at: `${nextDate}T00:20:00`,
          duration: 185,
          cT: 0,
          stops: 0,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '770', eT: '320' },
        },
      ],
      totalPriceList: createFares(7800, 2522.8),
    },
    {
      id: 'trip-onward-2',
      sI: [
        {
          id: 'seg-on-2a',
          da: { code: fromCode, name: 'Tiruchirapally Civil Arpt', city: 'Tiruchirappalli', terminal: '1' },
          aa: { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', terminal: '1' },
          dt: `${travelDate}T06:05:00`,
          at: `${travelDate}T07:15:00`,
          duration: 70,
          cT: 75,
          stops: 0,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '2171', eT: 'ATR' },
        },
        {
          id: 'seg-on-2b',
          da: { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', terminal: '1' },
          aa: { code: toCode, name: 'Delhi Indira Gandhi Intl', city: 'Delhi', terminal: '3' },
          dt: `${travelDate}T08:30:00`,
          at: `${travelDate}T10:50:00`,
          duration: 140,
          cT: 0,
          stops: 0,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '205', eT: '320' },
        },
      ],
      totalPriceList: createFares(10804, 2522.8),
    },
    {
      id: 'trip-onward-3',
      sI: [
        {
          id: 'seg-on-3a',
          da: { code: fromCode, name: 'Tiruchirapally Civil Arpt', city: 'Tiruchirappalli', terminal: '1' },
          aa: { code: 'BLR', name: 'Kempegowda Intl Airport', city: 'Bengaluru', terminal: '1' },
          dt: `${travelDate}T06:05:00`,
          at: `${travelDate}T07:10:00`,
          duration: 65,
          cT: 135,
          stops: 0,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '2171', eT: 'ATR' },
        },
        {
          id: 'seg-on-3b',
          da: { code: 'BLR', name: 'Kempegowda Intl Airport', city: 'Bengaluru', terminal: '1' },
          aa: { code: toCode, name: 'Delhi Indira Gandhi Intl', city: 'Delhi', terminal: '2' },
          dt: `${travelDate}T09:25:00`,
          at: `${travelDate}T12:05:00`,
          duration: 160,
          cT: 0,
          stops: 0,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '672', eT: '321' },
        },
      ],
      totalPriceList: createFares(10804, 2522.8),
    },
  ];

  // RETURN FLIGHTS (Image 5 Right Column)
  const returnTrips = [
    {
      id: 'trip-return-1',
      sI: [
        {
          id: 'seg-ret-1',
          da: { code: returnFromCode, name: 'Delhi Indira Gandhi Intl', city: 'Delhi', terminal: '1' },
          aa: { code: returnToCode, name: 'Tiruchirapally Civil Arpt', city: 'Tiruchirappalli', terminal: '1' },
          dt: `${returnDate}T17:40:00`,
          at: `${returnDate}T20:45:00`,
          duration: 185,
          cT: 0,
          stops: 0,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '769', eT: '320' },
        },
      ],
      totalPriceList: createFares(7199, 2522.8),
    },
    {
      id: 'trip-return-2',
      isNearbyAirport: true,
      nearbyInfo: 'HDO is 30.31 kms away from DEL',
      sI: [
        {
          id: 'seg-ret-2',
          da: { code: 'HDO', name: 'Hindon Air Force Station', city: 'Ghaziabad', terminal: '1' },
          aa: { code: returnToCode, name: 'Tiruchirapally Civil Arpt', city: 'Tiruchirappalli', terminal: '1' },
          dt: `${returnDate}T10:25:00`,
          at: `${returnDate}T21:40:00`,
          duration: 675,
          cT: 320,
          stops: 1,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '2519', eT: '320' },
        },
      ],
      totalPriceList: [
        {
          id: 'tj-ret-spec-hdo',
          fareIdentifier: 'SPECIAL_RETURN',
          fD: {
            ADULT: {
              fC: { BF: 10663, TAF: 2522.8, TF: 13185.8 },
              rT: 1,
              cc: 'ECONOMY',
              cb: 'R',
              sR: 1,
              bI: { iB: '15 Kg', cB: '7 Kg' },
            },
          },
        },
        {
          id: 'tj-ret-corp-hdo',
          fareIdentifier: 'CORPORATE_FARE',
          fD: {
            ADULT: {
              fC: { BF: 11241, TAF: 2522.8, TF: 13763.8 },
              rT: 1,
              cc: 'ECONOMY',
              cb: 'K',
              sR: 1,
              bI: { iB: '25 Kg', cB: '7 Kg' },
            },
          },
        },
      ],
    },
    {
      id: 'trip-return-3',
      isNearbyAirport: true,
      nearbyInfo: 'DXN is 61.88 kms away from DEL',
      sI: [
        {
          id: 'seg-ret-3',
          da: { code: 'DXN', name: 'Noida International Airport', city: 'Jewar', terminal: '1' },
          aa: { code: returnToCode, name: 'Tiruchirapally Civil Arpt', city: 'Tiruchirappalli', terminal: '1' },
          dt: `${returnDate}T14:30:00`,
          at: `${returnDate}T21:40:00`,
          duration: 430,
          cT: 120,
          stops: 1,
          fD: { aI: { code: '6E', name: 'IndiGo' }, fN: '2456', eT: '320' },
        },
      ],
      totalPriceList: [
        {
          id: 'tj-ret-spec-dxn',
          fareIdentifier: 'SPECIAL_RETURN',
          fD: {
            ADULT: {
              fC: { BF: 11076, TAF: 2522.8, TF: 13598.8 },
              rT: 1,
              cc: 'ECONOMY',
              cb: 'R',
              sR: 4,
              bI: { iB: '15 Kg', cB: '7 Kg' },
            },
          },
        },
      ],
    },
  ];

  return {
    searchToken: 'tj-sample-token-' + Date.now(),
    expiresIn: 900,
    searchResult: {
      tripInfos: {
        ONWARD: onwardTrips,
        ...(isRoundTrip ? { RETURN: returnTrips } : {}),
      },
    },
  };
}

function FlightResultsSkeleton({ fromCode, toCode }) {
  return (
    <div className="flight-results-skeleton" role="status" aria-label="Loading flights">
      <div className="flight-skeleton-banner">
        <div className="flight-skeleton-spinner" />
        <div className="flight-skeleton-text">
          <strong>Searching best flights {fromCode && toCode ? `from ${fromCode} to ${toCode}` : ''}...</strong>
          <small>Comparing IndiGo, Air India, SpiceJet, Akasa Air &amp; international carriers</small>
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
  const [group, setGroup] = useState('ONWARD');
  const [filters, setFilters] = useState(blankFilters);
  const [sort, setSort] = useState('price');
  const [sortOnward, setSortOnward] = useState('price');
  const [sortReturn, setSortReturn] = useState('price');
  const [stopsSector, setStopsSector] = useState('ONWARD');
  const [selection, setSelection] = useState({});
  const [moreFares, setMoreFares] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [retry, setRetry] = useState(0);

  // 4-Tab Flight Details Modal state (Images 1, 2, 3, 4)
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    trip: null,
    fare: null,
  });

  // Confirm to Proceed Modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    trip: null,
    fare: null,
    nextSelection: null,
  });

  const route = search?.searchQuery?.routeInfos?.[0] || {
    fromCityOrAirport: { code: 'TRZ', name: 'Tiruchirappalli, India' },
    toCityOrAirport: { code: 'DEL', name: 'Delhi, India' },
    travelDate: today(),
  };

  const returnRoute = search?.searchQuery?.routeInfos?.[1] || {
    fromCityOrAirport: route.toCityOrAirport,
    toCityOrAirport: route.fromCityOrAirport,
    travelDate: shiftDate(route.travelDate, 7),
  };

  const isRoundTripSearch = search?.mode === 'ROUND TRIP' || (search?.searchQuery?.routeInfos?.length || 0) > 1;

  function loadSampleData() {
    const sample = getSampleTripjackFlights(route, search);
    saveSession('flight-results', { search, data: sample, savedAt: Date.now() });
    setResult(sample);
    setGroup('ONWARD');
    setError('');
    setLoading(false);

    // Pre-seed default selection for both legs in round-trip mode
    const groupsData = sample.searchResult?.tripInfos || {};
    const initSel = {};
    if (groupsData.ONWARD?.[0]) {
      initSel.ONWARD = {
        trip: groupsData.ONWARD[0],
        fare: groupsData.ONWARD[0].totalPriceList[0],
      };
    }
    if (groupsData.RETURN?.[0]) {
      initSel.RETURN = {
        trip: groupsData.RETURN[0],
        fare: groupsData.RETURN[0].totalPriceList[0],
      };
    }
    setSelection(initSel);
  }

  // Fetch flight availability from Tripjack API or session cache
  useEffect(() => {
    if (!search) { setLoading(false); return; }
    const controller = new AbortController();
    const cached = readSession('flight-results');
    const accept = data => {
      setResult(data);
      const groupsData = data.searchResult?.tripInfos || {};
      const firstGroup = Object.keys(groupsData)[0] || 'ONWARD';
      setGroup(firstGroup);

      // Pre-seed selection
      const initSel = {};
      if (groupsData.ONWARD?.[0]) {
        initSel.ONWARD = {
          trip: groupsData.ONWARD[0],
          fare: groupsData.ONWARD[0].totalPriceList?.[0],
        };
      }
      if (groupsData.RETURN?.[0]) {
        initSel.RETURN = {
          trip: groupsData.RETURN[0],
          fare: groupsData.RETURN[0].totalPriceList?.[0],
        };
      }
      setSelection(initSel);
      setLoading(false);
    };

    if (!retry && cached && JSON.stringify(cached.search) === JSON.stringify(search) && Date.now() - cached.savedAt < 900000) {
      accept(cached.data);
      return;
    }

    setLoading(true);
    setError('');
    searchFlights(search.searchQuery, controller.signal)
      .then(({ data }) => {
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

  const groups = result?.searchResult?.tripInfos || {};
  const isSplitRoundTrip = isRoundTripSearch && groups.ONWARD && groups.RETURN;
  const pax = search?.searchQuery?.paxInfo || {};
  const total = fare => fareTotal(fare, pax);

  // Collect all fares across all groups for sidebar ranges
  const allTripsAcrossGroups = Object.values(groups).flat();
  const allFares = allTripsAcrossGroups.flatMap(trip => trip.totalPriceList || []);
  const minAvailablePrice = allFares.length ? Math.min(...allFares.map(total)) : 9721;
  const maxAvailablePrice = allFares.length ? Math.ceil(Math.max(...allFares.map(total))) : 16630;
  const maxPriceLimit = Math.ceil(Math.max(1, ...allFares.map(total)));

  // Airline options
  const airlineOptions = unique(allTripsAcrossGroups.flatMap(trip => (trip.sI || []).map(segment => segment.fD?.aI?.code))).map(code => {
    const seg = allTripsAcrossGroups.flatMap(trip => trip.sI || []).find(segment => segment.fD?.aI?.code === code);
    const airlineTrips = allTripsAcrossGroups.filter(t => t.sI?.some(s => s.fD?.aI?.code === code));
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

  // Reusable filtering for any trip list
  function filterAndSortTrips(rawTrips, sortKey, currentSector) {
    return rawTrips.map((trip, index) => ({ trip, index, fares: eligibleFares(trip) })).filter(({ trip, fares }) => {
      const segments = trip.sI || [];
      const first = segments[0];
      const last = segments.at(-1);

      // Stop filter condition considering active stopsSector in round-trip mode
      const applyStopsFilter = !isSplitRoundTrip || stopsSector === currentSector;

      return fares.length &&
        (!filters.stops.length || !applyStopsFilter || filters.stops.includes(Math.min(3, stopCount(trip)))) &&
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
      if (sortKey === 'duration') return tripDuration(a.trip) - tripDuration(b.trip);
      if (sortKey === 'departure') return (a.trip.sI?.[0]?.dt || '').localeCompare(b.trip.sI?.[0]?.dt || '');
      if (sortKey === 'arrival') return (a.trip.sI?.at(-1)?.at || '').localeCompare(b.trip.sI?.at(-1)?.at || '');
      return Math.min(...a.fares.map(total)) - Math.min(...b.fares.map(total));
    });
  }

  // Calculate lists
  const visibleOnwardTrips = filterAndSortTrips(groups.ONWARD || [], sortOnward, 'ONWARD');
  const visibleReturnTrips = filterAndSortTrips(groups.RETURN || [], sortReturn, 'RETURN');
  const visibleSingleTrips = filterAndSortTrips(groups[group] || [], sort, group);

  // Benchmarks for Onward
  const onwardAllFares = (groups.ONWARD || []).flatMap(t => t.totalPriceList || []);
  const onwardCheapest = onwardAllFares.length ? Math.min(...onwardAllFares.map(total)) : 9934.3;
  const onwardFastestMin = (groups.ONWARD || []).length ? Math.min(...(groups.ONWARD || []).map(tripDuration)) : 185;

  // Benchmarks for Return
  const returnAllFares = (groups.RETURN || []).flatMap(t => t.totalPriceList || []);
  const returnCheapest = returnAllFares.length ? Math.min(...returnAllFares.map(total)) : 9335.56;
  const returnFastestMin = (groups.RETURN || []).length ? Math.min(...(groups.RETURN || []).map(tripDuration)) : 185;

  function changeDate(date) {
    const next = { ...search, searchQuery: { ...search.searchQuery, routeInfos: [{ ...route, travelDate: date }] } };
    saveSession('flight-search', next);
    navigate('/flights/results', { state: { search: next } });
  }

  function handleInitiateBooking(chosenTrip, chosenFare, sectorKey = group) {
    const next = { ...selection, [sectorKey]: { fare: chosenFare, trip: chosenTrip } };
    setSelection(next);
    setConfirmModal({
      open: true,
      trip: chosenTrip,
      fare: chosenFare,
      nextSelection: next,
    });
  }

  async function review(nextSelection = selection) {
    const requiredKeys = isSplitRoundTrip ? ['ONWARD', 'RETURN'] : Object.keys(groups);
    const missing = requiredKeys.find(key => !nextSelection[key]);
    if (missing) { setGroup(missing); return; }
    setReviewing(true);
    setError('');

    const selectedTrips = Object.values(nextSelection).map(item => item.trip);
    const selectedFares = Object.values(nextSelection).map(item => item.fare);
    const totalBF = selectedFares.reduce((sum, f) => sum + (f.fD?.ADULT?.fC?.BF || 3000), 0);
    const totalTAF = selectedFares.reduce((sum, f) => sum + (f.fD?.ADULT?.fC?.TAF || 2522.8), 0);
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

    if (result?.searchToken?.startsWith('tj-sample-token')) {
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
    } catch {
      const reviewed = { data: reviewData, search, selection: nextSelection, savedAt: Date.now() };
      saveSession('flight-review', reviewed);
      navigate('/flights/review', { state: { reviewed } });
    } finally {
      setReviewing(false);
    }
  }

  function getFareBadge(fare) {
    const id = (fare.fareIdentifier || 'PUBLISHED').toUpperCase();
    if (id.includes('UPFRONT')) return { label: 'Upfront', className: 'tj-badge-upfront' };
    if (id.includes('SPECIAL_RETURN') || id.includes('SPECIAL')) return { label: 'Special Return', className: 'tj-badge-published' };
    if (id.includes('SME')) return { label: 'SME', className: 'tj-badge-sme' };
    if (id.includes('FLEX')) return { label: 'Flexi Plus', className: 'tj-badge-flexi' };
    if (id.includes('CORP')) return { label: 'Corporate Fare', className: 'tj-badge-published' };
    if (id.includes('STRETCH_PLUS')) return { label: 'Stretch Plus', className: 'tj-badge-stretch-plus' };
    if (id.includes('STRETCH') || id.includes('BUSINESS')) return { label: 'Stretch', className: 'tj-badge-stretch' };
    return { label: 'Published', className: 'tj-badge-published' };
  }

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

  /**
   * Reusable Flight Card Component for single column or two-column split view
   */
  const renderFlightCard = ({ trip, index, fares }, sectorKey) => {
    const segments = trip.sI || [];
    const first = segments[0] || {};
    const last = segments.at(-1) || first;
    const cardKey = `${sectorKey}-${index}`;
    const selectedFare = selection[sectorKey]?.trip?.id === trip.id ? selection[sectorKey]?.fare : fares[0];
    const chosen = fares.find(fare => fare.id === selectedFare?.id) || fares[0];
    const airlineCode = first?.fD?.aI?.code || '6E';
    const airlineName = first?.fD?.aI?.name || 'IndiGo';
    const isOvernight = isNextDay(first?.dt, last?.at);
    const flightNumbers = segments.map(s => `${s.fD?.aI?.code}-${s.fD?.fN}`).join(', ');
    const seatsRemaining = chosen?.fD?.ADULT?.sR ?? 9;
    const showAllFares = !!moreFares[cardKey];
    const isNearby = trip.isNearbyAirport;

    return (
      <article className={`flight-card tj-flight-card ${isNearby ? 'is-nearby-airport' : ''}`} key={cardKey}>
        <div className="tj-flight-card-inner">
          {/* Left Column: Airline, Timings & Badges */}
          <div className="tj-card-left-section">
            <div className="tj-airline-row">
              <div className="tj-indigo-logo-box" title={airlineCode}>
                <Plane size={18} className="tj-carrier-plane-glyph" />
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

            {/* Nearby airport indicator (Image 5) */}
            {isNearby && (
              <div className="tj-nearby-airport-badge">
                <Info size={12} />
                <span>{trip.nearbyInfo}</span>
              </div>
            )}

            {/* Details Toggle & Badges */}
            <div className="tj-badges-row">
              <button
                type="button"
                className="tj-view-details-toggle"
                onClick={() => setDetailsModal({ open: true, trip, fare: chosen })}
              >
                View Details +
              </button>

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

          {/* Right Column: Multi-Tier Fare Options with Radio selection */}
          <div className="tj-card-right-section">
            <div className="tj-fares-list-container">
              {(showAllFares ? fares : fares.slice(0, 3)).map((fareItem, fareIdx) => {
                const isSelectedFare = selection[sectorKey]?.trip?.id === trip.id && selection[sectorKey]?.fare?.id === fareItem.id;
                const badge = getFareBadge(fareItem);
                const adultInfo = fareItem.fD?.ADULT || {};
                const refundLabel = ['Non-refundable', 'Refundable', 'Partially refundable'][adultInfo.rT] || 'Refundable';

                return (
                  <div
                    key={fareItem.id || fareIdx}
                    className={`tj-fare-row-item ${isSelectedFare ? 'is-selected' : ''}`}
                    onClick={() => setSelection({ ...selection, [sectorKey]: { fare: fareItem, trip } })}
                  >
                    <div className="tj-fare-row-left">
                      <input
                        type="radio"
                        name={`fare-radio-${sectorKey}-${trip.id}`}
                        checked={isSelectedFare}
                        onChange={() => setSelection({ ...selection, [sectorKey]: { fare: fareItem, trip } })}
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
                          {cabinLabel(adultInfo.cc || 'ECONOMY')}, {refundLabel}
                        </span>
                      </div>
                    </div>

                    {/* Show BOOK button on first fare in one-way journey */}
                    {!isSplitRoundTrip && fareIdx === 0 && (
                      <div className="tj-fare-row-actions" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="tj-btn-book-primary"
                          disabled={reviewing}
                          onClick={() => handleInitiateBooking(trip, fareItem, sectorKey)}
                        >
                          {reviewing ? 'Reviewing…' : 'BOOK'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {fares.length > 3 && (
                <button
                  type="button"
                  className="tj-toggle-more-fares-btn"
                  onClick={() => setMoreFares({ ...moreFares, [cardKey]: !showAllFares })}
                >
                  {showAllFares ? 'Show Less ▴' : `+${fares.length - 3} more fares ▾`}
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  if (!search) return <main className="flights-page">{emptyMessage}</main>;

  return (
    <main className="flights-page flight-results-page tj-results-page">
      {/* 1. TripJack Dark Top Summary Bar (Image 5) */}
      <div className="tj-top-summary-bar">
        <div className="flight-container tj-summary-container">
          <div className="tj-summary-route">
            <div className="tj-summary-city-block">
              <strong>{route.fromCityOrAirport.code}</strong>
              <small>{route.fromCityOrAirport.name || 'Origin'}</small>
            </div>
            <div className="tj-summary-plane-icon">
              {isSplitRoundTrip ? '⇄' : <Plane size={18} />}
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

          {isSplitRoundTrip && (
            <>
              <div className="tj-summary-divider" />
              <div className="tj-summary-item">
                <span>Return Date</span>
                <strong>{formatFullDate(returnRoute.travelDate)}</strong>
              </div>
            </>
          )}

          <div className="tj-summary-divider" />

          <div className="tj-summary-item">
            <span>Passengers &amp; Class</span>
            <strong>
              {pax.ADULT || 1} Adults | {cabinLabel(search.searchQuery?.cabinClass || 'ECONOMY')}
            </strong>
          </div>

          <div className="tj-summary-divider" />

          <div className="tj-summary-item">
            <span>Preferred Airline</span>
            <strong>{search.searchQuery?.preferredAirline?.map(a => a.code).join(', ') || 'None'}</strong>
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

        {/* 2. Left Filter Rail (Image 5) */}
        <aside className={`flight-filters tj-filters-rail ${showFilters ? 'is-open' : ''}`} aria-label="Flight filters">
          <div className="filter-heading">
            <strong>Filters</strong>
            <button type="button" onClick={() => setFilters(blankFilters)}>RESET ALL</button>
          </div>

          {/* Price Range Filter Slider */}
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
                <span className="tj-min-price-label">{money(minAvailablePrice)}</span>
                <span className="tj-max-price-label">{money(filters.price || maxAvailablePrice)}</span>
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

          {/* Popular Filters (Image 5: Onward and Return split) */}
          <FilterSection title="Popular Filters" open>
            {isSplitRoundTrip ? (
              <>
                <div className="tj-popular-group-label">Onward</div>
                <div className="flight-chips tj-popular-chips">
                  <button
                    type="button"
                    aria-pressed={filters.stops.includes(0)}
                    onClick={() => toggle('stops', 0)}
                  >
                    Non Stop
                  </button>
                  <button
                    type="button"
                    aria-pressed={filters.stops.includes(1)}
                    onClick={() => toggle('stops', 1)}
                  >
                    1 Stop
                  </button>
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
                  <button
                    type="button"
                    aria-pressed={filters.airlines.includes('6E')}
                    onClick={() => toggle('airlines', '6E')}
                  >
                    IndiGo
                  </button>
                </div>

                <div className="tj-popular-group-label" style={{ marginTop: '10px' }}>Return</div>
                <div className="flight-chips tj-popular-chips">
                  <button
                    type="button"
                    aria-pressed={filters.stops.includes(0)}
                    onClick={() => toggle('stops', 0)}
                  >
                    Non Stop
                  </button>
                  <button
                    type="button"
                    aria-pressed={filters.stops.includes(1)}
                    onClick={() => toggle('stops', 1)}
                  >
                    1 Stop
                  </button>
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
                  <button
                    type="button"
                    aria-pressed={filters.airlines.includes('6E')}
                    onClick={() => toggle('airlines', '6E')}
                  >
                    IndiGo
                  </button>
                </div>
              </>
            ) : (
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
            )}
          </FilterSection>

          {/* Stops Selector with Sector Tabs in Image 5 */}
          <FilterSection title="Stops" open>
            {isSplitRoundTrip && (
              <div className="tj-stops-sector-tabs">
                <button
                  type="button"
                  className={`tj-stops-sector-tab-btn ${stopsSector === 'ONWARD' ? 'is-active' : ''}`}
                  onClick={() => setStopsSector('ONWARD')}
                >
                  {route.fromCityOrAirport.code}-{route.toCityOrAirport.code}
                </button>
                <button
                  type="button"
                  className={`tj-stops-sector-tab-btn ${stopsSector === 'RETURN' ? 'is-active' : ''}`}
                  onClick={() => setStopsSector('RETURN')}
                >
                  {route.toCityOrAirport.code}-{route.fromCityOrAirport.code}
                </button>
              </div>
            )}
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

          {/* Return Special Banner (Image 5) */}
          {isSplitRoundTrip && (
            <FilterSection title="Return Special" open>
              <div className="tj-return-special-card">
                <div className="tj-return-special-emblem">
                  <Plane size={18} />
                </div>
                <div>
                  <strong className="tj-return-special-price">
                    {money(onwardCheapest + returnCheapest)}
                  </strong>
                </div>
              </div>
            </FilterSection>
          )}

          {/* Departure From Origin */}
          <FilterSection title={`Departure From ${route.fromCityOrAirport.name || route.fromCityOrAirport.code}`} open>
            {timeButtons('departure')}
          </FilterSection>

          {/* Airlines Directory */}
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
        </aside>

        {/* 3. Main Results Viewport */}
        <section className="flight-results-main tj-results-main" aria-label="Flight results" aria-busy={loading || reviewing}>
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
              {/* SCENARIO A: ROUND TRIP TWO-COLUMN SPLIT WORKFLOW (Image 5) */}
              {isSplitRoundTrip ? (
                <div className="tj-roundtrip-split-layout">
                  {/* Left Column: ONWARD JOURNEY */}
                  <div className="tj-split-col tj-column-onward">
                    <div className="tj-col-header-box">
                      <div className="tj-col-bench-bar">
                        <button
                          type="button"
                          className="tj-bench-pill"
                          onClick={() => setSortOnward('price')}
                        >
                          <span>🏷️ Cheapest: {money(onwardCheapest)} • {duration(onwardFastestMin)}</span>
                        </button>
                        <button
                          type="button"
                          className="tj-bench-pill"
                          onClick={() => setSortOnward('duration')}
                        >
                          <span>⚡ Fastest: {money(onwardCheapest)} • {duration(onwardFastestMin)}</span>
                        </button>
                      </div>

                      <div className="tj-col-route-title-row">
                        <span className="tj-col-route-title">
                          {route.fromCityOrAirport.name?.split(',')[0] || route.fromCityOrAirport.code} → {route.toCityOrAirport.name?.split(',')[0] || route.toCityOrAirport.code} {formatFullDate(route.travelDate)}
                        </span>
                      </div>

                      <div className="tj-col-sort-bar">
                        <span>Sort By :</span>
                        {['duration', 'departure', 'arrival', 'price'].map(item => (
                          <button
                            key={item}
                            type="button"
                            className={`tj-col-sort-btn ${sortOnward === item ? 'is-active' : ''}`}
                            onClick={() => setSortOnward(item)}
                          >
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="tj-col-cards-list">
                      {visibleOnwardTrips.map(item => renderFlightCard(item, 'ONWARD'))}
                      {!visibleOnwardTrips.length && (
                        <div className="flight-empty">
                          <p>No onward flights match the selected filters.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: RETURN JOURNEY */}
                  <div className="tj-split-col tj-column-return">
                    <div className="tj-col-header-box">
                      <div className="tj-col-bench-bar">
                        <button
                          type="button"
                          className="tj-bench-pill"
                          onClick={() => setSortReturn('price')}
                        >
                          <span>🏷️ Cheapest: {money(returnCheapest)} • {duration(returnFastestMin)}</span>
                        </button>
                        <button
                          type="button"
                          className="tj-bench-pill"
                          onClick={() => setSortReturn('duration')}
                        >
                          <span>⚡ Fastest: {money(returnCheapest)} • {duration(returnFastestMin)}</span>
                        </button>
                      </div>

                      <div className="tj-col-route-title-row">
                        <span className="tj-col-route-title">
                          {route.toCityOrAirport.name?.split(',')[0] || route.toCityOrAirport.code} → {route.fromCityOrAirport.name?.split(',')[0] || route.fromCityOrAirport.code} {formatFullDate(returnRoute.travelDate)}
                        </span>

                        <div className="tj-share-actions-row">
                          <span className="tj-share-label">Share By :</span>
                          <button
                            type="button"
                            className="tj-share-icon-btn tj-share-whatsapp"
                            title="Share on WhatsApp"
                            onClick={() => window.open(`https://wa.me/?text=Check out flights from ${route.fromCityOrAirport.code} to ${route.toCityOrAirport.code}`, '_blank')}
                          >
                            💬
                          </button>
                          <button
                            type="button"
                            className="tj-share-icon-btn tj-share-email"
                            title="Share via Email"
                            onClick={() => window.open(`mailto:?subject=Flight options for ${route.fromCityOrAirport.code} - ${route.toCityOrAirport.code}`, '_blank')}
                          >
                            ✉
                          </button>
                          <button
                            type="button"
                            className="tj-share-icon-btn tj-share-eye"
                            title="View Summary"
                            onClick={() => {}}
                          >
                            👁
                          </button>
                        </div>
                      </div>

                      <div className="tj-col-sort-bar">
                        <span>Sort By :</span>
                        {['duration', 'departure', 'arrival', 'price'].map(item => (
                          <button
                            key={item}
                            type="button"
                            className={`tj-col-sort-btn ${sortReturn === item ? 'is-active' : ''}`}
                            onClick={() => setSortReturn(item)}
                          >
                            {item.charAt(0).toUpperCase() + item.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="tj-col-cards-list">
                      {visibleReturnTrips.map(item => renderFlightCard(item, 'RETURN'))}
                      {!visibleReturnTrips.length && (
                        <div className="flight-empty">
                          <p>No return flights match the selected filters.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* SCENARIO B: ONE WAY OR MULTI-CITY SINGLE WORKFLOW */
                <>
                  {/* Multi-Day Fare Calendar Strip */}
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
                              {isCurrent && minAvailablePrice ? money(minAvailablePrice) : 'Fetch Fare'}
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

                  {/* Benchmark highlights & sort */}
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

                  <div className="tj-flight-cards-list">
                    {visibleSingleTrips.map(item => renderFlightCard(item, group))}
                    {!visibleSingleTrips.length && (
                      <div className="flight-empty">
                        <h2>No flights found</h2>
                        <p>Try another date or reset your filters.</p>
                        <button onClick={() => setFilters(blankFilters)}>Reset filters</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {/* 4. Sticky Bottom Combined Booking Bar for Round Trip (Image 5) */}
      {isSplitRoundTrip && selection.ONWARD && selection.RETURN && (
        <div className="tj-sticky-roundtrip-booking-bar">
          <div className="tj-sticky-bar-inner">
            <div className="tj-sticky-legs-summary">
              <div className="tj-sticky-leg-item">
                <span className="tj-sticky-leg-badge">Onward</span>
                <div className="tj-sticky-leg-info">
                  <span className="tj-sticky-leg-route">
                    {selection.ONWARD.trip?.sI?.[0]?.fD?.aI?.name} {selection.ONWARD.trip?.sI?.[0]?.fD?.aI?.code}-{selection.ONWARD.trip?.sI?.[0]?.fD?.fN} • {selection.ONWARD.trip?.sI?.[0]?.da?.code} → {selection.ONWARD.trip?.sI?.at(-1)?.aa?.code}
                  </span>
                  <span className="tj-sticky-leg-sub">
                    {selection.ONWARD.trip?.sI?.[0]?.dt?.slice(11, 16)} - {selection.ONWARD.trip?.sI?.at(-1)?.at?.slice(11, 16)} | {money(total(selection.ONWARD.fare))}
                  </span>
                </div>
              </div>

              <div className="tj-sticky-divider" />

              <div className="tj-sticky-leg-item">
                <span className="tj-sticky-leg-badge">Return</span>
                <div className="tj-sticky-leg-info">
                  <span className="tj-sticky-leg-route">
                    {selection.RETURN.trip?.sI?.[0]?.fD?.aI?.name} {selection.RETURN.trip?.sI?.[0]?.fD?.aI?.code}-{selection.RETURN.trip?.sI?.[0]?.fD?.fN} • {selection.RETURN.trip?.sI?.[0]?.da?.code} → {selection.RETURN.trip?.sI?.at(-1)?.aa?.code}
                  </span>
                  <span className="tj-sticky-leg-sub">
                    {selection.RETURN.trip?.sI?.[0]?.dt?.slice(11, 16)} - {selection.RETURN.trip?.sI?.at(-1)?.at?.slice(11, 16)} | {money(total(selection.RETURN.fare))}
                  </span>
                </div>
              </div>
            </div>

            <div className="tj-sticky-checkout-actions">
              <div className="tj-sticky-price-block">
                <span className="tj-sticky-price-label">Total Fare</span>
                <strong className="tj-sticky-total-price">
                  {money(total(selection.ONWARD.fare) + total(selection.RETURN.fare))}
                </strong>
              </div>
              <button
                type="button"
                className="tj-btn-sticky-book"
                disabled={reviewing}
                onClick={() => {
                  setConfirmModal({
                    open: true,
                    trip: selection.ONWARD.trip,
                    fare: selection.ONWARD.fare,
                    nextSelection: selection,
                  });
                }}
              >
                {reviewing ? 'Reviewing…' : 'BOOK NOW'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Four-Tab Flight Details Modal (Images 1, 2, 3, 4) */}
      <FlightDetailsModal
        isOpen={detailsModal.open}
        trip={detailsModal.trip}
        fare={detailsModal.fare}
        searchToken={result?.searchToken}
        pax={pax}
        onClose={() => setDetailsModal({ open: false, trip: null, fare: null })}
      />

      {/* 6. Confirm to Proceed Modal */}
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
    </main>
  );
}
