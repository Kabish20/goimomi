export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const shiftDate = (value, days) => { const d = new Date(`${value}T12:00:00`); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const dayLabel = value => new Date(`${value?.slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
export const duration = minutes => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
export const fareTotal = (fare, pax) => Object.entries(fare.fD || {}).reduce((sum, [type, value]) => sum + Number(value.fC?.TF || 0) * (pax[type] || 0), 0);
export const tripDuration = trip => (trip.sI || []).reduce((sum, segment) => sum + Number(segment.duration || 0) + Number(segment.cT || 0), 0);
export const layoverDuration = trip => (trip.sI || []).reduce((sum, segment) => sum + Number(segment.cT || 0), 0);
export const stopCount = trip => Math.max(0, (trip.sI?.length || 1) - 1) + (trip.sI || []).reduce((sum, segment) => sum + Number(segment.stops || 0), 0);
export const readSession = key => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
export const saveSession = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Navigation state remains available. */ } };
export function flightError(error) {
  const data = error.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.error === 'string') return data.error;
  if (!error.response) return 'Unable to connect to the flight service. Please try again shortly.';
  if (error.response.status >= 500) return 'The flight service is temporarily unavailable. Please try again or contact our travel team.';
  if (error.response.status === 404) return 'The flight search service is unavailable. Please contact our travel team.';
  const flatten = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(flatten) : [];
  return flatten(data).slice(0, 3).join(' ') || 'Unable to complete this request. Please search again.';
}
export const cabinLabel = cabin => ({ ECONOMY: 'Economy', PREMIUM_ECONOMY: 'Premium Economy', BUSINESS: 'Business', FIRST: 'First' })[cabin] || cabin;
