import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  CalendarDays, 
  CarFront, 
  Check, 
  Hotel, 
  MapPin, 
  Phone, 
  Sparkles, 
  Users, 
  Utensils, 
  X,
  Compass,
  Sunset
} from 'lucide-react';
import TrendingDomesticDestinations from '../../../components/holidays/TrendingDomesticDestinations';
import usePageSEO from '../../../hooks/usePageSEO';
import api from '../../../api';
import '../TrendingDestinations/trendingDestinations.css';
import './TamilNaduKerala.css';

const heroImage = '/images/tamil-nadu-kerala/tamilnadu-kerala-hero.jpg';
const kanyakumariPhoto = '/images/tamil-nadu-kerala/kanyakumari-sunset.jpg';

const itinerary = [
  {
    day: 'Day 01',
    title: 'Madurai Arrival & Local Sightseeing',
    travelInfo: 'Arrival & City Tour',
    description: 'Welcome to Madurai, one of the oldest and most famous temple cities of South India. Upon your arrival at Madurai Airport, Railway Station or Bus Stand, our representative will receive you and assist with your transfer to the hotel. After check-in and a short refreshment break, proceed for Madurai local sightseeing. Visit the magnificent Meenakshi Amman Temple, famous for its stunning Dravidian architecture and colourful temple towers. Later, visit Thirumalai Nayakkar Mahal, an impressive 17th-century palace known for its grand pillars and architecture. If time permits, you may also visit local markets and explore the vibrant atmosphere of Madurai. Return to the hotel for an overnight stay in Madurai.',
    highlights: ['Airport / Station pickup', 'Meenakshi Amman Temple', 'Thirumalai Nayakkar Mahal', 'Overnight stay in Madurai'],
  },
  {
    day: 'Day 02',
    title: 'Madurai – Rameshwaram',
    travelInfo: 'Approx. 175 km | 4–5 Hours',
    description: 'After breakfast and check-out, proceed to the holy island town of Rameshwaram. During the journey, enjoy the scenic coastal route. On arrival, visit the famous Ramanathaswamy Temple, one of the most important pilgrimage centres in India. The temple is renowned for its magnificent corridors and sacred theerthams. Later, visit Agni Theertham, Panchamukhi Hanuman Temple and Pamban Bridge, where you can enjoy beautiful views of the sea and railway bridge. Depending on time availability, local sightseeing can be arranged. Check in to the hotel and enjoy an overnight stay in Rameshwaram.',
    highlights: ['Scenic coastal drive', 'Ramanathaswamy Temple & Theerthams', 'Agni Theertham & Panchamukhi Hanuman', 'Pamban Bridge sea view'],
  },
  {
    day: 'Day 03',
    title: 'Rameshwaram – Kanyakumari',
    travelInfo: 'Approx. 310 km | 6–7 Hours',
    description: 'After breakfast, check out from the hotel and proceed towards Kanyakumari, the southernmost tip of mainland India. Upon arrival, check in to the hotel and relax. Later, proceed for sightseeing in Kanyakumari. Visit the Kanyakumari Amman Temple, Gandhi Mandapam and the Vivekananda Rock Memorial. You can also enjoy the view of the Thiruvalluvar Statue and witness the beautiful sunset over the ocean. Kanyakumari is famous for the unique meeting point of the Bay of Bengal, Indian Ocean and Arabian Sea. Return to the hotel for an overnight stay in Kanyakumari.',
    highlights: ['Southernmost tip of India', 'Vivekananda Rock Memorial', 'Thiruvalluvar Statue & Gandhi Mandapam', 'Tri-sea sunset view'],
  },
  {
    day: 'Day 04',
    title: 'Kanyakumari – Trivandrum',
    travelInfo: 'Approx. 95 km | 3–4 Hours',
    description: 'Early morning, guests may enjoy the beautiful sunrise at Kanyakumari. After breakfast and check-out, proceed towards Trivandrum. On arrival, visit the famous Sree Padmanabhaswamy Temple (subject to temple entry rules and timings). Later, proceed for local sightseeing covering Napier Museum, Kovalam Beach and other attractions depending on available time. Enjoy the scenic beaches and the relaxed atmosphere of Kerala’s capital city. Check in to the hotel and enjoy an overnight stay in Trivandrum.',
    highlights: ['Kanyakumari sunrise', 'Sree Padmanabhaswamy Temple', 'Napier Museum', 'Kovalam Beach sunset & leisure'],
  },
  {
    day: 'Day 05',
    title: 'Trivandrum Departure',
    travelInfo: 'Departure Transfer',
    description: 'After breakfast, check out from the hotel. Depending on your departure schedule, you may have some free time for shopping or optional local sightseeing. Later, you will be dropped at Trivandrum Airport, Railway Station or Bus Stand for your onward journey with wonderful memories of your South India Tour.',
    highlights: ['Hotel breakfast & check-out', 'Free time for spice / souvenir shopping', 'Trivandrum Airport / Station drop', 'Tour Ends with Sweet Memories!'],
  },
];

