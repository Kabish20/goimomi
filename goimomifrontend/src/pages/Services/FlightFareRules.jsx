import React, { useEffect, useRef, useState } from 'react';
import { getFareRules } from './flightApi';
import { flightError, money } from './flightUtils';

const labels = { CANCELLATION: 'Cancellation', DATECHANGE: 'Date change', NO_SHOW: 'No-show', SEAT_CHARGEABLE: 'Seat charges' };

// Preserve route/passenger context while finding documented policies in supplier wrappers.
function collectRules(value, path = [], rows = []) {
  if (!value || typeof value !== 'object') return rows;
  Object.entries(value).forEach(([key, child]) => {
    if (labels[key] && child) rows.push({ title: [...path, labels[key]].join(' · '), policies: (Array.isArray(child) ? child : [child]).filter(Boolean) });
    else if (key === 'miscInfo') {
      const strings = node => typeof node === 'string' ? [node] : node && typeof node === 'object' ? Object.values(node).flatMap(strings) : [];
      const text = strings(child).join('\n');
      if (text) rows.push({ title: [...path, 'Additional rules'].join(' · '), policies: [{ policyInfo: text }] });
    } else if (!['status', 'errors'].includes(key)) collectRules(child, ['fareRule', 'fareRules', 'tfr'].includes(key) ? path : [...path, key], rows);
  });
  return rows;
}

export default function FlightFareRules({ searchToken, priceId }) {
  const [state, setState] = useState({ loading: false, rows: null, error: '' });
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function load() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState({ loading: true, rows: null, error: '' });
    try {
      const { data } = await getFareRules(searchToken, priceId, request.signal);
      if (!request.signal.aborted) setState({ loading: false, rows: collectRules(data), error: '' });
    } catch (error) {
      if (!request.signal.aborted) setState({ loading: false, rows: null, error: flightError(error) });
    }
  }
  return <section className="flight-fare-rules" aria-label="Fare rules">
    <button type="button" onClick={load} disabled={state.loading}>{state.loading ? 'Loading rules…' : 'View fare rules'}</button>
    <div aria-live="polite">
      {state.error && <p role="alert">{state.error}</p>}
      {state.rows?.length === 0 && <p>Detailed fare rules were not supplied. Confirm the policy with our travel team before booking.</p>}
      {state.rows?.map((row, index) => <div key={index}><h4>{row.title}</h4>{row.policies.map((policy, i) => <div key={i}>
        {typeof policy === 'string' ? <p>{policy}</p> : <>
          {policy.pp && <p>{String(policy.pp).replaceAll('_', ' ')}</p>}
          {(policy.st != null || policy.et != null) && <p>Hours before departure: {policy.st ?? 'Not supplied'} to {policy.et ?? 'Not supplied'}</p>}
          {policy.amount != null && <p>Airline fee: {money(policy.amount)}</p>}
          {policy.additionalFee != null && <p>Additional fee: {money(policy.additionalFee)}</p>}
          {typeof policy.policyInfo === 'string' && <p>{policy.policyInfo}</p>}
        </>}
      </div>)}</div>)}
    </div>
  </section>;
}
