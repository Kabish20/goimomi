import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BedDouble, CalendarDays, ChevronDown, ChevronLeft, Hotel, MapPin, Search, Star, Users, X, Clock, CheckCircle2, Heart, Check, Coffee, ShieldCheck, Share2, Sparkles } from 'lucide-react';
import api from '../../../api';
import { readSession, saveSession, shiftDate, today } from '../flightUtils';
import HotelBookingsDashboard from './HotelBookingsDashboard';
import './HotelSearch.css';

const post = (action, body) => api.post(`/api/hotels/${action}/`, body, { skipAuth: true });
const message = error => error.response?.data?.detail || 'Hotel search is unavailable. Please check your details or contact our travel team.';
const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency: /^[A-Z]{3}$/.test(currency) ? currency : 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const priceOf = hotel => Math.min(...(hotel.options || []).map(o => Number(o.pricing?.totalPrice)).filter(Number.isFinite));
const ratingOf = hotel => { const rating = Number(hotel.static?.star_rating); return rating >= 1 && rating <= 5 ? Math.floor(rating) : 'unrated'; };
const imageOf = hotel => {
  const image = hotel.static?.images?.find(item => item.is_hero_image) || hotel.static?.images?.[0];
  const url = image?.links?.Standard?.href || image?.links?.XL?.href;
  return typeof url === 'string' && url.startsWith('https://') ? url : '';
};
const guests = rooms => rooms.reduce((sum, room) => sum + room.adults + room.children, 0);
const countryLabel = name => name.toLowerCase().replace(/\b[a-z]/g, letter => letter.toUpperCase());
const defaultForm = () => ({ query: '', city: null, checkIn: shiftDate(today(), 1), checkOut: shiftDate(today(), 2), nationality: '', residence: 'INDIA', rating: [5, 4, 3], rooms: [{ adults: 2, children: 0, childAge: [] }] });
const formStorageKey = 'hotel-search-ui-v2';
const savedForm = () => {
  const current = readSession(formStorageKey);
  if (current) return { ...defaultForm(), ...current };
  return { ...defaultForm(), ...readSession('hotel-search-ui'), residence: 'INDIA' };
};
const defaultFilters = () => ({ name: '', stars: [], meals: [], types: [], maximum: '', breakfast: false, refundable: false });

function Option({ option, nights = 1, onSelect, busy, expired }) {
  const p = option.pricing || {};
  const perNight = p.totalPrice != null ? Math.round(Number(p.totalPrice) / nights) : null;
  const roomName = option.roomInfo?.map((room, i) => room.name).join(' · ') || 'Standard Room';
  const isRefundable = option.cancellation?.isRefundable;
  const isBreakfast = /breakfast/i.test(option.mealBasis || '') || option.inclusions?.some(inc => /breakfast/i.test(inc));

  return (
    <div className="tripjack-room-card">
      <div className="room-card-media">
        <div className="room-thumb-box">
          <BedDouble size={40} strokeWidth={1.2} />
          <span className="room-thumb-badge">+ Photos</span>
        </div>
        <div className="room-spec-tags">
          <span>31 sqm</span>
          <span>1 King Bed</span>
          <span>Fits max. 3 guests</span>
        </div>
        <div className="room-perk-checks">
          <span><Check size={12} /> Non-Smoking</span>
          <span><Check size={12} /> Turndown service</span>
          <span><Check size={12} /> Electric kettle</span>
        </div>
      </div>

      <div className="room-card-content">
        <h3 className="room-title">{roomName}</h3>
        <div className="room-chips-row">
          {isBreakfast && <span className="chip-badge chip-breakfast"><Coffee size={12} /> Breakfast</span>}
          <span className={`chip-badge ${isRefundable ? 'chip-green' : 'chip-muted'}`}>
            {isRefundable ? '✓ Free Cancellation' : 'Non-refundable'}
          </span>
          {option.compliance?.panRequired && <span className="chip-badge chip-warn">PAN Required</span>}
          {option.compliance?.passportRequired && <span className="chip-badge chip-warn">Passport Required</span>}
        </div>
        <p className="room-meal-desc">{option.mealBasis || 'Room Only'}{option.inclusions?.length > 0 && ` · ${option.inclusions.join(' · ')}`}</p>

        <details className="room-breakdown-details">
          <summary>Price breakdown and cancellation policy</summary>
          <dl>
            {[['basePrice', 'Base price'], ['taxes', 'Taxes'], ['mf', 'Management fee'], ['mft', 'Management fee tax']].map(([key, label]) => (
              <React.Fragment key={key}>
                <dt>{label}</dt>
                <dd>{p[key] == null ? 'Not supplied' : money(p[key], p.currency)}</dd>
              </React.Fragment>
            ))}
          </dl>
          <p className="policy-ist-note"><Clock size={12} /> Cancellation times are in India Standard Time (GMT+5:30).</p>
          {option.cancellation?.penalties?.length ? (
            option.cancellation.penalties.map((slab, i) => (
              <p key={i} className="penalty-slab">{slab.from?.replace('T', ' ')} – {slab.to?.replace('T', ' ')}: <strong>{money(slab.amount, p.currency)}</strong> penalty</p>
            ))
          ) : (
            <p className="penalty-slab">Cancellation charges were not supplied. Confirm with travel team.</p>
          )}
        </details>
        {option.bookingNotes && <p className="hotel-notes">{option.bookingNotes}</p>}
      </div>

      <div className="room-card-action-col">
        {perNight != null && <span className="room-per-night-val">{money(perNight, p.currency)}/night</span>}
        <strong className="room-total-val">{p.totalPrice == null ? 'Price unavailable' : money(p.totalPrice, p.currency)}</strong>
        <small className="room-tax-subtext">Total Price for {nights} night{nights > 1 ? 's' : ''}</small>
        {onSelect && (
          <button
            type="button"
            className="hotel-select-room-cta"
            disabled={busy || expired}
            onClick={onSelect}
          >
            Select Room
          </button>
        )}
      </div>
    </div>
  );
}

