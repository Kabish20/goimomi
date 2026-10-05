import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, CalendarDays, ChevronDown, PlaneLanding, PlaneTakeoff, X } from 'lucide-react';
import { getFlightAirports } from './flightApi';
import { readSession, saveSession, today, dayLabel } from './flightUtils';
import { mergeAirportData } from './flightAirportsData';
import FlightAirportPicker from './FlightAirportPicker';
import FlightPassengerPicker from './FlightPassengerPicker';
import FlightFareOption from './FlightFareOption';
import FlightBookingsDashboard from './FlightBookingsDashboard';
import './Flights.css';

/**
 * Creates an initial empty flight route leg object with origin, destination, and today's departure date.
 */
const emptyRoute = () => ({
  fromCityOrAirport: { code: '' },
  toCityOrAirport: { code: '' },
  travelDate: today()
});

/**
 * Major domestic and international airline codes supported for preferred filtering.
 */
const airlines = [
  ['6E', 'IndiGo'],
  ['SG', 'SpiceJet'],
  ['AI', 'Air India'],
  ['QP', 'Akasa Air'],
  ['IX', 'AI Express'],
  ['EK', 'Emirates Airlines'],
  ['EY', 'Etihad Airways'],
  ['SQ', 'Singapore Airlines'],
  ['QR', 'Qatar Airways'],
  ['MH', 'Malaysia Airline']
];

// In-memory cache for loaded airport master dataset
let _cachedAirports = null;
try {
  const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('goimomi_airports_data') : null;
  if (stored) _cachedAirports = JSON.parse(stored);
} catch (cacheErr) {
  console.warn('Unable to read airport cache from session storage:', cacheErr);
}

/**
 * Flights
 * 
 * Main flight booking home and search landing page:
 * - Trip Modes: One-Way, Round-Trip, and Multi-City journey planners
 * - Autocomplete Airport Pickers for Origin & Destination with city, airport name, and IATA codes
 * - Date Picker & Cabin Class Selector (Economy, Premium Economy, Business, First Class)
 * - Passenger Configuration: Adults, Children, and Infants
 * - Special Fare Tiers: Regular, Student, Senior Citizen, Armed Forces, Doctors & Nurses
 * - Integrated Flight Bookings Dashboard showing On-Hold, Upcoming, and Recent searches
 */
