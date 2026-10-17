import DestinationCard from './DestinationCard';
import { stays } from '../../pages/Holidays/Manali/manaliData';
import { packages as andamanPackages } from '../../pages/Holidays/Andaman/andamanData';
import { hotels as goaHotels } from '../../pages/Holidays/Goa/goaData';
import { packages as keralaPackages, lowestPrice } from '../../pages/Holidays/Kerala/keralaData';
import './TrendingDomesticDestinations.css';

const destinations = [
  {
    name: 'Kerala',
    region: 'Hills, Backwaters & Kannur',
    startingPrice: Math.min(...keralaPackages.map(lowestPrice)),
    highlights: ['2 or 4 nights / 3 or 5 days', 'Green Triangle & Kannur journeys', 'Breakfast & private transport'],
    image: '/images/kerala/kerala-backwaters-hero.png',
    imageAlt: 'Kerala-inspired palm-lined backwaters with a traditional wooden houseboat',
    description: 'Tea-green hills, tranquil backwaters and the living traditions of Kannur.',
    path: '/kerala',
  },
  {
    name: 'Kashmir',
    region: 'North India',
    startingPrice: 6499,
    highlights: ['4 nights / 5 days', 'Srinagar, Gulmarg & Pahalgam', 'Budget & private holiday options'],
    image: '/images/kashmir/kashmir-destination-card.webp',
    imageAlt: 'Kashmir-inspired scene of a yellow-canopied shikara on a lake beneath Himalayan mountains',
    description: 'Shikara rides, alpine meadows and scenic mountain escapes.',
    path: '/kashmir',
  },
  {
    name: 'Manali',
    region: 'Himachal Pradesh',
    startingPrice: Math.min(...stays.map(stay => stay.price / 2)),
    highlights: ['3 nights / 4 days', 'Solang Valley & Atal Tunnel', 'Private cab from Chandigarh'],
    image: '/images/manali/manali-destination-card.webp',
    imageAlt: 'Manali-inspired scene of a turquoise river, pine forests and snow-capped Himalayan peaks',
    description: 'A private Himalayan escape through scenic valleys and pine forests.',
    path: '/manali',
  },
  {
    name: 'Andaman',
    region: 'Andaman & Nicobar Islands',
    startingPrice: Math.min(...andamanPackages.map(option => option.price)),
    highlights: ['3 or 4 nights / 4 or 5 days', 'Port Blair, Ross Island & North Bay', 'Private transfers & ferry excursions'],
    image: '/images/andaman/andaman-destination-card.jpg',
    imageAlt: 'Andaman Islands pristine white beach with turquoise water, coral reef and a wooden boat',
    description: 'Island history, clear water and a slower winter rhythm by the sea.',
    path: '/andaman',
  },
  {
    name: 'Goa',
    region: 'North & South Goa',
    startingPrice: Math.min(...goaHotels.map(hotel => hotel.pricePerAdult)),
    highlights: ['3 nights / 4 days', '6 adults · 2 rooms', 'Breakfast & private Innova Crysta'],
    image: '/images/goa/goa-coast-hero.webp',
    imageAlt: 'Goa-inspired golden beach, coconut palms and a coastal fort by the Arabian Sea',
    description: 'Beach days, colourful streets and a private Innova Crysta for your group.',
    path: '/goa',
  },
  {
    name: 'Delhi Agra Jaipur',
    region: 'Golden Triangle',
    startingPrice: 14650,
    highlights: ['4 nights / 5 days', 'Delhi → Agra → Jaipur → Delhi', 'Private cab, breakfasts, dinners & sightseeing'],
    image: '/images/trending/golden-triangle-tour.jpg',
    imageAlt: 'Golden Triangle tour featuring the Taj Mahal in Agra, Hawa Mahal in Jaipur, and Red Fort in Delhi',
    description: 'Historic landmarks, iconic Mughal grandeur and the royal heritage of Jaipur in one classic India circuit.',
    path: '/golden-triangle',
  },
  {
    name: 'Tamil Nadu & Kerala',
    region: 'The Divine Experience',
    startingPrice: 12700,
    highlights: ['4 nights / 5 days', 'Madurai → Rameshwaram → Kanyakumari → Trivandrum', 'Meenakshi Temple, Pamban Bridge & ocean sunsets'],
    image: '/images/trending/tamilnadu-kerala-tour.jpg',
    imageAlt: 'The Divine Tamil Nadu & Kerala Experience featuring sacred temple towers and ocean horizons',
    description: 'Ancient temple architecture, sacred island bridges, tri-sea oceanic sunsets and peaceful Kerala shores.',
    path: '/tamil-nadu-kerala',
  },
];

/* Duplicate for seamless infinite loop */
const loopedDestinations = [...destinations, ...destinations];

export default function TrendingDomesticDestinations({ layout = 'marquee' }) {
  return (
    <section className="domestic-trending-section" aria-labelledby="domestic-trending-title">
      <div className="domestic-trending-container">
        <div className="domestic-trending-heading">
          <div>
            <span className="domestic-trending-eyebrow">DISCOVER INCREDIBLE INDIA</span>
            <h2 id="domestic-trending-title">Trending Domestic Destinations</h2>
          </div>
          <p>Choose your next Indian escape and start planning something beautiful.</p>
        </div>
      </div>

      {/* Full-width marquee strip — outside the container so it bleeds edge-to-edge */}
      <div className={`domestic-trending-overflow${layout === 'grid' ? ' domestic-trending-grid-view' : ''}`} aria-label={layout === 'grid' ? 'Domestic destination cards' : 'Scrolling destination cards'}>
        <div className="domestic-trending-track">
          {(layout === 'grid' ? destinations : loopedDestinations).map((destination, index) => (
            <DestinationCard key={`${destination.name}-${index}`} destination={destination} duplicate={index >= destinations.length} eager={index < destinations.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
