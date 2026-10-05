import React, { useState } from 'react';
import { Armchair, Check, X, RotateCw } from 'lucide-react';
import { money } from './flightUtils';

/**
 * Pre-seeded realistic booked seats matching standard airline occupancy and user screenshot:
 * Row 1: 1C is booked
 * Row 2: 2A is booked
 * Row 3: 3B is booked
 * Row 5: 5E is booked
 * Row 6: 6F is booked
 * Row 8: 8A is booked
 * Row 9: 9C is booked
 */
const BOOKED_SEATS_SET = new Set([
  '1C', '2A', '3B', '5E', '6F', '8A', '9C', '11B', '12D', '14E', '15A', '17C', '18F', '20B'
]);

/**
 * 6-column configuration matching standard aircraft:
 * Left side: A, B, C | Central Aisle | Right side: D, E, F
 */
const LEFT_COLS = ['A', 'B', 'C'];
const RIGHT_COLS = ['D', 'E', 'F'];
const ALL_COLS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Pricing and tier definitions matching screenshot styling:
 * - Row 1: ₹350 / Extra Legroom (Promotional Blue Outline matching Screenshot)
 * - Row 2-4: ₹0.00 (Standard Free)
 * - Row 5-11: ₹120 (Standard Mid)
 * - Row 12: ₹240 (Exit Row)
 * - Row 13-20: ₹100 (Standard Rear)
 */
function getSeatInfo(row, col) {
  if (row === 1) {
    return { price: 350, label: 'Front Row / Extra Legroom', type: 'legroom', isBlueTier: true };
  }
  if (row === 12) {
    return { price: 240, label: 'Exit Row Seats', type: 'exit', isExit: true };
  }
  if (row >= 2 && row <= 4) {
    return { price: 0, label: 'Standard Free', type: 'free', isFree: true };
  }
  if (row >= 5 && row <= 11) {
    return { price: 120, label: 'Preferred Seat', type: 'mid' };
  }
  return { price: 100, label: 'Standard Seat', type: 'rear' };
}

