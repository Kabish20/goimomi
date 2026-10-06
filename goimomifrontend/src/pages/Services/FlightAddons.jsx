import React, { useState } from 'react';
import { Utensils, Luggage, Plus, Minus, Check, HeartHandshake, Shield, Sparkles } from 'lucide-react';
import { money } from './flightUtils';

/**
 * Meal options matching Screenshot 1
 */
const MEAL_CATALOGUE = [
  { id: 'paneer_sandwich', title: 'Paneer Tikka Sandwich Combo', price: 500, isVeg: true },
  { id: 'chicken_sandwich', title: 'Chicken Junglee Sandwich Combo', price: 500, isVeg: false },
  { id: 'veg_biryani', title: 'Awadhi Veg Biryani with Raita', price: 450, isVeg: true },
  { id: 'chicken_biryani', title: 'Hyderabadi Chicken Biryani Combo', price: 550, isVeg: false },
];

/**
 * Baggage options matching Screenshot 2
 */
const BAGGAGE_CATALOGUE = [
  { id: 'baggage_5kg', title: 'Excess Baggage - 5 Kg', price: 3750, weight: '5 Kg' },
  { id: 'baggage_10kg', title: 'Excess Baggage - 10 Kg', price: 7500, weight: '10 Kg' },
  { id: 'baggage_15kg', title: 'Excess Baggage - 15 Kg', price: 11250, weight: '15 Kg' },
  { id: 'baggage_30kg', title: 'Excess Baggage - 30 Kg', price: 22500, weight: '30 Kg' },
];

/**
 * Other Special Services matching Screenshot 2
 */
const OTHER_SERVICES_CATALOGUE = [
  { id: 'wheelchair', title: 'Wheelchair Assistance', price: 0, description: 'Complimentary wheelchair assistance at airport terminals' },
  { id: 'priority_checkin', title: 'Fast Forward (Priority Check-In & Bag)', price: 400, description: 'Dedicated counter check-in and priority luggage delivery' },
  { id: 'travel_insurance', title: 'TripSafe Medical & Baggage Protection', price: 299, description: 'Comprehensive coverage up to ₹5,00,000 for flight delays and loss' },
];

