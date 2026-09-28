import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CarFront, Check, Hotel, MapPin, Phone, Utensils, Users, X } from 'lucide-react';
import TrendingDomesticDestinations from '../../../components/holidays/TrendingDomesticDestinations';
import usePageSEO from '../../../hooks/usePageSEO';
import api from '../../../api';
import '../TrendingDestinations/trendingDestinations.css';
import './GoldenTriangle.css';

const heroImage = '/images/golden-triangle/taj-mahal-sunrise.png';

const itinerary = [
  {
    day: 'Day 01',
    title: 'Delhi Arrival & Sightseeing',
    description: 'Meet our representative at Delhi Airport, railway station or hotel. Explore India Gate, Qutub Minar, Lotus Temple and Red Fort, then transfer to your hotel. Overnight stay: Delhi.',
    highlights: ['Airport / station pickup', 'Delhi city highlights', 'Hotel check-in'],
  },
  {
    day: 'Day 02',
    title: 'Delhi to Agra',
    description: 'Drive to Agra after breakfast and discover the Taj Mahal, Agra Fort, Mehtab Bagh and the local market in a memorable day.',
    highlights: ['Approx. 230 km / 4–5 hours', 'Taj Mahal visit', 'Agra overnight stay'],
  },
  {
    day: 'Day 03',
    title: 'Agra to Jaipur via Fatehpur Sikri',
    description: 'After breakfast, check out and continue to Jaipur with a stop at Fatehpur Sikri. Check in and explore Jaipur Local Market if time permits. Overnight stay: Jaipur.',
    highlights: ['Approx. 240 km / 5–6 hours', 'Fatehpur Sikri', 'Jaipur hotel stay'],
  },
  {
    day: 'Day 04',
    title: 'Jaipur Local Sightseeing',
    description: 'Discover Jaipur’s royal heritage with Amber Fort, Jal Mahal, City Palace, Jantar Mantar, Hawa Mahal and local markets.',
    highlights: ['Amber Fort', 'City Palace', 'Overnight stay: Jaipur'],
  },
  {
    day: 'Day 05',
    title: 'Jaipur to Delhi Departure',
    description: 'After breakfast, head back to Delhi and get dropped at the airport, railway station or hotel as per your travel plan.',
    highlights: ['Approx. 280 km / 5–6 hours', 'Departure transfer', 'Tour ends'],
  },
];

const packagesData = {
  budget: {
    name: 'Budget Package',
    tag: 'Package 01',
    description: 'Comfortable deluxe stays, private vehicle, breakfasts & dinners for an authentic Golden Triangle journey.',
    startingPrice: '₹14,650',
    options: [
      {
        guests: '2 Guests',
        config: '01 Room · Sedan Car',
        price: '₹19,800',
        label: 'Per Person',
        note: 'Best for couples seeking a comfortable Golden Triangle escape.',
      },
      {
        guests: '4 Guests',
        config: '02 Rooms · Sedan Car',
        price: '₹16,500',
        label: 'Per Person',
        note: 'Great value for friends or small families travelling together.',
      },
      {
        guests: '6 Guests',
        config: '03 Rooms · Ertiga',
        price: '₹14,650',
        label: 'Per Person',
        note: 'Maximum comfort and space with private Ertiga cab for your group.',
      },
    ],
    hotels: [
      { city: 'Delhi', options: 'Hotel Liwasa Inn / Hotel Red Castle / Hotel Arch International', room: 'Deluxe Room / Similar Category' },
      { city: 'Agra', options: 'Hotel Light House / Hotel Taj Vilas', room: 'Deluxe Room / Similar Category' },
      { city: 'Jaipur', options: 'Hotel Laxmi Niwas', room: 'Deluxe Room / Similar Category' },
    ],
  },
  leisure: {
    name: 'Private Leisure Package',
    tag: 'Package 02',
    description: 'Upgraded handpicked deluxe properties with seamless private transportation and premium hospitality.',
    startingPrice: '₹17,600',
    options: [
      {
        guests: '2 Guests',
        config: '01 Room · Sedan Car',
        price: '₹22,000',
        label: 'Per Person',
        note: 'Executive couple getaway with handpicked premium deluxe stays.',
      },
      {
        guests: '4 Guests',
        config: '02 Rooms · Sedan Car',
        price: '₹19,250',
        label: 'Per Person',
        note: 'A smooth, premium travel rhythm with deluxe stays and private transfers.',
      },
      {
        guests: '6 Guests',
        config: '03 Rooms · Ertiga',
        price: '₹17,600',
        label: 'Per Person',
        note: 'Premium family getaway with roomier Ertiga cab and superior comfort.',
      },
    ],
    hotels: [
      { city: 'Delhi', options: 'Hotel Triple Tree / Arch The Lohias', room: 'Deluxe Room / Similar Category' },
      { city: 'Agra', options: 'Hotel Atulyaa Taj', room: 'Deluxe Room / Similar Category' },
      { city: 'Jaipur', options: 'Hotel Laxmi Palace / Hotel Regenta Jaipur / Hotel Aarna Premier, Jagatpura', room: 'Deluxe Room / Similar Category' },
    ],
  },
};

