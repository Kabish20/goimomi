import React, { useState } from 'react';

/**
 * FlightConfirmProceedModal
 * 
 * Interstitial confirmation modal displayed when a user selects a flight tier with
 * specific baggage rules (e.g. Hand Baggage Only) or when fare adjustments occur between
 * search time and checkout.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Object} props.trip - Flight trip details containing flight segments (sI)
 * @param {Object} props.fare - Selected fare structure containing price and baggage allowance (fD)
 * @param {Function} props.onClose - Callback to dismiss modal and return to results
 * @param {Function} props.onProceed - Callback to proceed to passenger review and checkout
 */
export default function FlightConfirmProceedModal({
  isOpen,
  trip,
  fare,
  onClose,
  onProceed,
}) {
  // Currently active tab index when viewing multi-segment flight differences
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  // Early return if modal is closed or flight data is unavailable
  if (!isOpen || !trip || !fare) return null;

  // Extract flight segments and adult baggage allowance rules
  const segments = trip.sI || [];
  const adultBaggage = fare.fD?.ADULT?.bI || {};

  return (
    <div className="flight-modal-backdrop" onClick={onClose}>
      <div
        className="tj-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm to Proceed"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Title Header */}
        <div className="tj-confirm-modal-header">
          <h2>CONFIRM TO PROCEED</h2>
        </div>

        <div className="tj-confirm-modal-body">
          {/* Section 1: Baggage Policy Warning List per Segment */}
          <div className="tj-confirm-segments-notice">
            {segments.map((seg, idx) => {
              const segFrom = seg.da?.code || 'MAA';
              const segTo = seg.aa?.code || 'DXB';
              return (
                <div key={idx} className="tj-confirm-seg-block">
                  <strong className="tj-seg-title">{segFrom} - {segTo}</strong>
                  <ul className="tj-confirm-bullet-list">
                    <li>You have selected Hand baggage fare</li>
                    {adultBaggage.cB && <li>Cabin baggage allowed: {adultBaggage.cB}</li>}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Section 2: Fare & Baggage Comparison Diff Table */}
          <div className="tj-confirm-change-section">
            <h4 className="tj-change-subtitle">Fare have changed</h4>

            {/* Segment Selector Tabs (for Multi-city / Connecting flights) */}
            {segments.length > 1 && (
              <div className="tj-confirm-tabs">
                {segments.map((seg, idx) => {
                  const segLabel = `${seg.da?.code || 'MAA'}-${seg.aa?.code || 'DXB'}`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`tj-confirm-tab-btn ${activeTabIdx === idx ? 'is-active' : ''}`}
                      onClick={() => setActiveTabIdx(idx)}
                    >
                      {segLabel}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Old vs New Baggage Allowance Breakdown Table */}
            <div className="tj-confirm-diff-table-wrap">
              <table className="tj-confirm-diff-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>OLD</th>
                    <th>NEW</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>BAGGAGE</strong></td>
                    <td>
                      (Adult) Check-In: {adultBaggage.iB || '30 Kg'} ; Cabin: {adultBaggage.cB || '7 Kg'}
                    </td>
                    <td className="tj-diff-new-highlight">
                      (Adult) Check-In: {adultBaggage.iB || '35 Kilograms'} ; Cabin: {adultBaggage.cB || '7 Kg'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="tj-confirm-modal-footer">
          <button type="button" className="tj-btn-back" onClick={onClose}>
            BACK
          </button>
          <button type="button" className="tj-btn-continue" onClick={onProceed}>
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
