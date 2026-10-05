import React, { useState } from 'react';
import { X, AlertTriangle, Luggage } from 'lucide-react';

export default function FlightConfirmProceedModal({
  isOpen,
  trip,
  fare,
  onClose,
  onProceed,
}) {
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  if (!isOpen || !trip || !fare) return null;

  const segments = trip.sI || [];
  const adultBaggage = fare.fD?.ADULT?.bI || {};
  const isHandBaggageOnly = !adultBaggage.iB || adultBaggage.iB === '0 Kg' || adultBaggage.iB === '0';

  return (
    <div className="flight-modal-backdrop" onClick={onClose}>
      <div
        className="tj-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm to Proceed"
        onClick={e => e.stopPropagation()}
      >
        <div className="tj-confirm-modal-header">
          <h2>CONFIRM TO PROCEED</h2>
        </div>

        <div className="tj-confirm-modal-body">
          {/* Segment warning list matching Screenshot 2 */}
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

          {/* Fare / Baggage check table matching Screenshot 3 */}
          <div className="tj-confirm-change-section">
            <h4 className="tj-change-subtitle">Fare have changed</h4>

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
