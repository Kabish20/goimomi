import { Link } from 'react-router-dom';
import TrendingInternationalDestinations from '../../../components/holidays/TrendingInternationalDestinations';
import usePageSEO from '../../../hooks/usePageSEO';
import './trendingCollections.css';

export default function TrendingInternational() {
  usePageSEO('Trending International Holidays | Goimomi', 'Discover Thailand, Dubai, Bali and Azerbaijan with curated international holiday packages, detailed itineraries and airport transfers.', '/images/thailand/pattaya-bangkok.png');
  return <main className="trending-collection-page">
    <header className="trending-collection-intro"><nav aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/holidays?category=International">International Holidays</Link></nav><h1>Trending International</h1><p>New places, beautiful experiences and journeys to remember.</p><Link to="/trendingdomesticdestination">Explore domestic holidays →</Link></header>
    <TrendingInternationalDestinations />
  </main>;
}
