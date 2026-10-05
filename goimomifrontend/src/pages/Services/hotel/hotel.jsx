import React from 'react';
import HotelSearch from './HotelSearch';
import usePageSEO from '../../../hooks/usePageSEO';

/**
 * Hotel Page Route Component
 * 
 * Entry point for `/hotel` route. Injects SEO metadata for hotel search
 * and delegates search UI, filters, and dashboard to HotelSearch.
 */
export default function Hotel() {
  usePageSEO(
    'Search Hotels and Compare Rooms | Goimomi Holidays',
    'Explore hotels, compare available rooms and review live prices and cancellation policies.',
    null,
    'hotel search, hotel rooms, Goimomi Holidays'
  );
  return <HotelSearch />;
}

