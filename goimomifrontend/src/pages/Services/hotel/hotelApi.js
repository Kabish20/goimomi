import api from '../../../api';

/**
 * Creates a Zoho Payments hosted checkout session for a hotel booking.
 * 
 * @param {Object} payload
 * @param {string} payload.bookingId - Unique booking reference
 * @param {number} payload.amount - Total amount payable in INR
 * @param {string} payload.name - Lead guest full name
 * @param {string} payload.email - Contact email
 * @param {string} payload.phone - Contact phone number
 * @param {string} payload.hotelName - Name of the selected hotel
 * @param {string} payload.roomName - Selected room type description
 * @param {string} [payload.successUrl] - Return URL on successful payment
 * @param {string} [payload.failureUrl] - Return URL on failed payment
 * @returns {Promise<Object>} Zoho session with redirect_url
 */
export const createHotelPaymentSession = (payload) =>
  api.post('/api/hotels/create-payment-session/', payload, { skipAuth: true });

/**
 * Verifies a Zoho Payments checkout session for a hotel booking.
 * 
 * @param {Object} payload
 * @param {string} [payload.sessionId] - Zoho payments_session_id
 * @param {string} [payload.bookingId] - Booking reference ID
 * @returns {Promise<Object>} Verification status
 */
export const verifyHotelPayment = (payload) =>
  api.post('/api/hotels/verify-payment/', payload, { skipAuth: true });