const packageHighlights = [
  { num: '01', title: 'Madurai Meenakshi Amman Temple', desc: 'Marvel at the monumental towering Dravidian gopurams and sacred centuries-old temple architecture.' },
  { num: '02', title: 'Thirumalai Nayakkar Mahal', desc: 'An awe-inspiring 17th-century palace celebrated for its massive stucco domes and majestic courtyard pillars.' },
  { num: '03', title: 'Ramanathaswamy Temple, Rameshwaram', desc: 'Walk the world-famous carved temple corridors and experience sacred theerthams on this holy island.' },
  { num: '04', title: 'Historic Pamban Bridge & Sea Drive', desc: 'Gaze out across the turquoise Palk Strait and India’s iconic sea cantilever bridge connecting island to mainland.' },
  { num: '05', title: 'Kanyakumari Sunrise & Sunset', desc: 'Witness ethereal dawn and twilight over the unique confluence of the Arabian Sea, Bay of Bengal, and Indian Ocean.' },
  { num: '06', title: 'Vivekananda Rock & Thiruvalluvar Statue', desc: 'Take the scenic ferry out to the sacred meditation rock and towering stone monument rising out of the waves.' },
  { num: '07', title: 'Kanyakumari Amman Temple & Mandapam', desc: 'Pay homage at the seashore temple of Goddess Kanya Kumari and visit the pink-domed Gandhi Memorial Mandapam.' },
  { num: '08', title: 'Sree Padmanabhaswamy Temple', desc: 'Stand before the gold-plated facade and divine spiritual sanctity of Kerala’s legendary royal shrine in Trivandrum.' },
  { num: '09', title: 'Kovalam Beach & Napier Museum', desc: 'Unwind along the palm-fringed golden crescent shores of Kovalam and explore Travancore art and history.' },
];

