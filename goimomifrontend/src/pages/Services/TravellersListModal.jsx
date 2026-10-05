import React, { useState, useEffect } from 'react';
import { Search, UserCheck, X, Plus, Check } from 'lucide-react';

const DEFAULT_TRAVELLERS = [
  { id: 't-1', title: 'Mr', firstName: 'Rahul', lastName: 'Sharma', gender: 'MALE', phone: '9876543210', email: 'rahul.sharma@example.com', ffAirline: '6E', ffNumber: '6E982012' },
  { id: 't-2', title: 'Mrs', firstName: 'Priya', lastName: 'Sharma', gender: 'FEMALE', phone: '9876543211', email: 'priya.sharma@example.com', ffAirline: '6E', ffNumber: '6E982013' },
  { id: 't-3', title: 'Mr', firstName: 'Mohammed', lastName: 'Ali', gender: 'MALE', phone: '9845123456', email: 'm.ali@example.com', ffAirline: 'AI', ffNumber: 'AI492019' },
  { id: 't-4', title: 'Ms', firstName: 'Ananya', lastName: 'Iyer', gender: 'FEMALE', phone: '9880192837', email: 'ananya.iyer@example.com', ffAirline: '6E', ffNumber: '6E338192' },
];

export default function TravellersListModal({ isOpen, onClose, onSelectTraveller }) {
  const [query, setQuery] = useState('');
  const [travellers, setTravellers] = useState(DEFAULT_TRAVELLERS);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('goimomi_saved_travellers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          setTravellers(parsed);
        }
      } else {
        localStorage.setItem('goimomi_saved_travellers', JSON.stringify(DEFAULT_TRAVELLERS));
      }
    } catch (_) {}
  }, []);

  if (!isOpen) return null;

  const filtered = travellers.filter(t =>
    `${t.firstName} ${t.lastName} ${t.phone} ${t.email}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flight-modal-backdrop" onClick={onClose}>
      <div
        className="tj-traveller-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search from Travellers List"
        onClick={e => e.stopPropagation()}
      >
        <div className="tj-traveller-modal-header">
          <div>
            <h3>Search from Travellers List</h3>
            <p>Select a frequent flyer or saved traveller to instantly auto-fill details</p>
          </div>
          <button type="button" className="tj-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="tj-traveller-search-wrap">
          <Search size={17} className="tj-traveller-search-icon" />
          <input
            type="text"
            placeholder="Search by traveller name, mobile or email..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="tj-clear-search">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="tj-traveller-list-body">
          {filtered.length === 0 ? (
            <div className="tj-traveller-empty">
              <p>No travellers found matching "{query}"</p>
            </div>
          ) : (
            filtered.map(t => (
              <div
                key={t.id}
                className={`tj-traveller-card ${selectedId === t.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="tj-traveller-avatar">
                  {t.firstName?.[0]}{t.lastName?.[0]}
                </div>
                <div className="tj-traveller-info">
                  <strong>{t.title} {t.firstName} {t.lastName}</strong>
                  <span>{t.phone} · {t.email}</span>
                  {t.ffNumber && (
                    <small>Frequent Flyer ({t.ffAirline || 'Airline'}): {t.ffNumber}</small>
                  )}
                </div>
                <button
                  type="button"
                  className="tj-traveller-select-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectTraveller) onSelectTraveller(t);
                    onClose();
                  }}
                >
                  <Check size={14} /> Select
                </button>
              </div>
            ))
          )}
        </div>

        <div className="tj-traveller-modal-footer">
          <button type="button" className="flight-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
