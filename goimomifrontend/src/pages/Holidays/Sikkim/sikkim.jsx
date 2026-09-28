import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CarFront, Check, ChevronDown, Hotel, MapPin, Phone, ShieldCheck, Users, Utensils, X } from 'lucide-react';
import api from '../../../api';
import usePageSEO from '../../../hooks/usePageSEO';
import TrendingDomesticDestinations from '../../../components/holidays/TrendingDomesticDestinations';
import { days, exclusions, inclusions, information, packages, rupees, stops, totalFor, trip } from './sikkimData';
import '../TrendingDestinations/trendingDestinations.css';
import './sikkim.css';

const hero = '/images/north-east/dawki-hero.webp';

export default function Sikkim() {
  const [packageIndex, setPackageIndex] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const selected = packages[packageIndex];
  usePageSEO(
    'North East — Assam & Meghalaya | 6 Nights / 7 Days | Goimomi',
    'Explore Guwahati, Kaziranga, Shillong and Cherrapunji, 8–14 November 2026. Three hotel options from ₹40,000 per adult on twin sharing, for 4 adults in 2 rooms.',
    'Explore Guwahati, Kaziranga, Shillong and Cherrapunji. Three hotel options from ₹40,000 per adult on twin sharing, for 4 adults in 2 rooms.',
    hero,
    'North East holiday, Assam Meghalaya package, Guwahati, Kaziranga, Shillong, Cherrapunji, Dawki, November 2026',
    'North East holiday, Assam Meghalaya package, Guwahati, Kaziranga, Shillong, Cherrapunji, Dawki',
  );

  const choosePackage = index => {
    if (status === 'submitting') return;
    setPackageIndex(index);
    setStatus('idle');
    setError('');
  };
  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submitEnquiry = async event => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!form.name.trim() || !/^[+0-9 ()-]+$/.test(form.phone) || form.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter your name and a valid phone number with at least 10 digits.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      await api.post('/api/holiday-form/', {
        package_type: `North East - ${selected.name} - 6N / 7D`,
        start_city: 'Guwahati', nationality: 'Not specified', travel_date: trip.startDate,
        rooms: trip.rooms, adults: trip.adults, children: 0, star_rating: 'Unrated', holiday_type: 'Domestic',
        budget: String(totalFor(selected)), full_name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), nights: trip.nights,
        cities: stops.map(stop => ({ destination: stop.city, nights: stop.nights })),
        room_details: Array.from({ length: trip.rooms }, () => ({ adults: 2, children: 0, child_ages: [] })),
        room_type: 'Twin sharing; room categories as selected',
        meal_plan: 'Dinner and breakfast at listed hotels; travel-day meals to be confirmed',
        transfer_details: '1 Innova Crysta; scheduled sightseeing and transfers; final two days pending confirmation',
        message: [
          'Source: North East Assam & Meghalaya page (/sikkim). Enquiry only, subject to availability and final confirmation.',
          `Travel: ${trip.dates}. ${trip.adults} adults, ${trip.rooms} rooms, ${trip.nights} nights.`,
          `${selected.name}: INR ${selected.pricePerAdult} per adult on twin sharing. Total for 4 adults: INR ${totalFor(selected)}.`,
          ...selected.hotels.map((hotel, index) => `${stops[index].city}, ${stops[index].dates}: ${hotel.name} (${hotel.category}), 2 ${hotel.room}; dinner and breakfast.${hotel.note ? ` ${hotel.note}.` : ''}`),
          'Day 6 sightseeing and Day 7 departure pickup city await the corrected itinerary. Hotel schedule lists Cherrapunji for 12–14 November.',
          'Day 6 sightseeing and Day 7 departure pickup city await the corrected itinerary. Hotel schedule lists Cherrapunji for nights 5 and 6.',
          'Safari charges, entry tickets, permits where applicable and optional activities are extra. Travel-day meal coverage requires confirmation.',
          form.message.trim(),
        ].filter(Boolean).join('\n'),
      });
      setStatus('success');
    } catch {
      setStatus('error');
      setError('Your enquiry could not be sent. Please try again or call +91 8110082222.');
    }
  };

  return <div className="trending-page north-east-page">
    <section className="td-hero ne-hero" aria-labelledby="ne-title">
      <img className="td-hero-image" src={hero} alt="Meghalaya-inspired view of a wooden boat on a clear emerald river between forested hills" width="1536" height="1024" fetchPriority="high" />
      <div className="td-hero-overlay" />
      <div className="td-container td-hero-content">
        <div className="td-breadcrumb"><Link to="/">Home</Link><span>/</span><span>North East India</span></div>
        <span className="td-eyebrow">ASSAM & MEGHALAYA · ONE BEAUTIFUL JOURNEY</span>
        <h1 id="ne-title">Follow the river.<br /><em>Find your North East.</em></h1>
        <p>From Guwahati and Kaziranga to Shillong and Cherrapunji.<br />Seven days of green valleys, waterfall scenery and new discoveries.</p>
        <div className="ne-facts"><span><CalendarDays size={16} />{trip.dates}</span><span><Users size={16} />4 adults · 2 rooms</span><span><CarFront size={16} />{trip.vehicle}</span></div>
        <div className="ne-hero-actions"><a href="#ne-packages" className="td-button td-button-gold">Choose your stay <ArrowRight size={17} /></a><div>From <strong>{rupees(packages[0].pricePerAdult)}</strong><small>per adult · twin sharing</small></div></div>
        <div className="td-hero-caption"><MapPin size={13} />Inspired by Dawki, Meghalaya</div>
      </div>
    </section>

    <div className="td-container ne-snapshot">{[[Hotel, '6 nights / 7 days', '4 destinations, 2 rooms'], [Utensils, 'Breakfast & dinner', 'At the listed hotel stays'], [CarFront, 'Innova Crysta', 'As per scheduled itinerary'], [Users, 'Travel together', '4 adults on twin sharing']].map(([Icon, title, detail]) => <div key={title}><Icon size={24} strokeWidth={1.5} /><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
    <nav className="ne-nav" aria-label="North East package sections"><div className="td-container">{[['ne-overview', 'Overview'], ['ne-itinerary', 'Itinerary'], ['ne-packages', 'Hotels & prices'], ['ne-inclusions', 'Inclusions'], ['ne-info', 'Good to know']].map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}<a href="#ne-enquire" className="ne-nav-enquire-btn">Enquire now <ArrowRight size={14} /></a></div></nav>

    <section id="ne-overview" className="td-container td-section ne-overview">
      <div><span className="td-eyebrow">SIKKIM · ONE BEAUTIFUL JOURNEY</span><h2>A little adventure.<br /><em>A different pace.</em></h2></div>
      <div><p>Begin by the Brahmaputra in Guwahati, explore Kaziranga, and continue into Meghalaya’s hills. Discover Laitlum Canyons, Krang Suri Falls, Mawlynnong and the waters of Dawki before settling into Cherrapunji.</p><p>Choose from three accommodation options for the same four-adult journey, with two rooms and an Innova Crysta for the scheduled travel.</p></div>
      <div className="ne-route">{stops.map(stop => <div key={stop.city}><span>{stop.label}</span><strong>{stop.city}</strong><small>{stop.dates}</small></div>)}</div>
    </section>

    <section id="ne-itinerary" className="ne-soft"><div className="td-container td-section">
      <div className="td-section-heading"><div><span className="td-eyebrow">6 NIGHTS / 7 DAYS</span><h2>Your seven-day <em>North East journey.</em></h2></div><p>One Innova Crysta for the scheduled route. The final two days are awaiting the corrected programme.</p></div>
      <div className="ne-itinerary-grid"><aside className="ne-journey-photo"><img src={hero} alt="Meghalaya-inspired emerald river and forested hills" width="1536" height="1024" loading="lazy" /><div><span className="td-eyebrow">TAKE THE SCENIC ROUTE</span><h3>Clear waters.<br />Green horizons.</h3><p>Assam · Meghalaya</p></div></aside>
        <div className="ne-days">{days.map((day, index) => <details className="ne-day" key={day.title} open={index === 0 ? true : undefined}><summary><span className="ne-day-number">DAY<strong>{String(index + 1).padStart(2, '0')}</strong></span><span><h3>{day.title}</h3></span><ChevronDown className="ne-chevron" size={18} /></summary><div className="ne-day-body">{day.pending && <span className="ne-pending">Programme pending confirmation</span>}<p>{day.description}</p>{day.places.length > 0 && <ul className="ne-tags">{day.places.map(place => <li key={place}>{place}</li>)}</ul>}{day.note && <p className="ne-note">{day.note}</p>}{day.overnight && <div className="ne-overnight"><Hotel size={14} />Overnight: {day.overnight}</div>}</div></details>)}</div>
      </div>
    </div></section>

    <section id="ne-packages" className="td-container td-section">
      <div className="td-section-heading"><div><span className="td-eyebrow">THREE OPTIONS. YOUR KIND OF COMFORT.</span><h2>A stay for <em>every part of the journey.</em></h2></div><p>Prices are per adult on twin sharing, based on 4 adults in 2 rooms. Dinner and breakfast are specified at every listed stay.</p></div>
      <div className="ne-package-grid">{packages.map((option, index) => <article className={`ne-package ${packageIndex === index ? 'ne-selected' : ''}`} key={option.name}>
        <span className="td-eyebrow">OPTION {index + 1}</span><h3>{option.name}</h3><div className="ne-price">{rupees(option.pricePerAdult)}<small>per adult · twin sharing</small></div>
        <ul className="ne-hotels">{option.hotels.map((hotel, hotelIndex) => <li key={hotel.name}><span className="ne-hotel-stop">{stops[hotelIndex].city} · {stops[hotelIndex].label}</span><h4>{hotel.name}</h4><span>{stops[hotelIndex].dates} · {hotel.category}</span><span>2 {hotel.room} · 4 adults</span><span className="ne-hotel-meals"><Utensils size={12} />Dinner + breakfast{hotel.note ? ` · ${hotel.note}` : ''}</span></li>)}</ul>
        <button className={`td-button ${packageIndex === index ? 'td-button-green' : 'ne-outline'}`} type="button" aria-pressed={packageIndex === index} disabled={status === 'submitting'} onClick={() => choosePackage(index)}>{packageIndex === index ? <><Check size={16} />Selected package</> : <>Choose this package <ArrowRight size={16} /></>}</button>
      </article>)}</div>
      <div className="ne-selection" aria-live="polite"><span><strong>{selected.name}</strong> · {rupees(selected.pricePerAdult)} per adult · twin sharing</span><a href="#ne-enquire">Enquire for this package <ArrowRight size={16} /></a></div>
      <p className="ne-fine">Hotels and room categories follow the supplied quotation and are subject to availability. Final routing and travel-day meals require confirmation.</p>
    </section>

    <section id="ne-inclusions" className="ne-soft"><div className="td-container td-section"><span className="td-eyebrow">THE DETAILS THAT MATTER</span><h2>Know what is <em>part of your trip.</em></h2><div className="ne-inclusion-grid"><article><h3>Package inclusions</h3><ul>{inclusions.map(item => <li key={item}><Check size={15} /><span>{item}</span></li>)}</ul></article><article><h3>Package exclusions</h3><ul>{exclusions.map(item => <li key={item}><X size={15} /><span>{item}</span></li>)}</ul></article></div><p className="ne-fine">Anything not mentioned in the inclusions is excluded. Supplementary fees are reproduced from the quotation and require confirmation where applicable.</p></div></section>

    <section id="ne-info" className="td-container td-section"><span className="td-eyebrow">BEFORE YOU SET OFF</span><h2>A little planning, <em>a smoother journey.</em></h2><ol className="ne-information">{information.map(item => <li key={item}>{item}</li>)}</ol></section>

    <section id="ne-enquire" className="ne-enquire"><div className="td-container ne-enquire-grid">
      <div className="ne-enquire-copy"><span className="td-eyebrow">LET’S PLAN YOUR NORTH EAST ESCAPE</span><h2>Good company.<br /><em>A beautiful journey.</em></h2><p>Share your details and preferred package. Our team will help confirm hotel availability, the final programme and meal arrangements.</p><div className="ne-enquiry-summary"><strong>{selected.name}</strong><span>{trip.dates} · 4 adults · 2 rooms</span><p>{rupees(selected.pricePerAdult)}<small>per adult · twin sharing</small></p><span>Package total for 4 adults: {rupees(totalFor(selected))}</span></div><a className="ne-contact" href="tel:+918110082222"><Phone size={18} />+91 8110082222</a></div>
      <div className="ne-form-card holiday-enquiry-card">{status === 'success' ? <div className="ne-success" role="status"><ShieldCheck size={44} /><h3>Your North East enquiry is in!</h3><p>Our team will contact you about availability and the final itinerary. Your booking is confirmed only after the arrangements are agreed.</p><button className="td-button td-button-green" type="button" onClick={() => setStatus('idle')}>Make another enquiry</button></div> : <form onSubmit={submitEnquiry}><h3>Plan your North East holiday</h3><p>Enquiry only · no payment required</p><fieldset disabled={status === 'submitting'}>
        <label htmlFor="ne-package">Your package<select id="ne-package" value={packageIndex} onChange={event => choosePackage(Number(event.target.value))}>{packages.map((option, index) => <option key={option.name} value={index}>{option.name} · {rupees(option.pricePerAdult)} per adult · twin sharing</option>)}</select></label>
        <div className="ne-form-row"><label htmlFor="ne-name">Full name<input id="ne-name" name="name" value={form.name} onChange={updateForm} autoComplete="name" maxLength={100} required /></label><label htmlFor="ne-phone">Phone number<input id="ne-phone" name="phone" type="tel" value={form.phone} onChange={updateForm} autoComplete="tel" maxLength={20} required /></label></div>
        <label htmlFor="ne-email">Email address<input id="ne-email" name="email" type="email" value={form.email} onChange={updateForm} autoComplete="email" maxLength={254} required /></label>
        <label htmlFor="ne-dates">Package duration<input id="ne-dates" value="6 nights / 7 days" readOnly /></label>
        <label htmlFor="ne-message">Anything else? <span>(optional)</span><textarea id="ne-message" name="message" value={form.message} onChange={updateForm} rows={2} maxLength={2000} placeholder="Arrival timings, meal preferences or any questions…" /></label>
        {error && <p className="ne-error" role="alert">{error}</p>}<button className="td-button td-button-green" type="submit">{status === 'submitting' ? 'Sending your enquiry…' : 'Enquire about North East'}<ArrowRight size={16} /></button><p className="ne-privacy">By submitting, you agree to be contacted about your trip. <Link to="/privacy-policy">Privacy Policy</Link></p>
      </fieldset></form>}</div>
    </div></section>
    <TrendingDomesticDestinations />
  </div>;
}
