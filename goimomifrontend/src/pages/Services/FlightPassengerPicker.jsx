import React, { useEffect, useRef, useState } from 'react';
import { Armchair, Check, ChevronDown, X } from 'lucide-react';
import { cabinLabel } from './flightUtils';

export default function FlightPassengerPicker({ pax, setPax, cabin, setCabin }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const trigger = useRef(null);
  const closeButton = useRef(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const outside = event => { if (!wrapper.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const count = Object.values(pax).reduce((sum, value) => sum + value, 0);
  function choose(type, value) {
    if (type === 'ADULT') setPax({ ...pax, ADULT: value, CHILD: Math.min(pax.CHILD, value, 9 - value), INFANT: Math.min(pax.INFANT, value) });
    else setPax({ ...pax, [type]: value });
  }
  return <div ref={wrapper} className="flight-pax-wrap" onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); close(); } }}>
    <button ref={trigger} type="button" className="flight-pax-trigger" aria-expanded={open} aria-controls="flight-passenger-panel" aria-haspopup="dialog" onClick={() => setOpen(!open)}><Armchair /><span>{count} Passenger{count > 1 ? 's' : ''} | {cabinLabel(cabin)}</span><ChevronDown size={15} /></button>
    {open && <div id="flight-passenger-panel" className="flight-passenger-picker" role="dialog" aria-label="Passengers and cabin class">
      <div className="passenger-counts">
        <div className="passenger-picker-heading"><h2>Select passenger</h2><button ref={closeButton} type="button" aria-label="Close passenger selector" onClick={close}><X size={20} /></button></div>
        {[['ADULT', 'Adult', 'Age 12+'], ['CHILD', 'Children', 'Age 2–11'], ['INFANT', 'Infant', 'Under 2 years']].map(([type, label, age]) => <fieldset key={type} className="passenger-count-group"><legend>{label} <span>{age}</span></legend><div className="passenger-number-options">{Array.from({ length: type === 'INFANT' && pax.ADULT === 9 ? 10 : 9 }, (_, index) => type === 'ADULT' ? index + 1 : index).map(value => <button type="button" key={value} aria-label={`${label}: ${value}`} aria-pressed={pax[type] === value} disabled={type === 'CHILD' ? value > pax.ADULT || value + pax.ADULT > 9 : type === 'INFANT' && value > pax.ADULT} onClick={() => choose(type, value)}>{value}</button>)}</div></fieldset>)}
        <p className="passenger-limit-note">Up to 9 seated passengers. Infants travel with an adult.</p>
      </div>
      <div className="passenger-cabins"><h2>Select class</h2><div className="passenger-cabin-options">{['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].map(value => <label key={value}><input type="radio" name="flight-cabin" value={value} checked={cabin === value} onChange={() => setCabin(value)} /><span>{cabinLabel(value)}</span><span className="cabin-choice-mark" aria-hidden="true">{cabin === value && <Check size={17} />}</span></label>)}</div><button type="button" className="passenger-done" onClick={close}>Done</button></div>
    </div>}
  </div>;
}