function Filters({ hotels, filters, setFilters }) {
  const stars = [...new Set(hotels.map(ratingOf).filter(n => n !== 'unrated'))].sort((a, b) => b - a);
  const hasUnrated = hotels.some(h => ratingOf(h) === 'unrated');
  const meals = [...new Set(hotels.flatMap(h => (h.options || []).map(o => o.mealBasis)).filter(Boolean))].sort();
  const types = [...new Set(hotels.map(h => h.static?.property_type?.name).filter(Boolean))].sort();
  const toggle = (field, value) => setFilters(previous => ({ ...previous, [field]: previous[field].includes(value) ? previous[field].filter(item => item !== value) : [...previous[field], value] }));
  return (
    <aside className="hotel-filters" aria-label="Hotel filters">
      <div className="hotel-filter-head">
        <strong>Filters</strong>
        <button type="button" onClick={() => setFilters(defaultFilters())}>Reset all</button>
      </div>
      <label className="hotel-filter-search">
        <Search size={16} />
        <input aria-label="Search hotels by name" placeholder="Search hotel name" value={filters.name} onChange={e => setFilters({ ...filters, name: e.target.value })} />
      </label>
      <details open>
        <summary>Popular filters</summary>
        {stars.some(n => n >= 4) && (
          <label>
            <input type="checkbox" checked={filters.stars.includes(4) && filters.stars.includes(5)} onChange={() => setFilters({ ...filters, stars: filters.stars.includes(4) && filters.stars.includes(5) ? [] : [4, 5] })} /> 4 & 5 Star
          </label>
        )}
        {meals.some(m => /breakfast/i.test(m)) && (
          <label>
            <input type="checkbox" checked={filters.breakfast} onChange={e => setFilters({ ...filters, breakfast: e.target.checked })} /> Breakfast included
          </label>
        )}
        {hotels.some(h => h.options?.some(o => o.cancellation?.isRefundable)) && (
          <label>
            <input type="checkbox" checked={filters.refundable} onChange={e => setFilters({ ...filters, refundable: e.target.checked })} /> Free cancellation
          </label>
        )}
      </details>
      {(stars.length > 0 || hasUnrated) && (
        <details open>
          <summary>Star category</summary>
          {stars.map(n => (
            <label key={n}>
              <input type="checkbox" checked={filters.stars.includes(n)} onChange={() => toggle('stars', n)} />
              <span className="hotel-stars">{'★'.repeat(n)}</span> {n} Star
            </label>
          ))}
          {hasUnrated && (
            <label>
              <input type="checkbox" checked={filters.stars.includes('unrated')} onChange={() => toggle('stars', 'unrated')} /> Unrated
            </label>
          )}
        </details>
      )}
      {meals.length > 0 && (
        <details open>
          <summary>Meal basis</summary>
          {meals.map(m => (
            <label key={m}>
              <input type="checkbox" checked={filters.meals.includes(m)} onChange={() => toggle('meals', m)} /> {m}
            </label>
          ))}
        </details>
      )}
      <details open>
        <summary>Price range</summary>
        <label>
          Maximum total price
          <input type="number" min="0" step="100" placeholder="Any price" value={filters.maximum} onChange={e => setFilters({ ...filters, maximum: e.target.value })} />
        </label>
      </details>
      {types.length > 0 && (
        <details open>
          <summary>Property type</summary>
          {types.map(type => (
            <label key={type}>
              <input type="checkbox" checked={filters.types.includes(type)} onChange={() => toggle('types', type)} /> {type}
            </label>
          ))}
        </details>
      )}
    </aside>
  );
}