export default function FlightAddons({
  segments = [],
  passengers = [{ title: 'Mr', firstName: 'Vijay', lastName: 'Kumar' }],
  selectedMeals = {}, // { [segIdx]: { [paxIdx]: { [mealId]: qty } } }
  onChangeMeal,
  selectedBaggage = {}, // { [segIdx]: { [paxIdx]: { [bagId]: qty } } }
  onChangeBaggage,
  selectedOtherServices = {}, // { [serviceId]: boolean }
  onChangeOtherService,
}) {
  const [activeSegIdx, setActiveSegIdx] = useState(0);
  const [activeMealPaxIdx, setActiveMealPaxIdx] = useState(0);
  const [activeBaggagePaxIdx, setActiveBaggagePaxIdx] = useState(0);

  // Diet filter state: 'all' | 'veg' | 'nonveg'
  const [dietFilter, setDietFilter] = useState('all');

  const currentSegment = segments[activeSegIdx] || segments[0] || {};
  const originCode = currentSegment.da?.code || 'MAA';
  const destCode = currentSegment.aa?.code || 'TRZ';
  const totalPax = passengers.length || 1;

  // Meal selections for active segment & passenger
  const currentSegMeals = selectedMeals[activeSegIdx] || {};
  const activePaxMeals = currentSegMeals[activeMealPaxIdx] || {};

  // Baggage selections for active segment & passenger
  const currentSegBaggage = selectedBaggage[activeSegIdx] || {};
  const activePaxBaggage = currentSegBaggage[activeBaggagePaxIdx] || {};

  // Filter meals
  const filteredMeals = MEAL_CATALOGUE.filter(m => {
    if (dietFilter === 'veg') return m.isVeg;
    if (dietFilter === 'nonveg') return !m.isVeg;
    return true;
  });

  // Calculate totals
  const totalMealFee = Object.values(selectedMeals).reduce((sum, segMeals) => {
    return sum + Object.values(segMeals || {}).reduce((pSum, paxMeals) => {
      return pSum + Object.entries(paxMeals || {}).reduce((mSum, [mId, qty]) => {
        const item = MEAL_CATALOGUE.find(m => m.id === mId);
        return mSum + (item ? item.price * qty : 0);
      }, 0);
    }, 0);
  }, 0);

  const totalBaggageFee = Object.values(selectedBaggage).reduce((sum, segBaggage) => {
    return sum + Object.values(segBaggage || {}).reduce((pSum, paxBaggage) => {
      return pSum + Object.entries(paxBaggage || {}).reduce((bSum, [bId, qty]) => {
        const item = BAGGAGE_CATALOGUE.find(b => b.id === bId);
        return bSum + (item ? item.price * qty : 0);
      }, 0);
    }, 0);
  }, 0);

  const totalOtherServicesFee = Object.entries(selectedOtherServices || {}).reduce((sum, [sId, enabled]) => {
    if (!enabled) return sum;
    const item = OTHER_SERVICES_CATALOGUE.find(s => s.id === sId);
    return sum + (item ? item.price : 0);
  }, 0);

  const activeMealPax = passengers[activeMealPaxIdx] || passengers[0];
  const activeBaggagePax = passengers[activeBaggagePaxIdx] || passengers[0];

  const mealPaxLabel = `${activeMealPax.title || 'Mr'} ${activeMealPax.firstName || 'VIJAY'} ${activeMealPax.lastName || 'KUMAR'}`.toUpperCase();
  const baggagePaxLabel = `${activeBaggagePax.title || 'Mr'} ${activeBaggagePax.firstName || 'VIJAY'} ${activeBaggagePax.lastName || 'KUMAR'}`.toUpperCase();

  const totalMealsCount = Object.values(currentSegMeals).reduce((c, pm) => {
    return c + Object.values(pm || {}).reduce((sub, q) => sub + q, 0);
  }, 0);

  const totalBaggageCount = Object.values(currentSegBaggage).reduce((c, pb) => {
    return c + Object.values(pb || {}).reduce((sub, q) => sub + q, 0);
  }, 0);

  return (
    <div className="tj-flight-addons-wrapper">
      {/* ========================================================
          1. SELECT MEAL SECTION (Screenshot 1)
          ======================================================== */}
      <div className="tj-addon-section-card">
        <div className="tj-addon-header-bar">
          <div className="tj-addon-header-left">
            <div className="tj-addon-title">
              <Utensils size={18} />
              <span>SELECT MEAL</span>
            </div>
            <div className="tj-addon-route-pill">
              <span>{originCode}</span>
              <span className="tj-seatmap-plane">✈</span>
              <span>{destCode}</span>
              <strong>{totalMealsCount}/{totalPax}</strong>
            </div>
          </div>

          {/* Diet Filter Icons matching Screenshot 1 */}
          <div className="tj-diet-filter-wrap">
            <button
              type="button"
              title="Non-Veg Only"
              className={`tj-diet-icon-btn ${dietFilter === 'nonveg' ? 'is-active' : ''}`}
              onClick={() => setDietFilter(dietFilter === 'nonveg' ? 'all' : 'nonveg')}
            >
              <span className="tj-diet-dot-nonveg" />
            </button>

            <button
              type="button"
              title="Veg Only"
              className={`tj-diet-icon-btn ${dietFilter === 'veg' ? 'is-active' : ''}`}
              onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
            >
              <span className="tj-diet-dot-veg" />
            </button>
          </div>
        </div>

        {/* Meal Cards Grid matching Screenshot 1 */}
        <div className="tj-addon-cards-grid">
          {filteredMeals.map(meal => {
            const qty = activePaxMeals[meal.id] || 0;

            return (
              <div key={meal.id} className={`tj-addon-card-item ${qty > 0 ? 'has-selected' : ''}`}>
                <div className="tj-addon-card-top">
                  <span className={meal.isVeg ? 'tj-diet-dot-veg' : 'tj-diet-dot-nonveg'} style={{ marginTop: 4, flexShrink: 0 }} />
                  <span className="tj-addon-card-title">{meal.title}</span>
                </div>

                <div className="tj-addon-card-bottom">
                  <span className="tj-addon-card-price">{money(meal.price)}</span>
                  <div className="tj-addon-stepper">
                    <button
                      type="button"
                      disabled={qty <= 0}
                      className="tj-stepper-btn"
                      onClick={() => onChangeMeal && onChangeMeal(activeSegIdx, activeMealPaxIdx, meal.id, qty - 1)}
                    >
                      <Minus size={13} strokeWidth={3} />
                    </button>
                    <span className="tj-stepper-val">{qty}</span>
                    <button
                      type="button"
                      disabled={qty >= 4}
                      className="tj-stepper-btn"
                      onClick={() => onChangeMeal && onChangeMeal(activeSegIdx, activeMealPaxIdx, meal.id, qty + 1)}
                    >
                      <Plus size={13} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Bar: Passenger Selector & Total Meal Fee (Screenshot 1) */}
        <div className="tj-addon-bottom-bar">
          <div className="tj-addon-pax-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {passengers.map((p, idx) => {
              const isCur = idx === activeMealPaxIdx;
              const paxLabel = `${p.title || 'Mr'} ${p.firstName || 'VIJAY'} ${p.lastName || 'KUMAR'}`.toUpperCase();
              return (
                <button
                  key={idx}
                  type="button"
                  className={`tj-addon-pax-pill ${isCur ? 'is-active' : ''}`}
                  onClick={() => setActiveMealPaxIdx(idx)}
                >
                  <span>{paxLabel}</span>
                  <strong>SELECT MEAL</strong>
                </button>
              );
            })}
          </div>

          <div className="tj-addon-fee-display">
            <span>Total Meal Fee : </span>
            <strong>{money(totalMealFee)}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. SELECT BAGGAGE SECTION (Screenshot 2)
          ======================================================== */}
      <div className="tj-addon-section-card">
        <div className="tj-addon-header-bar">
          <div className="tj-addon-header-left">
            <div className="tj-addon-title">
              <Luggage size={18} />
              <span>SELECT BAGGAGE</span>
            </div>
            <div className="tj-addon-route-pill">
              <span>{originCode}</span>
              <span className="tj-seatmap-plane">✈</span>
              <span>{destCode}</span>
              <strong>{totalBaggageCount}/{totalPax}</strong>
            </div>
          </div>
        </div>

        {/* Baggage Cards Grid matching Screenshot 2 */}
        <div className="tj-addon-cards-grid">
          {BAGGAGE_CATALOGUE.map(bag => {
            const qty = activePaxBaggage[bag.id] || 0;

            return (
              <div key={bag.id} className={`tj-addon-card-item ${qty > 0 ? 'has-selected' : ''}`}>
                <div className="tj-addon-card-top">
                  <Luggage size={20} className="tj-baggage-icon-blue" />
                  <span className="tj-addon-card-title">{bag.title}</span>
                </div>

                <div className="tj-addon-card-bottom">
                  <span className="tj-addon-card-price">{money(bag.price)}</span>
                  <div className="tj-addon-stepper">
                    <button
                      type="button"
                      disabled={qty <= 0}
                      className="tj-stepper-btn"
                      onClick={() => onChangeBaggage && onChangeBaggage(activeSegIdx, activeBaggagePaxIdx, bag.id, qty - 1)}
                    >
                      <Minus size={13} strokeWidth={3} />
                    </button>
                    <span className="tj-stepper-val">{qty}</span>
                    <button
                      type="button"
                      disabled={qty >= 3}
                      className="tj-stepper-btn"
                      onClick={() => onChangeBaggage && onChangeBaggage(activeSegIdx, activeBaggagePaxIdx, bag.id, qty + 1)}
                    >
                      <Plus size={13} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Bar: Passenger Selector & Total Baggage Fee (Screenshot 2) */}
        <div className="tj-addon-bottom-bar">
          <div className="tj-addon-pax-tabs" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {passengers.map((p, idx) => {
              const isCur = idx === activeBaggagePaxIdx;
              const paxLabel = `${p.title || 'Mr'} ${p.firstName || 'VIJAY'} ${p.lastName || 'KUMAR'}`.toUpperCase();
              return (
                <button
                  key={idx}
                  type="button"
                  className={`tj-addon-pax-pill ${isCur ? 'is-active' : ''}`}
                  onClick={() => setActiveBaggagePaxIdx(idx)}
                >
                  <span>{paxLabel}</span>
                  <strong>SELECT BAGGAGE</strong>
                </button>
              );
            })}
          </div>

          <div className="tj-addon-fee-display">
            <span>Total Baggage Fee : </span>
            <strong>{money(totalBaggageFee)}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. OTHER SERVICES SECTION (Screenshot 2)
          ======================================================== */}
      <div className="tj-addon-section-card">
        <div className="tj-addon-header-bar">
          <div className="tj-addon-header-left">
            <div className="tj-addon-title">
              <Sparkles size={18} />
              <span>Other Services</span>
            </div>
            <div className="tj-addon-route-pill">
              <span>{originCode}</span>
              <span className="tj-seatmap-plane">✈</span>
              <span>{destCode}</span>
            </div>
          </div>

          <div className="tj-addon-fee-display">
            <span>Total Fee : </span>
            <strong>{money(totalOtherServicesFee)}</strong>
          </div>
        </div>

        <div className="tj-addon-cards-grid">
          {OTHER_SERVICES_CATALOGUE.map(svc => {
            const isOpted = Boolean(selectedOtherServices[svc.id]);

            return (
              <div key={svc.id} className={`tj-addon-card-item ${isOpted ? 'has-selected' : ''}`} style={{ cursor: 'pointer' }} onClick={() => onChangeOtherService && onChangeOtherService(svc.id, !isOpted)}>
                <div className="tj-addon-card-top">
                  <HeartHandshake size={20} style={{ color: '#14532d', flexShrink: 0 }} />
                  <div>
                    <span className="tj-addon-card-title">{svc.title}</span>
                    <small style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2 }}>{svc.description}</small>
                  </div>
                </div>

                <div className="tj-addon-card-bottom">
                  <span className="tj-addon-card-price">{svc.price === 0 ? 'FREE' : money(svc.price)}</span>
                  <label className="flight-check" style={{ pointerEvents: 'none' }}>
                    <input
                      type="checkbox"
                      checked={isOpted}
                      readOnly
                    />
                    <span style={{ fontSize: 12, fontWeight: 700, color: isOpted ? '#14532d' : '#64748b' }}>
                      {isOpted ? 'Selected' : 'Add Service'}
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
