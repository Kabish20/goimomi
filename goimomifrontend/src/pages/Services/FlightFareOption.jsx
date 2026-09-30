import React, { useState } from 'react';
import { Info } from 'lucide-react';

const descriptions = {
  STUDENT: 'Carry a valid student ID and student visa where required. Age and benefits vary by airline. Without proof, regular fares or baggage charges may apply.',
  SENIOR_CITIZEN: 'Carry government-issued ID showing your date of birth. Minimum age varies by airline. Without proof of eligibility, regular fares may apply.',
};

export default function FlightFareOption({ value, label, selected, onChange }) {
  const [show, setShow] = useState(false);
  const description = descriptions[value];
  const id = `fare-info-${value}`;
  return <div className="flight-fare-option" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setShow(false); }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setShow(false); } }}>
    <label><input type="radio" name="fareType" value={value} checked={selected} aria-describedby={description && show ? id : undefined} onFocus={() => setShow(true)} onChange={onChange} />{label}</label>
    {description && <><button type="button" className="fare-info-trigger" aria-label={`${label} fare eligibility`} aria-expanded={show} aria-controls={id} onClick={() => setShow(true)}><Info size={14} /></button>{show && <div id={id} role="tooltip" className="flight-fare-tooltip">{description}</div>}</>}
  </div>;
}