const packageInclusions = [
  'Delhi pickup as per arrival details',
  'Delhi drop as per departure details',
  '01 Night accommodation in Delhi',
  '01 Night accommodation in Agra',
  '02 Nights accommodation in Jaipur',
  '04 Breakfasts',
  '04 Dinners',
  '04 Nights hotel accommodation',
  'Private cab for 05 Days as per the itinerary',
  'Driver allowance',
  'Toll charges',
  'Parking charges',
  'Transportation for the sightseeing mentioned in the itinerary',
];

const packageExclusions = [
  'Airfare / Train Fare',
  'Lunch',
  'Monument and sightseeing entrance tickets',
  'Camera / Video charges',
  'Adventure activity charges',
  'Personal expenses',
  'Hotel room heater charges, if applicable',
  'Additional sightseeing not mentioned in the itinerary',
  'Night travel charges, if applicable',
  'Any expenses arising due to weather conditions, road closures, delays or circumstances beyond our control',
  'Anything not specifically mentioned under Package Inclusions',
];

export default function GoldenTriangle() {
  const [selectedPlan, setSelectedPlan] = useState('budget');
  const currentPlan = packagesData[selectedPlan];
  const [groupIndex, setGroupIndex] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', message: '' });
  const [status, setStatus] = useState('idle');
  const selectedGroup = currentPlan.options[groupIndex];
  const updateForm = event => setForm(value => ({ ...value, [event.target.name]: event.target.value }));
  const submitEnquiry = async event => {
    event.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    const adults = [2, 4, 6][groupIndex];
    const perPerson = Number(selectedGroup.price.replace(/\D/g, ''));
    try {
      await api.post('/api/holiday-form/', {
        package_type: `Delhi Agra Jaipur - ${currentPlan.name}`,
        start_city: 'Delhi', nationality: 'Not specified', travel_date: form.date,
        rooms: adults / 2, adults, children: 0, nights: 4,
        star_rating: 'Unrated', holiday_type: 'Domestic', budget: String(perPerson * adults),
        full_name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        room_type: 'Deluxe Room / Similar Category', meal_plan: '4 breakfasts and 4 dinners',
        transfer_details: `${adults === 6 ? 'Ertiga' : 'Sedan'} for 5 days; Delhi pickup and drop`,
        cities: [{ destination: 'Delhi', nights: 1 }, { destination: 'Agra', nights: 1 }, { destination: 'Jaipur', nights: 2 }],
        message: `Golden Triangle enquiry. ${currentPlan.name}; ${selectedGroup.config}; starting at INR ${perPerson} per person for ${adults} guests. Subject to availability.\n${form.message}`,
      });
      setStatus('success');
    } catch { setStatus('error'); }
  };

  usePageSEO(
    'Delhi Agra Jaipur Tour Package | Golden Triangle 4N / 5D | Goimomi',
    'Explore the Golden Triangle with Delhi, Agra and Jaipur in 4 nights / 5 days. Includes hotel stays, private cab, breakfasts, dinners and well-planned heritage sightseeing.',
    heroImage,
    'Delhi Agra Jaipur tour package, Golden Triangle holiday, India heritage tour, Jaipur trip, Taj Mahal package'
  );

  return (
    <div className="gt-page trending-page">
      <section className="td-hero gt-hero" aria-labelledby="gt-title">
        <img className="td-hero-image" src={heroImage} alt="The Taj Mahal and its reflecting pool in warm sunrise light" fetchPriority="high" width="1672" height="941" />
        <div className="td-hero-overlay" />
        <div className="td-container td-hero-content">
          <div className="td-breadcrumb"><Link to="/holidayhome">Goimomi Holidays</Link><span>/</span><span>Golden Triangle</span></div>
          <span className="td-eyebrow">PRIVATE JOURNEYS · INDIA</span>
          <h1 id="gt-title">Three cities.<br />One extraordinary<br /><em>Golden Triangle.</em></h1>
          <p>From Delhi’s timeless monuments to the Taj Mahal and Jaipur’s royal palaces. Discover an iconic Indian journey, at your own pace.</p>
          <div className="gt-hero-chips"><span><MapPin size={15} /> Delhi → Agra → Jaipur → Delhi</span><span><CalendarDays size={15} /> 4 nights / 5 days</span></div>
          <div className="gt-hero-actions"><a className="td-button td-button-gold" href="#packages">Explore the packages <ArrowRight size={18} /></a><a className="gt-hero-link" href="#itinerary">See the itinerary <ArrowRight size={16} /></a></div>
          <div className="gt-hero-bottom"><span>Private Golden Triangle tour</span><span>From <strong>₹14,650</strong> <small>/ person</small></span></div>
          <small className="gt-image-credit">AI-generated destination illustration</small>
        </div>
      </section>

      <div className="gt-trip-facts"><div className="td-container">
        {[[CalendarDays, 'THE DURATION', '4 nights · 5 days'], [MapPin, 'THE ROUTE', 'Delhi · Agra · Jaipur'], [CarFront, 'THE EXPERIENCE', 'Your own private cab'], [Utensils, 'THE MEALS', '4 breakfasts · 4 dinners']].map(([Icon, label, value]) => <div className="gt-trip-fact" key={label}><Icon size={22} strokeWidth={1.4} /><div><small>{label}</small><strong>{value}</strong></div></div>)}
      </div></div>
      <nav className="gt-page-nav td-container" aria-label="Explore this tour"><a href="#overview">The experience</a><a href="#packages">Packages & stays</a><a href="#itinerary">Day by day</a><a href="#included">What’s included</a><a href="#enquire">Enquire <ArrowRight size={14} /></a></nav>

      <section id="overview" className="gt-why gt-section td-container">
        <div className="gt-intro"><span className="td-eyebrow">A CLASSIC, BEAUTIFULLY PLANNED</span><h2>A little history.<br />A little wonder.<br /><em>A journey to remember.</em></h2><p>Three remarkable cities, four comfortable nights and a private vehicle throughout. We bring the essentials together so you can enjoy the places that make this route special.</p><a href="#itinerary" className="gt-text-link">Discover your five days <ArrowRight size={17} /></a></div>
        <div className="gt-feature-grid">
          {[
            ['01', 'Delhi', 'The historic capital', 'Monumental gateways, Mughal history and the many layers of India’s capital.', '1 NIGHT'],
            ['02', 'Agra', 'A moment of wonder', 'The Taj Mahal, Agra Fort and a glimpse of the city beyond its famous marble silhouette.', '1 NIGHT'],
            ['03', 'Jaipur', 'A royal welcome', 'Amber Fort, pink sandstone palaces and time to explore the city’s colourful markets.', '2 NIGHTS'],
          ].map(([number, title, subtitle, desc, stay]) => <article key={title} className="gt-feature-card"><span className="gt-city-number">{number}</span><div><div className="gt-city-heading"><h3>{title}</h3><span>{stay}</span></div><small>{subtitle}</small><p>{desc}</p></div></article>)}
        </div>
      </section>

      <section id="packages" className="gt-section gt-package-section">
        <div className="td-container">
          <div className="td-section-heading"><div><span className="td-eyebrow">THE RIGHT FIT FOR YOUR GROUP</span><h2>Your journey.<br /><em>Your kind of comfort.</em></h2></div><p>Choose your stay category and group size. Every option includes a private cab, breakfast, dinner and the complete itinerary.</p></div>
          <div className="gt-package-tabs" role="group" aria-label="Package category selection">
            <button type="button" disabled={status === 'submitting'} aria-pressed={selectedPlan === 'budget'} className={`gt-package-tab ${selectedPlan === 'budget' ? 'active' : ''}`} onClick={() => { setSelectedPlan('budget'); setStatus('idle'); }}>Budget <span>From ₹14,650 / person</span></button>
            <button type="button" disabled={status === 'submitting'} aria-pressed={selectedPlan === 'leisure'} className={`gt-package-tab ${selectedPlan === 'leisure' ? 'active' : ''}`} onClick={() => { setSelectedPlan('leisure'); setStatus('idle'); }}>Private Leisure <span>From ₹17,600 / person</span></button>
          </div>
          <div className="gt-package-grid">
            {currentPlan.options.map((pkg, index) => <article key={pkg.guests} className={`gt-package-card ${index === 2 ? 'gt-package-featured' : ''}`}>
              <div className="gt-package-top"><Users size={22} strokeWidth={1.5} /><span className="gt-tag">{index === 2 ? 'LOWEST PER-PERSON PRICE' : 'PRIVATE GROUP'}</span></div><h3>{pkg.guests}</h3><span className="gt-spec">{pkg.config}</span>
              <div className="gt-price-row"><small>Starting from</small><strong>{pkg.price}</strong><span>per person · {currentPlan.name}</span></div>
              <ul className="gt-package-benefits"><li><Check size={15} />4 nights in deluxe accommodation</li><li><Check size={15} />Breakfast, dinner & private transfers</li><li><Check size={15} />Sightseeing as per the itinerary</li></ul>
              <a className="td-button" href="#enquire" onClick={() => { setGroupIndex(index); setStatus('idle'); }}>Plan this trip <ArrowRight size={17} /></a>
            </article>)}
          </div>
          <p className="gt-price-note">Starting prices per person for the stated group size. Hotels and final pricing are subject to availability.</p>
          <div className="gt-hotel-section"><div className="td-section-heading"><div><span className="td-eyebrow">YOUR STAYS · {currentPlan.tag.toUpperCase()}</span><h3 className="gt-hotel-title">A comfortable place to return to.</h3></div><p>Proposed hotels for your selected package. Deluxe rooms or a similar category.</p></div>
            <div className="gt-hotel-grid">{currentPlan.hotels.map(h => <article key={h.city} className="gt-hotel-card"><div className="gt-hotel-heading"><Hotel size={20} strokeWidth={1.4} /><h4>{h.city}</h4><span>{h.city === 'Jaipur' ? '2 nights' : '1 night'}</span></div><ul>{h.options.split(' / ').map(hotel => <li key={hotel}>{hotel}</li>)}</ul><small>{h.room}</small></article>)}</div>
          </div>
        </div>
      </section>

      <section id="itinerary" className="gt-section td-container">
        <div className="td-section-heading"><div><span className="td-eyebrow">THE JOURNEY, DAY BY DAY</span><h2>Five days.<br /><em>Countless memories.</em></h2></div><p>A thoughtfully planned route, with Delhi pickup and drop and four nights along the way.</p></div>
        <div className="gt-itinerary-layout">
          <figure className="gt-itinerary-photo"><img src="/images/golden-triangle/jaipur.png" alt="Jaipur’s Hawa Mahal in warm evening light" loading="lazy" width="1536" height="1024" /><figcaption><span>THE PINK CITY</span><strong>Stories in every stone.</strong><small>Representative AI-generated artwork</small></figcaption></figure>
          <div className="gt-itinerary-list">{itinerary.map((item, index) => <article key={item.day} className="gt-day-card"><span className="gt-timeline-number">0{index + 1}</span><div><div className="gt-day-header"><span className="gt-day-badge">{item.day}</span><h3>{item.title}</h3></div><p>{item.description}</p><div className="gt-badges">{item.highlights.map(highlight => <span key={highlight}>{highlight}</span>)}</div></div></article>)}</div>
        </div>
      </section>

      <section id="included" className="gt-section gt-details-section"><div className="td-container">
        <div className="td-section-heading"><div><span className="td-eyebrow">EVERY DETAIL, CLEARLY LAID OUT</span><h2>Know before <em>you go.</em></h2></div></div>
        <div className="gt-stay-strip"><strong><Hotel size={20} /> Your accommodation plan</strong><span>Delhi <b>1 night</b></span><span>Agra <b>1 night</b></span><span>Jaipur <b>2 nights</b></span><span>Total <b>4 nights / 5 days</b></span></div>
        <div className="gt-info-grid">
          <article className="gt-panel"><span className="gt-list-heading"><Check size={20} /><h3>Included in your journey</h3></span><ul className="gt-list">{packageInclusions.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul></article>
          <article className="gt-panel gt-panel-excluded"><span className="gt-list-heading"><X size={20} /><h3>Plan for these separately</h3></span><ul className="gt-list">{packageExclusions.map(item => <li key={item}><X size={15} />{item}</li>)}</ul></article>
        </div>
      </div></section>

      <section id="enquire" className="gt-enquire-section"><div className="td-container gt-enquire-inner">
        <div className="gt-enquire-copy"><span className="td-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h2>Let’s make this<br /><em>your journey.</em></h2><p>Tell us who’s travelling and when. Our travel team will help with availability, hotel options and a personalised quote.</p><div className="gt-callout"><Phone size={23} strokeWidth={1.4} /><div><small>Prefer to talk it through?</small><a href="tel:+918110082222">+91 8110082222</a></div></div><div className="gt-enquire-route"><span>DELHI</span><i /><span>AGRA</span><i /><span>JAIPUR</span></div><p className="gt-enquire-note">4 nights · 5 days · A private journey</p></div>
        <div className="gt-enquire-card holiday-enquiry-card"><span className="td-eyebrow">YOUR TRIP, YOUR DETAILS</span><h3>Request your personalised quote</h3>
          <form className="gt-enquiry-form" onSubmit={submitEnquiry}>
            <p className="gt-form-summary"><strong>{currentPlan.name}</strong><span>From {selectedGroup.price} / person</span></p>
            <label>Package<select value={selectedPlan} onChange={event => { setSelectedPlan(event.target.value); setStatus('idle'); }} disabled={status === 'submitting'}><option value="budget">Budget Package</option><option value="leisure">Private Leisure Package</option></select></label>
            <label>Group size<select value={groupIndex} onChange={event => { setGroupIndex(Number(event.target.value)); setStatus('idle'); }} disabled={status === 'submitting'}>{currentPlan.options.map((option, index) => <option key={option.guests} value={index}>{option.guests} — {option.config}</option>)}</select></label>
            <label>Full name<input name="name" value={form.name} onChange={updateForm} required autoComplete="name" maxLength={100} placeholder="Your name" /></label>
            <label>Email<input name="email" type="email" value={form.email} onChange={updateForm} required autoComplete="email" placeholder="you@example.com" /></label>
            <label>Phone<input name="phone" type="tel" value={form.phone} onChange={updateForm} required autoComplete="tel" pattern="[+0-9 ()-]{10,20}" maxLength={20} placeholder="+91" /></label>
            <label>Travel date<input name="date" type="date" value={form.date} onChange={updateForm} required min={new Date().toLocaleDateString('en-CA')} /></label>
            <label className="gt-form-wide">Message<textarea name="message" value={form.message} onChange={updateForm} rows={3} placeholder="Anything you’d like us to know?" /></label>
            <button type="submit" className="td-button td-button-gold" disabled={status === 'submitting' || status === 'success'}>{status === 'submitting' ? 'Sending…' : status === 'success' ? 'Enquiry received' : 'Request a quote'} <ArrowRight size={17} /></button>
            <small className="gt-form-wide gt-form-footnote">An enquiry only. Availability and final price will be confirmed by our team.</small>
            {status === 'success' && <p className="gt-form-wide" role="status">Your enquiry has been received. Our team will contact you to confirm availability.</p>}
            {status === 'error' && <p className="gt-form-wide" role="alert">We couldn’t submit your enquiry. Please try again or call +91 8110082222.</p>}
          </form>
        </div>
      </div></section>
      <TrendingDomesticDestinations />
    </div>
  );
}
