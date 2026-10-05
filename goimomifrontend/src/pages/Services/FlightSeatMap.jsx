import React, { useState } from 'react';
import { Armchair, Check, X, ShieldAlert } from 'lucide-react';
import { money } from './flightUtils';

/**
 * Pre-seeded realistic booked seats for visual authenticity and collision checking.
 * Matches standard airline seat allocation patterns.
 */
const BOOKED_SEATS_SET = new Set(['1C', '2A', '3B', '5E', '6F', '8A', '9C', '11D', '12B', '14E']);

/**
 * FlightSeatMap
 * 
 * Interactive airline seat selector designed around standard commercial narrow-body
 * aircraft (Airbus A320 / Boeing 737) with a 3-3 seat configuration (Rows 1-15).
 * Supports multi-segment flights and multi-passenger seat assignment with tier pricing.
 *
 * @param {Object} props
 * @param {Array} props.segments - List of flight segments (legs) in the booking
 * @param {Array} props.passengers - List of passenger profiles requiring seat assignments
 * @param {Object} props.selectedSeats - Map of selected seats structured as { [segIdx]: { [paxIdx]: seatPayload } }
 * @param {Function} props.onSelectSeat - Callback invoked when a seat is chosen or deselected
 */
export default function FlightSeatMap({
  segments = [],
  passengers = [{ title: 'Mr', firstName: 'Rahul', lastName: 'Sharma' }],
  selectedSeats = {}, // { [segIdx]: { [paxIdx]: seat } }
  onSelectSeat,
}) {
  // Currently active flight segment tab index (for multi-leg journeys)
  const [activeSegIdx, setActiveSegIdx] = useState(0);

  // Currently focused passenger index who is choosing a seat
  const [activePaxIdx, setActivePaxIdx] = useState(0);

  // Current flight segment details and IATA codes
  const currentSegment = segments[activeSegIdx] || segments[0] || {};
  const originCode = currentSegment.da?.code || 'MAA';
  const destCode = currentSegment.aa?.code || 'DXB';

  // Seats allocated for the active flight segment
  const currentSegSeats = selectedSeats[activeSegIdx] || {};
  const selectedCount = Object.keys(currentSegSeats).length;
  const totalPax = passengers.length || 1;

  // 15 rows of standard A320 / B737 layout: 3-3 configuration (A-B-C / D-E-F)
  const rows = Array.from({ length: 15 }, (_, i) => i + 1);

  /**
   * Calculates pricing and categorization tier based on seat row and column.
   *
   * @param {number} rowNumber - The 1-indexed row number
   * @param {string} _colLetter - The seat column letter (A, B, C, D, E, F)
   * @returns {Object} Seat pricing metadata { price, label, type }
   */
  function getSeatPrice(rowNumber, _colLetter) {
    if (rowNumber === 1) return { price: 450, label: 'Extra Legroom', type: 'legroom' };
    if (rowNumber === 12 || rowNumber === 13) return { price: 350, label: 'Exit Row Seats', type: 'exit' };
    if (rowNumber <= 5) return { price: 150, label: 'Front Row', type: 'preferred' };
    return { price: 0, label: 'Standard', type: 'free' };
  }

  /**
   * Handles user interaction when selecting or deselecting a seat in the grid.
   * Prevents booking collisions and automatically advances to next unassigned passenger.
   *
   * @param {string} seatCode - Seat coordinate code (e.g. '12A')
   * @param {Object} seatInfo - Seat metadata including price and category tier
   */
  function handleSeatClick(seatCode, seatInfo) {
    if (BOOKED_SEATS_SET.has(seatCode)) return;

    // Verify seat is not already claimed by another passenger in this flight leg
    const existingPaxForSeat = Object.entries(currentSegSeats).find(
      ([pIdx, s]) => s?.code === seatCode && Number(pIdx) !== activePaxIdx
    );
    if (existingPaxForSeat) return;

    // Toggle: unselect seat if the currently active passenger clicks their own assigned seat
    if (currentSegSeats[activePaxIdx]?.code === seatCode) {
      if (onSelectSeat) onSelectSeat(activeSegIdx, activePaxIdx, null);
      return;
    }

    const seatPayload = {
      code: seatCode,
      price: seatInfo.price,
      label: seatInfo.label,
      type: seatInfo.type,
      segment: `${originCode} - ${destCode}`,
    };

    if (onSelectSeat) {
      onSelectSeat(activeSegIdx, activePaxIdx, seatPayload);
    }

    // Auto-advance cursor to next passenger who does not have an assigned seat yet
    const nextUnassigned = passengers.findIndex((_, idx) => !currentSegSeats[idx] && idx !== activePaxIdx);
    if (nextUnassigned !== -1) {
      setActivePaxIdx(nextUnassigned);
    }
  }

  return (
    <div className="tj-seat-selection-card">
      <div className="tj-seat-header-banner">
        <div className="tj-seat-title-wrap">
          <Armchair size={19} className="tj-seat-main-icon" />
          <div>
            <strong>SELECT SEAT</strong>
            <small>Choose your preferred seat on each flight sector</small>
          </div>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="tj-seat-segment-tabs">
        {segments.map((seg, idx) => {
          const segOrig = seg.da?.code || (idx === 0 ? 'MAA' : 'DEL');
          const segDest = seg.aa?.code || (idx === 0 ? 'DEL' : 'DXB');
          const count = Object.keys(selectedSeats[idx] || {}).length;
          const isActive = idx === activeSegIdx;

          return (
            <button
              key={idx}
              type="button"
              className={`tj-seat-seg-tab ${isActive ? 'is-active' : ''}`}
              onClick={() => {
                setActiveSegIdx(idx);
                setActivePaxIdx(0);
              }}
            >
              <span className="tj-seg-route">
                <strong>{segOrig}</strong>
                <span className="tj-seg-plane">✈</span>
                <strong>{segDest}</strong>
              </span>
              <span className="tj-seg-badge">{count}/{totalPax}</span>
            </button>
          );
        })}
      </div>

      {/* Passenger selector for multiple passengers */}
      {passengers.length > 1 && (
        <div className="tj-seat-pax-picker">
          <span>Selecting seat for:</span>
          <div className="tj-pax-chip-group">
            {passengers.map((p, idx) => {
              const assigned = currentSegSeats[idx];
              const isCurrent = idx === activePaxIdx;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`tj-pax-chip ${isCurrent ? 'is-current' : ''}`}
                  onClick={() => setActivePaxIdx(idx)}
                >
                  <span>{p.title || 'Pax'} {p.firstName || `Adult ${idx + 1}`}</span>
                  {assigned ? (
                    <strong className="tj-assigned-seat-pill">{assigned.code}</strong>
                  ) : (
                    <small className="tj-unassigned-seat-pill">Select seat</small>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Seat Status & Legend */}
      <div className="tj-seat-legend-bar">
        <div className="tj-legend-group">
          <span className="tj-legend-title">SEAT STATUS:</span>
          <span className="tj-legend-item">
            <span className="tj-legend-box status-selected"><Check size={12} /></span>
            <span>Selected</span>
          </span>
          <span className="tj-legend-item">
            <span className="tj-legend-box status-booked"><X size={12} /></span>
            <span>Booked</span>
          </span>
        </div>

        <div className="tj-legend-group">
          <span className="tj-legend-title">SEAT ATTRIBUTES:</span>
          <span className="tj-legend-item">
            <span className="tj-legend-box attr-free" />
            <span>₹0.00</span>
          </span>
          <span className="tj-legend-item">
            <span className="tj-legend-box attr-legroom" />
            <span>Extra Legroom</span>
          </span>
          <span className="tj-legend-item">
            <span className="tj-legend-box attr-exit" />
            <span>Exit Row Seats</span>
          </span>
        </div>
      </div>

      {/* Cabin Visual Grid */}
      <div className="tj-cabin-viewport">
        <div className="tj-cabin-nose">
          <div className="tj-cockpit-window" />
          <span>FRONT OF AIRCRAFT</span>
        </div>

        <div className="tj-seat-columns-header">
          <div className="tj-col-trio">
            <span>A</span>
            <span>B</span>
            <span>C</span>
          </div>
          <div className="tj-aisle-spacer">AISLE</div>
          <div className="tj-col-trio">
            <span>D</span>
            <span>E</span>
            <span>F</span>
          </div>
        </div>

        <div className="tj-seat-rows-list">
          {rows.map(rowNum => {
            const isExit = rowNum === 12 || rowNum === 13;
            const isFront = rowNum === 1;

            return (
              <div key={rowNum} className={`tj-seat-row ${isExit ? 'is-exit-row' : ''} ${isFront ? 'is-front-row' : ''}`}>
                <span className="tj-row-num">{rowNum}</span>

                {/* Left Trio (A, B, C) */}
                <div className="tj-seat-group">
                  {['A', 'B', 'C'].map(col => {
                    const code = `${rowNum}${col}`;
                    const info = getSeatPrice(rowNum, col);
                    const isBooked = BOOKED_SEATS_SET.has(code);
                    const isSelected = Object.values(currentSegSeats).some(s => s?.code === code);
                    const isMine = currentSegSeats[activePaxIdx]?.code === code;

                    let attrClass = 'is-free';
                    if (info.type === 'legroom') attrClass = 'is-legroom';
                    else if (info.type === 'exit') attrClass = 'is-exit';
                    else if (info.type === 'preferred') attrClass = 'is-preferred';

                    return (
                      <button
                        key={code}
                        type="button"
                        disabled={isBooked}
                        title={isBooked ? `${code} - Booked` : `${code} (${info.label}) - ${info.price === 0 ? 'Free' : money(info.price)}`}
                        className={`tj-seat-btn ${attrClass} ${isBooked ? 'is-booked' : ''} ${isSelected ? 'is-selected' : ''} ${isMine ? 'is-mine' : ''}`}
                        onClick={() => handleSeatClick(code, info)}
                      >
                        {isSelected ? <Check size={12} strokeWidth={3} /> : isBooked ? <X size={12} /> : <span className="tj-seat-no">{code}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="tj-aisle-gap" />

                {/* Right Trio (D, E, F) */}
                <div className="tj-seat-group">
                  {['D', 'E', 'F'].map(col => {
                    const code = `${rowNum}${col}`;
                    const info = getSeatPrice(rowNum, col);
                    const isBooked = BOOKED_SEATS_SET.has(code);
                    const isSelected = Object.values(currentSegSeats).some(s => s?.code === code);
                    const isMine = currentSegSeats[activePaxIdx]?.code === code;

                    let attrClass = 'is-free';
                    if (info.type === 'legroom') attrClass = 'is-legroom';
                    else if (info.type === 'exit') attrClass = 'is-exit';
                    else if (info.type === 'preferred') attrClass = 'is-preferred';

                    return (
                      <button
                        key={code}
                        type="button"
                        disabled={isBooked}
                        title={isBooked ? `${code} - Booked` : `${code} (${info.label}) - ${info.price === 0 ? 'Free' : money(info.price)}`}
                        className={`tj-seat-btn ${attrClass} ${isBooked ? 'is-booked' : ''} ${isSelected ? 'is-selected' : ''} ${isMine ? 'is-mine' : ''}`}
                        onClick={() => handleSeatClick(code, info)}
                      >
                        {isSelected ? <Check size={12} strokeWidth={3} /> : isBooked ? <X size={12} /> : <span className="tj-seat-no">{code}</span>}
                      </button>
                    );
                  })}
                </div>

                {isExit && (
                  <span className="tj-exit-indicator">
                    <ShieldAlert size={12} /> EXIT
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Seats summary chip list */}
        {selectedCount > 0 && (
          <div className="tj-seat-selected-summary">
            <strong>Selected for this segment ({originCode} → {destCode}):</strong>
            <div className="tj-seat-pills-wrap">
              {Object.entries(currentSegSeats).map(([pIdx, s]) => {
                const pax = passengers[pIdx];
                return (
                  <span key={pIdx} className="tj-summary-seat-pill">
                    <span>{pax ? `${pax.firstName || 'Pax'}` : `Pax ${Number(pIdx) + 1}`}: </span>
                    <b>{s.code}</b> ({s.price === 0 ? 'Free' : money(s.price)})
                    <button
                      type="button"
                      aria-label="Remove seat"
                      onClick={() => onSelectSeat && onSelectSeat(activeSegIdx, Number(pIdx), null)}
                    >
                      <X size={11} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
