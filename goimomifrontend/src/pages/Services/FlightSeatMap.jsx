import React, { useState } from 'react';
import { Armchair, Check, X } from 'lucide-react';
import { money } from './flightUtils';

/**
 * Pre-seeded realistic booked seats matching standard airline occupancy and Image 5
 */
const BOOKED_SEATS_SET = new Set(['2C', '1A', '3D', '6A', '8D', '11C', '14F']);

/**
 * Pricing and attribute tier definitions matching Image 5:
 * - ₹0.00 (Standard Free): Rows 3-5
 * - Extra Legroom: Row 1-2 (Peach/coral)
 * - Exit Row Seats: Row 12 (Sage/teal)
 * - ₹80 - 160: Rows 6-11 (Sky Blue)
 * - ₹240 - 240: Rows 12-14 (Lavender)
 * - ₹250+: Rows 15-16 (Warm Tan/Orange)
 */
function getSeatInfo(row, col) {
  if (row === 1 || row === 2) {
    return { price: 350, label: 'Extra Legroom', type: 'legroom', colorClass: 'tier-legroom' };
  }
  if (row === 12) {
    return { price: 240, label: 'Exit Row Seats', type: 'exit', colorClass: 'tier-exit' };
  }
  if (row >= 3 && row <= 5) {
    return { price: 0, label: 'Standard Free', type: 'free', colorClass: 'tier-free' };
  }
  if (row >= 6 && row <= 11) {
    return { price: 120, label: '₹80 - 160', type: 'mid', colorClass: 'tier-blue' };
  }
  if (row >= 13 && row <= 14) {
    return { price: 240, label: '₹240 - 240', type: 'high', colorClass: 'tier-purple' };
  }
  return { price: 280, label: '₹280+', type: 'rear', colorClass: 'tier-orange' };
}