export default function Flights() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load prior search query from router navigation state or session storage
  const initial = location.state?.search || readSession('flight-search');

  // Journey mode: 'ONE WAY' | 'ROUND TRIP' | 'MULTI CITY'
  const [mode, setMode] = useState(initial?.mode || 'ONE WAY');

  // Active route legs (1 for one-way, 2 for round-trip, 2+ for multi-city)
  const [routes, setRoutes] = useState(initial?.searchQuery?.routeInfos || [emptyRoute()]);

  // Passenger counts per age category
  const [pax, setPax] = useState(initial?.searchQuery?.paxInfo || { ADULT: 1, CHILD: 0, INFANT: 0 });

  // Selected cabin class
  const [cabin, setCabin] = useState(initial?.searchQuery?.cabinClass || 'ECONOMY');

  // Direct flights only filter toggle
  const [direct, setDirect] = useState(initial?.searchQuery?.searchModifiers?.isDirectFlight || false);

  // Credit shell toggle for airline voucher redemptions
  const [creditShell, setCreditShell] = useState(false);

  // Selected fare type (REGULAR, STUDENT, SENIOR_CITIZEN, ARMED_FORCES, etc.)
  const [fareType, setFareType] = useState(initial?.searchQuery?.searchModifiers?.pfts || 'REGULAR');

  // Preferred airline codes list
  const [preferred, setPreferred] = useState(initial?.searchQuery?.preferredAirline?.map(a => a.code) || []);

  // Complete airport dataset initialized with fallback and fetched asynchronously
  const [airports, setAirports] = useState(() => _cachedAirports || mergeAirportData([]));

  // Form submission / search error message
  const [error, setError] = useState('');

  // Fetch full airport master list on mount and cache in session storage
  useEffect(() => {
    if (_cachedAirports && _cachedAirports.length > 50) {
      return;
    }
    const controller = new AbortController();
    getFlightAirports(controller.signal)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        const merged = mergeAirportData(list);
        _cachedAirports = merged;
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('goimomi_airports_data', JSON.stringify(merged));
          }
        } catch (storageErr) {
          console.warn('Unable to cache airports in sessionStorage:', storageErr);
        }
        setAirports(merged);
      })
      .catch(() => {
        // Fallback to pre-seeded popular airports is already initialized
      });
    return () => controller.abort();
  }, []);

  function changeMode(next) {
    setMode(next);
    setError('');
    setRoutes(previous =>
      next === 'ONE WAY'
        ? [previous[0]]
        : next === 'ROUND TRIP'
          ? [
            previous[0],
            {
              fromCityOrAirport: previous[0].toCityOrAirport,
              toCityOrAirport: previous[0].fromCityOrAirport,
              travelDate: previous[1]?.travelDate || previous[0].travelDate
            }
          ]
          : previous.length > 1
            ? previous
            : [...previous, emptyRoute()]
    );
  }

  function updateRoute(index, key, value) {
    setRoutes(previous =>
      previous.map((route, i) => {
        if (i !== index) return route;
        if (key === 'travelDate') return { ...route, travelDate: value };
        const airportObj =
          typeof value === 'object' && value !== null
            ? value
            : { code: (value || '').toUpperCase() };
        return { ...route, [key]: airportObj };
      })
    );
  }

  function swapAirports(index) {
    setRoutes(previous =>
      previous.map((route, i) =>
        i === index
          ? {
            ...route,
            fromCityOrAirport: route.toCityOrAirport,
            toCityOrAirport: route.fromCityOrAirport
          }
          : route
      )
    );
  }

  function handleSelectRecentSearch(searchItem) {
    if (!searchItem) return;
    const fromCode = (searchItem.fromCode || '').toUpperCase();
    const toCode = (searchItem.toCode || '').toUpperCase();
    const fromAirport = airports.find(a => a.iata_code === fromCode) || {
      code: fromCode,
      cityName: searchItem.fromCity || fromCode,
    };
    const toAirport = airports.find(a => a.iata_code === toCode) || {
      code: toCode,
      cityName: searchItem.toCity || toCode,
    };

    setMode(searchItem.mode || 'ONE WAY');
    setRoutes([
      {
        fromCityOrAirport: fromAirport,
        toCityOrAirport: toAirport,
        travelDate: searchItem.travelDate || today(),
      }
    ]);
    if (searchItem.pax) {
      setPax(searchItem.pax);
    }
    if (searchItem.cabin) {
      setCabin(searchItem.cabin);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submit(event) {
    event.preventDefault();
    if (
      Object.values(pax).some(value => !Number.isInteger(value) || value < 0) ||
      pax.ADULT < 1 ||
      pax.INFANT > pax.ADULT ||
      pax.CHILD > pax.ADULT ||
      pax.ADULT + pax.CHILD > 9
    ) {
      setError('Select up to nine seated passengers. Children and infants cannot exceed adults.');
      return;
    }

    const journey =
      mode === 'ROUND TRIP'
        ? [
          routes[0],
          {
            fromCityOrAirport: routes[0].toCityOrAirport,
            toCityOrAirport: routes[0].fromCityOrAirport,
            travelDate: routes[1]?.travelDate || routes[0].travelDate
          }
        ]
        : routes;

    for (let i = 0; i < journey.length; i++) {
      const fromCode = (journey[i].fromCityOrAirport?.code || '').trim().toUpperCase();
      const toCode = (journey[i].toCityOrAirport?.code || '').trim().toUpperCase();

      if (!fromCode || !toCode || fromCode.length !== 3 || toCode.length !== 3) {
        setError('Please select valid origin and destination airports.');
        return;
      }
      if (fromCode === toCode) {
        setError('Choose different origin and destination airports.');
        return;
      }
      if (journey[i].travelDate < today() || (i > 0 && journey[i].travelDate < journey[i - 1].travelDate)) {
        setError('Select travel dates in ascending order.');
        return;
      }
    }

    const cleanRouteInfos = journey.map(r => ({
      fromCityOrAirport: { code: r.fromCityOrAirport.code.toUpperCase() },
      toCityOrAirport: { code: r.toCityOrAirport.code.toUpperCase() },
      travelDate: r.travelDate
    }));

    // Save this search to recent searches in localStorage for quick re-use
    try {
      const fCode = cleanRouteInfos[0]?.fromCityOrAirport?.code || '';
      const tCode = cleanRouteInfos[0]?.toCityOrAirport?.code || '';
      const fAirport = airports.find(a => a.iata_code === fCode);
      const tAirport = airports.find(a => a.iata_code === tCode);
      const newRecent = {
        id: `search-${Date.now()}`,
        fromCode: fCode,
        toCode: tCode,
        fromCity: fAirport?.city_name || fCode,
        toCity: tAirport?.city_name || tCode,
        travelDate: cleanRouteInfos[0]?.travelDate,
        dateLabel: `${dayLabel(cleanRouteInfos[0]?.travelDate)} '${cleanRouteInfos[0]?.travelDate?.slice(2, 4)}`,
        mode,
        modeLabel: mode === 'ONE WAY' ? 'One Way' : mode === 'ROUND TRIP' ? 'Round Trip' : 'Multi City',
        paxLabel: `${pax.ADULT + pax.CHILD} traveller${pax.ADULT + pax.CHILD > 1 ? 's' : ''}`,
        pax,
        cabin,
      };
      // Persist recent search to localStorage for instant re-search on dashboard
      const existing = JSON.parse(localStorage.getItem('recent_flight_searches') || '[]');
      const filtered = existing.filter(item => !(item.fromCode === fCode && item.toCode === tCode));
      localStorage.setItem('recent_flight_searches', JSON.stringify([newRecent, ...filtered].slice(0, 6)));
    } catch (saveErr) {
      console.warn('Unable to persist recent flight search to localStorage:', saveErr);
    }

    const search = {
      mode,
      searchQuery: {
        cabinClass: cabin,
        paxInfo: pax,
        routeInfos: cleanRouteInfos,
        searchModifiers: { isDirectFlight: direct, pfts: fareType },
        ...(preferred.length ? { preferredAirline: preferred.map(code => ({ code })) } : {})
      }
    };

    saveSession('flight-search', search);
    navigate('/flights/results', { state: { search } });
  }

  return (
    <main className="flights-page flight-search-page">
      <section className="flight-hero">
        <div className="flight-container">
          <h1>Book flights and explore the world with us.</h1>
          <div className="journey-tabs" role="group" aria-label="Journey type">
            {['ONE WAY', 'ROUND TRIP', 'MULTI CITY'].map(item => (
              <button
                key={item}
                type="button"
                aria-pressed={mode === item}
                className={mode === item ? 'active' : ''}
                onClick={() => changeMode(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {(mode === 'MULTI CITY' ? routes : [routes[0]]).map((route, index) => (
              <div className="flight-search-row" key={index}>
                <div className="flight-route-inputs">
                  <FlightAirportPicker
                    id={`origin-input-${index}`}
                    value={route.fromCityOrAirport}
                    onChange={airport => updateRoute(index, 'fromCityOrAirport', airport)}
                    placeholder="Where From ?"
                    icon={PlaneTakeoff}
                    ariaLabel={`Journey ${index + 1} origin`}
                    airports={airports}
                    required
                  />

                  <button
                    type="button"
                    className="flight-swap"
                    aria-label={`Swap journey ${index + 1} airports`}
                    onClick={() => swapAirports(index)}
                    title="Swap origin and destination"
                  >
                    <ArrowLeftRight size={20} />
                  </button>

                  <FlightAirportPicker
                    id={`destination-input-${index}`}
                    value={route.toCityOrAirport}
                    onChange={airport => updateRoute(index, 'toCityOrAirport', airport)}
                    placeholder="Where To ?"
                    icon={PlaneLanding}
                    ariaLabel={`Journey ${index + 1} destination`}
                    airports={airports}
                    required
                  />
                </div>

                <div className="flight-dates">
                  <CalendarDays aria-hidden="true" />
                  <input
                    aria-label={`Journey ${index + 1} departure date`}
                    type="date"
                    required
                    min={index ? routes[index - 1].travelDate : today()}
                    value={route.travelDate}
                    onChange={event => updateRoute(index, 'travelDate', event.target.value)}
                  />
                  {mode === 'ROUND TRIP' ? (
                    <>
                      <input
                        aria-label="Return date"
                        type="date"
                        required
                        min={routes[0].travelDate}
                        value={routes[1]?.travelDate || routes[0].travelDate}
                        onChange={event => updateRoute(1, 'travelDate', event.target.value)}
                      />
                      <button
                        type="button"
                        aria-label="Remove return journey"
                        onClick={() => changeMode('ONE WAY')}
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : mode === 'ONE WAY' && (
                    <button
                      type="button"
                      className="add-return"
                      onClick={() => changeMode('ROUND TRIP')}
                    >
                      Add return
                    </button>
                  )}
                </div>

                {index === 0 ? (
                  <>
                    <FlightPassengerPicker
                      pax={pax}
                      setPax={setPax}
                      cabin={cabin}
                      setCabin={setCabin}
                    />
                    <button className="flight-primary search-button" type="submit">
                      Search
                    </button>
                  </>
                ) : (
                  <div className="flight-extra-actions">
                    {routes.length < 6 && index === routes.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setRoutes([...routes, emptyRoute()])}
                      >
                        ADD ONE MORE
                      </button>
                    )}
                    {routes.length > 2 && (
                      <button
                        type="button"
                        aria-label={`Remove journey ${index + 1}`}
                        onClick={() => setRoutes(routes.filter((_, i) => i !== index))}
                      >
                        <X />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="flight-search-options">
              <details className="flight-airline-menu">
                <summary>
                  Select Preferred Airline <ChevronDown size={18} />
                </summary>
                <div>
                  {airlines.map(([code, name]) => (
                    <label key={code}>
                      <input
                        type="checkbox"
                        checked={preferred.includes(code)}
                        onChange={() =>
                          setPreferred(
                            preferred.includes(code)
                              ? preferred.filter(item => item !== code)
                              : [...preferred, code]
                          )
                        }
                      />
                      {name}
                    </label>
                  ))}
                </div>
              </details>

              <span>Select Fare Type:</span>
              <div className="flight-fare-types">
                {[
                  ['REGULAR', 'Regular'],
                  ['STUDENT', 'Student'],
                  ['SENIOR_CITIZEN', 'Senior Citizen']
                ].map(([value, label]) => (
                  <FlightFareOption
                    key={value}
                    value={value}
                    label={label}
                    selected={fareType === value}
                    onChange={() => setFareType(value)}
                  />
                ))}
                {['SOTO', 'NDC'].map(label => (
                  <label
                    key={label}
                    className="unavailable-option"
                    title="Not available in the current flight service"
                  >
                    <input type="checkbox" disabled />
                    {label}
                    <span className="sr-only"> — unavailable</span>
                  </label>
                ))}
              </div>

              <label className="direct-option">
                <input
                  type="checkbox"
                  checked={direct}
                  onChange={event => setDirect(event.target.checked)}
                />
                Direct Flight
              </label>

              <label className="credit-shell-option">
                <input
                  type="checkbox"
                  checked={creditShell}
                  onChange={event => setCreditShell(event.target.checked)}
                />
                Credit Shell
              </label>
            </div>

            {error && <p className="flight-error" role="alert">{error}</p>}
          </form>
        </div>
      </section>

      {/* Bookings Dashboard (On Hold / Upcoming / Recent Searches) */}
      <FlightBookingsDashboard
        defaultTab={location.state?.dashboardTab || 'on_hold'}
        onSelectSearch={handleSelectRecentSearch}
      />

      <div className="flight-search-note flight-container">
        <PlaneTakeoff />
        <div>
          <h2>Your journey starts here</h2>
          <p>
            Search flights, compare fares and review your itinerary. Choose an airport code or select an airport from the suggestions.
          </p>
        </div>
      </div>
    </main>
  );
}