const packagesData = {
  deluxe: {
    name: 'Deluxe Package',
    tag: 'Package 01 · Deluxe',
    description: 'Handpicked quality Deluxe hotels, private dedicated vehicle for all 5 days, daily hotel breakfast, multilinguistic driver, all tolls, fuel, parking and state permits included.',
    startingPrice: '₹12,700',
    extraBedPrice: '₹7,500',
    options: [
      {
        guests: '2 Pax',
        paxCount: 2,
        vehicle: 'Swift Dzire / Etios',
        price: '₹ 22,600',
        numericPrice: 22600,
        badge: 'IDEAL FOR COUPLES',
        note: 'Private AC Sedan with dedicated multilinguistic driver for 2 travellers.',
      },
      {
        guests: '4 Pax',
        paxCount: 4,
        vehicle: 'Swift Dzire / Etios',
        price: '₹ 15,600',
        numericPrice: 15600,
        badge: 'GREAT VALUE',
        note: 'Economical private Sedan option for small families or close friends.',
      },
      {
        guests: '4 Pax',
        paxCount: 4,
        vehicle: 'Innova',
        price: '₹ 17,500',
        numericPrice: 17500,
        badge: 'PREMIUM COMFORT',
        note: 'Spacious AC Innova with extra legroom and luggage capacity.',
      },
      {
        guests: '6 Pax',
        paxCount: 6,
        vehicle: 'Innova',
        price: '₹ 14,500',
        numericPrice: 14500,
        badge: 'FAMILY FAVORITE',
        note: 'Roomy Innova cab perfectly sized for a group of 6 exploring together.',
      },
      {
        guests: '12 Pax',
        paxCount: 12,
        vehicle: 'Tempo Traveller',
        price: '₹ 12,700',
        numericPrice: 12700,
        badge: 'BEST PER-PERSON RATE',
        note: 'Luxury Tempo Traveller with pushback seating and high roof for large groups.',
      },
    ],
    hotels: [
      { city: 'Madurai', nights: '1 Night', options: ['Cr Grande', 'Heritage Residency', 'Hotel Grand Sabarees', 'Similar'] },
      { city: 'Rameshwaram', nights: '1 Night', options: ['Hotel Rameswaram Grand', 'Hotel Brindavan Residency', 'Jiwan Residency', 'Similar'] },
      { city: 'Kanyakumari', nights: '1 Night', options: ['The Gopinivas Grand', 'Hotel Temple Citi', 'Similar'] },
      { city: 'Trivandrum', nights: '1 Night', options: ['Ginger Trivandrum', 'Hotel Horizon', 'Similar'] },
    ],
  },
  superDeluxe: {
    name: 'Super Deluxe Package',
    tag: 'Package 02 · Super Deluxe',
    description: 'Upgraded premium properties and luxury resorts with enhanced amenities, seamless private transportation, daily buffet breakfasts and personalised hospitality.',
    startingPrice: '₹16,500',
    extraBedPrice: '₹9,500',
    options: [
      {
        guests: '2 Pax',
        paxCount: 2,
        vehicle: 'Swift Dzire / Etios',
        price: '₹ 26,500',
        numericPrice: 26500,
        badge: 'LUXURY COUPLE ESCAPE',
        note: 'Premium couple getaway with upgraded Super Deluxe hotels & dedicated sedan.',
      },
      {
        guests: '4 Pax',
        paxCount: 4,
        vehicle: 'Swift Dzire / Etios',
        price: '₹ 19,500',
        numericPrice: 19500,
        badge: 'SUPER DELUXE VALUE',
        note: 'Elevated stay comfort with private AC Sedan and premium properties.',
      },
      {
        guests: '4 Pax',
        paxCount: 4,
        vehicle: 'Innova',
        price: '₹ 21,500',
        numericPrice: 21500,
        badge: 'SUPERIOR LEISURE',
        note: 'Maximum road comfort in a private AC Innova with premium resort stays.',
      },
      {
        guests: '6 Pax',
        paxCount: 6,
        vehicle: 'Innova',
        price: '₹ 18,500',
        numericPrice: 18500,
        badge: 'EXECUTIVE FAMILY TOUR',
        note: 'Premium family getaway with roomier Innova cab and super deluxe hotels.',
      },
      {
        guests: '12 Pax',
        paxCount: 12,
        vehicle: 'Tempo Traveller',
        price: '₹ 16,500',
        numericPrice: 16500,
        badge: 'PREMIUM GROUP JOURNEY',
        note: 'Top-tier Tempo Traveller journey with luxury properties across all 4 destinations.',
      },
    ],
    hotels: [
      { city: 'Madurai', nights: '1 Night', options: ['Sterling V Grand Madurai', 'Astoria Hotels', 'Similar'] },
      { city: 'Rameshwaram', nights: '1 Night', options: ['Hotel Sri Ashvik', 'Star Palace Hotel', 'Hotel Ashoka', 'Similar'] },
      { city: 'Kanyakumari', nights: '1 Night', options: ['The Seashore Hotel', 'Hotel Sahaya Arasi', 'Hotel Sea View', 'Similar'] },
      { city: 'Trivandrum', nights: '1 Night', options: ['Abad Harmonia Resort', 'The Central Residency', 'Keys Select By Lemon Tree Hotels', 'Similar'] },
    ],
  },
};

const packageInclusions = [
  'Accommodation in selected hotel category (Deluxe or Super Deluxe) for 4 Nights / 5 Days.',
  'Daily breakfast at the hotel.',
  'Comfortable private vehicle for all transfers and sightseeing as per the itinerary.',
  'Madurai Airport / Railway Station / Bus Stand pickup.',
  'Trivandrum Airport / Railway Station / Bus Stand drop.',
  'All sightseeing and transfers as mentioned in the day-wise itinerary.',
  'Experienced multilinguistic driver throughout the tour.',
  'Parking charges, toll fees, fuel charges and driver allowances included.',
  'Applicable state taxes and vehicle permit charges included.',
  'Rates are valid for India market only.',
];

const packageExclusions = [
  'Airfare, train tickets or any other transportation tickets not mentioned in the package.',
  'Lunch and dinner.',
  'Entry tickets to monuments, museums, temples, boating and other attractions.',
  'Camera and video charges wherever applicable.',
  'Personal expenses such as laundry, telephone calls, tips, shopping and room service.',
  'Additional sightseeing or vehicle usage beyond the planned itinerary.',
  'Guide charges.',
  'Early check-in or late check-out charges.',
  'Any additional expenses caused by weather conditions, road closures, flight/train delays, natural calamities or unforeseen circumstances.',
  'Anything not specifically mentioned under Package Inclusions.',
];

