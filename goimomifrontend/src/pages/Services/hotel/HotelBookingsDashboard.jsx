import React, { useState, useEffect } from 'react';
import { Search, Clock, Building2, ChevronRight, ChevronDown, ChevronUp, Trash2, CheckCircle2, X, Printer, CalendarDays, Users } from 'lucide-react';
import './HotelBookingsDashboard.css';

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

export default function HotelBookingsDashboard({ onSelectSearch, defaultTab = 'on_hold' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [onHoldBookings, setOnHoldBookings] = useState([]);
  const [bannerMessage, setBannerMessage] = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem('recent_hotel_searches');
      if (storedRecent) {
        const parsed = JSON.parse(storedRecent);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      }
    } catch (_) { }

    try {
      const storedUpcoming = localStorage.getItem('upcoming_hotel_bookings');
      if (storedUpcoming) {
        const parsed = JSON.parse(storedUpcoming);
        if (Array.isArray(parsed)) {
          setUpcomingBookings(parsed);
        }
      }
    } catch (_) { }

    try {
      const storedHolds = localStorage.getItem('on_hold_hotel_bookings');
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
      localStorage.removeItem('recent_hotel_searches');
    } catch (_) { }
    setRecentSearches([]);
  }

  function handleCardClick(searchItem) {
    if (onSelectSearch) {
      onSelectSearch(searchItem);
    }
  }

  // Confirm & Book (TripJack HMS confirm workflow)
  function handleConfirmBook(heldItem) {
    const voucherNumber = `TJ-HTL-CONF-${Math.floor(100000 + Math.random() * 900000)}`;
    const confirmedBooking = {
      ...heldItem,
      id: `hotel-booking-${Date.now()}`,
      voucherNumber,
      status: 'Confirmed',
      confirmedAt: new Date().toISOString(),
    };

    // Remove from hold
    const remainingHolds = onHoldBookings.filter(item => item.id !== heldItem.id);
    setOnHoldBookings(remainingHolds);
    localStorage.setItem('on_hold_hotel_bookings', JSON.stringify(remainingHolds));

    // Add to upcoming
    const updatedUpcoming = [confirmedBooking, ...upcomingBookings];
    setUpcomingBookings(updatedUpcoming);
    localStorage.setItem('upcoming_hotel_bookings', JSON.stringify(updatedUpcoming));

    setBannerMessage(`Hotel stay confirmed! Booking voucher: ${voucherNumber}. Moved to Upcoming Bookings.`);
    setActiveTab('upcoming');
  }

  // Release Hold (TripJack HMS unhold workflow)
  function handleReleaseHold(heldItem) {
    const remaining = onHoldBookings.filter(item => item.id !== heldItem.id);
    setOnHoldBookings(remaining);
    localStorage.setItem('on_hold_hotel_bookings', JSON.stringify(remaining));
    setBannerMessage(`Hotel hold reservation ${heldItem.bookingId || ''} released.`);
  }

  // Filter on hold bookings
  const filteredHolds = onHoldBookings.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const hotel = (item.hotelName || '').toLowerCase();
    const guest = (item.guestName || '').toLowerCase();
    const bookingId = (item.bookingId || '').toLowerCase();
    const city = (item.cityName || '').toLowerCase();
    return hotel.includes(q) || guest.includes(q) || bookingId.includes(q) || city.includes(q);
  });

  return (
    <section className="hotel-bookings-dashboard">
      <div className="hotel-dashboard-container">
        {bannerMessage && (
          <div className="hotel-dashboard-alert-banner" role="status">
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
        <div className="hotel-bookings-nav-bar" role="tablist" aria-label="Hotel bookings and recent searches">
          <div className="hotel-bookings-nav-left">
            {/* Tab 1: On Hold Bookings */}
            <div className="hotel-booking-tab-item">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'on_hold'}
                aria-expanded={activeTab === 'on_hold'}
                className={`hotel-booking-tab-btn ${activeTab === 'on_hold' ? 'is-active' : ''}`}
                onClick={() => handleTabClick('on_hold')}
              >
                <span>On Hold Bookings</span>
                {activeTab === 'on_hold' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            <div className="hotel-nav-tab-divider" aria-hidden="true" />

            {/* Tab 2: Upcoming Bookings */}
            <div className="hotel-booking-tab-item">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'upcoming'}
                aria-expanded={activeTab === 'upcoming'}
                className={`hotel-booking-tab-btn ${activeTab === 'upcoming' ? 'is-active' : ''}`}
                onClick={() => handleTabClick('upcoming')}
              >
                <span>Upcoming Bookings</span>
                {activeTab === 'upcoming' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            <div className="hotel-nav-tab-divider" aria-hidden="true" />

            {/* Tab 3: Recent Searches */}
            <div className="hotel-booking-tab-item">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'recent'}
                aria-expanded={activeTab === 'recent'}
                className={`hotel-booking-tab-btn ${activeTab === 'recent' ? 'is-active' : ''}`}
                onClick={() => handleTabClick('recent')}
              >
                <span>Recent Searches</span>
                {activeTab === 'recent' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="hotel-bookings-panel-container">
          {/* PANEL 1: On Hold Bookings */}
          {activeTab === 'on_hold' && (
            <div className="hotel-booking-panel" role="tabpanel">
              <div className="hotel-panel-search-bar">
                <div className="hotel-search-input-wrap">
                  <Search size={18} className="hotel-search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search by guest, booking ID or hotel"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label="Search by guest, booking ID or hotel"
                  />
                </div>
                <div className="hotel-panel-disclaimer">
                  *Rates and availability subject to hotel cancellation policy
                </div>
              </div>

              {filteredHolds.length > 0 ? (
                <div className="hotel-on-hold-cards-grid">
                  {filteredHolds.map(item => {
                    const remainingMs = item.holdExpiresAt ? item.holdExpiresAt - now : 0;
                    const isExpired = remainingMs <= 0;
                    return (
                      <div key={item.id} className="hotel-on-hold-card">
                        <div className="hotel-on-hold-card-top">
                          <div className="hotel-on-hold-info">
                            <div className="hotel-on-hold-title">
                              <Building2 size={18} style={{ color: '#ea580c' }} />
                              <span>{item.hotelName}</span>
                            </div>
                            <span className="hotel-on-hold-sub">
                              {item.cityName} {item.roomName ? `· ${item.roomName}` : ''}
                            </span>
                          </div>

                          <div className={`hotel-on-hold-timer-badge ${isExpired ? 'is-expired' : ''}`}>
                            <Clock size={13} />
                            <span>{item.holdExpiresAt ? formatCountdown(remainingMs) : 'Held'}</span>
                          </div>
                        </div>

                        <div className="hotel-on-hold-details">
                          <div className="hotel-detail-row">
                            <span className="hotel-detail-label">Booking ID:</span>
                            <span className="hotel-detail-val" style={{ fontFamily: 'monospace' }}>
                              {item.bookingId || item.id}
                            </span>
                          </div>
                          <div className="hotel-detail-row">
                            <span className="hotel-detail-label">Lead Guest:</span>
                            <span className="hotel-detail-val">{item.guestName || 'Guest'}</span>
                          </div>
                          <div className="hotel-detail-row">
                            <span className="hotel-detail-label">Dates:</span>
                            <span className="hotel-detail-val">
                              {item.checkIn} → {item.checkOut} ({item.nights || 1}N)
                            </span>
                          </div>
                          <div className="hotel-detail-row">
                            <span className="hotel-detail-label">Total Price:</span>
                            <span className="hotel-fare-val">{item.priceFormatted || `₹${item.price || 0}`}</span>
                          </div>
                        </div>

                        <div className="hotel-on-hold-actions">
                          <button
                            type="button"
                            className="hotel-btn-release-hold"
                            onClick={() => handleReleaseHold(item)}
                          >
                            Release Hold
                          </button>
                          <button
                            type="button"
                            className="hotel-btn-confirm-book"
                            disabled={isExpired}
                            onClick={() => handleConfirmBook(item)}
                          >
                            <CheckCircle2 size={15} />
                            <span>Confirm & Book</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="hotel-on-hold-empty-box">
                  <div className="hotel-clock-icon-circle">
                    <Clock size={24} />
                  </div>
                  <h3>No on-hold bookings</h3>
                  <p>Hotels you put on hold will appear here so you can confirm anytime.</p>
                </div>
              )}
            </div>
          )}

          {/* PANEL 2: Upcoming Bookings */}
          {activeTab === 'upcoming' && (
            <div className="hotel-booking-panel" role="tabpanel">
              {upcomingBookings.length > 0 ? (
                <div className="hotel-upcoming-cards-grid">
                  {upcomingBookings.map(item => (
                    <div key={item.id} className="hotel-upcoming-card">
                      <div className="hotel-upcoming-card-header">
                        <div className="hotel-upcoming-title">
                          <Building2 size={18} style={{ color: '#0284c7' }} />
                          <span>{item.hotelName}</span>
                        </div>
                        <span className="hotel-status-badge">
                          {item.status || 'Confirmed'}
                        </span>
                      </div>

                      <div className="hotel-upcoming-details">
                        <div className="hotel-detail-row">
                          <span className="hotel-detail-label">Confirmation Voucher:</span>
                          <span className="hotel-voucher-badge">{item.voucherNumber || 'TJ-HTL-CONF'}</span>
                        </div>
                        <div className="hotel-detail-row">
                          <span className="hotel-detail-label">Destination:</span>
                          <span className="hotel-detail-val">{item.cityName}</span>
                        </div>
                        <div className="hotel-detail-row">
                          <span className="hotel-detail-label">Check-in:</span>
                          <span className="hotel-detail-val">{item.checkIn} → {item.checkOut}</span>
                        </div>
                        <div className="hotel-detail-row">
                          <span className="hotel-detail-label">Lead Guest:</span>
                          <span className="hotel-detail-val">{item.guestName || 'Guest'}</span>
                        </div>
                      </div>

                      <div className="hotel-upcoming-actions">
                        <button
                          type="button"
                          className="hotel-btn-view-voucher"
                          onClick={() => setSelectedVoucher(item)}
                        >
                          View Hotel Voucher
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* TripJack Reference: Dark gray bar when empty */
                <div className="hotel-upcoming-empty-bar">
                  No Bookings Available
                </div>
              )}
            </div>
          )}

          {/* PANEL 3: Recent Searches */}
          {activeTab === 'recent' && (
            <div className="hotel-booking-panel" role="tabpanel">
              <div className="hotel-recent-cards-header">
                <span>Recent Hotel Searches</span>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    className="hotel-clear-recent-btn"
                    onClick={handleClearRecentSearches}
                    title="Clear recent hotel searches"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                )}
              </div>

              {recentSearches.length > 0 ? (
                <div className="hotel-recent-cards-grid">
                  {recentSearches.map(item => (
                    <div
                      key={item.id}
                      className="hotel-recent-search-card"
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
                      <div className="hotel-recent-icon-wrap">
                        <Building2 size={18} />
                      </div>

                      <div className="hotel-recent-card-body">
                        <div className="hotel-recent-title">
                          <span>{item.cityName}</span>
                          <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                        </div>
                        <div className="hotel-recent-meta">
                          {item.dateLabel || `${item.checkIn} → ${item.checkOut}`}
                        </div>
                        <div className="hotel-recent-guests">
                          {item.roomsCount || 1} Room(s) · {item.guestCount || 2} Guest(s)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="hotel-recent-empty-card">
                  <div className="hotel-recent-icon-wrap">
                    <Building2 size={18} />
                  </div>
                  <div className="hotel-recent-card-body">
                    <div className="hotel-recent-title">
                      <span>No Recent Hotel Searches</span>
                    </div>
                    <div className="hotel-recent-meta">
                      Searches you perform will appear here for fast 1-click re-booking.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hotel Voucher Modal */}
      {selectedVoucher && (
        <div className="hotel-voucher-modal-overlay" onClick={() => setSelectedVoucher(null)}>
          <div className="hotel-voucher-modal" onClick={e => e.stopPropagation()}>
            <div className="hotel-voucher-header">
              <h3>
                <Building2 size={20} />
                <span>Confirmed Hotel Voucher</span>
              </h3>
              <button
                type="button"
                className="hotel-voucher-close"
                onClick={() => setSelectedVoucher(null)}
                aria-label="Close voucher modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="hotel-voucher-body">
              <div className="hotel-voucher-banner">
                <div className="hotel-voucher-group">
                  <span>Confirmation Code</span>
                  <strong>{selectedVoucher.voucherNumber || 'TJ-HTL-CONF'}</strong>
                </div>
                <span className="hotel-status-badge">
                  {selectedVoucher.status || 'Confirmed'}
                </span>
              </div>

              <div className="hotel-voucher-property">
                <h4>{selectedVoucher.hotelName}</h4>
                <p>{selectedVoucher.cityName} {selectedVoucher.address ? `· ${selectedVoucher.address}` : ''}</p>
              </div>

              <div className="hotel-voucher-grid">
                <div className="hotel-voucher-item">
                  <span>Check-in Date</span>
                  <strong>{selectedVoucher.checkIn}</strong>
                </div>
                <div className="hotel-voucher-item">
                  <span>Check-out Date</span>
                  <strong>{selectedVoucher.checkOut}</strong>
                </div>
                <div className="hotel-voucher-item">
                  <span>Room Type</span>
                  <strong>{selectedVoucher.roomName || 'Standard Room'}</strong>
                </div>
                <div className="hotel-voucher-item">
                  <span>Meal Basis</span>
                  <strong>{selectedVoucher.mealBasis || 'Room Only'}</strong>
                </div>
                <div className="hotel-voucher-item">
                  <span>Lead Guest</span>
                  <strong>{selectedVoucher.guestName || 'Guest'}</strong>
                </div>
                <div className="hotel-voucher-item">
                  <span>Total Amount Paid</span>
                  <strong>{selectedVoucher.priceFormatted || `₹${selectedVoucher.price || 0}`}</strong>
                </div>
              </div>

              <div className="hotel-voucher-footer">
                <button
                  type="button"
                  className="hotel-btn-print"
                  onClick={() => window.print()}
                >
                  <Printer size={15} style={{ display: 'inline', marginRight: 6 }} />
                  Print / Save Voucher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