export default function FlightSeatMap({
  segments = [],
  passengers = [{ title: 'Mr', firstName: 'Vijay', lastName: 'D' }],
  selectedSeats = {}, // { [segIdx]: { [paxIdx]: seatPayload } }
  onSelectSeat,
}) {
  const [activeSegIdx, setActiveSegIdx] = useState(0);
  const [activePaxIdx, setActivePaxIdx] = useState(0);
  // Default orientation is 'horizontal' as explicitly requested
  const [orientation, setOrientation] = useState('horizontal'); // 'horizontal' | 'vertical'

  const currentSegment = segments[activeSegIdx] || segments[0] || {};
  const originCode = currentSegment.da?.code || 'MAA';
  const destCode = currentSegment.aa?.code || 'TRZ';

  const currentSegSeats = selectedSeats[activeSegIdx] || {};
  const totalPax = passengers.length || 1;
  const currentAssignedCount = Object.keys(currentSegSeats).length;

  // 20 rows of seats (standard single-aisle aircraft)
  const rows = Array.from({ length: 20 }, (_, i) => i + 1);

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

  // Render an individual seat button
  function renderSeat(r, col) {
    const code = `${r}${col}`;
    const info = getSeatInfo(r, col);
    const isBooked = BOOKED_SEATS_SET.has(code);
    const isSelected = Object.values(currentSegSeats).some(s => s?.code === code);
    const isMine = currentSegSeats[activePaxIdx]?.code === code;

    let seatClass = 'tj-seat-box';
    if (isBooked) {
      seatClass += ' is-booked';
    } else if (isMine) {
      seatClass += ' is-selected is-mine';
    } else if (isSelected) {
      seatClass += ' is-selected-other';
    } else if (info.isBlueTier) {
      seatClass += ' tier-blue-border';
    }

    return (
      <button
        key={code}
        type="button"
        disabled={isBooked}
        onClick={() => handleSeatClick(code, info)}
        title={`${code} (${info.label}) - ${info.price === 0 ? 'Free' : money(info.price)}`}
        className={seatClass}
      >
        {isBooked ? (
          <span className="tj-booked-x">×</span>
        ) : isMine ? (
          <span className="tj-selected-code">{code} ✓</span>
        ) : isSelected ? (
          <span className="tj-other-code">{code}</span>
        ) : (
          code
        )}
      </button>
    );
  }

  return (
    <div className="tj-seatmap-container">
      {/* Top Header Bar */}
      <div className="tj-seatmap-top-bar">
        <div className="tj-seatmap-title">
          <Armchair size={18} />
          <strong>SELECT SEAT</strong>
          <span className="tj-seatmap-badge">3 × 3 Fuselage</span>
        </div>

        <div className="tj-seatmap-controls-group">
          {/* Orientation Toggle Button */}
          <button
            type="button"
            className="tj-orientation-toggle-btn"
            onClick={() => setOrientation(prev => (prev === 'horizontal' ? 'vertical' : 'horizontal'))}
            title="Toggle between horizontal and vertical seat map view"
          >
            <RotateCw size={13} />
            <span>View: <strong>{orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}</strong></span>
          </button>

          {/* Segment Route & Progress */}
          <div className="tj-seatmap-route-pill">
            <span>{originCode}</span>
            <span className="tj-seatmap-plane">✈</span>
            <span>{destCode}</span>
            <strong>{currentAssignedCount}/{totalPax}</strong>
          </div>
        </div>
      </div>

      {/* Legend Bar matching Image */}
      <div className="tj-seatmap-legend-wrap">
        <div className="tj-legend-row">
          <span className="tj-legend-heading">SEAT STATUS:</span>
          <div className="tj-legend-item">
            <span className="tj-legend-badge status-available" />
            <span>Available</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-legend-badge status-blue" />
            <span>Extra Legroom (Row 1)</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-legend-badge status-selected"><Check size={11} strokeWidth={3} /></span>
            <span>Selected</span>
          </div>
          <div className="tj-legend-item">
            <span className="tj-legend-badge status-booked"><X size={11} strokeWidth={2.5} /></span>
            <span>Booked</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          HORIZONTAL VIEW (Default - Plane extends horizontally from left to right)
         ========================================================================= */}
      {orientation === 'horizontal' ? (
        <div className="tj-plane-viewport-horiz">
          <div className="tj-horiz-fuselage-wrap">
            {/* Front of Aircraft Nose Cap on Left */}
            <div className="tj-horiz-nose-cap">
              <div className="tj-horiz-nose-pill">
                FRONT OF AIRCRAFT
              </div>
            </div>

            {/* Main Horizontal Seat Grid (Rows 1 to 20 Left to Right) */}
            <div className="tj-horiz-grid">
              {/* Column A */}
              <div className="tj-horiz-col-strip">
                <span className="tj-col-head">A</span>
                {rows.map(r => renderSeat(r, 'A'))}
              </div>

              {/* Column B */}
              <div className="tj-horiz-col-strip">
                <span className="tj-col-head">B</span>
                {rows.map(r => renderSeat(r, 'B'))}
              </div>

              {/* Column C */}
              <div className="tj-horiz-col-strip">
                <span className="tj-col-head">C</span>
                {rows.map(r => renderSeat(r, 'C'))}
              </div>

              {/* Central AISLE Strip with Row Numbers */}
              <div className="tj-horiz-aisle-strip">
                <span className="tj-col-head tj-aisle-head">AISLE</span>
                {rows.map(r => (
                  <span key={r} className="tj-aisle-num">{r}</span>
                ))}
              </div>

              {/* Column D */}
              <div className="tj-horiz-col-strip">
                <span className="tj-col-head">D</span>
                {rows.map(r => renderSeat(r, 'D'))}
              </div>

              {/* Column E */}
              <div className="tj-horiz-col-strip">
                <span className="tj-col-head">E</span>
                {rows.map(r => renderSeat(r, 'E'))}
              </div>

              {/* Column F */}
              <div className="tj-horiz-col-strip">
                <span className="tj-col-head">F</span>
                {rows.map(r => renderSeat(r, 'F'))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VERTICAL VIEW (Top to Bottom matching the original screenshot)
           ========================================================================= */
        <div className="tj-plane-viewport-vert">
          <div className="tj-vert-fuselage-wrap">
            {/* Front of Aircraft Nose Pill at Top */}
            <div className="tj-vert-nose-cap">
              <div className="tj-vert-nose-pill">
                FRONT OF AIRCRAFT
              </div>
            </div>

            {/* Column Headers: A B C AISLE D E F */}
            <div className="tj-vert-col-headers">
              <span className="tj-vert-row-blank" />
              <span className="tj-vert-col-label">A</span>
              <span className="tj-vert-col-label">B</span>
              <span className="tj-vert-col-label">C</span>
              <span className="tj-vert-col-label tj-vert-aisle-label">AISLE</span>
              <span className="tj-vert-col-label">D</span>
              <span className="tj-vert-col-label">E</span>
              <span className="tj-vert-col-label">F</span>
            </div>

            {/* Vertical Rows 1 to 20 */}
            <div className="tj-vert-rows-list">
              {rows.map(r => (
                <div key={r} className="tj-vert-row-item">
                  <span className="tj-vert-row-number">{r}</span>
                  {renderSeat(r, 'A')}
                  {renderSeat(r, 'B')}
                  {renderSeat(r, 'C')}
                  <span className="tj-vert-aisle-spacer" />
                  {renderSeat(r, 'D')}
                  {renderSeat(r, 'E')}
                  {renderSeat(r, 'F')}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Passenger Tabs & Total Seat Fee */}
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
