import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, CalendarDays, CarFront, Check, ChevronDown, Compass, Headphones, Hotel, MapPin, Mountain, Phone, Plane, ShieldCheck, Sparkles, Users, Utensils, X } from 'lucide-react';
import api from '../../../api';
import TrendingDomesticDestinations from '../../../components/holidays/TrendingDomesticDestinations';
import usePageSEO from '../../../hooks/usePageSEO';
import { budgetInclusions, exclusions, formatRupees, hotelCategories, itinerary, privateInclusions, privateRates, supplements } from './kashmirData';
import '../TrendingDestinations/trendingDestinations.css';
import './Kashmir.css';

const heroImage = '/images/kashmir/dal-lake-hero.webp';
const valleyImage = '/images/kashmir/pahalgam-valley.webp';
const sections = [['packages', 'Packages'], ['itinerary', 'Itinerary'], ['hotels', 'Your stay'], ['rates', 'Rates'], ['inclusions', 'Inclusions']];

function InclusionList({ items }) {
  return <ul className="km-check-list">{items.map(item => <li key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></li>)}</ul>;
}

function RateTable({ rows, supplement = false }) {
  return <div className="km-table-scroll" tabIndex={0} role="region" aria-label={supplement ? 'Supplement rates, scroll horizontally for all categories' : 'Private package rates, scroll horizontally for all categories'}>
    <table className="km-table">
      <caption>{supplement ? 'Supplements per person (INR)' : 'Private Leisure package · per person, twin sharing (INR)'}</caption>
      <thead><tr><th scope="col">{supplement ? 'Supplement' : 'Vehicle / minimum guests'}</th>{hotelCategories.map(category => <th scope="col" key={category.label}>{category.label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.label || `${row.vehicle}-${row.pax}`}><th scope="row">{row.label || <>{row.vehicle}<span>Minimum {row.pax} guests</span></>}</th>{row.prices.map((price, index) => <td key={index}>{formatRupees(price)}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export default function Kashmir() {
  const [hotelStars, setHotelStars] = useState('03');
  const [vehicleIndex, setVehicleIndex] = useState(7);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState('Budget');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', adults: 2, rooms: 1, message: '' });
  const selectedRate = privateRates[vehicleIndex];
  const selectedCategory = hotelCategories[categoryIndex];
  const price = selectedRate.prices[categoryIndex];
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  usePageSEO('Kashmir Holiday Packages | 4 Nights / 5 Days from ₹6,499 | Goimomi', 'Discover Srinagar, Sonmarg, Gulmarg and Pahalgam. Compare Budget and Private Leisure packages, six hotel categories, day-wise itinerary and transparent rates.', '/images/kashmir/dal-lake-social.jpg', 'Kashmir holiday package, Srinagar, Sonmarg, Gulmarg, Pahalgam, Kashmir 4 nights 5 days');

  const choosePackage = (type) => {
    setSelectedPackage(type);
    setStatus('idle');
    setError('');
    if (type === 'Private Leisure') setForm(current => ({ ...current, adults: selectedRate.pax, rooms: Math.ceil(selectedRate.pax / 2) }));
  };

  const updateForm = (event) => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
    if (status === 'error') { setStatus('idle'); setError(''); }
  };

  const submitEnquiry = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!form.name.trim() || !/^[+0-9 ()-]+$/.test(form.phone) || form.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter your name and a phone number with at least 10 digits.');
      setStatus('error');
      return;
    }
    if (form.date < minDate) {
      setError('Please choose today or a future travel date.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      await api.post('/api/holiday-form/', {
        package_type: `Kashmir ${selectedPackage} - 4N / 5D`,
        start_city: 'Srinagar', nationality: 'Not specified', travel_date: form.date,
        rooms: Number(form.rooms), adults: Number(form.adults), children: 0,
        star_rating: selectedPackage === 'Budget' ? 'Budget' : categoryIndex < 3 ? '3' : '4',
        holiday_type: 'Domestic', budget: String(selectedPackage === 'Budget' ? 6499 : price),
        full_name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        nights: 4, cities: [{ destination: 'Srinagar', nights: 4 }], room_details: [],
        meal_plan: 'Breakfast and dinner',
        transfer_details: selectedPackage === 'Budget' ? 'Shared SIC sightseeing; airport transfers excluded' : 'Private vehicle; airport pickup and drop included',
        message: [
          'Source: Kashmir landing page. Enquiry only; availability and final quote to be confirmed.',
          selectedPackage === 'Private Leisure' ? `${selectedCategory.label}; ${selectedRate.vehicle}; rate basis: minimum ${selectedRate.pax} guests, twin sharing; INR ${price} per person.` : 'Budget: Hotel Akar Inn or similar; INR 6499 per person.',
          `Requested: ${form.adults} adults, ${form.rooms} rooms.`, form.message,
        ].filter(Boolean).join('\n'),
      });
      setStatus('success');
    } catch {
      setError('Your enquiry could not be sent. Please try again, or call +91 8110082222.');
      setStatus('error');
    }
  };

  return <div className="kashmir-page">
    <section className="km-hero" aria-labelledby="km-title">
      <img className="km-hero-image" src={heroImage} alt="Kashmir-inspired scene of a shikara on Dal Lake with Himalayan mountains at sunrise" fetchPriority="high" width="1672" height="941" />
      <div className="km-hero-shade" />
      <div className="km-container km-hero-content">
        <div className="km-breadcrumb"><Link to="/holidayhome">Goimomi Holidays</Link><span>/</span><span>Kashmir</span></div>
        <div className="km-eyebrow km-light"><span /> YOUR LITTLE ESCAPE TO PARADISE</div>
        <h1 id="km-title">Some places stay<br />with you. <em>Kashmir.</em></h1>
        <p>Quiet lakes. Snow-kissed peaks. A little more wonder.<br className="km-desktop-break" /> Five unforgettable days in the heart of the Himalayas.</p>
        <div className="km-destinations"><MapPin size={16} aria-hidden="true" /> Srinagar <i>·</i> Sonmarg <i>·</i> Gulmarg <i>·</i> Pahalgam</div>
        <div className="km-hero-actions"><a className="km-button km-button-gold" href="#packages">Find your Kashmir escape <ArrowRight size={18} /></a><a className="km-hero-link" href="#itinerary">Explore the itinerary <ArrowDown size={16} /></a></div>
        <div className="km-hero-bottom"><span><CalendarDays size={16} /> 4 nights / 5 days</span><span>Packages from <strong>₹6,499</strong> <small>/ person</small></span></div>
      </div>
      <div className="km-image-caption"><MapPin size={13} /> Inspired by Dal Lake, Srinagar</div>
    </section>

    <div className="km-benefits"><div className="km-container">
      {[[Hotel, 'A stay for every style', 'Budget to 4-star premium'], [Utensils, 'Meals taken care of', 'Breakfast & dinner daily'], [Compass, 'Four iconic destinations', 'One beautiful journey'], [Headphones, 'A team by your side', 'On-call trip assistance']].map(([Icon, title, subtitle]) => <div key={title}><Icon size={25} strokeWidth={1.4} /><span><strong>{title}</strong><small>{subtitle}</small></span></div>)}
    </div></div>

    <nav className="km-section-nav" aria-label="Kashmir page sections"><div className="km-container">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}<a href="#enquire" className="km-nav-cta">Plan my trip <ArrowRight size={15} /></a></div></nav>

    <section id="packages" className="km-section km-container">
      <div className="km-section-heading"><div><span className="km-eyebrow">ONE DESTINATION. YOUR WAY TO EXPLORE.</span><h2>Your Kashmir, <em>your kind of holiday.</em></h2></div><p>Share the journey with fellow travellers, or enjoy the freedom of your own private escape.</p></div>
      <div className="km-package-grid">
        <article className="km-package km-budget"><div className="km-package-top"><span className="km-icon-box"><Users size={24} /></span><span className="km-badge"><Sparkles size={13} /> BEST VALUE</span></div><span className="km-eyebrow">GOOD COMPANY. GREAT VALUE.</span><h3>Budget Package</h3><p>A beautiful Kashmir holiday, made accessible.</p><div className="km-price">₹6,499 <span>Per Person</span></div><div className="km-duration"><CalendarDays size={16} /> 4 nights / 5 days <span>·</span> Srinagar base</div><InclusionList items={['Budget hotel · Hotel Akar Inn or similar', 'Shared SIC sightseeing with fellow travellers', 'Breakfast + dinner every day', 'Sonmarg, Gulmarg, Pahalgam & local sights']} /><p className="km-transfer-note"><Plane size={16} /> Airport transfers excluded. Reach the hotel on your own.</p><a href="#enquire" className="km-button km-button-green" onClick={() => choosePackage('Budget')}>Enquire about Budget <ArrowRight size={17} /></a></article>
        <article className="km-package km-private"><div className="km-package-top"><span className="km-icon-box"><CarFront size={24} /></span><span className="km-badge km-badge-outline">YOUR CAB. YOUR PACE.</span></div><span className="km-eyebrow">A LITTLE MORE FREEDOM.</span><h3>Private Leisure Package</h3><p>More flexibility. More comfort. All your own.</p><div className="km-price">₹9,034 <span>Onwards / Person · Twin Sharing</span></div><div className="km-duration"><CalendarDays size={16} /> 4 nights / 5 days <span>·</span> Srinagar base</div><InclusionList items={['Your choice of six 3-star & 4-star hotel categories', 'Private vehicle · sightseeing on your timings', 'Breakfast + dinner every day', 'Driver, fuel, tolls & parking included']} /><p className="km-transfer-note"><Plane size={16} /> Airport pickup & drop included.</p><a href="#rates" className="km-button km-button-outline">Explore private trip rates <ArrowRight size={17} /></a><small className="km-rate-basis">From price: 03★ Basic · Tempo Traveller · minimum 12 guests.</small></article>
      </div>
    </section>

    <section id="itinerary" className="km-section km-itinerary-section"><div className="km-container">
      <div className="km-section-heading"><div><span className="km-eyebrow">FIVE DAYS. SO MANY STORIES.</span><h2>A journey worth <em>slowing down for.</em></h2></div><p>Unpack once in Srinagar. Wake up to a new adventure every day.</p></div>
      <div className="km-itinerary-grid"><div className="km-journey-photo"><img src={valleyImage} alt="Kashmir-inspired alpine valley with pine forests, mountain peaks and the Lidder river" loading="lazy" width="1672" height="941" /><div><span className="km-eyebrow km-light">A BREATH OF FRESH AIR</span><h3>Take the road<br /><em>to somewhere beautiful.</em></h3><p><MapPin size={15} /> Inspired by Pahalgam, Kashmir</p></div></div>
        <div className="km-days">{itinerary.map((day, index) => <details key={day.place + index} className="km-day" open={index === 0 ? true : undefined}><summary><span className="km-day-number">DAY <strong>{String(index + 1).padStart(2, '0')}</strong></span><span className="km-day-heading"><small>{day.place}</small><h3>{day.title}</h3></span><ChevronDown size={19} className="km-chevron" /></summary><div className="km-day-content"><span className="km-day-tag">{day.tag}</span><p>{day.description}</p><div className="km-tags">{day.highlights.map(item => <span key={item}>{item}</span>)}</div></div></details>)}<p className="km-fine-print">Gondola tickets, pony rides, union cabs, entry fees and optional activities are extra. Shikara arrangements and charges will be confirmed in your quote. Activities depend on weather and local availability.</p></div>
      </div>
    </div></section>

    <section id="hotels" className="km-section km-container">
      <div className="km-section-heading"><div><span className="km-eyebrow">REST WELL. EXPLORE MORE.</span><h2>A comfortable stay, <em>your way.</em></h2></div><p>Four nights in Srinagar. Choose the comfort that feels right for your private holiday.</p></div>
      <div className="km-hotel-toolbar"><span><MapPin size={17} /> Srinagar <i>·</i> Private Leisure accommodation</span><div className="km-toggle" role="group" aria-label="Hotel star rating">{['03', '04'].map(stars => <button key={stars} type="button" aria-pressed={hotelStars === stars} className={hotelStars === stars ? 'selected' : ''} onClick={() => setHotelStars(stars)}>{Number(stars)}-star stays</button>)}</div></div>
      <div className="km-hotel-grid">{hotelCategories.filter(category => category.label.startsWith(hotelStars)).map((category, index) => <article className="km-hotel-card" key={category.label}><div className="km-hotel-card-top"><Hotel size={28} strokeWidth={1.3} /><span>{hotelStars === '03' ? '★★★' : '★★★★'}</span></div><small>THE {['ESSENTIAL', 'COMFORT', 'ELEVATED'][index]} STAY</small><h3>{category.label.slice(4)}</h3><p>{category.hotels[0]}<span>or {category.hotels[1]}</span></p><div className="km-hotel-bottom">Or a similar property <span><Utensils size={14} /> Breakfast + dinner</span></div></article>)}</div>
      <p className="km-fine-print">Listed hotels or similar, subject to availability. Budget accommodation is Hotel Akar Inn or similar and is separate from the private hotel categories above.</p>
    </section>

    <section id="rates" className="km-section km-rates-section"><div className="km-container">
      <div className="km-section-heading"><div><span className="km-eyebrow">A LITTLE PLANNING. A LOT TO LOOK FORWARD TO.</span><h2>Find your <em>perfect fit.</em></h2></div><p>Choose your vehicle, group size and hotel category to see your private package rate.</p></div>
      <div className="km-rate-builder"><div className="km-rate-fields"><label htmlFor="km-vehicle">Your vehicle & group size<select id="km-vehicle" value={vehicleIndex} onChange={event => setVehicleIndex(Number(event.target.value))}>{privateRates.map((rate, index) => <option key={`${rate.vehicle}-${rate.pax}`} value={index}>{rate.vehicle} · min. {rate.pax} guests</option>)}</select></label><label htmlFor="km-category">Your hotel category<select id="km-category" value={categoryIndex} onChange={event => setCategoryIndex(Number(event.target.value))}>{hotelCategories.map((category, index) => <option key={category.label} value={index}>{category.label}</option>)}</select></label><p><ShieldCheck size={16} /> 4 nights · breakfast & dinner · private cab · airport transfers</p></div><div className="km-rate-result"><span>YOUR PRIVATE KASHMIR ESCAPE</span><strong aria-live="polite" aria-atomic="true">{formatRupees(price)}</strong><p>Per Person · Twin Sharing · Min. {selectedRate.pax} Guests</p><a href="#enquire" className="km-button km-button-gold" onClick={() => choosePackage('Private Leisure')}>Enquire for this package <ArrowRight size={17} /></a></div></div>
      <details className="km-rate-details"><summary>Compare all private package rates <span>12 vehicle & group options <ChevronDown size={18} /></span></summary><RateTable rows={privateRates} /></details>
      <details className="km-rate-details"><summary>Extra bed & child supplements <span>View all 6 hotel categories <ChevronDown size={18} /></span></summary><RateTable rows={supplements} supplement /></details>
      <p className="km-fine-print">All private rates are per person on twin sharing, based on the stated minimum group size. Supplements are additional. Final availability and applicable charges will be confirmed by our team.</p>
    </div></section>

    <section id="inclusions" className="km-section km-container">
      <div className="km-section-heading"><div><span className="km-eyebrow">THE DETAILS, ALL IN ONE PLACE.</span><h2>Know exactly <em>what’s included.</em></h2></div></div>
      <div className="km-inclusions-grid"><article><span className="km-eyebrow">BUDGET · ₹6,499 / PERSON</span><h3>All the essentials</h3><InclusionList items={budgetInclusions} /><p className="km-fine-print">SIC means seat-in-coach: sightseeing is shared with other travellers. Airport pickup and drop are excluded; guests reach the hotel independently.</p></article><article><span className="km-eyebrow">PRIVATE LEISURE · FROM ₹9,034 / PERSON</span><h3>A holiday on your terms</h3><InclusionList items={privateInclusions} /></article></div>
      <div className="km-exclusions"><h3>What’s not included</h3><ul>{exclusions.map(item => <li key={item}><X size={15} aria-hidden="true" /><span>{item}</span></li>)}</ul></div>
    </section>

    <section id="enquire" className="km-enquire-section"><div className="km-container km-enquire-grid"><div className="km-enquire-copy"><span className="km-eyebrow km-light">YOUR NEXT CHAPTER STARTS HERE.</span><h2>Let’s make<br /><em>Kashmir happen.</em></h2><p>Tell us a little about your trip. Our travel team will help with availability, the right stay and a personalised quote.</p><div className="km-enquire-contact"><Phone size={20} /><div><small>Prefer a conversation?</small><a href="tel:+918110082222">+91 8110082222</a></div></div><span className="km-enquire-note"><Mountain size={20} /> Thoughtfully planned. Beautifully remembered.</span></div>
      <div className="km-form-card holiday-enquiry-card">{status === 'success' ? <div className="km-success" role="status"><ShieldCheck size={45} /><h3>Your Kashmir enquiry is in!</h3><p>Thank you, {form.name}. Our travel team will contact you about your {selectedPackage} package. Your booking is confirmed only after availability and the final quote are agreed.</p><button className="km-button km-button-green" type="button" onClick={() => setStatus('idle')}>Plan another enquiry</button></div> : <form onSubmit={submitEnquiry}>
        <h3>A little closer to your getaway</h3><p className="km-form-intro">Request a quote · no payment required</p>
        <fieldset disabled={status === 'submitting'}><label htmlFor="km-package">I’m interested in<select id="km-package" value={selectedPackage} onChange={event => choosePackage(event.target.value)}><option>Budget</option><option>Private Leisure</option></select></label>
        {selectedPackage === 'Private Leisure' && <p className="km-form-selection">{selectedCategory.label} · {selectedRate.vehicle} · rate basis: minimum {selectedRate.pax} guests at {formatRupees(price)} per person. <a href="#rates">Change options</a></p>}
        <div className="km-form-row"><label htmlFor="km-name">Full name<input id="km-name" name="name" autoComplete="name" placeholder="Your name" value={form.name} onChange={updateForm} maxLength={100} required /></label><label htmlFor="km-phone">Phone number<input id="km-phone" type="tel" name="phone" autoComplete="tel" placeholder="+91" value={form.phone} onChange={updateForm} maxLength={20} required /></label></div>
        <div className="km-form-row"><label htmlFor="km-email">Email address<input id="km-email" type="email" name="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={updateForm} maxLength={254} required /></label><label htmlFor="km-date">Travel date<input id="km-date" type="date" name="date" min={minDate} value={form.date} onChange={updateForm} required /></label></div>
        <div className="km-form-row"><label htmlFor="km-adults">Adults<input id="km-adults" type="number" name="adults" min="1" max="100" value={form.adults} onChange={updateForm} required /></label><label htmlFor="km-rooms">Rooms<input id="km-rooms" type="number" name="rooms" min="1" max="50" value={form.rooms} onChange={updateForm} required /></label></div>
        <label htmlFor="km-message">Anything else? <span className="km-optional">(optional)</span><textarea id="km-message" name="message" rows={2} value={form.message} onChange={updateForm} maxLength={2000} placeholder="Children & ages, special occasions, room preferences…" /></label>
        {error && <p className="km-form-error" role="alert">{error}</p>}
        <button className="km-button km-button-green" type="submit">{status === 'submitting' ? 'Sending your enquiry…' : 'Help me plan my Kashmir trip'}<ArrowRight size={17} /></button><p className="km-form-privacy">By submitting, you agree to be contacted about your trip. <Link to="/privacy-policy">Privacy Policy</Link></p></fieldset>
      </form>}</div>
    </div></section>
    <TrendingDomesticDestinations />
    <div className="km-closing"><Mountain size={23} strokeWidth={1.4} /><span>Comfortable stays <i>·</i> Beautiful places <i>·</i> Memories that stay</span></div>
    <div className="km-mobile-cta"><span>5 days in Kashmir<strong>From ₹6,499 <small>/ person</small></strong></span><a className="km-button km-button-green" href="#enquire">Enquire now <ArrowRight size={16} /></a></div>
  </div>;
}