export default function TamilNaduKerala() {
  const [selectedTier, setSelectedTier] = useState('deluxe');
  const currentPlan = packagesData[selectedTier];
  const [optionIndex, setOptionIndex] = useState(4); // Default to 12 Pax Tempo Traveller (starting price) or 0
  const selectedOption = currentPlan.options[optionIndex] || currentPlan.options[0];
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    message: '',
  });
  const [status, setStatus] = useState('idle');

  const updateForm = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlanSelect = (tierKey) => {
    setSelectedTier(tierKey);
    setStatus('idle');
  };

  const submitEnquiry = async (e) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');

    const guests = selectedOption.paxCount;
    const perPerson = selectedOption.numericPrice;
    const vehicle = selectedOption.vehicle;
    const planName = currentPlan.name;

    try {
      await api.post('/api/holiday-form/', {
        package_type: `The Divine Tamil Nadu & Kerala - ${planName}`,
        start_city: 'Madurai',
        nationality: 'Indian',
        travel_date: form.date,
        rooms: Math.ceil(guests / 2),
        adults: guests,
        children: 0,
        nights: 4,
        star_rating: selectedTier === 'superDeluxe' ? '4-Star' : '3-Star',
        holiday_type: 'Domestic',
        budget: String(perPerson * guests),
        full_name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        room_type: `${planName} Room Category / Similar`,
        meal_plan: 'Daily breakfast included at hotels',
        transfer_details: `${vehicle} for 5 days; Madurai pickup and Trivandrum drop`,
        cities: [
          { destination: 'Madurai', nights: 1 },
          { destination: 'Rameshwaram', nights: 1 },
          { destination: 'Kanyakumari', nights: 1 },
          { destination: 'Trivandrum', nights: 1 },
        ],
        message: `The Divine Tamil Nadu & Kerala Experience Enquiry.
Category: ${planName} (${selectedTier.toUpperCase()})
Selected Group: ${selectedOption.guests} with ${vehicle}
Quoted Rate: INR ${perPerson.toLocaleString('en-IN')} per person
Total Estimated: INR ${(perPerson * guests).toLocaleString('en-IN')} for ${guests} guests
Note: Rates exclude peak seasons. Extra bed available at ${currentPlan.extraBedPrice}.
User Notes: ${form.message.trim() || 'None provided'}`,
      });
      setStatus('success');
    } catch (err) {
      console.error('Enquiry error:', err);
      setStatus('error');
    }
  };

  usePageSEO(
    'The Divine Tamil Nadu & Kerala Experience | 4N / 5D Tour | Goimomi',
    'Experience Madurai, Rameshwaram, Kanyakumari & Trivandrum in 4 Nights / 5 Days. Private cab, hotel stays, daily breakfast & all transfers included. Starting from ₹12,700 per person.',
    heroImage,
    'Tamil Nadu Kerala tour package, Madurai Rameshwaram Kanyakumari Trivandrum tour, Meenakshi Temple package, South India temple tour, Kanyakumari sunset, Rameshwaram tour'
  );

  return (
    <div className="tnk-page trending-page">
      {/* HERO SECTION */}
      <section className="td-hero tnk-hero" aria-labelledby="tnk-title">
        <img 
          className="td-hero-image" 
          src={heroImage} 
          alt="Dravidian temple gopuram towers of South India in warm sunrise light" 
          fetchPriority="high" 
          width="1672" 
          height="941" 
        />
        <div className="td-hero-overlay" />
        <div className="td-container td-hero-content">
          <div className="td-breadcrumb">
            <Link to="/holidayhome">Goimomi Holidays</Link>
            <span>/</span>
            <Link to="/trendingdomesticdestination">Trending Domestic</Link>
            <span>/</span>
            <span>Tamil Nadu & Kerala</span>
          </div>
          <span className="td-eyebrow">THE DIVINE SOUTH INDIA PILGRIMAGE & COASTAL ESCAPE</span>
          <h1 id="tnk-title">The Divine<br />Tamil Nadu &amp; Kerala<br /><em>Experience.</em></h1>
          <p>
            From the soaring temple towers of Madurai and the sacred theerthams of Rameshwaram to the dramatic meeting of three oceans at Kanyakumari and the serene beaches of Trivandrum.
          </p>
          <div className="tnk-hero-chips">
            <span className="tnk-hero-chip"><MapPin size={15} /> Madurai → Rameshwaram → Kanyakumari → Trivandrum</span>
            <span className="tnk-hero-chip"><CalendarDays size={15} /> 4 Nights / 5 Days</span>
            <span className="tnk-hero-chip"><CarFront size={15} /> Private Vehicle &amp; Dedicated Driver</span>
            <span className="tnk-hero-chip"><Compass size={15} /> Pickup: Madurai · Drop: Trivandrum</span>
          </div>
          <div className="tnk-hero-actions">
            <a className="td-button td-button-gold" href="#packages">
              Explore Packages &amp; Stays <ArrowRight size={18} />
            </a>
            <a className="tnk-hero-link" href="#itinerary">
              See the Day-by-Day Itinerary <ArrowRight size={16} />
            </a>
          </div>
          <div className="tnk-hero-bottom">
            <span>All-inclusive private South India circuit</span>
            <span>From <strong>₹12,700</strong> <small>/ person</small></span>
          </div>
          <small className="tnk-image-credit">Representative AI-generated travel photography</small>
        </div>
      </section>

      {/* TRIP FACTS BAR */}
      <div className="tnk-trip-facts">
        <div className="td-container tnk-trip-facts-inner">
          <div className="tnk-fact">
            <div className="tnk-fact-icon"><CalendarDays size={22} strokeWidth={1.5} /></div>
            <div>
              <small>DURATION</small>
              <strong>4 Nights · 5 Days</strong>
            </div>
          </div>
          <div className="tnk-fact">
            <div className="tnk-fact-icon"><MapPin size={22} strokeWidth={1.5} /></div>
            <div>
              <small>SACRED ROUTE</small>
              <strong>Madurai → Trivandrum</strong>
            </div>
          </div>
          <div className="tnk-fact">
            <div className="tnk-fact-icon"><CarFront size={22} strokeWidth={1.5} /></div>
            <div>
              <small>PRIVATE TRANSFERS</small>
              <strong>Sedan / Innova / Tempo</strong>
            </div>
          </div>
          <div className="tnk-fact">
            <div className="tnk-fact-icon"><Utensils size={22} strokeWidth={1.5} /></div>
            <div>
              <small>MEAL INCLUSION</small>
              <strong>Daily Hotel Breakfast</strong>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY NAV */}
      <nav className="tnk-page-nav td-container" aria-label="Explore this tour">
        <a href="#overview">Package Highlights</a>
        <a href="#packages">Packages &amp; Rates</a>
        <a href="#hotels">Proposed Hotels</a>
        <a href="#itinerary">Day-by-Day Itinerary</a>
        <a href="#included">Inclusions &amp; Exclusions</a>
        <a href="#enquire">Get Personalised Quote <ArrowRight size={14} /></a>
      </nav>

      {/* OVERVIEW & HIGHLIGHTS */}
      <section id="overview" className="tnk-highlights-section tnk-section td-container">
        <div className="td-section-heading">
          <div>
            <span className="td-eyebrow">SPIRITUAL WONDERS &amp; COASTAL SPLENDOUR</span>
            <h2>Timeless temples.<br />Endless ocean horizons.<br /><em>A journey of a lifetime.</em></h2>
          </div>
          <p>
            Experience the cultural cradle of Tamil Nadu and the serene coastal grace of Kerala across four legendary destinations, with every transfer and hotel comfortably coordinated.
          </p>
        </div>

        {/* ROUTE VISUAL STRIP */}
        <div className="tnk-route-strip">
          <div className="tnk-route-stop">
            <span>DAY 1 · START</span>
            <strong>Madurai</strong>
            <small>Meenakshi Temple &amp; Palace</small>
          </div>
          <span className="tnk-route-arrow">→</span>
          <div className="tnk-route-stop">
            <span>DAY 2 · 175 KM</span>
            <strong>Rameshwaram</strong>
            <small>Holy Island &amp; Pamban Bridge</small>
          </div>
          <span className="tnk-route-arrow">→</span>
          <div className="tnk-route-stop">
            <span>DAY 3 · 310 KM</span>
            <strong>Kanyakumari</strong>
            <small>Where 3 Oceans Meet</small>
          </div>
          <span className="tnk-route-arrow">→</span>
          <div className="tnk-route-stop">
            <span>DAY 4 &amp; 5 · 95 KM</span>
            <strong>Trivandrum</strong>
            <small>Padmanabhaswamy &amp; Kovalam</small>
          </div>
        </div>

        <div className="tnk-highlights-grid">
          {packageHighlights.map(item => (
            <article key={item.num} className="tnk-highlight-card">
              <span className="tnk-highlight-num">HIGHLIGHT {item.num}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* PACKAGES & RATES */}
      <section id="packages" className="tnk-section tnk-packages-section">
        <div className="td-container">
          <div className="td-section-heading">
            <div>
              <span className="td-eyebrow">TRANSPARENT PRICING · TAILORED FOR YOUR GROUP</span>
              <h2>Choose your stay category.<br /><em>Pick your perfect vehicle.</em></h2>
            </div>
            <p>
              Rates are per person in INR with comfortable private transfers, daily breakfast, multilinguistic driver, parking, toll fees and fuel charges included throughout.
            </p>
          </div>

          {/* TIER TABS */}
          <div className="tnk-category-tabs" role="group" aria-label="Select stay category">
            <button
              type="button"
              className={`tnk-category-tab ${selectedTier === 'deluxe' ? 'active' : ''}`}
              onClick={() => handlePlanSelect('deluxe')}
            >
              <span className="tnk-category-tab-title">Deluxe Package</span>
              <span className="tnk-category-tab-price">Starting from ₹12,700 / person</span>
            </button>
            <button
              type="button"
              className={`tnk-category-tab ${selectedTier === 'superDeluxe' ? 'active' : ''}`}
              onClick={() => handlePlanSelect('superDeluxe')}
            >
              <span className="tnk-category-tab-title">Super Deluxe Package</span>
              <span className="tnk-category-tab-price">Starting from ₹16,500 / person</span>
            </button>
          </div>

          <p className="tnk-category-desc">{currentPlan.description}</p>

          {/* RATE CARDS */}
          <div className="tnk-rate-cards-grid">
            {currentPlan.options.map((opt, idx) => (
              <article 
                key={`${opt.guests}-${opt.vehicle}`} 
                className={`tnk-rate-card ${idx === 4 ? 'featured' : ''}`}
              >
                <span className="tnk-card-badge">{opt.badge}</span>
                <div className="tnk-rate-card-top">
                  <Users size={20} />
                  <h3>{opt.guests}</h3>
                </div>
                <div className="tnk-rate-vehicle"><CarFront size={14} className="inline mr-1" /> {opt.vehicle}</div>

                <div className="tnk-card-price-box">
                  <small>Package Cost / Pax</small>
                  <strong>{opt.price}</strong>
                  <span>Per person ({currentPlan.name})</span>
                </div>

                <ul className="tnk-card-features">
                  <li><Check size={14} /> 4 Nights in selected {currentPlan.name} hotels</li>
                  <li><Check size={14} /> Private {opt.vehicle} for all 5 days</li>
                  <li><Check size={14} /> Daily breakfast at all hotels</li>
                  <li><Check size={14} /> Multilingual driver, tolls, parking &amp; permits</li>
                </ul>

                <a 
                  className="td-button td-button-gold" 
                  href="#enquire"
                  onClick={() => {
                    setOptionIndex(idx);
                    setStatus('idle');
                  }}
                >
                  Enquire for {opt.guests} <ArrowRight size={15} />
                </a>
              </article>
            ))}
          </div>

          {/* SUPPLEMENTS BANNER */}
          <div className="tnk-supplements-banner">
            <div>
              <strong>Extra Bed Supplement:</strong>
              <p>Travelling with an additional adult or child needing an extra bed? Special rates apply.</p>
            </div>
            <div className="tnk-supplements-badge">
              Extra Bed: {currentPlan.extraBedPrice} / person
            </div>
          </div>

          <p className="tnk-disclaimer">
            * Note: Rates are not valid during holiday and peak seasons. Seasonal surcharges may apply. Please confirm the latest rates with our team before final booking.
          </p>

          {/* PROPOSED HOTELS */}
          <div id="hotels" className="tnk-hotels-wrapper">
            <div className="td-section-heading">
              <div>
                <span className="td-eyebrow">YOUR ACCOMMODATION · {currentPlan.tag.toUpperCase()}</span>
                <h2>Proposed hotels &amp; resorts.</h2>
              </div>
              <p>Handpicked comfortable properties across Tamil Nadu and Kerala. Base category rooms or similar.</p>
            </div>

            <div className="tnk-hotels-grid">
              {currentPlan.hotels.map(h => (
                <article key={h.city} className="tnk-hotel-card">
                  <div className="tnk-hotel-header">
                    <h4>{h.city}</h4>
                    <span>{h.nights}</span>
                  </div>
                  <ul className="tnk-hotel-list">
                    {h.options.map(hotelName => (
                      <li key={hotelName}>{hotelName}</li>
                    ))}
                  </ul>
                  <div className="tnk-hotel-footer">
                    {selectedTier === 'superDeluxe' ? 'Super Deluxe Room / Similar' : 'Deluxe Room / Similar'}
                  </div>
                </article>
              ))}
            </div>
            <p className="tnk-disclaimer">
              * Hotel rooms are subject to availability at the time of booking. Similar alternative properties of equal standard will be provided if unavailable.
            </p>
          </div>
        </div>
      </section>

      {/* ITINERARY */}
      <section id="itinerary" className="tnk-section td-container">
        <div className="td-section-heading">
          <div>
            <span className="td-eyebrow">DAY BY DAY JOURNEY</span>
            <h2>Five days of wonder.<br /><em>From temple towers to the ocean edge.</em></h2>
          </div>
          <p>Carefully planned travel times and unhurried temple darshans designed for peaceful exploration.</p>
        </div>

        <div className="tnk-itinerary-layout">
          <figure className="tnk-itinerary-photo-card">
            <img 
              src={kanyakumariPhoto} 
              alt="Vivekananda Rock Memorial and Thiruvalluvar Statue at Kanyakumari during a golden sunset" 
              loading="eager" 
              decoding="async"
              width="1536" 
              height="1024" 
            />
            <figcaption className="tnk-itinerary-photo-caption">
              <span>CAPE COMORIN · WHERE 3 OCEANS MEET</span>
              <strong>Sunset at the edge of India.</strong>
              <p>Witnessing the sunset behind Vivekananda Rock Memorial is one of the most serene moments of the tour.</p>
            </figcaption>
          </figure>

          <div className="tnk-itinerary-list">
            {itinerary.map((item, index) => (
              <article key={item.day} className="tnk-day-card">
                <div className="tnk-day-num-box">
                  <span>DAY</span>
                  <strong>0{index + 1}</strong>
                </div>
                <div className="tnk-day-content">
                  <div className="tnk-day-header">
                    <h3>{item.title}</h3>
                    <span className="tnk-day-travel-badge">{item.travelInfo}</span>
                  </div>
                  <p>{item.description}</p>
                  <div className="tnk-day-badges">
                    {item.highlights.map(hl => (
                      <span key={hl}>{hl}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* INCLUSIONS & EXCLUSIONS */}
      <section id="included" className="tnk-section tnk-details-section">
        <div className="td-container">
          <div className="td-section-heading">
            <div>
              <span className="td-eyebrow">TRANSPARENCY &amp; PEACE OF MIND</span>
              <h2>Package inclusions &amp; <em>exclusions.</em></h2>
            </div>
            <p>Everything clearly laid out so you know exactly what is included in your booking.</p>
          </div>

          <div className="tnk-stay-strip">
            <strong><Hotel size={18} /> Route Breakdown:</strong>
            <span>Madurai <b>1 Night</b></span>
            <span>·</span>
            <span>Rameshwaram <b>1 Night</b></span>
            <span>·</span>
            <span>Kanyakumari <b>1 Night</b></span>
            <span>·</span>
            <span>Trivandrum <b>1 Night</b></span>
            <span>·</span>
            <span>Total <b>4 Nights / 5 Days</b></span>
          </div>

          <div className="tnk-info-grid">
            <article className="tnk-panel">
              <div className="tnk-list-heading">
                <Check size={22} />
                <h3>Package Inclusions</h3>
              </div>
              <ul className="tnk-list">
                {packageInclusions.map(inc => (
                  <li key={inc}>
                    <Check size={15} />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="tnk-panel tnk-panel-excluded">
              <div className="tnk-list-heading">
                <X size={22} />
                <h3>Package Exclusions</h3>
              </div>
              <ul className="tnk-list">
                {packageExclusions.map(exc => (
                  <li key={exc}>
                    <X size={15} />
                    <span>{exc}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ENQUIRY SECTION */}
      <section id="enquire" className="tnk-enquire-section">
        <div className="td-container tnk-enquire-inner">
          <div className="tnk-enquire-copy">
            <span className="td-eyebrow">LET’S PLAN YOUR SOUTH INDIA PILGRIMAGE</span>
            <h2>Ready to experience<br /><em>The Divine Journey?</em></h2>
            <p>
              Tell us your travel dates and group details. Our destination experts will promptly confirm availability, provide personalised quotes, and assist with any custom additions.
            </p>

            <div className="tnk-callout">
              <Phone size={24} strokeWidth={1.5} color="#e5be7a" />
              <div>
                <small>Need instant assistance?</small>
                <a href="tel:+918110082222">+91 8110082222</a>
              </div>
            </div>

            <div className="tnk-enquire-route">
              <span>MADURAI</span>
              <i />
              <span>RAMESHWARAM</span>
              <i />
              <span>KANYAKUMARI</span>
              <i />
              <span>TRIVANDRUM</span>
            </div>
          </div>

          <div className="tnk-enquire-card holiday-enquiry-card">
            <span className="td-eyebrow">CONFIDENTIAL &amp; NO OBLIGATION</span>
            <h3>Request Your Tour Quote</h3>

            <form className="tnk-enquiry-form" onSubmit={submitEnquiry}>
              <div className="tnk-form-summary">
                <div>
                  <strong>{currentPlan.name} · {selectedOption.guests}</strong>
                  <div className="text-[11px] text-gray-500">{selectedOption.vehicle}</div>
                </div>
                <span>{selectedOption.price} / person</span>
              </div>

              <label>
                Package Tier
                <select
                  value={selectedTier}
                  onChange={(e) => {
                    setSelectedTier(e.target.value);
                    setStatus('idle');
                  }}
                  disabled={status === 'submitting'}
                >
                  <option value="deluxe">Deluxe Package (From ₹12,700 / pax)</option>
                  <option value="superDeluxe">Super Deluxe Package (From ₹16,500 / pax)</option>
                </select>
              </label>

              <label>
                Group Size &amp; Vehicle
                <select
                  value={optionIndex}
                  onChange={(e) => {
                    setOptionIndex(Number(e.target.value));
                    setStatus('idle');
                  }}
                  disabled={status === 'submitting'}
                >
                  {currentPlan.options.map((opt, idx) => (
                    <option key={`${opt.guests}-${opt.vehicle}`} value={idx}>
                      {opt.guests} — {opt.vehicle} ({opt.price} / pax)
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Full Name
                <input
                  name="name"
                  value={form.name}
                  onChange={updateForm}
                  required
                  autoComplete="name"
                  maxLength={100}
                  placeholder="Your full name"
                />
              </label>

              <label>
                Email Address
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateForm}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>

              <label>
                Phone Number
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateForm}
                  required
                  autoComplete="tel"
                  maxLength={20}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label>
                Travel Date
                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={updateForm}
                  required
                  min={new Date().toLocaleDateString('en-CA')}
                />
              </label>

              <label className="tnk-form-wide">
                Special Requests / Notes (Optional)
                <textarea
                  name="message"
                  value={form.message}
                  onChange={updateForm}
                  rows={3}
                  placeholder="Extra bed requirement, pickup timings, or preferences..."
                />
              </label>

              <button
                type="submit"
                className="td-button td-button-gold"
                disabled={status === 'submitting' || status === 'success'}
              >
                {status === 'submitting' ? 'Submitting Enquiry...' : status === 'success' ? 'Enquiry Received ✓' : 'Send Quote Request'} <ArrowRight size={16} />
              </button>

              <small className="tnk-form-wide tnk-form-footnote">
                No payment required now. Our team will verify dates, check hotel availability, and contact you directly.
              </small>

              {status === 'success' && (
                <div className="tnk-form-wide tnk-enquiry-status success" role="status">
                  ✓ Your enquiry has been successfully received! Our travel specialist will contact you with availability and your custom itinerary.
                </div>
              )}

              {status === 'error' && (
                <div className="tnk-form-wide tnk-enquiry-status error" role="alert">
                  We could not submit your enquiry right now. Please try again or call our support directly at +91 8110082222.
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* TRENDING DOMESTIC DESTINATIONS CAROUSEL */}
      <TrendingDomesticDestinations />
    </div>
  );
}
