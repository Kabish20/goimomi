import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CarFront, Check, ChevronDown, Hotel, MapPin, Phone, ShieldCheck, Users, Utensils, X } from 'lucide-react';
import api from '../../../api';
import usePageSEO from '../../../hooks/usePageSEO';
import TrendingDomesticDestinations from '../../../components/holidays/TrendingDomesticDestinations';
import { days, exclusions, hotels, inclusions, information, rupees, totalFor, trip } from './goaData';
import '../TrendingDestinations/trendingDestinations.css';
import './goa.css';

const hero = '/images/goa/goa-coast-hero.webp';

export default function Goa() {
  const [hotelIndex, setHotelIndex] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const selected = hotels[hotelIndex];
  usePageSEO('Goa | 3 Nights / 4 Days | Triple Sharing | Goimomi', `Explore North and South Goa, ${trip.dates}. From ₹9,400 per adult on triple sharing, for a minimum of 6 adults in 2 rooms, with breakfast and Innova Crysta transport.`, hero, 'Goa holiday package, North Goa, South Goa, triple sharing, Innova Crysta, Dabolim Airport');

  const chooseHotel = index => {
    if (status === 'submitting') return;
    setHotelIndex(index);
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
        package_type: `Goa - ${selected.name} - 3N / 4D`, start_city: 'Goa Dabolim Airport', nationality: 'Not specified',
        travel_date: trip.startDate, rooms: trip.rooms, adults: trip.adults, children: 0, nights: trip.nights,
        star_rating: 'Unrated', holiday_type: 'Domestic', budget: String(totalFor(selected)),
        full_name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        cities: [{ destination: 'Goa', nights: trip.nights }],
        room_details: Array.from({ length: trip.rooms }, () => ({ adults: 3, children: 0, child_ages: [] })),
        room_type: 'Triple sharing; 2 rooms for 6 adults', meal_plan: 'Breakfast only; lunch and dinner excluded',
        transfer_details: 'Innova Crysta; private Dabolim transfers and North/South Goa sightseeing',
        message: [
          'Source: Goa holiday page. Enquiry only; subject to availability and final confirmation.',
          `Travel: ${trip.dates}. 3 nights / 4 days. 6 adults in 2 rooms on triple sharing.`,
          `${selected.name}: INR ${selected.pricePerAdult} per adult on triple sharing. Total for 6 adults: INR ${totalFor(selected)}. All taxes included.`,
          'Quoted cost applies to a minimum of 6 adults. Vehicle: Innova Crysta.',
          'North and South Goa sightseeing: 10:00 AM–6:00 PM. Breakfast included; lunch, dinner and all entry tickets excluded. Sightseeing lunch stops do not include the meal cost.',
          'The itinerary uses Dabolim Airport. Railway-station transfers can be requested with station and train details. Optional water sports require confirmation of charges.',
          form.message.trim(),
        ].filter(Boolean).join('\n'),
      });
      setStatus('success');
    } catch {
      setStatus('error');
      setError('Your enquiry could not be sent. Please try again or call +91 8110082222.');
    }
  };

  return <div className="trending-page goa-page">
    <section className="td-hero ga-hero" aria-labelledby="ga-title"><img className="td-hero-image" src={hero} alt="Goa-inspired golden beach, coconut palms and a coastal fort beside the Arabian Sea" width="1536" height="1024" fetchPriority="high" /><div className="td-hero-overlay" /><div className="td-container td-hero-content">
      <div className="td-breadcrumb"><Link to="/">Home</Link><span>/</span><span>Goa</span></div><span className="td-eyebrow">SIX FRIENDS. FOUR DAYS. A LITTLE MORE GOA.</span><h1 id="ga-title">Good company.<br /><em>Golden Goa days.</em></h1><p>Beaches, old-world streets and time together.<br />Explore North and South Goa with your own Innova Crysta.</p>
      <div className="ga-facts"><span><CalendarDays size={16} />{trip.dates}</span><span><Users size={16} />6 adults · 2 rooms</span><span><CarFront size={16} />Innova Crysta</span></div><div className="ga-hero-actions"><a className="td-button td-button-gold" href="#ga-hotels">Choose your hotel <ArrowRight size={17} /></a><span>From <strong>{rupees(hotels[0].pricePerAdult)}</strong><small>per adult · triple sharing</small></span></div><div className="td-hero-caption"><MapPin size={13} />Inspired by the Goa coastline</div>
    </div></section>
    <div className="td-container ga-snapshot">{[[Hotel, '3 nights / 4 days', '2 rooms on triple sharing'], [Users, 'Minimum 6 adults', 'Rates based on this group size'], [Utensils, 'Breakfast included', 'Lunch & dinner extra'], [CarFront, 'Private transport', 'Innova Crysta']].map(([Icon, title, detail]) => <div key={title}><Icon size={24} strokeWidth={1.5} /><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
    <nav className="ga-nav" aria-label="Goa package sections"><div className="td-container">{[['ga-itinerary', 'Itinerary'], ['ga-hotels', 'Hotels & prices'], ['ga-inclusions', 'Inclusions'], ['ga-info', 'Good to know']].map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}<a href="#ga-enquire" className="ga-nav-enquire-btn">Enquire now <ArrowRight size={14} /></a></div></nav>

    <section id="ga-itinerary" className="ga-soft"><div className="td-container td-section"><div className="td-section-heading"><div><span className="td-eyebrow">{trip.dates.toUpperCase()}</span><h2>Four days, <em>planned for you.</em></h2></div></div><div className="ga-itinerary-grid"><aside className="ga-photo"><img src={hero} alt="Goa-inspired palm-lined beach and Arabian Sea coastline" width="1536" height="1024" loading="lazy" /><div><span className="td-eyebrow">SLOW DOWN. LOOK AROUND.</span><h3>A little sea breeze.<br />A lot of memories.</h3><p>North & South Goa</p></div></aside><div>{days.map((day, index) => <details className="ga-day" key={day.title} open={index === 0 ? true : undefined}><summary><span className="ga-day-number">DAY<strong>{String(index + 1).padStart(2, '0')}</strong></span><span><small>{day.time}</small><h3>{day.title}</h3></span><ChevronDown size={18} /></summary><div className="ga-day-body"><p>{day.description}</p><ul className="ga-tags">{day.places.map(place => <li key={place}>{place}</li>)}</ul>{day.note && <p className="ga-note">{day.note}</p>}</div></details>)}</div></div></div></section>

    <section id="ga-hotels" className="td-container td-section"><div className="td-section-heading"><div><span className="td-eyebrow">THREE HOTELS. THE SAME GOA ESCAPE.</span><h2>Choose where <em>you unwind.</em></h2></div><p>Per-adult prices on triple sharing, based on a minimum of 6 adults in 2 rooms. All taxes included.</p></div><div className="ga-hotel-grid">{hotels.map((hotel, index) => <article className={`ga-hotel ${hotelIndex === index ? 'ga-selected' : ''}`} key={hotel.name}><span className="td-eyebrow">OPTION {index + 1}</span><Hotel size={26} strokeWidth={1.5} /><h3>{hotel.name}</h3><div className="ga-price">{rupees(hotel.pricePerAdult)}<small>per adult · triple sharing</small></div><ul className="ga-hotel-details">{['3 nights accommodation', '2 rooms · 3 adults per room', 'Breakfast included', 'Innova Crysta transport', 'North & South Goa sightseeing', 'Taxes, parking & tolls included'].map(item => <li key={item}><Check size={14} />{item}</li>)}</ul><button className={`td-button ${hotelIndex === index ? 'td-button-green' : 'ga-outline'}`} type="button" aria-pressed={hotelIndex === index} disabled={status === 'submitting'} onClick={() => chooseHotel(index)}>{hotelIndex === index ? <><Check size={16} />Selected hotel</> : <>Choose this hotel <ArrowRight size={16} /></>}</button></article>)}</div><div className="ga-selection" aria-live="polite"><span><strong>{selected.name}</strong> · {rupees(selected.pricePerAdult)} per adult · triple sharing</span><a href="#ga-enquire">Enquire for this stay <ArrowRight size={16} /></a></div><p className="ga-fine">Quoted cost applies to a minimum of 6 adults. Hotel availability and room categories require confirmation at booking.</p></section>

    <section id="ga-inclusions" className="ga-soft"><div className="td-container td-section"><span className="td-eyebrow">CLEAR DETAILS, BEFORE YOU GO</span><h2>What is <em>part of your holiday.</em></h2><div className="ga-inclusion-grid"><article><h3>Package inclusions</h3><ul>{inclusions.map(item => <li key={item}><Check size={15} /><span>{item}</span></li>)}</ul></article><article><h3>Package exclusions</h3><ul>{exclusions.map(item => <li key={item}><X size={15} /><span>{item}</span></li>)}</ul><p className="ga-note">Lunch stops appear in the itinerary, but meal costs are excluded. Breakfast is the included meal.</p></article></div></div></section>
    <section id="ga-info" className="td-container td-section"><span className="td-eyebrow">A FEW THINGS TO KNOW</span><h2>Before you <em>head to Goa.</em></h2><ol className="ga-information">{information.map(item => <li key={item}>{item}</li>)}</ol></section>

    <section id="ga-enquire" className="ga-enquire"><div className="td-container ga-enquire-grid"><div className="ga-enquire-copy"><span className="td-eyebrow">LET’S PLAN YOUR GOA DAYS</span><h2>Your people.<br /><em>Your Goa escape.</em></h2><p>Share your details and preferred hotel. Our team will help confirm availability and your private Goa holiday.</p><div className="ga-enquiry-summary"><strong>{selected.name}</strong><span>{trip.dates} · 6 adults · 2 rooms</span><p>{rupees(selected.pricePerAdult)}<small>per adult · triple sharing</small></p><span>Package total for 6 adults: {rupees(totalFor(selected))}</span><span>Minimum 6 adults · all taxes included</span></div><a className="ga-contact" href="tel:+918110082222"><Phone size={18} />+91 8110082222</a></div>
      <div className="ga-form-card holiday-enquiry-card">{status === 'success' ? <div className="ga-success" role="status"><ShieldCheck size={44} /><h3>Your Goa enquiry is in!</h3><p>Our team will contact you about availability and your final quote. Your booking is confirmed only after arrangements are agreed.</p><button className="td-button td-button-green" type="button" onClick={() => setStatus('idle')}>Make another enquiry</button></div> : <form onSubmit={submitEnquiry}><h3>Plan your Goa holiday</h3><p>Enquiry only · no payment required</p><fieldset disabled={status === 'submitting'}>
        <label htmlFor="ga-hotel">Your hotel<select id="ga-hotel" value={hotelIndex} onChange={event => chooseHotel(Number(event.target.value))}>{hotels.map((hotel, index) => <option value={index} key={hotel.name}>{hotel.name} · {rupees(hotel.pricePerAdult)} per adult · triple sharing</option>)}</select></label><div className="ga-form-row"><label htmlFor="ga-name">Full name<input id="ga-name" name="name" value={form.name} onChange={updateForm} autoComplete="name" maxLength={100} required /></label><label htmlFor="ga-phone">Phone number<input id="ga-phone" name="phone" type="tel" value={form.phone} onChange={updateForm} autoComplete="tel" maxLength={20} required /></label></div><label htmlFor="ga-email">Email address<input id="ga-email" name="email" type="email" value={form.email} onChange={updateForm} autoComplete="email" maxLength={254} required /></label><label htmlFor="ga-dates">Package duration<input id="ga-dates" value="3 nights / 4 days" readOnly /></label><label htmlFor="ga-message">Anything else? <span>(optional)</span><textarea id="ga-message" name="message" rows={2} value={form.message} onChange={updateForm} maxLength={2000} placeholder="Flight timings, railway station details or preferences…" /></label>{error && <p className="ga-error" role="alert">{error}</p>}<button className="td-button td-button-green" type="submit">{status === 'submitting' ? 'Sending your enquiry…' : 'Enquire about Goa'}<ArrowRight size={16} /></button><p className="ga-privacy">By submitting, you agree to be contacted about your trip. <Link to="/privacy-policy">Privacy Policy</Link></p>
      </fieldset></form>}</div>
    </div></section>
    <TrendingDomesticDestinations />
  </div>;
}
