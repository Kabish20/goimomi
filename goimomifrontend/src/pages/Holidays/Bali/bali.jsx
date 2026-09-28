import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CarFront, Check, ChevronDown, Coffee, Hotel, MapPin, Phone, ShieldCheck, X } from 'lucide-react';
import api from '../../../api';
import usePageSEO from '../../../hooks/usePageSEO';
import TrendingInternationalDestinations from '../../../components/holidays/TrendingInternationalDestinations';
import { days, exclusions, inclusions, peakPeriods, rupees, trip } from './baliData';
import '../TrendingDestinations/trendingDestinations.css';
import './bali.css';

export default function Bali() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  usePageSEO('Bali Special Package | 3 Nights / 4 Days from ₹17,300 | Goimomi', 'Low Season 2026 Bali private tour without Bali Swing. Stay 3 nights at BRTIS HOTEL with breakfast, private transfers, Uluwatu, Melasti Beach, Ubud, Tegenungan Waterfall and Kintamani.', trip.image, 'Bali package, Low Season 2026, Ubud, Kintamani, Tegenungan Waterfall, Melasti Beach, Uluwatu, BRTIS HOTEL, without Bali Swing');
  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submitEnquiry = async event => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!form.name.trim() || !/^[+0-9 ()-]+$/.test(form.phone) || form.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter your name and a phone number with at least 10 digits.'); return;
    }
    if (!form.date || form.date < minDate) { setError('Please select today or a future travel date.'); return; }
    setStatus('submitting'); setError('');
    try {
      await api.post('/api/holiday-form/', {
        package_type: trip.name, start_city: 'Bali · Ngurah Rai International Airport', nationality: 'Not specified',
        travel_date: form.date, rooms: 1, adults: 2, children: 0, star_rating: 'Unrated', holiday_type: 'International',
        budget: String(trip.pricePerAdult * trip.adults), full_name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), nights: trip.nights,
        cities: [{ destination: 'Bali', nights: trip.nights }], room_details: [{ adults: 2, children: 0, child_ages: [] }],
        room_type: trip.room, meal_plan: 'Daily breakfast at the hotel',
        transfer_details: 'Private air-conditioned vehicle; airport arrival & departure transfers; English-speaking guide / driver',
        message: [`Source: Bali package page. ${trip.hotel}. ${trip.duration}, twin sharing for 2 adults. ${trip.season}. ${trip.variant}.`, `${rupees(trip.pricePerAdult)} per person based on twin sharing. Total for two adults: ${rupees(trip.pricePerAdult * 2)}.`, `Low-season rate excludes: ${peakPeriods.join('; ')}. Requested dates, hotel and final quotation subject to confirmation. Water sports and beach club expenses are not included.`, form.message.trim()].filter(Boolean).join('\n'),
      });
      setStatus('success');
    } catch { setError('We could not send your enquiry. Please try again or call +91 8110082222.'); setStatus('error'); }
  };

  return <div className="trending-page bali-page">
    <section className="td-hero bl-hero" aria-labelledby="bl-title">
      <img className="td-hero-image" src={trip.image} alt="Traditional Balinese temple beside a lake at sunset" fetchPriority="high" />
      <div className="td-hero-overlay" />
      <div className="td-container td-hero-content">
        <div className="td-breadcrumb"><Link to="/holidays?category=International">International Holidays</Link><span>/</span><span>Bali</span></div>
        <span className="td-eyebrow">WITHOUT BALI SWING · LOW SEASON PACKAGE 2026</span>
        <h1 id="bl-title">Bali Special Package.<br /><em>3 nights / 4 days.</em></h1>
        <p>Discover Bali’s beaches, culture and breathtaking landscapes, from Uluwatu and Melasti Beach to Ubud, Tegenungan Waterfall and Mount Batur, with private tours and transfers.</p>
        <div className="bl-hero-actions"><a href="#bl-itinerary" className="td-button td-button-gold">Explore your journey <ArrowRight size={17} /></a><span>Starting from <strong>{rupees(trip.pricePerAdult)}</strong><small>per person · twin sharing</small></span></div>
        <div className="td-hero-caption"><MapPin size={13} />Bali, Indonesia</div>
      </div>
    </section>
    <div className="td-container bl-facts">{[[Hotel, '3 nights / 4 days', trip.hotel], [CarFront, 'Private AC vehicle', 'Sightseeing & airport transfers'], [Coffee, 'Daily breakfast', 'At the hotel'], [CalendarDays, trip.season, trip.variant]].map(([Icon, title, detail]) => <div key={title}><Icon size={24} /><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
    <nav className="bl-nav" aria-label="Bali package sections"><div className="td-container">{[['bl-overview', 'Overview'], ['bl-itinerary', 'Itinerary'], ['bl-stay', 'Stay & price'], ['bl-inclusions', 'Inclusions & exclusions'], ['bl-enquire', 'Enquire now']].map(([id, title]) => <a href={`#${id}`} key={id}>{title}</a>)}</div></nav>

    <section id="bl-overview" className="td-container td-section bl-overview"><div><span className="td-eyebrow">FROM ULUWATU’S CLIFFS TO UBUD’S GREENS</span><h2>Every day, <em>a different Bali.</em></h2></div><div><p>Experience the beauty, culture, beaches and breathtaking landscapes of Bali on a private 3-night / 4-day holiday. From dramatic Uluwatu cliffs and Melasti Beach to Ubud’s cultural attractions, Tegenungan Waterfall and the scenic Mount Batur region, discover a wonderful introduction to the island.</p><div className="bl-route"><MapPin size={18} />Arrival → Tanjung Benoa, Melasti & Uluwatu → Ubud & Kintamani → Departure</div></div></section>
    <section id="bl-itinerary" className="bl-soft"><div className="td-container td-section"><div className="td-section-heading"><div><span className="td-eyebrow">3 NIGHTS / 4 DAYS</span><h2>Your island story, <em>day by day.</em></h2></div></div><div className="bl-itinerary"><aside className="bl-journey-photo"><img src={trip.image} alt="Balinese temple architecture reflected in a lake at sunset" loading="lazy" /><div><MapPin size={28} /><h3>The beauty of Bali.</h3><p>Island scenery · Destination inspiration</p></div></aside><div className="bl-days">{days.map((day, index) => <details className="bl-day" key={day.title} open={index === 0}><summary><span className="bl-day-number">DAY<strong>{String(index + 1).padStart(2, '0')}</strong></span><span><small>{day.timing}</small><h3>{day.title}</h3></span><ChevronDown size={18} /></summary><div className="bl-day-body"><p>{day.description}</p><ul>{day.highlights.map(item => <li key={item}><Check size={14} />{item}</li>)}</ul><p className="bl-day-note">{day.note}</p></div></details>)}</div></div></div></section>

    <section id="bl-stay" className="td-container td-section"><div className="td-section-heading"><div><span className="td-eyebrow">YOUR HOME ON THE ISLAND</span><h2>Settle in. <em>Set out.</em></h2></div><p>Three nights on a twin-sharing basis, with time to discover Bali together.</p></div><div className="bl-stay"><div><Hotel size={30} /><h3>{trip.hotel}</h3><p>{trip.room} · {trip.nights} nights · 2 adults</p><ul><li><Check size={16} />Daily breakfast at the hotel</li><li><Check size={16} />Private sightseeing & airport transfers</li><li><Check size={16} />Standard hotel check-in and check-out timings apply</li></ul><p className="bl-fine">Rooms are subject to availability at the time of booking. Early check-in and late check-out depend on availability and may attract additional charges.</p></div><div className="bl-price"><span>BALI SPECIAL PACKAGE · WITHOUT BALI SWING</span><strong>{rupees(trip.pricePerAdult)}</strong><small>per person · based on twin sharing</small><p>{rupees(trip.pricePerAdult * 2)} for 2 adults</p><a href="#bl-enquire" className="td-button td-button-green">Enquire about this stay <ArrowRight size={16} /></a></div></div></section>

    <section id="bl-inclusions" className="bl-soft"><div className="td-container td-section"><span className="td-eyebrow">KNOW YOUR PACKAGE</span><h2>The essentials, <em>already arranged.</em></h2><div className="bl-inclusions"><article><h3>Package inclusions</h3><ul>{inclusions.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul></article><article><h3>Package exclusions</h3><ul>{exclusions.map(item => <li key={item}><X size={15} />{item}</li>)}</ul></article></div></div></section>


    <section id="bl-enquire" className="bl-enquire"><div className="td-container bl-enquire-grid"><div><span className="td-eyebrow">LET’S TAKE YOU TO BALI</span><h2>Your next chapter.<br /><em>An island away.</em></h2><p>Share your preferred dates and flight details. Our team will help confirm your stay and plan your Bali escape.</p><div className="bl-enquiry-summary"><strong>{trip.hotel}</strong><span>{trip.duration} · {trip.room} · 2 adults</span><p>{rupees(trip.pricePerAdult)} <small>per person · twin sharing</small></p><span>Total for 2 adults: {rupees(trip.pricePerAdult * 2)}</span></div><a className="bl-phone" href="tel:+918110082222"><Phone size={20} />+91 8110082222</a></div><div className="bl-form-card holiday-enquiry-card">{status === 'success' ? <div className="bl-success" role="status"><ShieldCheck size={42} /><h3>Your Bali enquiry is in.</h3><p>Our team will contact you about your dates and package availability.</p><button type="button" className="td-button td-button-green" onClick={() => setStatus('idle')}>Make another enquiry</button></div> : <form onSubmit={submitEnquiry}><h3>Plan your Bali holiday</h3><p>Enquiry only · no payment required</p><fieldset disabled={status === 'submitting'}><div className="bl-form-row"><label htmlFor="bl-name">Full name<input id="bl-name" name="name" value={form.name} onChange={updateForm} autoComplete="name" maxLength={100} required /></label><label htmlFor="bl-phone">Phone number<input id="bl-phone" name="phone" value={form.phone} onChange={updateForm} type="tel" autoComplete="tel" maxLength={20} required /></label></div><label htmlFor="bl-email">Email address<input id="bl-email" name="email" value={form.email} onChange={updateForm} type="email" autoComplete="email" required /></label><label htmlFor="bl-date">Preferred travel date<input id="bl-date" name="date" value={form.date} onChange={updateForm} type="date" min={minDate} required /></label><label htmlFor="bl-message">Anything else? <span>(optional)</span><textarea id="bl-message" name="message" value={form.message} onChange={updateForm} rows={3} maxLength={2000} placeholder="Flight timings, room preferences or questions" /></label>{error && <p role="alert" className="bl-error">{error}</p>}<button className="td-button td-button-green" type="submit">{status === 'submitting' ? 'Sending your enquiry…' : 'Enquire about Bali'}<ArrowRight size={16} /></button><p className="bl-privacy">By submitting, you agree to be contacted about your trip. <Link to="/privacy-policy">Privacy policy</Link></p></fieldset></form>}</div></div></section>
    <TrendingInternationalDestinations />
  </div>;
}