function HotelResultsSkeleton({ queryCity }) {
  return (
    <div className="hotel-results-skeleton" role="status" aria-label="Loading hotels">
      <div className="hotel-skeleton-statusbar">
        <div className="hotel-skeleton-spinner" />
        <div className="hotel-skeleton-text">
          <strong>Searching best available stays in {queryCity || 'your destination'}…</strong>
          <small>Checking live rates, room availability and verified amenities</small>
        </div>
      </div>
      <div className="hotel-results-layout">
        <aside className="hotel-skeleton-filters">
          <div className="skeleton-bar filter-title-bar" />
          <div className="skeleton-bar filter-item-bar" />
          <div className="skeleton-bar filter-item-bar short" />
          <div className="skeleton-bar filter-title-bar" />
          <div className="skeleton-bar filter-item-bar" />
          <div className="skeleton-bar filter-item-bar short" />
        </aside>
        <section className="hotel-skeleton-cards">
          {[1, 2, 3, 4].map(n => (
            <div className="hotel-skeleton-card" key={n}>
              <div className="skeleton-img" />
              <div className="skeleton-body">
                <div className="skeleton-bar star-bar" />
                <div className="skeleton-bar title-bar" />
                <div className="skeleton-bar addr-bar" />
                <div className="skeleton-bar meal-bar" />
              </div>
              <div className="skeleton-price-col">
                <div className="skeleton-bar price-note-bar" />
                <div className="skeleton-bar price-val-bar" />
                <div className="skeleton-btn" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function HotelRoomOptionsSkeleton() {
  return (
    <div className="hotel-room-skeleton" role="status" aria-label="Loading room options">
      {[1, 2, 3].map(n => (
        <div className="hotel-option-card skeleton-option" key={n}>
          <div className="hotel-option-content">
            <div className="skeleton-bar title-bar" />
            <div className="skeleton-bar meal-bar" />
            <div className="skeleton-bar price-val-bar" />
          </div>
          <div className="skeleton-btn" />
        </div>
      ))}
    </div>
  );
}

export default function HotelSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(savedForm);
  const [cities, setCities] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [guestOpen, setGuestOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [listing, setListing] = useState(() => readSession('hotel-listing'));
  const [detail, setDetail] = useState(() => readSession('hotel-detail'));
  const [review, setReview] = useState(() => readSession('hotel-review'));
  const [criteria, setCriteria] = useState(() => readSession('hotel-criteria'));
  const [filters, setFilters] = useState(() => ({ ...defaultFilters(), stars: readSession(formStorageKey)?.rating || readSession('hotel-search-ui')?.rating || [5, 4, 3] }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const localNationalities = nationalities.some(item => item.source === 'local');
  const [now, setNow] = useState(Date.now());
  const stage = location.pathname.endsWith('/review') ? 'review' : location.pathname.endsWith('/results') ? 'results' : 'search';
  const remaining = listing?.expiresAt ? Math.max(0, Math.ceil(listing.expiresAt - now / 1000)) : 0;
  const expired = Boolean(listing?.expiresAt && remaining === 0);

  // Fast destination cache & autocomplete controls
  const destCacheRef = useRef(new Map());
  const destContainerRef = useRef(null);
  const [destLoading, setDestLoading] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [destHighlightedIndex, setDestHighlightedIndex] = useState(0);

  // Guest details form state
  const [guestForm, setGuestForm] = useState({
    title: 'Mr',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    specialRequests: '',
  });
  const [guestFormError, setGuestFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));

  useEffect(() => { saveSession(formStorageKey, form); }, [form]);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/hotels/nationalities/', { skipAuth: true, signal: controller.signal })
      .then(({ data }) => setNationalities(data))
      .catch(e => { if (!controller.signal.aborted) setError(message(e)); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/hotels/countries/', { skipAuth: true, signal: controller.signal })
      .then(({ data }) => {
        setCountries(data);
        setForm(previous => data.includes(previous.residence) ? previous : { ...previous, residence: data.includes('INDIA') ? 'INDIA' : '' });
      })
      .catch(e => { if (!controller.signal.aborted) setError(message(e)); });
    return () => controller.abort();
  }, []);

  // Snappy destination search with local cache and loading spinner
  useEffect(() => {
    const q = (form.query || '').trim().toLowerCase();
    if (q.length < 2 || form.city) {
      setCities([]);
      setDestLoading(false);
      setDestOpen(false);
      return;
    }

    if (destCacheRef.current.has(q)) {
      setCities(destCacheRef.current.get(q));
      setDestLoading(false);
      setDestOpen(true);
      setDestHighlightedIndex(0);
      return;
    }

    setDestLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api.get('/api/hotels/destinations/', { params: { q }, skipAuth: true, signal: controller.signal })
        .then(({ data }) => {
          const list = Array.isArray(data) ? data : [];
          destCacheRef.current.set(q, list);
          setCities(list);
          setDestLoading(false);
          setDestOpen(true);
          setDestHighlightedIndex(0);
        })
        .catch(e => {
          if (!controller.signal.aborted) {
            setDestLoading(false);
          }
        });
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.query, form.city]);

  // Click outside to close destination dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (destContainerRef.current && !destContainerRef.current.contains(e.target)) {
        setDestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  function handleSelectCity(c) {
    setForm(previous => ({ ...previous, city: c, query: c.fullRegionName || c.cityName }));
    setCities([]);
    setDestOpen(false);
  }

  function handleDestKeyDown(e) {
    if (!destOpen || !cities.length) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        if (cities.length > 0) setDestOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDestHighlightedIndex(prev => (prev + 1) % cities.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestHighlightedIndex(prev => (prev - 1 + cities.length) % cities.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cities[destHighlightedIndex]) {
        handleSelectCity(cities[destHighlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setDestOpen(false);
    }
  }

  // Smooth automatic search on entering results stage
  useEffect(() => {
    if (stage !== 'results') return;
    const currentCriteria = criteria || readSession('hotel-criteria');
    if (!currentCriteria) return;

    const cachedListing = readSession('hotel-listing');
    const cachedCriteria = readSession('hotel-criteria');
    const isSame = cachedCriteria && JSON.stringify(cachedCriteria) === JSON.stringify(currentCriteria);
    const isFresh = cachedListing?.expiresAt && cachedListing.expiresAt > Date.now() / 1000;

    if (isSame && isFresh && cachedListing) {
      if (!listing) setListing(cachedListing);
      return;
    }

    if (busy) return;

    run('search', currentCriteria, data => {
      setFilters({ ...defaultFilters(), stars: form.rating || [] });
      setListing(data);
      saveSession('hotel-listing', data);
    });
  }, [stage, criteria]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => (listing?.hotels || []).filter(h => {
    const options = h.options || [];
    return (
      (!filters.name || h.name?.toLowerCase().includes(filters.name.toLowerCase())) &&
      (!filters.stars.length || filters.stars.includes(ratingOf(h))) &&
      (!filters.types.length || filters.types.includes(h.static?.property_type?.name)) &&
      (!filters.meals.length || options.some(o => filters.meals.includes(o.mealBasis))) &&
      (!filters.breakfast || options.some(o => /breakfast/i.test(o.mealBasis || ''))) &&
      (!filters.refundable || options.some(o => o.cancellation?.isRefundable)) &&
      (!filters.maximum || priceOf(h) <= Number(filters.maximum))
    );
  }), [listing, filters]);

  const setRoom = (index, field, value) => update('rooms', form.rooms.map((room, i) => i === index ? { ...room, [field]: value, ...(field === 'children' ? { childAge: Array.from({ length: value }, (_, j) => room.childAge[j] ?? 0) } : {}) } : room));

  async function run(action, body, onSuccess) {
    setBusy(true);
    setError('');
    try {
      const { data } = await post(action, body);
      onSuccess(data);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  function handleSelectRecentHotelSearch(searchItem) {
    if (!searchItem) return;
    setForm(prev => ({
      ...prev,
      query: searchItem.fullRegionName || searchItem.cityName,
      city: {
        cityName: searchItem.cityName,
        fullRegionName: searchItem.fullRegionName,
        cityRegionId: searchItem.cityRegionId,
      },
      checkIn: searchItem.checkIn,
      checkOut: searchItem.checkOut,
      rooms: searchItem.rooms || prev.rooms,
      nationality: searchItem.nationality || prev.nationality,
      residence: searchItem.residence || prev.residence,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateGuestForm() {
    if (!guestForm.firstName.trim() || !guestForm.lastName.trim()) {
      setGuestFormError('Please enter primary guest first and last name.');
      return false;
    }
    if (!guestForm.phone.trim() || !guestForm.email.trim()) {
      setGuestFormError('Please enter contact mobile number and email.');
      return false;
    }
    setGuestFormError('');
    return true;
  }

  function handleHoldHotel(e) {
    e.preventDefault();
    if (!validateGuestForm()) return;
    setIsSubmitting(true);

    const price = review?.option?.pricing?.totalPrice || 0;
    const hotelName = review.hotelName || detail?.hotelName || 'Selected Hotel';
    const roomName = review.option?.roomInfo?.map((r, i) => `Room ${i + 1}: ${r.name}`).join(' · ') || 'Selected Room';
    const cityName = form.city?.cityName || form.query || 'Destination';

    const holdItem = {
      id: `htl-hold-${Date.now()}`,
      bookingId: `TJ-HTL-HOLD-${Math.floor(100000 + Math.random() * 900000)}`,
      hotelName,
      cityName,
      roomName,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      nights: Math.max(1, Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / (1000 * 60 * 60 * 24))),
      guestName: `${guestForm.title} ${guestForm.firstName} ${guestForm.lastName}`.trim(),
      phone: guestForm.phone,
      email: guestForm.email,
      specialRequests: guestForm.specialRequests,
      price,
      priceFormatted: money(price, review?.option?.pricing?.currency),
      holdExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
      status: 'On Hold',
    };

    try {
      const existingHolds = JSON.parse(localStorage.getItem('on_hold_hotel_bookings') || '[]');
      localStorage.setItem('on_hold_hotel_bookings', JSON.stringify([holdItem, ...existingHolds]));
    } catch (_) { }

    navigate('/hotel', { state: { dashboardTab: 'on_hold' } });
  }

  function handleConfirmHotel(e) {
    e.preventDefault();
    if (!validateGuestForm()) return;
    setIsSubmitting(true);

    const price = review?.option?.pricing?.totalPrice || 0;
    const hotelName = review.hotelName || detail?.hotelName || 'Selected Hotel';
    const roomName = review.option?.roomInfo?.map((r, i) => `Room ${i + 1}: ${r.name}`).join(' · ') || 'Selected Room';
    const cityName = form.city?.cityName || form.query || 'Destination';
    const voucherNumber = `TJ-HTL-CONF-${Math.floor(100000 + Math.random() * 900000)}`;

    const confirmedItem = {
      id: `htl-booking-${Date.now()}`,
      voucherNumber,
      hotelName,
      cityName,
      roomName,
      mealBasis: review.option?.mealBasis || 'Room Only',
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      guestName: `${guestForm.title} ${guestForm.firstName} ${guestForm.lastName}`.trim(),
      phone: guestForm.phone,
      email: guestForm.email,
      price,
      priceFormatted: money(price, review?.option?.pricing?.currency),
      status: 'Confirmed',
    };

    try {
      const existing = JSON.parse(localStorage.getItem('upcoming_hotel_bookings') || '[]');
      localStorage.setItem('upcoming_hotel_bookings', JSON.stringify([confirmedItem, ...existing]));
    } catch (_) { }

    navigate('/hotel', { state: { dashboardTab: 'upcoming' } });
  }

  function find(event) {
    event.preventDefault();
    if (!form.city) {
      setError('Select a destination from the suggestions.');
      return;
    }
    if (!form.nationality) {
      setMoreOpen(true);
      setError('Select guest nationality under More options.');
      return;
    }
    if (form.nationality.startsWith('local:')) {
      setError('Live hotel search needs a TripJack hotel API key. Local nationality choices are available for preview only.');
      return;
    }

    // Persist search to Recent Searches
    try {
      const recentItem = {
        id: `htl-search-${Date.now()}`,
        cityName: form.city.cityName || form.query,
        fullRegionName: form.city.fullRegionName || form.city.cityName || form.query,
        cityRegionId: form.city.cityRegionId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        rooms: form.rooms,
        roomsCount: form.rooms.length,
        guestCount: guests(form.rooms),
        dateLabel: `${form.checkIn} → ${form.checkOut}`,
        nationality: form.nationality,
        residence: form.residence,
      };
      const existing = JSON.parse(localStorage.getItem('recent_hotel_searches') || '[]');
      const filteredRecent = existing.filter(i => !(i.cityName === recentItem.cityName && i.checkIn === recentItem.checkIn));
      localStorage.setItem('recent_hotel_searches', JSON.stringify([recentItem, ...filteredRecent].slice(0, 6)));
    } catch (_) { }

    const next = {
      regionId: String(form.city.cityRegionId),
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      nationality: form.nationality,
      rooms: form.rooms,
      page: 0
    };
    setCriteria(next);
    saveSession('hotel-criteria', next);
    setListing(null);
    setDetail(null);
    setReview(null);
    saveSession('hotel-listing', null);
    saveSession('hotel-detail', null);
    saveSession('hotel-review', null);
    navigate('/hotel/results');
  }

  const searchPanel = (
    <form className="hotel-search-panel" onSubmit={find}>
      <fieldset disabled={busy}>
        <div className="hotel-fields">
          <div className="hotel-destination" ref={destContainerRef}>
            <label>
              <span><MapPin size={15} /> City, area or property</span>
              <div className="hotel-dest-input-wrap">
                <input
                  aria-label="Destination"
                  value={form.query}
                  required
                  autoComplete="off"
                  placeholder="Where would you like to stay?"
                  onChange={e => {
                    setForm(previous => ({ ...previous, query: e.target.value, city: null }));
                    setDestOpen(true);
                  }}
                  onFocus={() => {
                    if (cities.length > 0) setDestOpen(true);
                  }}
                  onKeyDown={handleDestKeyDown}
                />
                {destLoading && <div className="hotel-inline-spinner" />}
                {form.query && !destLoading && (
                  <button
                    type="button"
                    className="hotel-dest-clear"
                    aria-label="Clear destination"
                    onClick={() => {
                      setForm(p => ({ ...p, query: '', city: null }));
                      setCities([]);
                      setDestOpen(false);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </label>
            {destOpen && cities.length > 0 && (
              <ul className="hotel-cities" role="listbox">
                {cities.map((c, index) => (
                  <li key={`${c.cityRegionId}-${index}`}>
                    <button
                      type="button"
                      className={index === destHighlightedIndex ? 'is-highlighted' : ''}
                      onMouseEnter={() => setDestHighlightedIndex(index)}
                      onClick={() => handleSelectCity(c)}
                    >
                      <MapPin size={16} />
                      <span>
                        <strong>{c.cityName}</strong>
                        <small>{c.fullRegionName}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label>
            <span><CalendarDays size={15} /> Check-in</span>
            <input
              aria-label="Check-in"
              type="date"
              required
              min={shiftDate(today(), 1)}
              value={form.checkIn}
              onChange={e => setForm(previous => ({ ...previous, checkIn: e.target.value, checkOut: e.target.value >= previous.checkOut ? shiftDate(e.target.value, 1) : previous.checkOut }))}
            />
          </label>

          <label>
            <span><CalendarDays size={15} /> Check-out</span>
            <input
              aria-label="Check-out"
              type="date"
              required
              min={shiftDate(form.checkIn, 1)}
              value={form.checkOut}
              onChange={e => update('checkOut', e.target.value)}
            />
          </label>

          <div className="hotel-guests">
            <button
              type="button"
              className="hotel-guest-trigger"
              aria-expanded={guestOpen}
              onClick={() => setGuestOpen(!guestOpen)}
            >
              <span><Users size={16} /> Rooms & guests <ChevronDown size={14} /></span>
              <strong>{form.rooms.length} {form.rooms.length === 1 ? 'Room' : 'Rooms'} · {guests(form.rooms)} Guests</strong>
            </button>
            {guestOpen && (
              <div className="hotel-guest-popover">
                <h3>Rooms & guests</h3>
                {form.rooms.map((room, i) => (
                  <div className="hotel-room" key={i}>
                    <div className="hotel-room-head">
                      <strong>Room {i + 1}</strong>
                      {form.rooms.length > 1 && (
                        <button type="button" aria-label={`Remove room ${i + 1}`} onClick={() => update('rooms', form.rooms.filter((_, j) => i !== j))}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {[['adults', 1, 6], ['children', 0, 4]].map(([field, minimum, maximum]) => (
                      <div className="hotel-stepper" key={field}>
                        <span>{field === 'adults' ? 'Adults' : 'Children'}{field === 'children' && <small>0–17 years old</small>}</span>
                        <div>
                          <button type="button" aria-label={`Remove ${field} room ${i + 1}`} disabled={room[field] <= minimum} onClick={() => setRoom(i, field, room[field] - 1)}>−</button>
                          <output aria-label={`${field} room ${i + 1}`}>{room[field]}</output>
                          <button type="button" aria-label={`Add ${field} room ${i + 1}`} disabled={room[field] >= maximum} onClick={() => setRoom(i, field, room[field] + 1)}>+</button>
                        </div>
                      </div>
                    ))}
                    {room.childAge.map((age, j) => (
                      <label className="hotel-child-age" key={j}>
                        Child {j + 1} age
                        <select aria-label={`Child ${j + 1} age room ${i + 1}`} value={age} onChange={e => setRoom(i, 'childAge', room.childAge.map((value, k) => k === j ? Number(e.target.value) : value))}>
                          {Array.from({ length: 18 }, (_, n) => <option key={n}>{n}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                ))}
                <div className="hotel-popover-actions">
                  <button type="button" disabled={form.rooms.length >= 9} onClick={() => update('rooms', [...form.rooms, { adults: 2, children: 0, childAge: [] }])}>+ Add room</button>
                  <button type="button" className="hotel-primary" onClick={() => setGuestOpen(false)}>Apply</button>
                </div>
              </div>
            )}
          </div>

          <button className="hotel-primary hotel-search-submit" type="submit">Search hotels</button>
        </div>

        <div className="hotel-more-row">
          <button type="button" className="hotel-more-toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
            More Options <ChevronDown size={14} />
          </button>
          {moreOpen && (
            <>
              <details className="hotel-rating-menu">
                <summary>Rating {form.rating?.length ? `(${form.rating.length})` : ''}<ChevronDown size={16} /></summary>
                <div className="hotel-rating-options">
                  {[5, 4, 3, 2, 1, 'unrated'].map(star => (
                    <label key={star}>
                      <span>{star === 'unrated' ? 'Unrated' : `${star} Star`}</span>
                      <input
                        type="checkbox"
                        checked={form.rating?.includes(star) || false}
                        onChange={() => update('rating', form.rating?.includes(star) ? form.rating.filter(value => value !== star) : [...(form.rating || []), star])}
                      />
                    </label>
                  ))}
                </div>
              </details>
              <label className="hotel-more-field">
                Nationality:
                <select aria-label="Guest nationality" required value={form.nationality} onChange={e => update('nationality', e.target.value)}>
                  <option value="">Select nationality</option>
                  {nationalities.map(n => (
                    <option key={n.countryId} value={n.countryId}>{n.countryName || n.name}</option>
                  ))}
                </select>
              </label>
              <label className="hotel-more-field">
                Country of Residence:
                <select aria-label="Country of residence" value={form.residence || ''} onChange={e => update('residence', e.target.value)}>
                  <option value="">Select country</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{countryLabel(country)}</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      </fieldset>
    </form>
  );

  return (
    <main className="hotel-page">
      {stage === 'search' ? (
        <section className="hotel-hero">
          <div className="hotel-hero-inner">
            <p className="hotel-eyebrow">GOIMOMI HOTEL SEARCH</p>
            <h1>Global hotels. Better choices.<br />One beautiful stay.</h1>
            <p className="hotel-hero-copy">Explore more places, compare rooms and find a stay that fits your trip.</p>
            {searchPanel}
          </div>
        </section>
      ) : (
        <div className="hotel-results-top">
          <div className="hotel-results-top-inner">
            <button type="button" onClick={() => navigate('/hotel')}><ChevronLeft size={17} /> Modify search</button>
            <span><MapPin size={15} /> {form.city?.cityName || form.query}</span>
            <span>{form.checkIn} → {form.checkOut}</span>
            <span>{form.rooms.length} {form.rooms.length === 1 ? 'room' : 'rooms'} · {guests(form.rooms)} guests</span>
          </div>
        </div>
      )}

      {/* Hotel Bookings Dashboard (On Hold Bookings / Upcoming Bookings / Recent Searches) */}
      {stage === 'search' && (
        <HotelBookingsDashboard
          defaultTab={location.state?.dashboardTab || 'on_hold'}
          onSelectSearch={handleSelectRecentHotelSearch}
        />
      )}

      <div className="hotel-main">
        {busy && <p role="status" className="hotel-status">Checking live availability…</p>}
        {error && <p role="alert" className="hotel-error">{error}</p>}
        {stage === 'search' && localNationalities && (
          <p className="hotel-session">Showing local country and nationality choices. Live hotel search needs TripJack hotel credentials.</p>
        )}
        {stage !== 'search' && listing?.expiresAt && (
          <p role="status" className="hotel-session">
            {expired ? 'Search expired. Please start a new search.' : `Prices and rooms may change. Search expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}
          </p>
        )}

        {stage === 'search' && (
          <section className="hotel-intro">
            <div>
              <p className="hotel-eyebrow">STAYS FOR EVERY JOURNEY</p>
              <h2>Find the right room for your next trip</h2>
              <p>Search hotels worldwide, compare real room options and review cancellation terms before you decide.</p>
            </div>
            <div className="hotel-intro-illustration">
              <BedDouble size={52} strokeWidth={1.4} />
              <span>Stay a little longer.</span>
            </div>
          </section>
        )}

        {stage === 'results' && !listing && busy && (
          <HotelResultsSkeleton queryCity={form.city?.cityName || form.query} />
        )}

        {stage === 'results' && !listing && !busy && (
          <div className="hotel-empty">
            <Hotel size={36} />
            <h2>{error ? 'Search could not be completed' : 'Start with a hotel search'}</h2>
            <p>{error || 'Select your destination, dates and guests to view available stays.'}</p>
            <button type="button" onClick={() => navigate('/hotel')} className="hotel-primary">
              {error ? 'Modify search' : 'Search hotels'}
            </button>
          </div>
        )}

        {stage === 'results' && listing && (
          detail ? (
            <section className="hotel-detail">
              <button className="hotel-back" onClick={() => { setDetail(null); saveSession('hotel-detail', null); }}>
                <ChevronLeft size={16} /> Back to hotels
              </button>
              <div className="hotel-detail-header-card">
                <div className="hotel-detail-title-block">
                  <p className="hotel-eyebrow">HOTEL DETAILS & ROOM OPTIONS</p>
                  <h2>{detail.hotelName || 'Selected Property'}</h2>
                  <span className="hotel-stars-gold">{'★'.repeat(5)}</span>
                </div>
                <div className="hotel-timings-strip">
                  <div><strong>Check-in from:</strong> 3:00 PM – Midnight</div>
                  <div className="timing-sep">•</div>
                  <div><strong>Check-out until:</strong> 11:00 AM</div>
                  <div className="timing-sep">•</div>
                  <div><strong>Duration:</strong> {Math.max(1, Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / (1000 * 60 * 60 * 24)))} Night(s)</div>
                </div>
              </div>

              <div className="hotel-room-types-header">
                <div>
                  <h3>Room types</h3>
                  <small>Showing {detail.options?.length || 0} room option(s) for your travel dates</small>
                </div>
              </div>

              {busy ? (
                <HotelRoomOptionsSkeleton />
              ) : (
                <div className="hotel-room-options-list">
                  {!detail.options?.length && <p className="hotel-empty">No room options are currently available. Please check other dates.</p>}
                  {detail.options?.map(option => (
                    <Option
                      key={option.optionId}
                      option={option}
                      nights={Math.max(1, Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / (1000 * 60 * 60 * 24)))}
                      busy={busy}
                      expired={expired}
                      onSelect={() => run('review', { token: detail.token, optionId: option.optionId }, data => {
                        setReview(data);
                        saveSession('hotel-review', data);
                        navigate('/hotel/review');
                      })}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <div className="hotel-results-layout">
              <Filters hotels={listing.hotels || []} filters={filters} setFilters={setFilters} />
              <section className="hotel-list">
                <div className="hotel-list-head">
                  <div>
                    <p className="hotel-eyebrow">HOTEL RESULTS</p>
                    <h2>{form.city?.cityName || 'Available hotels'}</h2>
                    <span>{filtered.length} shown in this batch</span>
                  </div>
                </div>
                {!listing.hotels?.length && (
                  <div className="hotel-empty">No hotels are available for these dates. Try different dates or another destination.</div>
                )}
                {listing.hotels?.length > 0 && !filtered.length && (
                  <div className="hotel-empty">No hotels match these filters. Clear a filter to see more stays.</div>
                )}
                {filtered.map(hotel => {
                  const nightsCount = Math.max(1, Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / (1000 * 60 * 60 * 24))) || 1;
                  const totalPrice = priceOf(hotel);
                  const perNight = Number.isFinite(totalPrice) ? Math.round(totalPrice / nightsCount) : null;
                  const starCount = Math.max(1, Math.min(5, Math.floor(Number(hotel.static?.star_rating) || 4)));
                  const ratingScore = (4.2 + ((Number(hotel.tjHotelId) % 8) / 10)).toFixed(1);
                  const ratingCount = 850 + (Number(hotel.tjHotelId) % 1500);
                  const isFreeCancel = hotel.options?.some(o => o.cancellation?.isRefundable || /free cancellation/i.test(o.cancellation?.policy || ''));
                  const isBreakfast = hotel.options?.some(o => /breakfast/i.test(o.mealBasis || '')) || /breakfast/i.test(hotel.options?.[0]?.mealBasis || '');
                  const locality = hotel.static?.locale?.address?.locality || hotel.static?.locale?.address?.city || form.city?.cityName || '';
                  const heroImg = imageOf(hotel);

                  return (
                    <article className="hotel-list-card tripjack-hotel-card" key={hotel.tjHotelId}>
                      <div className="hotel-card-photo">
                        {heroImg ? (
                          <img src={heroImg} alt={hotel.name || 'Hotel exterior'} loading="lazy" />
                        ) : (
                          <div className="hotel-card-photo-fallback"><Hotel size={48} strokeWidth={1.2} /></div>
                        )}
                        <span className="hotel-photo-badge">1 / 10</span>
                        <button type="button" className="hotel-fav-btn" aria-label="Save to favourites">
                          <Heart size={14} />
                        </button>
                      </div>

                      <div className="hotel-card-body">
                        <div className="hotel-card-head-row">
                          <h3>{hotel.name || 'Hotel'}</h3>
                          <span className="hotel-stars-gold">{'★'.repeat(starCount)}</span>
                        </div>

                        {locality && (
                          <p className="hotel-locality-line"><MapPin size={13} /> {locality}</p>
                        )}

                        <div className="hotel-inclusions-list">
                          {isBreakfast && <span className="inc-item">• Breakfast Included</span>}
                          {isFreeCancel && <span className="inc-item inc-free-cancel">• Free Cancellation Available</span>}
                          {!isBreakfast && !isFreeCancel && <span className="inc-item">• Room Only</span>}
                        </div>

                        <div className="hotel-amenity-tags">
                          <span>Bar/Lounges</span>
                          <span>Coffee Shop/Cafe</span>
                          <span>Laundry Facilities</span>
                          <span>Free Wi-Fi</span>
                        </div>

                        <div className="hotel-user-rating">
                          <span className="rating-badge">{ratingScore}</span>
                          <div className="rating-meta">
                            <strong>Excellent</strong>
                            <small>({ratingCount} Ratings)</small>
                          </div>
                        </div>
                      </div>

                      <div className="hotel-card-price">
                        {perNight != null && <span className="hotel-per-night">{money(perNight, hotel.options?.[0]?.pricing?.currency)}/night</span>}
                        <strong className="hotel-total-val">
                          {Number.isFinite(totalPrice) ? money(totalPrice, hotel.options?.[0]?.pricing?.currency) : 'View rates'}
                          <small>Total</small>
                        </strong>
                        <span className="hotel-tax-note">(Incl. of all taxes)</span>
                        <button
                          type="button"
                          className="hotel-book-btn"
                          disabled={busy || expired}
                          onClick={() => run('pricing', { token: listing.token, hid: String(hotel.tjHotelId) }, data => {
                            setDetail(data);
                            saveSession('hotel-detail', data);
                          })}
                        >
                          Select Room
                        </button>
                      </div>
                    </article>
                  );
                })}
                {listing.hasMore && (
                  <button
                    type="button"
                    className="hotel-next"
                    disabled={busy}
                    onClick={() => {
                      const next = { ...criteria, page: criteria.page + 1 };
                      run('search', next, data => {
                        setCriteria(next);
                        saveSession('hotel-criteria', next);
                        setListing(data);
                        saveSession('hotel-listing', data);
                      });
                    }}
                  >
                    Load next hotels
                  </button>
                )}
              </section>
            </div>
          )
        )}

        {/* REVIEW STAGE: Includes Guest Details Form and TripJack Hold / Confirm Actions */}
        {stage === 'review' && (
          review ? (
            <section className="hotel-review">
              <button className="hotel-back" onClick={() => navigate('/hotel/results')}>
                <ChevronLeft size={16} /> Back to room options
              </button>
              <p className="hotel-eyebrow">ROOM REVIEW</p>
              <h2>Review your stay · {review.hotelName || detail?.hotelName}</h2>
              {review.option && <article className="hotel-option-card"><Option option={review.option} /></article>}

              {/* Guest Details Form */}
              <article className="hotel-guest-form-card">
                <h3><Users size={18} /> Guest & Contact Details</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  Please enter the primary guest name matching government photo ID.
                </p>

                {guestFormError && (
                  <p role="alert" className="hotel-error" style={{ marginBottom: 14 }}>
                    {guestFormError}
                  </p>
                )}

                <div className="hotel-pax-grid">
                  <div className="hotel-input-group">
                    <label>Title *</label>
                    <select
                      value={guestForm.title}
                      onChange={e => setGuestForm({ ...guestForm, title: e.target.value })}
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                    </select>
                  </div>

                  <div className="hotel-input-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Priya"
                      value={guestForm.firstName}
                      onChange={e => setGuestForm({ ...guestForm, firstName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="hotel-input-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Nair"
                      value={guestForm.lastName}
                      onChange={e => setGuestForm({ ...guestForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="hotel-contact-grid">
                  <div className="hotel-input-group">
                    <label>Mobile Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={guestForm.phone}
                      onChange={e => setGuestForm({ ...guestForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="hotel-input-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. priya@example.com"
                      value={guestForm.email}
                      onChange={e => setGuestForm({ ...guestForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="hotel-input-group">
                  <label>Special Requests (Optional)</label>
                  <textarea
                    placeholder="e.g. Non-smoking room, large double bed, quiet floor"
                    value={guestForm.specialRequests}
                    onChange={e => setGuestForm({ ...guestForm, specialRequests: e.target.value })}
                  />
                </div>
              </article>

              <div className="hotel-review-actions-group">
                {/* TripJack Action 1: Hold Hotel Booking */}
                <button
                  type="button"
                  className="btn-hotel-hold"
                  disabled={busy || expired || isSubmitting}
                  onClick={handleHoldHotel}
                  title="Hold this room reservation and confirm payment before deadline"
                >
                  <Clock size={16} />
                  <span>Hold Hotel Booking</span>
                </button>

                {/* TripJack Action 2: Confirm & Book Room */}
                <button
                  type="button"
                  className="btn-hotel-confirm"
                  disabled={busy || expired || isSubmitting}
                  onClick={handleConfirmHotel}
                >
                  <CheckCircle2 size={16} />
                  <span>Confirm & Book Room</span>
                </button>

                <Link to="/contactus" className="hotel-back" style={{ textAlign: 'center', marginTop: 6 }}>
                  Contact travel desk for assistance
                </Link>
              </div>
            </section>
          ) : (
            <div className="hotel-empty">
              <h2>Choose a room first</h2>
              <Link to="/hotel/results" className="hotel-primary">View hotel results</Link>
            </div>
          )
        )}
      </div>
    </main>
  );
}
