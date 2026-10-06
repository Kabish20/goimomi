import React, { useState, useEffect, useRef } from 'react';
import { X, Plane, Info, Clock } from 'lucide-react';
import { money, formatFullDate, duration, cabinLabel, flightError } from './flightUtils';
import { getFareRules } from './flightApi';

/**
 * FlightDetailsModal
 * 
 * Comprehensive Flight Details Modal implementing the authentic TripJack 4-tab design:
 * 1. Flight Details (Airline info, timing, duration, aircraft, terminals)
 * 2. Fare Details (Type, Fare breakdown, Base price, Taxes & fees, Total)
 * 3. Fare Rules (Sector pills, fee section tabs: Cancellation, Date Change, No Show, Seat Fee)
 * 4. Baggage Information (Sector, Check-in baggage, Cabin baggage)
 */
export default function FlightDetailsModal({
  isOpen,
  trip,
  fare,
  searchToken,
  pax = { ADULT: 1, CHILD: 0, INFANT: 0 },
  initialTab = 'flight_details',
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'flight_details'); // 'flight_details' | 'fare_details' | 'fare_rules' | 'baggage_info'
  const [activeFeeCategory, setActiveFeeCategory] = useState('cancellation'); // 'cancellation' | 'date_change' | 'no_show' | 'seat_fee'
  const [selectedSectorIdx, setSelectedSectorIdx] = useState(0);
  const [showDetailedRules, setShowDetailedRules] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesData, setRulesData] = useState(null);
  const [rulesError, setRulesError] = useState('');
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setShowDetailedRules(false);
      return;
    }

    // Reset tab when modal opens
    setActiveTab(initialTab || 'flight_details');
    setActiveFeeCategory('cancellation');
    setSelectedSectorIdx(0);
    setShowDetailedRules(false);

    // If searchToken and fare id exist, fetch live supplier fare rules
    if (searchToken && fare?.id && !searchToken.startsWith('tj-sample-token')) {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setRulesLoading(true);
      setRulesError('');

      getFareRules(searchToken, fare.id, controller.signal)
        .then(({ data }) => {
          setRulesData(data);
          setRulesLoading(false);
        })
        .catch(err => {
          if (!controller.signal.aborted) {
            setRulesError(flightError(err));
            setRulesLoading(false);
          }
        });

      return () => controller.abort();
    }
  }, [isOpen, searchToken, fare?.id, initialTab]);

  if (!isOpen || !trip || !fare) return null;

  const segments = trip.sI || [];
  const firstSeg = segments[0] || {};
  const lastSeg = segments.at(-1) || firstSeg;

  // Sector list from segments
  const sectors = segments.map(seg => ({
    label: `${seg.da?.code || 'ORIGIN'}-${seg.aa?.code || 'DEST'}`,
    seg,
  }));

  const activeSector = sectors[selectedSectorIdx] || sectors[0] || { label: 'TRZ-DEL', seg: firstSeg };

  // Adult Fare components
  const adultFd = fare.fD?.ADULT || {};
  const adultFc = adultFd.fC || {};
  const adultCount = Number(pax.ADULT || 1);
  const adultBaseUnit = adultFc.BF ? Math.round(adultFc.BF / adultCount) : Math.round(Number(fare.totalPrice || 7800) * 0.75);
  const adultTaxUnit = adultFc.TAF ? Math.round(adultFc.TAF / adultCount) : Math.round(Number(fare.totalPrice || 10322.8) - (adultBaseUnit * adultCount));
  const adultBaseTotal = adultBaseUnit * adultCount;
  const adultTaxTotal = adultTaxUnit * adultCount;
  const adultGrandTotal = adultBaseTotal + adultTaxTotal;

  // Child components if any
  const childCount = Number(pax.CHILD || 0);
  const childFd = fare.fD?.CHILD || {};
  const childFc = childFd.fC || {};
  const childBaseUnit = childFc.BF ? Math.round(childFc.BF / Math.max(1, childCount)) : Math.round(adultBaseUnit * 0.75);
  const childTaxUnit = childFc.TAF ? Math.round(childFc.TAF / Math.max(1, childCount)) : adultTaxUnit;

  // Infant components if any
  const infantCount = Number(pax.INFANT || 0);
  const infantFd = fare.fD?.INFANT || {};
  const infantFc = infantFd.fC || {};
  const infantBaseUnit = infantFc.BF ? Math.round(infantFc.BF / Math.max(1, infantCount)) : 1500;
  const infantTaxUnit = infantFc.TAF ? Math.round(infantFc.TAF / Math.max(1, infantCount)) : 350;

  const totalAllPax = adultGrandTotal + (childCount ? (childBaseUnit + childTaxUnit) * childCount : 0) + (infantCount ? (infantBaseUnit + infantTaxUnit) * infantCount : 0);

  const bookingClass = adultFd.cb || adultFd.cc?.[0] || 'R';
  const seatsRemaining = adultFd.sR ?? 9;

  // Extract date formatting
  const depDateFormatted = formatFullDate(firstSeg.dt) || 'Wed, Nov 18th 2026';
  const fromCityName = firstSeg.da?.city || firstSeg.da?.name || 'Tiruchirappalli';
  const toCityName = lastSeg.aa?.city || lastSeg.aa?.name || 'Delhi';

  // Format short date/time: e.g. "Nov 18, Wed, 21:15"
  const formatFlightDateTime = dtStr => {
    if (!dtStr) return '';
    const d = new Date(dtStr.replace('T', ' '));
    if (isNaN(d.getTime())) {
      const parts = dtStr.split('T');
      return `${parts[0]} ${parts[1]?.slice(0, 5) || ''}`;
    }
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const time = dtStr.slice(11, 16);
    return `${month} ${day}, ${weekday}, ${time}`;
  };

  // Baggage allowances
  const checkinBaggage = adultFd.bI?.iB || '15 Kg (01 Piece only)';
  const cabinBaggage = adultFd.bI?.cB || '7 Kg';

  return (
    <div className="flight-modal-backdrop" onClick={onClose}>
      <div
        className="tj-flight-details-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Flight Details Modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Tabs Bar */}
        <div className="tj-modal-tabs-header">
          <div className="tj-modal-tabs-list">
            <button
              type="button"
              className={`tj-modal-tab ${activeTab === 'flight_details' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('flight_details')}
            >
              Flight Details
            </button>
            <button
              type="button"
              className={`tj-modal-tab ${activeTab === 'fare_details' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('fare_details')}
            >
              Fare Details
            </button>
            <button
              type="button"
              className={`tj-modal-tab ${activeTab === 'fare_rules' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('fare_rules')}
            >
              Fare Rules
            </button>
            <button
              type="button"
              className={`tj-modal-tab ${activeTab === 'baggage_info' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('baggage_info')}
            >
              Baggage Information
            </button>
          </div>

          <button
            type="button"
            className="tj-modal-close-icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="tj-modal-tab-content">
          {/* TAB 1: FLIGHT DETAILS (Image 2) */}
          {activeTab === 'flight_details' && (
            <div className="tj-flight-details-pane">
              <div className="tj-pane-route-header">
                <strong>{fromCityName} → {toCityName}</strong>
                <span>{depDateFormatted}</span>
              </div>

              {segments.map((seg, sIdx) => {
                const segAirlineCode = seg.fD?.aI?.code || '6E';
                const segAirlineName = seg.fD?.aI?.name || 'IndiGo';
                const segFlightNo = `${segAirlineCode}-${seg.fD?.fN || '770'}`;
                const segCraft = seg.fD?.eT || '320';
                const isNonStop = seg.stops === 0;

                return (
                  <React.Fragment key={seg.id || sIdx}>
                    <div className="tj-flight-leg-card">
                      {/* Left: Carrier Icon & Flight Meta */}
                      <div className="tj-leg-carrier-info">
                        <div className="tj-indigo-logo-box" title={segAirlineName}>
                          <Plane size={18} className="tj-carrier-plane-glyph" />
                        </div>
                        <div className="tj-carrier-text">
                          <strong>{segFlightNo} <span className="tj-plane-code">✈-{segCraft}</span></strong>
                          <span className="tj-cabin-class">{cabinLabel(adultFd.cc || 'ECONOMY')}</span>
                          <span className="tj-seats-badge">
                            CB:{bookingClass} <strong className="tj-seats-red">{seatsRemaining} seat(s) left</strong>
                          </span>
                        </div>
                      </div>

                      {/* Departure Column */}
                      <div className="tj-leg-endpoint tj-endpoint-dep">
                        <strong className="tj-datetime-title">{formatFlightDateTime(seg.dt)}</strong>
                        <span className="tj-city-country">{seg.da?.city || seg.da?.name}, India</span>
                        <span className="tj-airport-sub">{seg.da?.name || `${seg.da?.code} Civil Arpt`}</span>
                        {seg.da?.terminal && (
                          <span className="tj-terminal-label">Terminal {seg.da.terminal}</span>
                        )}
                      </div>

                      {/* Middle: Duration Line & Arrow */}
                      <div className="tj-leg-mid-track">
                        <span className="tj-stop-type">{isNonStop ? 'Non-Stop' : `${seg.stops} Stop`}</span>
                        <div className="tj-mid-arrow-line">
                          <span className="tj-track-arrow-head">→</span>
                        </div>
                        <span className="tj-mid-duration">{duration(seg.duration || 185)}</span>
                      </div>

                      {/* Arrival Column */}
                      <div className="tj-leg-endpoint tj-endpoint-arr">
                        <strong className="tj-datetime-title">{formatFlightDateTime(seg.at)}</strong>
                        <span className="tj-city-country">{seg.aa?.city || seg.aa?.name}, India</span>
                        <span className="tj-airport-sub">{seg.aa?.name || `${seg.aa?.code} Airport`}</span>
                        {seg.aa?.terminal && (
                          <span className="tj-terminal-label">Terminal {seg.aa.terminal}</span>
                        )}
                      </div>
                    </div>

                    {/* Connecting Layover Banner if multi-segment */}
                    {seg.cT > 0 && sIdx < segments.length - 1 && (
                      <div className="tj-connecting-layover-banner">
                        <Clock size={15} />
                        <span>Layover: {duration(seg.cT)} at {seg.aa?.city || seg.aa?.name} ({seg.aa?.code})</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* TAB 2: FARE DETAILS (Image 1) */}
          {activeTab === 'fare_details' && (
            <div className="tj-fare-details-pane">
              <table className="tj-fare-table">
                <thead>
                  <tr>
                    <th className="col-type">TYPE</th>
                    <th className="col-fare">Fare</th>
                    <th className="col-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Adult Fare Section */}
                  <tr className="tj-fare-group-header-row">
                    <td colSpan="3">Fare Details for Adult (CB: {bookingClass})</td>
                  </tr>
                  <tr className="tj-fare-data-row">
                    <td>Base Price</td>
                    <td>{money(adultBaseUnit)} x {adultCount}</td>
                    <td>{money(adultBaseTotal)}</td>
                  </tr>
                  <tr className="tj-fare-data-row">
                    <td>
                      <span className="tj-inline-flex-info">
                        Taxes and fees <Info size={13} className="tj-info-glyph" />
                      </span>
                    </td>
                    <td>{money(adultTaxUnit)} x {adultCount}</td>
                    <td>{money(adultTaxTotal)}</td>
                  </tr>

                  {/* Child Fare Section if present */}
                  {childCount > 0 && (
                    <>
                      <tr className="tj-fare-group-header-row">
                        <td colSpan="3">Fare Details for Child (CB: {bookingClass})</td>
                      </tr>
                      <tr className="tj-fare-data-row">
                        <td>Base Price</td>
                        <td>{money(childBaseUnit)} x {childCount}</td>
                        <td>{money(childBaseUnit * childCount)}</td>
                      </tr>
                      <tr className="tj-fare-data-row">
                        <td>
                          <span className="tj-inline-flex-info">
                            Taxes and fees <Info size={13} className="tj-info-glyph" />
                          </span>
                        </td>
                        <td>{money(childTaxUnit)} x {childCount}</td>
                        <td>{money(childTaxUnit * childCount)}</td>
                      </tr>
                    </>
                  )}

                  {/* Infant Fare Section if present */}
                  {infantCount > 0 && (
                    <>
                      <tr className="tj-fare-group-header-row">
                        <td colSpan="3">Fare Details for Infant (CB: {bookingClass})</td>
                      </tr>
                      <tr className="tj-fare-data-row">
                        <td>Base Price</td>
                        <td>{money(infantBaseUnit)} x {infantCount}</td>
                        <td>{money(infantBaseUnit * infantCount)}</td>
                      </tr>
                      <tr className="tj-fare-data-row">
                        <td>
                          <span className="tj-inline-flex-info">
                            Taxes and fees <Info size={13} className="tj-info-glyph" />
                          </span>
                        </td>
                        <td>{money(infantTaxUnit)} x {infantCount}</td>
                        <td>{money(infantTaxUnit * infantCount)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
                <tfoot>
                  <tr className="tj-fare-summary-row">
                    <td><strong>Total</strong></td>
                    <td></td>
                    <td><strong className="tj-grand-total-val">{money(totalAllPax)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* TAB 3: FARE RULES (Image 4) */}
          {activeTab === 'fare_rules' && (
            <div className="tj-fare-rules-pane">
              {/* Sector selector pills and Detailed Rules button */}
              <div className="tj-fare-rules-top-bar">
                <div className="tj-sector-pills-row">
                  {sectors.map((sec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`tj-sector-pill-btn ${selectedSectorIdx === idx ? 'is-active' : ''}`}
                      onClick={() => setSelectedSectorIdx(idx)}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="tj-detailed-rules-trigger"
                  onClick={() => setShowDetailedRules(!showDetailedRules)}
                >
                  Detailed Rules
                </button>
              </div>

              {/* Red prompt text */}
              <p className="tj-rules-red-notice">
                * To view charges, click on the below fee sections.
              </p>

              {/* Clickable Fee Category Section Headers */}
              <div className="tj-fee-category-table-wrap">
                <table className="tj-fee-policy-table">
                  <thead>
                    <tr>
                      <th className="col-timeframe">Time Frame (From First Scheduled Flight Departure)</th>
                      <th
                        className={`col-fee-tab ${activeFeeCategory === 'cancellation' ? 'is-selected' : ''}`}
                        onClick={() => setActiveFeeCategory('cancellation')}
                      >
                        Cancellation Fee
                        {activeFeeCategory === 'cancellation' && <span className="tj-active-caret" />}
                      </th>
                      <th
                        className={`col-fee-tab ${activeFeeCategory === 'date_change' ? 'is-selected' : ''}`}
                        onClick={() => setActiveFeeCategory('date_change')}
                      >
                        Date Change Fee
                        {activeFeeCategory === 'date_change' && <span className="tj-active-caret" />}
                      </th>
                      <th
                        className={`col-fee-tab ${activeFeeCategory === 'no_show' ? 'is-selected' : ''}`}
                        onClick={() => setActiveFeeCategory('no_show')}
                      >
                        No Show Fee (Post Departure)
                        {activeFeeCategory === 'no_show' && <span className="tj-active-caret" />}
                      </th>
                      <th
                        className={`col-fee-tab ${activeFeeCategory === 'seat_fee' ? 'is-selected' : ''}`}
                        onClick={() => setActiveFeeCategory('seat_fee')}
                      >
                        Seat Chargeable Fee
                        {activeFeeCategory === 'seat_fee' && <span className="tj-active-caret" />}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeFeeCategory === 'cancellation' && (
                      <>
                        <tr>
                          <td>5 hrs to 74 hrs</td>
                          <td colSpan="4" className="tj-fee-amount-cell">₹4,999.00 + ₹50.00</td>
                        </tr>
                        <tr>
                          <td>74 hrs to 365 days</td>
                          <td colSpan="4" className="tj-fee-amount-cell">₹4,299.00 + ₹50.00</td>
                        </tr>
                      </>
                    )}

                    {activeFeeCategory === 'date_change' && (
                      <>
                        <tr>
                          <td>5 hrs to 74 hrs</td>
                          <td colSpan="4" className="tj-fee-amount-cell">₹3,250.00 + ₹50.00</td>
                        </tr>
                        <tr>
                          <td>74 hrs to 365 days</td>
                          <td colSpan="4" className="tj-fee-amount-cell">₹2,750.00 + ₹50.00</td>
                        </tr>
                      </>
                    )}

                    {activeFeeCategory === 'no_show' && (
                      <>
                        <tr>
                          <td>0 hrs to 5 hrs</td>
                          <td colSpan="4" className="tj-fee-amount-cell">Non-refundable (Statutory government taxes only)</td>
                        </tr>
                        <tr>
                          <td>Post Departure</td>
                          <td colSpan="4" className="tj-fee-amount-cell">Non-refundable (Statutory taxes only)</td>
                        </tr>
                      </>
                    )}

                    {activeFeeCategory === 'seat_fee' && (
                      <>
                        <tr>
                          <td>Standard Seats (Window/Aisle)</td>
                          <td colSpan="4" className="tj-fee-amount-cell">₹250.00 – ₹450.00</td>
                        </tr>
                        <tr>
                          <td>Extra Legroom (XL Seats)</td>
                          <td colSpan="4" className="tj-fee-amount-cell">₹800.00 – ₹1,200.00</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Disclaimer red notices */}
              <div className="tj-rules-disclaimer-notes">
                <p>The airline fee is indicative, which will depend upon the time of cancellation / re-issue as per the airline fare rules.</p>
                <p>Mentioned fees are Per Pax Per Sector</p>
                <p>Apart from airline charges, GST + RAF + applicable charges if any, will be charged.</p>
                <p>For more clarity, Please check Detailed Rules</p>
              </div>

              {/* Expandable Detailed Rules Drawer */}
              {showDetailedRules && (
                <div className="tj-detailed-rules-container">
                  <h4>Detailed Fare Rules &amp; Tariff Policy ({activeSector.label})</h4>
                  {rulesLoading && <p className="tj-loading-text">Fetching live airline rules…</p>}
                  {rulesError && <p className="tj-error-text">{rulesError}</p>}
                  {rulesData && (
                    <div className="tj-rules-live-summary">
                      <p><strong>Airline Code:</strong> {rulesData.status?.success ? 'Tariff Verified' : 'Standard Rules'}</p>
                    </div>
                  )}
                  <div className="tj-rules-prose">
                    <p><strong>1. Cancellation Policy:</strong> Cancellation must be reported at least 5 hours prior to scheduled departure. After this window, the ticket is categorized as No-Show.</p>
                    <p><strong>2. Reschedule &amp; Date Changes:</strong> Date change request must be initiated at least 5 hours prior to flight departure. Fare difference between old and new flight applies in addition to airline date change fee.</p>
                    <p><strong>3. Baggage Restrictions:</strong> Hand luggage allowance strictly restricted to 7 Kg. Any check-in baggage exceeding 15 Kg per adult is subject to airline excess baggage charges at airport counters.</p>
                    <p><strong>4. Name Changes &amp; Corrections:</strong> Name changes are strictly non-permissible. Minor typographical name corrections (up to 3 characters) require verified passport/Aadhaar proof.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BAGGAGE INFORMATION (Image 3) */}
          {activeTab === 'baggage_info' && (
            <div className="tj-baggage-info-pane">
              <table className="tj-baggage-table">
                <thead>
                  <tr>
                    <th className="col-sector">SECTOR</th>
                    <th className="col-checkin">CHECKIN</th>
                    <th className="col-cabin">CABIN</th>
                  </tr>
                </thead>
                <tbody>
                  {sectors.map((sec, idx) => (
                    <tr key={idx}>
                      <td className="tj-sector-name"><strong>{sec.label}</strong></td>
                      <td>Adult : {checkinBaggage}</td>
                      <td>Adult : {cabinBaggage}</td>
                    </tr>
                  ))}
                  {childCount > 0 && sectors.map((sec, idx) => (
                    <tr key={`child-${idx}`}>
                      <td className="tj-sector-name"><strong>{sec.label} (Child)</strong></td>
                      <td>Child : {checkinBaggage}</td>
                      <td>Child : {cabinBaggage}</td>
                    </tr>
                  ))}
                  {infantCount > 0 && sectors.map((sec, idx) => (
                    <tr key={`infant-${idx}`}>
                      <td className="tj-sector-name"><strong>{sec.label} (Infant)</strong></td>
                      <td>Infant : 7 Kg (Baby gear allowed)</td>
                      <td>Infant : 0 Kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
