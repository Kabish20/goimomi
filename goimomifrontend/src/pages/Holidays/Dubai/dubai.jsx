import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CarFront, Check, ChevronDown, Coffee, Hotel, MapPin, Phone, ShieldCheck, X } from 'lucide-react';
import api from '../../../api';
import usePageSEO from '../../../hooks/usePageSEO';
import TrendingInternationalDestinations from '../../../components/holidays/TrendingInternationalDestinations';
import { days, exclusions, inclusions, rupees, seo, trip } from './dubaiData';
import '../TrendingDestinations/trendingDestinations.css';
import '../Bali/bali.css';
import './dubai.css';

export default function Dubai() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const today = new Date();
  const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const minDate = todayDate > trip.validFrom ? todayDate : trip.validFrom;
  const expired = minDate > trip.validUntil;
  usePageSEO(seo.title, seo.description, trip.image, seo.keywords);
  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submitEnquiry = async event => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!form.name.trim() || !/^[+0-9 ()-]+$/.test(form.phone) || form.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter your name and a phone number with at least 10 digits.'); return;
    }
    if (expired || !form.date || form.date < minDate || form.date > trip.validUntil) {
      setError(`Please choose an available date within ${trip.validity}.`); return;
    }
    setStatus('submitting'); setError('');
    try {
      await api.post('/api/holiday-form/', {
        package_type: trip.name, start_city: 'Dubai International Airport', nationality: 'Not specified',
        travel_date: form.date, rooms: 1, adults: trip.adults, children: 0, star_rating: '3', holiday_type: 'International',
        budget: String(trip.pricePerAdult * trip.adults), full_name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), nights: trip.nights,
        cities: [{ destination: 'Dubai', nights: trip.nights }], room_details: [{ adults: trip.adults, children: 0, child_ages: [] }],
        room_type: trip.room, meal_plan: `${trip.mealPlan}; Dubai Creek Cruise with Dinner`,
        transfer_details: 'Private arrival and departure airport transfers; Half-Day Dubai City Tour and Deluxe Desert Safari on SIC basis',
        message: [
          `Source: Dubai package page. ${trip.name}. ${trip.hotel}. ${trip.duration}. Twin sharing for 2 adults; minimum 2 persons.`,
          `${rupees(trip.pricePerAdult)} per person. Total for 2 adults: ${rupees(trip.pricePerAdult * trip.adults)}. Currency: INR.`,
          `Stay validity: ${trip.validity}. Full stay and final availability to be confirmed. Welcome kit and UAE VAT included. Tourism Dirham Fee payable directly at the hotel.`,
          form.message.trim(),
        ].filter(Boolean).join('\n'),
      });
      setStatus('success');
    } catch { setError('We could not send your enquiry. Please try again or call +91 8110082222.'); setStatus('error'); }
  };

  return <div className="trending-page bali-page dubai-page">
    <section className="td-hero bl-hero" aria-labelledby="db-title">
      <img className="td-hero-image" src={trip.image} alt={trip.imageAlt} width="1774" height="887" fetchPriority="high" />
      <div className="td-hero-overlay" />
      <div className="td-container td-hero-content">
        <div className="td-breadcrumb"><Link to="/trendinginternationaldestination">International Holidays</Link><span>/</span><span>Dubai</span></div>
        <span className="td-eyebrow">3★ DUBAI HOLIDAY PACKAGE · MINIMUM 2 PERSONS</span>
        <h1 id="db-title">Dubai after the sun.<br /><em>A city full of stories.</em></h1>
        <p>Five days of city discoveries, a Dubai Creek dinner cruise and desert landscapes, with four nights at Citymax Bur Dubai.</p>
        <div className="bl-hero-actions"><a href="#db-itinerary" className="td-button td-button-gold">Explore your journey <ArrowRight size={17} /></a><span>Starting from <strong>{rupees(trip.pricePerAdult)}</strong><small>per person · twin sharing</small></span></div>
        <div className="td-hero-caption"><MapPin size={13} />Dubai-inspired skyline & dhow cruise</div>
      </div>
    </section>
    <div className="td-container bl-facts">{[[Hotel, trip.duration, '3★ Citymax Bur Dubai'], [CarFront, 'Private airport transfers', 'City tour & safari on SIC basis'], [Coffee, 'Daily breakfast', 'Creek cruise dinner included'], [CalendarDays, 'Stay validity', trip.validity]].map(([Icon, title, detail]) => <div key={title}><Icon size={24} /><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
    <nav className="bl-nav" aria-label="Dubai package sections"><div className="td-container">{[['db-overview', 'Overview'], ['db-itinerary', 'Itinerary'], ['db-stay', 'Stay & price'], ['db-inclusions', 'Inclusions & exclusions'], ['db-enquire', 'Enquire now']].map(([id, title]) => <a href={`#${id}`} key={id}>{title}</a>)}</div></nav>

    <section id="db-overview" className="td-container td-section bl-overview">
      <div><span className="td-eyebrow">CITY LIGHTS & DESERT LANDSCAPES</span><h2>Discover Dubai, <em>at your pace.</em></h2></div>
      <div><p>Enjoy a 4-night / 5-day Dubai holiday with a half-day city tour, an evening Creek cruise with dinner, a deluxe desert safari and a full leisure day. Stay on a twin-sharing basis at Citymax Bur Dubai with daily breakfast and private airport transfers.</p><div className="bl-route"><MapPin size={18} />Arrival → City tour & Creek cruise → Desert safari → Leisure → Departure</div></div>
    </section>

    <section id="db-itinerary" className="bl-soft"><div className="td-container td-section">
      <div className="td-section-heading"><div><span className="td-eyebrow">4 NIGHTS / 5 DAYS</span><h2>Your Dubai story, <em>day by day.</em></h2></div></div>
      <div className="bl-itinerary"><aside className="bl-journey-photo"><img src={trip.image} alt={trip.imageAlt} loading="lazy" /><div><MapPin size={28} /><h3>An evening on the water.</h3><p>Dubai Creek Cruise with Dinner · Day 2</p></div></aside>
        <div className="bl-days">{days.map((day, index) => <details className="bl-day" key={day.title} open={index === 0}><summary><span className="bl-day-number">DAY<strong>{String(index + 1).padStart(2, '0')}</strong></span><span><small>{day.timing}</small><h3>{day.title}</h3></span><ChevronDown size={18} /></summary><div className="bl-day-body"><p>{day.description}</p><ul>{day.highlights.map(item => <li key={item}><Check size={14} />{item}</li>)}</ul><p className="bl-day-note">{day.note}</p></div></details>)}</div>
      </div>
    </div></section>

    <section id="db-stay" className="td-container td-section">
      <div className="td-section-heading"><div><span className="td-eyebrow">YOUR DUBAI STAY</span><h2>Stay comfortably. <em>Explore freely.</em></h2></div></div>
      <div className="bl-stay"><div><Hotel size={30} /><h3>{trip.hotel}</h3><p>3★ hotel · {trip.nights} nights · {trip.room}</p><ul><li><Check size={16} />Daily breakfast</li><li><Check size={16} />Welcome kit & UAE VAT included</li></ul></div><div className="bl-price"><span>3★ DUBAI HOLIDAY PACKAGE</span><strong>{rupees(trip.pricePerAdult)}</strong><small>per person · based on twin sharing</small><a href="#db-enquire" className="td-button td-button-green">Enquire about this stay <ArrowRight size={16} /></a></div></div>
    </section>

    <section id="db-inclusions" className="bl-soft"><div className="td-container td-section"><span className="td-eyebrow">KNOW YOUR PACKAGE</span><h2>What’s included, <em>and what’s extra.</em></h2><div className="bl-inclusions"><article><h3>Package inclusions</h3><ul>{inclusions.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul></article><article><h3>Package exclusions</h3><ul>{exclusions.map(item => <li key={item}><X size={15} />{item}</li>)}</ul></article></div></div></section>

    <section id="db-enquire" className="bl-enquire"><div className="td-container bl-enquire-grid">
      <div><span className="td-eyebrow">LET’S TAKE YOU TO DUBAI</span><h2>Your next getaway.<br /><em>Five days to remember.</em></h2><p>Share your preferred travel date and flight details. Our team will confirm the package and availability for your stay.</p><div className="bl-enquiry-summary"><strong>{trip.hotel} · 3★</strong><span>{trip.duration} · {trip.room} · minimum 2 persons</span><p>{rupees(trip.pricePerAdult)} <small>per person</small></p><span>Stay validity: {trip.validity}</span></div><a className="bl-phone" href="tel:+918110082222"><Phone size={20} />+91 8110082222</a></div>
      <div className="bl-form-card holiday-enquiry-card">{status === 'success' ? <div className="bl-success" role="status"><ShieldCheck size={42} /><h3>Your Dubai enquiry is in.</h3><p>Our team will contact you about your dates and package availability.</p><button type="button" className="td-button td-button-green" onClick={() => setStatus('idle')}>Make another enquiry</button></div> : <form onSubmit={submitEnquiry}>
        <h3>Plan your Dubai holiday</h3><p>Enquiry for 2 adults · no payment required</p>
        {expired && <p role="status" className="bl-error">This package’s stay validity has ended. Call us for current Dubai packages.</p>}
        <fieldset disabled={status === 'submitting' || expired}>
          <div className="bl-form-row"><label htmlFor="db-name">Full name<input id="db-name" name="name" value={form.name} onChange={updateForm} autoComplete="name" maxLength={100} required /></label><label htmlFor="db-phone">Phone number<input id="db-phone" name="phone" value={form.phone} onChange={updateForm} type="tel" autoComplete="tel" maxLength={20} required /></label></div>
          <label htmlFor="db-email">Email address<input id="db-email" name="email" value={form.email} onChange={updateForm} type="email" autoComplete="email" required /></label>
          <label htmlFor="db-date">Preferred travel date<input id="db-date" name="date" value={form.date} onChange={updateForm} type="date" min={minDate} max={trip.validUntil} required /></label>
          <label htmlFor="db-message">Anything else? <span>(optional)</span><textarea id="db-message" name="message" value={form.message} onChange={updateForm} rows={3} maxLength={2000} placeholder="Flight timings, additional travellers or questions" /></label>
          {error && <p role="alert" className="bl-error">{error}</p>}
          <button className="td-button td-button-green" type="submit">{status === 'submitting' ? 'Sending your enquiry…' : 'Enquire about Dubai'}<ArrowRight size={16} /></button>
          <p className="bl-privacy">By submitting, you agree to be contacted about your trip. <Link to="/privacy-policy">Privacy policy</Link></p>
        </fieldset>
      </form>}</div>
    </div></section>
    <TrendingInternationalDestinations />
  </div>;
}
