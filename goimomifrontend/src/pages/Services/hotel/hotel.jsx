import React from 'react';
import HotelSearch from './HotelSearch';
import usePageSEO from '../../../hooks/usePageSEO';

export default function Hotel() {
  usePageSEO('Search Hotels and Compare Rooms | Goimomi Holidays', 'Explore hotels, compare available rooms and review live prices and cancellation policies.', null, 'hotel search, hotel rooms, Goimomi Holidays');
  return <HotelSearch />;
}
