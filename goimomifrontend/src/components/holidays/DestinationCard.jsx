import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DestinationCard({ destination, duplicate = false, eager = false }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const closeTimer = useRef();
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  return <article
    className="domestic-trending-card destination-disclosure-card"
    aria-hidden={duplicate || undefined}
    onPointerEnter={event => {
      clearTimeout(closeTimer.current);
      if (event.pointerType === 'mouse') setExpanded(true);
    }}
    onPointerLeave={event => {
      const card = event.currentTarget;
      if (event.pointerType === 'mouse') closeTimer.current = setTimeout(() => {
        if (!card.contains(document.activeElement)) setExpanded(false);
      }, 120);
    }}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.matches(':hover')) setExpanded(false);
    }}
    onKeyDown={event => {
      if (event.key === 'Escape' && expanded) {
        clearTimeout(closeTimer.current);
        setExpanded(false);
        event.currentTarget.querySelector('.destination-card-toggle').focus();
      }
    }}
  >
    <Link className="destination-card-image-link" to={destination.path} tabIndex={duplicate ? -1 : undefined} aria-label={`View ${destination.name} package`}>
      <img src={destination.image} alt={destination.imageAlt} loading={eager ? 'eager' : 'lazy'} decoding="async" width="800" height="533" />
    </Link>
    <div className="destination-card-price"><span>Starting From</span><strong>₹{destination.startingPrice.toLocaleString('en-IN')}</strong><small>{destination.priceLabel || 'Per Person'}</small></div>
    <div className="destination-card-panel">
      <h3><button type="button" className="destination-card-toggle" aria-label={`${destination.name} details`} aria-expanded={expanded} aria-controls={detailsId} tabIndex={duplicate ? -1 : undefined} onClick={() => setExpanded(value => !value)}>
        <span className="destination-card-labels"><span className="destination-card-region">{destination.region}</span><span className="destination-card-name">{destination.name}</span></span><ChevronDown size={20} aria-hidden="true" />
      </button></h3>
      <div id={detailsId} aria-hidden={!expanded} inert={!expanded ? '' : undefined} data-expanded={expanded} className="destination-card-details"><div className="destination-card-details-inner">
        <p className="sr-only">{destination.description}</p>
        <ul>{destination.highlights.map(highlight => <li key={highlight}><CheckCircle2 size={14} aria-hidden="true" /><span>{highlight}</span></li>)}</ul>
        <Link className="destination-card-explore" to={destination.path} tabIndex={duplicate ? -1 : undefined}>Explore {destination.name}<ArrowRight size={15} aria-hidden="true" /></Link>
      </div></div>
    </div>
  </article>;
}
