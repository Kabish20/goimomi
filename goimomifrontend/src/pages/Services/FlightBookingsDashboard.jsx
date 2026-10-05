import React, { useState, useEffect } from 'react';
import { Search, Clock, Plane, ChevronRight, ChevronDown, ChevronUp, Trash2, CheckCircle2, AlertCircle, X, Printer } from 'lucide-react';
import './FlightBookingsDashboard.css';

function formatCountdown(ms) {
  if (ms <= 0) return 'Hold Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export default function FlightBookingsDashboard({ onSelectSearch, defaultTab = 'on_hold' }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'on_hold' | 'upcoming' | 'recent' | null
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [onHoldBookings, setOnHoldBookings] = useState([]);
  const [bannerMessage, setBannerMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Keep live timer active for hold expirations
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync tab if defaultTab changes
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Load bookings and searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recent_flight_searches');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const realSearches = parsed.filter(item => item && item.id !== 'default-1');
          setRecentSearches(realSearches);
        } else {
          setRecentSearches([]);
        }
      }
    } catch (_) {
      setRecentSearches([]);
    }

    try {
      const storedUpcoming = localStorage.getItem('upcoming_flight_bookings');
      if (storedUpcoming) {
        const parsed = JSON.parse(storedUpcoming);
        if (Array.isArray(parsed)) {
          setUpcomingBookings(parsed);
        }
      }
    } catch (_) { }

    try {
      const storedHolds = localStorage.getItem('on_hold_flight_bookings');
      if (storedHolds) {
        const parsed = JSON.parse(storedHolds);
        if (Array.isArray(parsed)) {
          setOnHoldBookings(parsed);
        }
      }
    } catch (_) { }
  }, []);

  function handleTabClick(tab) {
    setActiveTab(prev => (prev === tab ? null : tab));
  }

  function handleClearRecentSearches(e) {
    e.stopPropagation();
    try {
      localStorage.removeItem('recent_flight_searches');
    } catch (_) { }
    setRecentSearches([]);
  }

  function handleCardClick(searchItem) {
    if (onSelectSearch) {
      onSelectSearch(searchItem);
    }
  }

  // Issue Ticket (TripJack Confirm-Book workflow)
  function handleIssueTicket(heldItem) {
    const pnr = `${heldItem.airlineCode || '6E'}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const confirmedBooking = {
      ...heldItem,
      id: `booking-${Date.now()}`,
      pnr,
      status: 'Confirmed',
      confirmedAt: new Date().toISOString(),
    };

    // Remove from on hold
    const remainingHolds = onHoldBookings.filter(item => item.id !== heldItem.id);
    setOnHoldBookings(remainingHolds);
    localStorage.setItem('on_hold_flight_bookings', JSON.stringify(remainingHolds));

    // Add to upcoming
    const updatedUpcoming = [confirmedBooking, ...upcomingBookings];
    setUpcomingBookings(updatedUpcoming);
    localStorage.setItem('upcoming_flight_bookings', JSON.stringify(updatedUpcoming));

    setBannerMessage(`Ticket successfully issued! Confirmed Airline PNR: ${pnr}. Moved to Upcoming Bookings.`);
    setActiveTab('upcoming');
  }

  // Release Hold (TripJack Unhold workflow)
  function handleReleaseHold(heldItem) {
    const remaining = onHoldBookings.filter(item => item.id !== heldItem.id);
    setOnHoldBookings(remaining);
    localStorage.setItem('on_hold_flight_bookings', JSON.stringify(remaining));
    setBannerMessage(`Hold reservation ${heldItem.bookingId || ''} has been released.`);
  }

  // Filter on hold bookings
  const filteredHolds = onHoldBookings.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const route = `${item.fromCode || ''} ${item.toCode || ''}`.toLowerCase();
    const passenger = (item.passengerName || item.passengers?.[0]?.name || '').toLowerCase();
    const bookingId = (item.bookingId || '').toLowerCase();
    const airline = (item.airline || '').toLowerCase();
    return route.includes(q) || passenger.includes(q) || bookingId.includes(q) || airline.includes(q);
  });

  return (
    <section className="flight-bookings-dashboard">
      <div className="flight-container">
        {/* Banner notification for user actions */}
        {bannerMessage && (
          <div className="dashboard-alert-banner" role="status">
            <span>{bannerMessage}</span>
            <button
              type="button"
              onClick={() => setBannerMessage('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="bookings-nav-bar" role="tablist" aria-label="Bookings and recent searches">
          <div className="bookings-nav-left">
            {/* Tab 1: On Hold Bookings */}
            <div className="booking-tab-item">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'on_hold'}
                aria-expanded={activeTab === 'on_hold'}
                className={`booking-tab-btn ${activeTab === 'on_hold' ? 'is-active' : ''}`}
                onClick={() => handleTabClick('on_hold')}
              >
                <span>On Hold Bookings</span>
                {activeTab === 'on_hold' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            <div className="nav-tab-divider" aria-hidden="true" />

            {/* Tab 2: Upcoming Bookings */}
            <div className="booking-tab-item">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'upcoming'}
                aria-expanded={activeTab === 'upcoming'}
                className={`booking-tab-btn ${activeTab === 'upcoming' ? 'is-active' : ''}`}
                onClick={() => handleTabClick('upcoming')}
              >
                <span>Upcoming Bookings</span>
                {activeTab === 'upcoming' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            <div className="nav-tab-divider" aria-hidden="true" />

            {/* Tab 3: Recent Searches */}
            <div className="booking-tab-item">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'recent'}
                aria-expanded={activeTab === 'recent'}
                className={`booking-tab-btn ${activeTab === 'recent' ? 'is-active' : ''}`}
                onClick={() => handleTabClick('recent')}
              >
                <span>Recent Searches</span>
                {activeTab === 'recent' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="bookings-panel-container">
          {/* PANEL 1: On Hold Bookings */}
          {activeTab === 'on_hold' && (
            <div className="booking-panel panel-on-hold" role="tabpanel">
              <div className="panel-search-bar">
                <div className="search-input-wrap">
                  <Search size={18} className="search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search by passenger, booking ID or route"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label="Search by passenger, booking ID or route"
                  />
                </div>
                <div className="panel-disclaimer">
                  *Price might change as per airline rules
                </div>
              </div>

              {filteredHolds.length > 0 ? (
                <div className="on-hold-cards-grid">
                  {filteredHolds.map(item => {
                    const remainingMs = item.holdExpiresAt ? item.holdExpiresAt - now : 0;
                    const isExpired = remainingMs <= 0;
                    return (
                      <div key={item.id} className="on-hold-card">
                        <div className="on-hold-card-top">
                          <div className="on-hold-route-info">
                            <div className="on-hold-route-title">
                              <Plane size={18} style={{ color: '#006633' }} />
                              <span>{item.fromCode} → {item.toCode}</span>
                            </div>
                            <span className="on-hold-airline">
                              {item.airline || 'Airline'} {item.flightNumber ? `· ${item.flightNumber}` : ''}
                            </span>
                          </div>

                          <div className={`on-hold-timer-badge ${isExpired ? 'is-expired' : ''}`}>
                            <Clock size={13} />
                            <span>{item.holdExpiresAt ? formatCountdown(remainingMs) : 'Held'}</span>
                          </div>
                        </div>

                        <div className="on-hold-details">
                          <div className="on-hold-detail-row">
                            <span className="on-hold-detail-label">Booking ID:</span>
                            <span className="on-hold-detail-val" style={{ fontFamily: 'monospace' }}>
                              {item.bookingId || item.id}
                            </span>
                          </div>
                          <div className="on-hold-detail-row">
                            <span className="on-hold-detail-label">Passenger:</span>
                            <span className="on-hold-detail-val">
                              {item.passengerName || item.passengers?.[0]?.name || '1 Adult'}
                            </span>
                          </div>
                          <div className="on-hold-detail-row">
                            <span className="on-hold-detail-label">Travel Date:</span>
                            <span className="on-hold-detail-val">{item.travelDate || 'Upcoming'}</span>
                          </div>
                          <div className="on-hold-detail-row">
                            <span className="on-hold-detail-label">Total Fare:</span>
                            <span className="on-hold-fare-val">{item.fareFormatted || (item.fare ? `₹${item.fare}` : '₹5,490')}</span>
                          </div>
                        </div>

                        <div className="on-hold-actions">
                          <button
                            type="button"
                            className="btn-release-hold"
                            onClick={() => handleReleaseHold(item)}
                          >
                            Release Hold
                          </button>
                          <button
                            type="button"
                            className="btn-issue-ticket"
                            disabled={isExpired}
                            onClick={() => handleIssueTicket(item)}
                          >
                            <CheckCircle2 size={15} />
                            <span>Issue Ticket</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="on-hold-empty-box">
                  <div className="clock-icon-circle">
                    <Clock size={24} className="clock-svg" />
                  </div>
                  <h3>No on-hold bookings</h3>
                  <p>Flights you put on hold will appear here so you can complete payment anytime.</p>
                </div>
              )}
            </div>
          )}

          {/* PANEL 2: Upcoming Bookings */}
          {activeTab === 'upcoming' && (
            <div className="booking-panel panel-upcoming" role="tabpanel">
              {upcomingBookings.length > 0 ? (
                <div className="upcoming-cards-grid">
                  {upcomingBookings.map(item => (
                    <div
                      key={item.id || `${item.fromCode}-${item.toCode}-${item.pnr}`}
                      className="upcoming-booking-card"
                    >
                      <div className="upcoming-card-header">
                        <div className="upcoming-route-title">
                          <Plane size={18} style={{ color: '#0284c7' }} />
                          <span>{item.fromCode} → {item.toCode}</span>
                        </div>
                        <span className="booking-status-badge">
                          {item.status || 'Confirmed'}
                        </span>
                      </div>

                      <div className="upcoming-details">
                        <div className="on-hold-detail-row">
                          <span className="on-hold-detail-label">Airline PNR:</span>
                          <span className="upcoming-pnr-badge">{item.pnr || '6E-W8X9Q2'}</span>
                        </div>
                        <div className="on-hold-detail-row">
                          <span className="on-hold-detail-label">Airline:</span>
                          <span className="on-hold-detail-val">{item.airline || 'Flight Service'}</span>
                        </div>
                        <div className="on-hold-detail-row">
                          <span className="on-hold-detail-label">Date:</span>
                          <span className="on-hold-detail-val">{item.travelDate || item.dateLabel}</span>
                        </div>
                        <div className="on-hold-detail-row">
                          <span className="on-hold-detail-label">Traveller:</span>
                          <span className="on-hold-detail-val">
                            {item.passengerName || item.passengers?.[0]?.name || item.paxLabel || '1 Traveller'}
                          </span>
                        </div>
                      </div>

                      <div className="upcoming-actions">
                        <button
                          type="button"
                          className="btn-view-ticket"
                          onClick={() => setSelectedTicket(item)}
                        >
                          View E-Ticket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* TripJack Reference: Dark gray bar when no upcoming bookings */
                <div className="upcoming-empty-bar">
                  No Bookings Available
                </div>
              )}
            </div>
          )}

          {/* PANEL 3: Recent Searches */}
          {activeTab === 'recent' && (
            <div className="booking-panel panel-recent" role="tabpanel">
              <div className="recent-cards-header">
                <span>Recent Searches</span>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    className="clear-recent-btn"
                    onClick={handleClearRecentSearches}
                    title="Clear recent searches"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                )}
              </div>

              {recentSearches.length > 0 ? (
                <div className="recent-cards-grid">
                  {recentSearches.map(item => (
                    <div
                      key={item.id || `${item.fromCode}-${item.toCode}`}
                      className="recent-search-card"
                      onClick={() => handleCardClick(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCardClick(item);
                        }
                      }}
                    >
                      <div className="recent-card-icon-wrap">
                        <Plane size={18} className="recent-plane-svg" />
                      </div>

                      <div className="recent-card-body">
                        <div className="recent-route-title">
                          <span>{item.fromCode} → {item.toCode}</span>
                          <ChevronRight size={16} className="recent-chevron" />
                        </div>
                        <div className="recent-meta-line">
                          {item.dateLabel || item.travelDate} | {item.modeLabel || item.mode}
                        </div>
                        <div className="recent-pax-line">
                          {item.paxLabel || `${item.pax?.ADULT || 1} traveller`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="recent-empty-card">
                  <div className="recent-card-icon-wrap">
                    <Plane size={18} />
                  </div>
                  <div className="recent-card-body">
                    <div className="recent-route-title">
                      <span>No Recent Searches</span>
                    </div>
                    <div className="recent-meta-line">
                      Searches you perform will appear here for fast 1-click re-booking.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Modal Preview */}
      {selectedTicket && (
        <div className="flight-ticket-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="flight-ticket-modal" onClick={e => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>
                <Plane size={20} />
                <span>Confirmed Flight E-Ticket</span>
              </h3>
              <button
                type="button"
                className="ticket-modal-close"
                onClick={() => setSelectedTicket(null)}
                aria-label="Close ticket modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="ticket-modal-body">
              <div className="ticket-pnr-banner">
                <div className="ticket-pnr-group">
                  <span>Airline PNR</span>
                  <strong>{selectedTicket.pnr || '6E-W8X9Q2'}</strong>
                </div>
                <span className="booking-status-badge">
                  {selectedTicket.status || 'Confirmed'}
                </span>
              </div>

              <div className="ticket-route-strip">
                <div className="ticket-sector">
                  <h4>{selectedTicket.fromCode}</h4>
                  <p>{selectedTicket.fromCity || 'Origin'}</p>
                </div>
                <div className="ticket-arrow">
                  <Plane size={24} />
                </div>
                <div className="ticket-sector sector-dest">
                  <h4>{selectedTicket.toCode}</h4>
                  <p>{selectedTicket.toCity || 'Destination'}</p>
                </div>
              </div>

              <div className="ticket-info-grid">
                <div className="ticket-info-item">
                  <span>Travel Date</span>
                  <strong>{selectedTicket.travelDate || selectedTicket.dateLabel}</strong>
                </div>
                <div className="ticket-info-item">
                  <span>Airline</span>
                  <strong>{selectedTicket.airline || 'Flight Service'}</strong>
                </div>
                <div className="ticket-info-item">
                  <span>Primary Passenger</span>
                  <strong>{selectedTicket.passengerName || selectedTicket.passengers?.[0]?.name || 'Passenger 1'}</strong>
                </div>
                <div className="ticket-info-item">
                  <span>Cabin Class</span>
                  <strong>{selectedTicket.cabin || 'ECONOMY'}</strong>
                </div>
              </div>

              <div className="ticket-modal-footer">
                <button
                  type="button"
                  className="btn-ticket-print"
                  onClick={() => window.print()}
                >
                  <Printer size={15} style={{ display: 'inline', marginRight: 6 }} />
                  Print / Save Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
