import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { filterAirports } from './flightAirportsData';
import './FlightAirportPicker.css';

export default function FlightAirportPicker({
  value,
  onChange,
  placeholder = 'Where From ?',
  icon: Icon,
  ariaLabel,
  airports = [],
  id,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Selected airport details
  const selectedCode = (typeof value === 'object' ? value?.code : value) || '';
  const selectedAirport = useMemo(() => {
    if (!selectedCode) return null;
    return airports.find(a => (a.iata_code || '').toUpperCase() === selectedCode.toUpperCase()) ||
      (typeof value === 'object' && value?.code ? value : null);
  }, [selectedCode, airports, value]);

  // Filtered airports based on current query
  const filteredList = useMemo(() => {
    return filterAirports(query, airports);
  }, [query, airports]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Keep highlighted item in view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.flight-airport-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex, isOpen]);

  function handleSelect(airport) {
    onChange({
      code: airport.iata_code,
      name: airport.name,
      cityName: airport.city_name,
      countryName: airport.country_name,
    });
    setIsOpen(false);
    setQuery('');
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange({ code: '' });
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
    setIsOpen(true);
  }

  function handleFocus() {
    setIsOpen(true);
    setHighlightedIndex(0);
  }

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % Math.max(1, filteredList.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredList.length) % Math.max(1, filteredList.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredList[highlightedIndex]) {
        handleSelect(filteredList[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  }

  // Display text in the input
  const displayText = isOpen
    ? query
    : selectedAirport
      ? `${selectedAirport.city_name || selectedAirport.cityName || selectedAirport.code} (${selectedAirport.iata_code || selectedAirport.code})`
      : '';

  return (
    <div
      ref={containerRef}
      className={`flight-airport-picker ${isOpen ? 'picker-open' : ''} ${selectedAirport ? 'has-value' : ''}`}
    >
      <div className="picker-input-wrap" onClick={() => { if (!isOpen) { setIsOpen(true); inputRef.current?.focus(); } }}>
        {Icon && <Icon className="picker-icon" aria-hidden="true" size={22} />}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-label={ariaLabel || placeholder}
          placeholder={placeholder}
          value={displayText}
          onChange={e => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          required={required && !selectedCode}
        />
        {selectedCode && (
          <button
            type="button"
            className="picker-clear-btn"
            aria-label={`Clear ${placeholder}`}
            onClick={handleClear}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="flight-airport-dropdown" role="listbox">
          <div className="dropdown-scroll-body" ref={listRef}>
            {filteredList.length > 0 ? (
              filteredList.map((airport, index) => {
                const isSelected = selectedCode === airport.iata_code;
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={`${airport.iata_code}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`flight-airport-item ${isHighlighted ? 'is-highlighted' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelect(airport)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="airport-col-code">
                      {airport.iata_code}
                    </div>

                    <div className="airport-col-info">
                      <span className="airport-city-title">
                        {airport.city_name || airport.name}
                      </span>
                      <span className="airport-sub-name">
                        {airport.name}
                      </span>
                    </div>

                    <div className="airport-col-country">
                      {airport.country_name || 'India'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="picker-empty-state">
                <Search size={18} className="empty-search-icon" />
                <p>No airports found for &ldquo;{query}&rdquo;</p>
                <small>Try searching by city, airport name, or 3-letter IATA code</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