export default function FlightSeatMap({
  segments = [],
  passengers = [{ title: 'Mr', firstName: 'Vijay', lastName: 'D' }],
  selectedSeats = {}, // { [segIdx]: { [paxIdx]: seatPayload } }
  onSelectSeat,
}) {
  const [activeSegIdx, setActiveSegIdx] = useState(0);
  const [activePaxIdx, setActivePaxIdx] = useState(0);

  const currentSegment = segments[activeSegIdx] || segments[0] || {};
  const originCode = currentSegment.da?.code || 'MAA';
  const destCode = currentSegment.aa?.code || 'TRZ';

  const currentSegSeats = selectedSeats[activeSegIdx] || {};
  const totalPax = passengers.length || 1;
  const currentAssignedCount = Object.keys(currentSegSeats).length;

  // 16 rows of horizontal aircraft layout matching Image 5
  const rows = Array.from({ length: 16 }, (_, i) => i + 1);

  // Compute total seat fee for active segment
  const totalSeatFee = Object.values(currentSegSeats).reduce((sum, s) => sum + Number(s?.price || 0), 0);

  function handleSeatClick(seatCode, info) {
    if (BOOKED_SEATS_SET.has(seatCode)) return;

    // Check if seat is selected by another passenger
    const existingPaxForSeat = Object.entries(currentSegSeats).find(
      ([pIdx, s]) => s?.code === seatCode && Number(pIdx) !== activePaxIdx
    );
    if (existingPaxForSeat) return;

    // Toggle off if already selected by this passenger
    if (currentSegSeats[activePaxIdx]?.code === seatCode) {
      if (onSelectSeat) onSelectSeat(activeSegIdx, activePaxIdx, null);
      return;
    }

    const seatPayload = {
      code: seatCode,
      price: info.price,
      label: info.label,
      type: info.type,
      segment: `${originCode} - ${destCode}`,
    };

    if (onSelectSeat) {
      onSelectSeat(activeSegIdx, activePaxIdx, seatPayload);
    }

    // Advance to next unassigned passenger
    const nextUnassigned = passengers.findIndex((_, idx) => !currentSegSeats[idx] && idx !== activePaxIdx);
    if (nextUnassigned !== -1) {
      setActivePaxIdx(nextUnassigned);
    }
  }

  const activePax = passengers[activePaxIdx] || passengers[0] || { firstName: 'ADULT', label: 'ADULT-1' };

  return (
    <div className="tj-seatmap-container">
      {/* Header bar matching Image 5 */}
      <div className="tj-seatmap-top-bar">
        <div className="tj-seatmap-title">
          <Armchair size={18} />
          <strong>SELECT SEAT</strong>
        </div>
        <div className="tj-seatmap-route-pill">
          <span>{originCode}</span>
          <span className="tj-seatmap-plane">✈</span>
          <span>{destCode}</span>
          <strong>{currentAssignedCount}/{totalPax}</strong>
        </div>
      </div>

      {/* Legend Rows matching Image 5 */}
      <div className="tj-seatmap-legend-wrap">
        <div className="tj-legend-row">
          <span className="tj-legend-heading">SEAT STATUS:</span>
          <div className="tj-legend-item">
            <span className="tj-legend-badge status-selected"><Check size={12} strokeWidth={3} /></span>
            <span>Selected</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-legend-badge status-booked"><X size={12} strokeWidth={3} /></span>
            <span>Booked</span>
          </div>
        </div>

        <div className="tj-legend-row tj-attr-row">
          <span className="tj-legend-heading">SEAT ATTRIBUTES:</span>
          <div className="tj-legend-item">
            <span className="tj-attr-box tier-free" />
            <span>₹0.00</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-attr-box tier-legroom" />
            <span>Extra Legroom</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-attr-box tier-exit" />
            <span>Exit Row Seats</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-attr-box tier-blue" />
            <span>₹80 - 160</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-attr-box tier-purple" />
            <span>₹240 - 240</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-attr-box tier-orange" />
            <span>₹280+</span>
          </div>
        </div>
      </div>

      {/* Horizontal Airplane Viewport matching Image 5 */}
      <div className="tj-plane-viewport">
        <div className="tj-plane-fuselage">
          {/* Airplane Nose / Cockpit on Left */}
          <div className="tj-plane-nose">
            <div className="tj-cockpit-glass" />
            <span className="tj-nose-label">{currentSegment.fD?.aI?.name || 'A320'}</span>
          </div>

          {/* Seat Grid: Columns F, D (Top), Row Numbers (Aisle), Columns C, A (Bottom) */}
          <div className="tj-plane-grid">
            {/* Column Label: F */}
            <div className="tj-seat-row-strip">
              <span className="tj-col-char">F</span>
              {rows.map(r => {
                const code = `${r}F`;
                const info = getSeatInfo(r, 'F');
                const isBooked = BOOKED_SEATS_SET.has(code);
                const isSelected = Object.values(currentSegSeats).some(s => s?.code === code);
                const isMine = currentSegSeats[activePaxIdx]?.code === code;

                return (
                  <button
                    key={code}
                    type="button"
                    disabled={isBooked}
                    onClick={() => handleSeatClick(code, info)}
                    title={`${code} (${info.label}) - ${info.price === 0 ? 'Free' : money(info.price)}`}
                    className={`tj-seat-unit ${info.colorClass} ${isBooked ? 'is-booked' : ''} ${isSelected ? 'is-selected' : ''} ${isMine ? 'is-mine' : ''}`}
                  >
                    {isBooked ? <X size={11} strokeWidth={2.5} /> : isSelected ? <Check size={11} strokeWidth={3} /> : code}
                  </button>
                );
              })}
            </div>

            {/* Column Label: D */}
            <div className="tj-seat-row-strip">
              <span className="tj-col-char">D</span>
              {rows.map(r => {
                const code = `${r}D`;
                const info = getSeatInfo(r, 'D');
                const isBooked = BOOKED_SEATS_SET.has(code);
                const isSelected = Object.values(currentSegSeats).some(s => s?.code === code);
                const isMine = currentSegSeats[activePaxIdx]?.code === code;

                return (
                  <button
                    key={code}
                    type="button"
                    disabled={isBooked}
                    onClick={() => handleSeatClick(code, info)}
                    title={`${code} (${info.label}) - ${info.price === 0 ? 'Free' : money(info.price)}`}
                    className={`tj-seat-unit ${info.colorClass} ${isBooked ? 'is-booked' : ''} ${isSelected ? 'is-selected' : ''} ${isMine ? 'is-mine' : ''}`}
                  >
                    {isBooked ? <X size={11} strokeWidth={2.5} /> : isSelected ? <Check size={11} strokeWidth={3} /> : code}
                  </button>
                );
              })}
            </div>

            {/* Aisle Row with Row Numbers (1 to 16) */}
            <div className="tj-aisle-number-strip">
              <span className="tj-col-char tj-aisle-blank" />
              {rows.map(r => (
                <span key={r} className="tj-aisle-row-num">{r}</span>
              ))}
            </div>

            {/* Column Label: C */}
            <div className="tj-seat-row-strip">
              <span className="tj-col-char">C</span>
              {rows.map(r => {
                const code = `${r}C`;
                const info = getSeatInfo(r, 'C');
                const isBooked = BOOKED_SEATS_SET.has(code);
                const isSelected = Object.values(currentSegSeats).some(s => s?.code === code);
                const isMine = currentSegSeats[activePaxIdx]?.code === code;

                return (
                  <button
                    key={code}
                    type="button"
                    disabled={isBooked}
                    onClick={() => handleSeatClick(code, info)}
                    title={`${code} (${info.label}) - ${info.price === 0 ? 'Free' : money(info.price)}`}
                    className={`tj-seat-unit ${info.colorClass} ${isBooked ? 'is-booked' : ''} ${isSelected ? 'is-selected' : ''} ${isMine ? 'is-mine' : ''}`}
                  >
                    {isBooked ? <X size={11} strokeWidth={2.5} /> : isSelected ? <Check size={11} strokeWidth={3} /> : code}
                  </button>
                );
              })}
            </div>

            {/* Column Label: A */}
            <div className="tj-seat-row-strip">
              <span className="tj-col-char">A</span>
              {rows.map(r => {
                const code = `${r}A`;
                const info = getSeatInfo(r, 'A');
                const isBooked = BOOKED_SEATS_SET.has(code);
                const isSelected = Object.values(currentSegSeats).some(s => s?.code === code);
                const isMine = currentSegSeats[activePaxIdx]?.code === code;

                return (
                  <button
                    key={code}
                    type="button"
                    disabled={isBooked}
                    onClick={() => handleSeatClick(code, info)}
                    title={`${code} (${info.label}) - ${info.price === 0 ? 'Free' : money(info.price)}`}
                    className={`tj-seat-unit ${info.colorClass} ${isBooked ? 'is-booked' : ''} ${isSelected ? 'is-selected' : ''} ${isMine ? 'is-mine' : ''}`}
                  >
                    {isBooked ? <X size={11} strokeWidth={2.5} /> : isSelected ? <Check size={11} strokeWidth={3} /> : code}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar matching Image 5: ADULT-1 SELECT SEAT & Total Seat Fee */}
      <div className="tj-seatmap-bottom-bar">
        <div className="tj-seatmap-pax-tabs">
          {passengers.map((p, idx) => {
            const isCur = idx === activePaxIdx;
            const assigned = currentSegSeats[idx];
            return (
              <button
                key={idx}
                type="button"
                className={`tj-pax-select-pill ${isCur ? 'is-active' : ''}`}
                onClick={() => setActivePaxIdx(idx)}
              >
                <span>{p.label || `ADULT-${idx + 1}`}</span>
                <strong>{assigned ? `SEAT: ${assigned.code}` : 'SELECT SEAT'}</strong>
              </button>
            );
          })}
        </div>

        <div className="tj-seatmap-fee-display">
          <span>Total Seat Fee : </span>
          <strong>{money(totalSeatFee)}</strong>
        </div>
      </div>
    </div>
  );
}
