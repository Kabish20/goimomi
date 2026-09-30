import DestinationCard from './DestinationCard';
import { hotels } from '../../pages/Holidays/Azerbaijan/azerbaijanData';
import { trip as baliTrip } from '../../pages/Holidays/Bali/baliData';
import { trip as dubaiTrip } from '../../pages/Holidays/Dubai/dubaiData';
import { trip as thailandTrip } from '../../pages/Holidays/Thailand/thailandData';
import './TrendingDomesticDestinations.css';

const destinations = [
  { name: 'Thailand', region: 'Pattaya & Bangkok', path: '/thailand', image: thailandTrip.image, imageAlt: thailandTrip.imageAlt, startingPrice: 9499, priceLabel: 'Per adult · 10 adults · double sharing', description: 'Coral Island, Thai temples and private transfers, with 2 nights Pattaya and 1 night Bangkok.', highlights: [thailandTrip.duration, '2 nights Pattaya + 1 night Bangkok', 'Coral Island & Indian Buffet Lunch', 'From ₹9,499 for a group of 10 adults'] },
  { name: 'Dubai', region: 'City, Creek & Desert', path: '/dubai', image: dubaiTrip.image, imageAlt: dubaiTrip.imageAlt, startingPrice: dubaiTrip.pricePerAdult, description: 'Discover Dubai with a city tour, Creek dinner cruise and deluxe desert safari.', highlights: [dubaiTrip.duration, '3★ Citymax Bur Dubai', 'Breakfast, cruise & desert safari'] },
  { name: 'Azerbaijan', region: 'Baku & the Caucasus', path: '/azerbaijan', image: '/images/azerbaijan/baku-hero.webp', imageAlt: 'Baku-inspired skyline with the Flame Towers and Caspian waterfront at sunset', startingPrice: Math.min(...hotels.map(hotel => hotel.price / 2)), description: 'Discover Baku’s skyline, mountain scenery and the Land of Fire.', highlights: ['4 nights / 5 days', 'Baku, Shahdag & Absheron', 'Private transfers & breakfast'] },
  { name: 'Bali', region: 'Ubud, Kintamani & South Bali', path: '/bali', image: baliTrip.image, imageAlt: 'Traditional Balinese temple beside a lake at sunset', startingPrice: baliTrip.pricePerAdult, description: 'Temple sunsets, Melasti Beach and Ubud waterfalls. Without Bali Swing.', highlights: [baliTrip.duration, 'BRTIS HOTEL · Low Season 2026', 'Private tours & daily breakfast'] },
];

const loopedDestinations = [...destinations, ...destinations];

export default function TrendingInternationalDestinations({ layout = 'marquee' }) {
  return (
    <section className="domestic-trending-section international-trending-section" aria-labelledby="international-trending-title">
      <div className="domestic-trending-container">
        <div className="domestic-trending-heading">
          <div>
            <span className="domestic-trending-eyebrow">DISCOVER BEYOND BORDERS</span>
            <h2 id="international-trending-title">Trending International Destinations</h2>
          </div>
          <p>Discover your next international escape, thoughtfully planned for you.</p>
        </div>
      </div>
      <div className={`domestic-trending-overflow${layout === 'grid' ? ' domestic-trending-grid-view' : ''}`} aria-label={layout === 'grid' ? 'International destination cards' : 'Scrolling international destination cards'}>
        <div className="domestic-trending-track">
          {(layout === 'grid' ? destinations : loopedDestinations).map((destination, index) => (
            <DestinationCard key={`${destination.path}-${index}`} destination={destination} duplicate={index >= destinations.length} eager={index < destinations.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
