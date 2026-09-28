import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CarFront, Check, ChevronDown, Coffee, Hotel, MapPin, Phone, ShieldCheck, X } from 'lucide-react';
import api from '../../../api';
import usePageSEO from '../../../hooks/usePageSEO';
import TrendingInternationalDestinations from '../../../components/holidays/TrendingInternationalDestinations';
import { days, exclusions, inclusions, rates, rupees, trip } from './thailandData';
import '../TrendingDestinations/trendingDestinations.css';
import '../Bali/bali.css';
import './thailand.css';

export default function Thailand() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', adults: '2', message: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const selected = rates.find(rate => rate.adults === Number(form.adults));
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  usePageSEO('Thailand Special Package | Pattaya & Bangkok | Goimomi', '3 nights / 4 days: 2 nights Pattaya and 1 night Bangkok, Coral Island with Indian lunch, temple sightseeing and private transfers. From ₹9,499 per adult for 10 adults, double sharing.', trip.image);
  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submitEnquiry = async event => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!form.name.trim() || !/^[+0-9 ()-]+$/.test(form.phone) || form.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter your name and a phone number with at least 10 digits.'); return;
    }
    if (!selected || !form.date || form.date < minDate) { setError('Please select a listed group size and today or a future travel date.'); return; }
    setStatus('submitting'); setError('');
    try {
      await api.post('/api/holiday-form/', {
        package_type: trip.name, start_city: 'Suvarnabhumi International Airport, Bangkok', nationality: 'Not specified',
        travel_date: form.date, rooms: selected.adults / 2, adults: selected.adults, children: 0,
        star_rating: '4 & 3', holiday_type: 'International', budget: String(selected.price * selected.adults),
        full_name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), nights: 3,
        cities: [{ destination: 'Pattaya', nights: 2 }, { destination: 'Bangkok', nights: 1 }],
        room_details: Array.from({ length: selected.adults / 2 }, () => ({ adults: 2, children: 0, child_ages: [] })),
        room_type: 'Superior Room; double sharing', meal_plan: 'Daily breakfast + Indian Buffet Lunch during Coral Island Tour',
        transfer_details: 'Private airport and Pattaya–Bangkok transfers; Coral Island speedboat tour on SIC basis',
        message: [`Source: Thailand package page. ${trip.duration}. 2 nights Sunday JA Plus Hotel 4★, Pattaya; 1 night Platinum Suite Bangkok 3★. Superior Rooms.`, `${selected.adults} adults, double sharing; ${rupees(selected.price)} per adult; group total ${rupees(selected.price * selected.adults)}.`, 'Includes Wat Uthai Tharam, Wat Thepleela and Gems Gallery. Luggage: 1 medium suitcase + 1 shoulder bag per person. Thailand Insurance during included local tours within the applicable boundary. Flights, visas and optional water sports excluded.', form.message.trim()].filter(Boolean).join('\n'),
      });
      setStatus('success');
    } catch { setError('We could not send your enquiry. Please try again or call +91 8110082222.'); setStatus('error'); }
  };

  return <main className="trending-page bali-page thailand-page">
    <section className="td-hero bl-hero" aria-labelledby="th-title">
      <img className="td-hero-image" src={trip.image} alt={trip.imageAlt} width="1536" height="1024" fetchPriority="high" />
      <div className="td-hero-overlay" />
      <div className="td-container td-hero-content">
        <div className="td-breadcrumb"><Link to="/trendinginternationaldestination">Trending International</Link><span>/</span><span>Thailand</span></div>
        <span className="td-eyebrow">THAILAND SPECIAL PACKAGE · 3 NIGHTS / 4 DAYS</span>
        <h1 id="th-title">Pattaya & Bangkok.<br /><em>Sea breeze. City stories.</em></h1>
        <p>Two nights in Pattaya, one night in Bangkok. Discover Coral Island, Thai temples and moments of leisure, with private transfers along the way.</p>
        <div className="bl-hero-actions"><a href="#th-itinerary" className="td-button td-button-gold">Explore your journey <ArrowRight size={17} /></a><span>Starting from <strong>₹9,499</strong><small>per adult · group of 10 adults · double sharing</small></span></div>
        <div className="td-hero-caption"><MapPin size={13} />Thailand destination inspiration · AI-generated montage</div>
      </div>
    </section>
    <div className="td-container bl-facts">{[[Hotel, '2 nights Pattaya', 'Sunday JA Plus Hotel · 4★'], [Hotel, '1 night Bangkok', 'Platinum Suite Bangkok · 3★'], [CarFront, 'Private transfers', 'Coral Island tour on SIC basis'], [Coffee, 'Daily breakfast', 'Coral Island Indian lunch included']].map(([Icon, title, detail]) => <div key={title}><Icon size={24} /><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
    <nav className="bl-nav" aria-label="Thailand package sections"><div className="td-container">{[['th-itinerary', 'Itinerary'], ['th-stay', 'Hotels & rates'], ['th-inclusions', 'Inclusions & exclusions'], ['th-enquire', 'Enquire now']].map(([id, title]) => <a href={`#${id}`} key={id}>{title}</a>)}</div></nav>
    <section id="th-itinerary" className="bl-soft"><div className="td-container td-section">
      <div className="td-section-heading"><div><span className="td-eyebrow">3 NIGHTS / 4 DAYS</span><h2>Your Thailand story, <em>day by day.</em></h2></div></div>
      <div className="bl-itinerary"><aside className="bl-journey-photo"><img src={trip.image} alt={trip.imageAlt} loading="lazy" /><div><MapPin size={28} /><h3>From island shores to city lights.</h3><p>Pattaya & Bangkok · Destination inspiration</p></div></aside>
        <div className="bl-days">{days.map((day, index) => <details className="bl-day" key={day.title} open={index === 0}><summary><span className="bl-day-number">DAY<strong>{String(index + 1).padStart(2, '0')}</strong></span><span><small>{day.timing}</small><h3>{day.title}</h3></span><ChevronDown size={18} /></summary><div className="bl-day-body"><p>{day.description}</p><ul>{day.highlights.map(item => <li key={item}><Check size={14} />{item}</li>)}</ul><p className="bl-day-note">{day.note}</p></div></details>)}</div>
      </div>
    </div></section>
    <section id="th-stay" className="td-container td-section">
      <span className="td-eyebrow">YOUR STAYS & PACKAGE RATES</span><h2>Two cities. <em>One memorable escape.</em></h2>
      <div className="bl-stay th-stay"><div><Hotel size={30} /><h3>Sunday JA Plus Hotel – 4★</h3><p>Pattaya · 2 nights · Superior Room</p><h3>Platinum Suite Bangkok – 3★</h3><p>Bangkok · 1 night · Superior Room</p><p className="bl-fine">Daily breakfast included. Early check-in and late check-out charges are excluded.</p></div>
        <div className="th-rates"><table><caption>Rate per adult on double sharing basis</caption><thead><tr><th scope="col">No. of adults</th><th scope="col">Rate per adult</th></tr></thead><tbody>{rates.map(rate => <tr key={rate.adults}><th scope="row">{rate.adults} adults</th><td>{rupees(rate.price)}</td></tr>)}</tbody></table><a href="#th-enquire" className="td-button td-button-green">Choose your group size <ArrowRight size={16} /></a></div>
      </div>
    </section>
    <section id="th-inclusions" className="bl-soft"><div className="td-container td-section"><span className="td-eyebrow">KNOW YOUR PACKAGE</span><h2>The essentials, <em>already arranged.</em></h2><div className="bl-inclusions">{[[inclusions, 'Package inclusions', Check], [exclusions, 'Package exclusions', X]].map(([items, title, Icon]) => <article key={title}><h3>{title}</h3><ul>{items.map(item => <li key={item}><Icon size={15} />{item}</li>)}</ul></article>)}</div></div></section>
    <section id="th-enquire" className="bl-enquire"><div className="td-container bl-enquire-grid">
      <div><span className="td-eyebrow">LET’S TAKE YOU TO THAILAND</span><h2>Your next getaway.<br /><em>Four days to remember.</em></h2><p>Share your preferred dates and group size to enquire about your Pattaya & Bangkok holiday.</p><div className="bl-enquiry-summary" aria-live="polite"><strong>{selected.adults} adults · double sharing</strong><span>{trip.duration} · {selected.adults / 2} Superior Rooms at each hotel</span><p>{rupees(selected.price)} <small>per adult</small></p><span>Group total: {rupees(selected.price * selected.adults)}</span></div><a className="bl-phone" href="tel:+918110082222"><Phone size={20} />+91 8110082222</a></div>
      <div className="bl-form-card holiday-enquiry-card">{status === 'success' ? <div className="bl-success" role="status"><ShieldCheck size={42} /><h3>Your Thailand enquiry is in.</h3><p>Our team will contact you about your dates and package availability.</p><button type="button" className="td-button td-button-green" onClick={() => setStatus('idle')}>Make another enquiry</button></div> : <form onSubmit={submitEnquiry}><h3>Plan your Thailand holiday</h3><p>Enquiry only · no payment required</p><fieldset disabled={status === 'submitting'}>
        <div className="bl-form-row"><label htmlFor="th-name">Full name<input id="th-name" name="name" value={form.name} onChange={updateForm} autoComplete="name" maxLength={100} required /></label><label htmlFor="th-phone">Phone number<input id="th-phone" name="phone" value={form.phone} onChange={updateForm} type="tel" autoComplete="tel" maxLength={20} required /></label></div>
        <label htmlFor="th-email">Email address<input id="th-email" name="email" value={form.email} onChange={updateForm} type="email" autoComplete="email" required /></label>
        <label htmlFor="th-date">Preferred travel date<input id="th-date" name="date" value={form.date} onChange={updateForm} type="date" min={minDate} required /></label>
        <label htmlFor="th-adults">Number of adults<select id="th-adults" name="adults" value={form.adults} onChange={updateForm}>{rates.map(rate => <option key={rate.adults} value={rate.adults}>{rate.adults} adults — {rupees(rate.price)} per adult</option>)}</select></label>
        <label htmlFor="th-message">Anything else? <span>(optional)</span><textarea id="th-message" name="message" value={form.message} onChange={updateForm} rows={3} maxLength={2000} placeholder="Flight timings, room preferences or questions" /></label>
        {error && <p role="alert" className="bl-error">{error}</p>}<button className="td-button td-button-green" type="submit">{status === 'submitting' ? 'Sending your enquiry…' : 'Enquire about Thailand'}<ArrowRight size={16} /></button><p className="bl-privacy">By submitting, you agree to be contacted about your trip. <Link to="/privacy-policy">Privacy policy</Link></p>
      </fieldset></form>}</div>
    </div></section>
    <TrendingInternationalDestinations />
  </main>;
}
