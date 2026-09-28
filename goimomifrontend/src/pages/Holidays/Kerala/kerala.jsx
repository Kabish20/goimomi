import { useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, Coffee, MapPin, Phone, ShieldCheck, Trees, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../api';
import usePageSEO from '../../../hooks/usePageSEO';
import TrendingDomesticDestinations from '../../../components/holidays/TrendingDomesticDestinations';
import { exclusions, inclusions, lowestPrice, packages, rupees } from './keralaData';
import '../TrendingDestinations/trendingDestinations.css';
import './kerala.css';

const hero = '/images/kerala/kerala-backwaters-hero.png';

export default function Kerala() {
  const [packageIndex, setPackageIndex] = useState(0);
  const [rateIndex, setRateIndex] = useState(0);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', email: '', date: '', message: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const selected = packages[packageIndex];
  const rate = selected.rates[rateIndex];
  const price = rate.prices[categoryIndex];
  const today = new Date().toLocaleDateString('en-CA');
  const firstDate = today > selected.start ? today : selected.start;
  usePageSEO('Kerala Holiday Packages | Munnar & Kannur from ₹9,700 | Goimomi', 'Explore the Green Triangle of Munnar, Thekkady and Alleppey, or discover Kannur with Theyyam, beaches and culture. Breakfast and private transport included.', hero, 'Kerala holiday packages, Munnar, Thekkady, Alleppey, Kannur, Theyyam');

  const choosePackage = index => {
    setPackageIndex(index); setRateIndex(0); setCategoryIndex(0);
    setForm(current => ({ ...current, date: '' })); setStatus('idle'); setError('');
  };
  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submitEnquiry = async event => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!form.name.trim() || !/^[+0-9 ()-]+$/.test(form.phone) || form.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter your name and a valid phone number with at least 10 digits.'); return;
    }
    if (!form.date || form.date < firstDate || form.date > selected.end) {
      setError('Please select a travel date within this package’s validity.'); return;
    }
    setStatus('submitting'); setError('');
    try {
      await api.post('/api/holiday-form/', {
        package_type: `${selected.name} – Kerala`, start_city: selected.gateway, nationality: 'Not specified',
        travel_date: form.date, rooms: rate.pax / 2, adults: rate.pax, children: 0,
        star_rating: selected.categories[categoryIndex].replace('★', ''), holiday_type: 'Domestic', budget: String(price),
        full_name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), nights: String(selected.nights),
        cities: selected.id === 'kannur' ? [{ destination: 'Kannur', nights: '2' }] : [{ destination: 'Munnar', nights: '2' }, { destination: 'Thekkady', nights: '1' }, { destination: 'Alleppey', nights: '1' }],
        room_details: Array.from({ length: rate.pax / 2 }, () => ({ adults: 2, children: 0, child_ages: [] })),
        room_type: 'Room arrangement to be confirmed', meal_plan: 'Breakfast · CPAI', transfer_details: rate.vehicle,
        message: [`Source: Kerala landing page. ${selected.name}, ${selected.duration}.`, `${selected.categories[categoryIndex]} · ${rate.pax} guests · ${rate.vehicle} · ${rupees(price)} per person.`, `Travel date requested: ${form.date}. Peak dates excluded; availability requires confirmation. Room allocation is provisional.`, form.message.trim()].filter(Boolean).join('\n'),
      });
      setStatus('success');
    } catch { setStatus('error'); setError('We could not send your enquiry. Please try again or call +91 8110082222.'); }
  };

  return <div className="trending-page kerala-page">
    <section className="td-hero kl-hero" aria-labelledby="kl-title">
      <img className="td-hero-image" src={hero} alt="Kerala-inspired backwaters with coconut palms and a traditional wooden houseboat" width="1672" height="941" fetchPriority="high" />
      <div className="td-hero-overlay" />
      <div className="td-container td-hero-content">
        <div className="td-breadcrumb"><Link to="/holidays?category=Domestic">Domestic Holidays</Link><span>/</span><span>Kerala</span></div>
        <span className="td-eyebrow">HILLS. BACKWATERS. LIVING TRADITIONS.</span>
        <h1 id="kl-title">Kerala, at its<br /><em>own beautiful pace.</em></h1>
        <p>Follow the tea-green hills to Alleppey, or discover the rituals and shores of Kannur. Two thoughtfully planned ways to experience Kerala.</p>
        <div className="kl-hero-actions"><a href="#kl-packages" className="td-button td-button-gold">Find your Kerala <ArrowRight size={17} /></a><span>Starting from <strong>{rupees(Math.min(...packages.map(lowestPrice)))}</strong><small>per person · Kannur, 6 guests, 3★</small></span></div>
        <div className="td-hero-caption"><MapPin size={13} />Kerala-inspired imagery · boating and houseboat stays not included</div>
      </div>
    </section>
    <div className="td-container kl-facts">{[[Trees, 'Two distinct journeys', 'Hills & backwaters or coastal culture'], [CalendarDays, '2 or 4 nights', 'Choose your pace'], [Coffee, 'Breakfast included', 'At all listed hotels'], [Users, 'Private transport', 'Vehicle matched to group size']].map(([Icon, title, detail]) => <div key={title}><Icon size={24} /><span><strong>{title}</strong><small>{detail}</small></span></div>)}</div>
    <nav className="kl-nav" aria-label="Kerala package sections"><div className="td-container">{[['kl-packages', 'Packages'], ['kl-itinerary', 'Itinerary'], ['kl-hotels', 'Hotels'], ['kl-rates', 'Rates'], ['kl-inclusions', 'Inclusions'], ['kl-enquire', 'Enquire now']].map(([id, title]) => <a href={`#${id}`} key={id}>{title}</a>)}</div></nav>

    <section id="kl-packages" className="td-container td-section">
      <div className="td-section-heading"><div><span className="td-eyebrow">ONE STATE. TWO DIFFERENT STORIES.</span><h2>Choose your kind <em>of Kerala.</em></h2></div><p>Select a journey to explore its itinerary, hotels and complete package rates.</p></div>
      <div className="kl-packages">{packages.map((option, index) => <article className={`kl-package ${packageIndex === index ? 'kl-selected' : ''}`} key={option.id}>
        <span className="td-eyebrow">{option.duration} · {option.categories.join(' / ')}</span><h3>{option.name}</h3><span className="kl-subtitle">{option.subtitle}</span><p>{option.description}</p><div className="kl-route"><MapPin size={16} />{option.route}</div>
        <div className="kl-package-price"><span>From <strong>{rupees(lowestPrice(option))}</strong> per person</span><small>{option.id === 'kannur' ? '6 guests · Crysta · 3★' : '8 guests · Traveller · 3★'}</small></div>
        <button type="button" className={`td-button ${packageIndex === index ? 'td-button-green' : 'kl-outline'}`} onClick={() => choosePackage(index)} disabled={status === 'submitting'} aria-pressed={packageIndex === index}>{packageIndex === index ? <><Check size={16} />Selected journey</> : <>Explore this journey <ArrowRight size={16} /></>}</button>
      </article>)}</div>
    </section>

    <section id="kl-itinerary" className="kl-soft"><div className="td-container td-section">
      <div className="td-section-heading"><div><span className="td-eyebrow">{selected.name}</span><h2>A journey to <em>settle into.</em></h2></div><p>{selected.duration}<br />{selected.route}</p></div>
      <div className="kl-itinerary"><aside className="kl-journey"><span className="td-eyebrow">YOUR SEASON TO EXPLORE</span><h3>{selected.subtitle}</h3><p>{selected.description}</p><CalendarDays size={25} /><strong>{selected.validity}</strong><small>Pooja, Diwali, Pongal, Christmas and New Year excluded. Additional blackout dates may apply; confirm your dates before booking.</small><a href="#kl-enquire">Plan this journey <ArrowRight size={16} /></a></aside>
        <div key={selected.id} className="kl-days">{selected.days.map(([title, description, overnight], index) => <details key={title} open={index === 0} className="kl-day"><summary><span className="kl-day-number">DAY<strong>{String(index + 1).padStart(2, '0')}</strong></span><span><small>{overnight}</small><h3>{title}</h3></span><ChevronDown size={18} /></summary><p>{description}</p></details>)}</div>
      </div>
    </div></section>

    <section id="kl-hotels" className="td-container td-section"><div className="td-section-heading"><div><span className="td-eyebrow">REST WELL, EXPLORE MORE</span><h2>Stays for every <em>comfort level.</em></h2></div><p>Base-category rooms in the listed hotels or similar. Breakfast included at all hotels (CPAI).</p></div>
      <div className="kl-table-scroll" role="region" aria-label="Hotel options" tabIndex={0}><table><caption>{selected.name} · hotel options</caption><thead><tr><th scope="col">Destination</th>{selected.categories.map(category => <th scope="col" key={category}>{category}</th>)}</tr></thead><tbody>{selected.hotels.map(hotel => <tr key={hotel.destination}><th scope="row">{hotel.destination}</th>{hotel.options.map(option => <td key={option}>{option}</td>)}</tr>)}</tbody></table></div>
    </section>

    <section id="kl-rates" className="kl-soft"><div className="td-container td-section"><div className="td-section-heading"><div><span className="td-eyebrow">CLEAR PRICES. THOUGHTFUL CHOICES.</span><h2>Find your <em>perfect fit.</em></h2></div><p>All package rates are per person in INR, based on the stated group size. Peak dates excluded.</p></div>
      <div className="kl-rate-builder"><div><label htmlFor="kl-group">Group & vehicle<select id="kl-group" value={rateIndex} disabled={status === 'submitting'} onChange={event => { setRateIndex(Number(event.target.value)); setStatus('idle'); }}>{selected.rates.map((option, index) => <option key={option.pax} value={index}>{option.pax} guests · {option.vehicle}</option>)}</select></label><label htmlFor="kl-category">Hotel category<select id="kl-category" value={categoryIndex} disabled={status === 'submitting'} onChange={event => { setCategoryIndex(Number(event.target.value)); setStatus('idle'); }}>{selected.categories.map((category, index) => <option key={category} value={index}>{category}</option>)}</select></label></div><div className="kl-rate-result" aria-live="polite"><span>{selected.name}</span><strong>{rupees(price)} <small>per person</small></strong><p>{rate.pax} guests · {rate.vehicle} · {selected.categories[categoryIndex]}</p><a href="#kl-enquire" className="td-button td-button-green">Enquire for this option <ArrowRight size={16} /></a></div></div>
      <div className="kl-table-scroll" role="region" aria-label="Package rates" tabIndex={0}><table><caption>All package rates · per person</caption><thead><tr><th scope="col">Guests / vehicle</th>{selected.categories.map(category => <th scope="col" key={category}>{category}</th>)}</tr></thead><tbody>{selected.rates.map(option => <tr key={option.pax}><th scope="row">{option.pax} guests · {option.vehicle}</th>{option.prices.map((amount, index) => <td key={index}>{rupees(amount)}</td>)}</tr>)}</tbody></table></div>
      <div className="kl-table-scroll kl-extras" role="region" aria-label="Supplement rates" tabIndex={0}><table><caption>Extra adult, child & supplement charges</caption><thead><tr><th scope="col">Supplement</th>{selected.categories.map(category => <th scope="col" key={category}>{category}</th>)}</tr></thead><tbody>{selected.extras.map(([label, ...amounts]) => <tr key={label}><th scope="row">{label}</th>{amounts.map((amount, index) => <td key={index}>{rupees(amount)}</td>)}</tr>)}</tbody></table></div>
      <p className="kl-fine">Child age bands and room arrangements will be confirmed with your final quotation. Optional activities and supplements are additional to the package rate.</p>
    </div></section>

    <section id="kl-inclusions" className="td-container td-section"><span className="td-eyebrow">BEFORE YOU GO</span><h2>The details, <em>taken care of.</em></h2><div className="kl-inclusions">{[[inclusions, 'Included in your holiday'], [exclusions, 'Additional & excluded']].map(([items, title]) => <article key={title}><h3>{title}</h3><ul>{items.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul></article>)}</div><details className="kl-notes"><summary>Booking notes & important information <ChevronDown size={16} /></summary><ul>{selected.notes.map(note => <li key={note}>{note}</li>)}</ul></details></section>

    <section id="kl-enquire" className="kl-enquire"><div className="td-container kl-enquire-grid"><div><span className="td-eyebrow">LET’S PLAN SOMETHING BEAUTIFUL</span><h2>Your Kerala.<br /><em>Your kind of escape.</em></h2><p>Share your preferred dates. Our team will confirm hotel availability, transport and the final details of your journey.</p><div className="kl-enquiry-summary"><strong>{selected.name}</strong><span>{selected.duration} · {rate.pax} guests · {selected.categories[categoryIndex]}</span><p>{rupees(price)} <small>per person</small></p><span>{rate.vehicle} · breakfast included</span></div><a className="kl-phone" href="tel:+918110082222"><Phone size={20} />+91 8110082222</a></div>
      <div className="kl-form-card holiday-enquiry-card">{status === 'success' ? <div className="kl-success" role="status"><ShieldCheck size={42} /><h3>Your Kerala enquiry is in.</h3><p>Our team will contact you to confirm availability and your travel plans.</p><button type="button" className="td-button td-button-green" onClick={() => setStatus('idle')}>Make another enquiry</button></div> : <form onSubmit={submitEnquiry}><h3>Plan your Kerala holiday</h3><p>Enquiry only · no payment required</p><fieldset disabled={status === 'submitting'}><label htmlFor="kl-package">Your journey<select id="kl-package" value={packageIndex} onChange={event => choosePackage(Number(event.target.value))}>{packages.map((option, index) => <option key={option.id} value={index}>{option.name}</option>)}</select></label><div className="kl-form-row"><label htmlFor="kl-name">Full name<input id="kl-name" name="name" value={form.name} onChange={updateForm} autoComplete="name" maxLength={100} required /></label><label htmlFor="kl-phone">Phone number<input id="kl-phone" name="phone" value={form.phone} onChange={updateForm} type="tel" autoComplete="tel" maxLength={20} required /></label></div><div className="kl-form-row"><label htmlFor="kl-email">Email address<input id="kl-email" name="email" value={form.email} onChange={updateForm} type="email" autoComplete="email" required /></label><label htmlFor="kl-date">Preferred travel date<input id="kl-date" name="date" value={form.date} onChange={updateForm} type="date" min={firstDate} max={selected.end} required /></label></div><p className="kl-fine">Peak dates are excluded. Your selected date is subject to confirmation.</p><label htmlFor="kl-message">Anything else? <span>(optional)</span><textarea id="kl-message" name="message" value={form.message} onChange={updateForm} rows={3} maxLength={2000} placeholder="Children’s ages, room preferences or anything you’d like us to know" /></label>{error && <p role="alert" className="kl-error">{error}</p>}<button className="td-button td-button-green" type="submit">{status === 'submitting' ? 'Sending your enquiry…' : 'Enquire about Kerala'}<ArrowRight size={16} /></button><p className="kl-privacy">By submitting, you agree to be contacted about your trip. <Link to="/privacy-policy">Privacy policy</Link></p></fieldset></form>}</div>
    </div></section>
    <TrendingDomesticDestinations />
  </div>;
}
