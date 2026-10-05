import api from '../../api';

// The Django adapter attaches the TripJack key; never call TripJack from the browser.
export const searchFlights = (searchQuery, signal) => api.post(
  '/api/flights/search/', { searchQuery }, { skipAuth: true, signal },
);

export const reviewFlights = (searchToken, priceIds) => api.post(
  '/api/flights/review/', { searchToken, priceIds }, { skipAuth: true },
);

export const getFlightAirports = signal => api.get('/api/airports/', {
  skipAuth: true, signal,
});

export const getFareRules = (searchToken, priceId, signal) => api.post(
  '/api/flights/fare-rules/', { searchToken, priceId }, { skipAuth: true, signal },
);

export const createFlightPaymentSession = (payload) => api.post(
  '/api/flights/create-payment-session/', payload, { skipAuth: true },
);

export const verifyFlightPayment = (payload) => api.post(
  '/api/flights/verify-payment/', payload, { skipAuth: true },
);
