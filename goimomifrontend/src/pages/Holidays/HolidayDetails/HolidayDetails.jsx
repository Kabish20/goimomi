import React, { useState, useEffect, useMemo } from "react";
import { Hotel, Star, MapPin, Info, Utensils, FileDown, ArrowRight, Car } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";
import api from "../../../api";
import ZohoTripForm from "../../../components/forms/ZohoTripForm";
import DownloadPDFModal from "../../../components/holidays/DownloadPDFModal";
import usePageSEO from "../../../hooks/usePageSEO";
import { getImageUrl } from "../../../utils/imageUtils";
import { simpleCache } from "../../../utils/cache";
import { downloadPackagePDF } from "../../../utils/pdfGenerator";
// PDF Static Assets are handled by pdfGenerator utility

/**
 * Holiday Package Detailed Itinerary & Booking Page
 * 
 * Features:
 * - Day-by-day rich itinerary visualization with activities, sightseeing spots, and accommodations
 * - Fixed departure slots with real-time tier pricing (Standard, Deluxe, Luxury)
 * - Inclusions, exclusions, policy terms, and downloadable PDF brochure
 * - Direct Zoho CRM lead capture form
 */
const HolidayDetails = () => {
  const { id } = useParams();
  const tabsRef = React.useRef(null);
  const location = useLocation();
  const [pkg, setPkg] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [sightseeingMasters, setSightseeingMasters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [pricePopupOpen, setPricePopupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Itinerary");
  const [selectedTier, setSelectedTier] = useState(location.state?.selectedTier || "Standard");
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(0);

  const slots = useMemo(() => {
    try {
      const raw = pkg?.fixed_departure_data ? (typeof pkg.fixed_departure_data === 'string' ? JSON.parse(pkg.fixed_departure_data) : pkg.fixed_departure_data) : [];
      return raw.map(s => ({
        ...s,
        travel_date: s.travel_date || s.date || s.travelDate || ""
      }));
    } catch (e) { return []; }
  }, [pkg?.fixed_departure_data]);

  const currentPrice = useMemo(() => {
    if (slots.length > 0) {
      const slot = slots[selectedSlotIdx] || slots[0];
      const tierKey = Object.keys(slot.tiers || {}).find(k => k.toLowerCase() === (selectedTier || "standard").toLowerCase());
      const tierData = slot.tiers?.[tierKey];
      if (tierData && tierData.length > 0) {
        const data = tierData[0];
        return data.offer_price || data.Offer_price || data.price;
      }
    }
    return pkg?.Offer_price || pkg?.offer_price;
  }, [slots, selectedTier, selectedSlotIdx, pkg?.Offer_price, pkg?.offer_price]);

  const markupPrice = useMemo(() => {
    if (slots.length > 0) {
      const slot = slots[selectedSlotIdx] || slots[0];
      const tierKey = Object.keys(slot.tiers || {}).find(k => k.toLowerCase() === (selectedTier || "standard").toLowerCase());
      const tierData = slot.tiers?.[tierKey];
      if (tierData && tierData.length > 0) {
        const data = tierData[0];
        return data.markup_price || data.Markup_price || data.market_price || data.Market_price;
      }
    }
    return pkg?.price;
  }, [slots, selectedTier, selectedSlotIdx, pkg?.price]);

  const discountPercentage = useMemo(() => {
    if (markupPrice && currentPrice && markupPrice > currentPrice) {
      return Math.round(((markupPrice - currentPrice) / markupPrice) * 100);
    }
    return 0;
  }, [markupPrice, currentPrice]);

  const availableDates = useMemo(() => {
    if (slots.length > 0) {
      return slots.map(s => {
        const d = s.travel_date;
        if (!d) return null;
        try {
          return new Date(d).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) { return null; }
      }).filter(Boolean);
    }
    return [];
  }, [slots]);

  const stripeHtml = (html) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const seoDescription = useMemo(() => {
    if (!pkg) return "Discover affordable and premium tour packages with Goimomi Holidays.";
    const plainDesc = stripeHtml(pkg.description);
    if (plainDesc && plainDesc.length > 10) {
      return plainDesc.substring(0, 160) + (plainDesc.length > 160 ? "..." : "");
    }
    return `Book the ${pkg.title} package with Goimomi Holidays. Enjoy ${pkg.days} days and ${pkg.nights} nights in ${pkg.starting_city} and more.`;
  }, [pkg]);

  usePageSEO(
    pkg ? `${pkg.title} | Goimomi Holidays` : "Holiday Details | Goimomi Holidays",
    seoDescription,
    pkg ? getImageUrl(pkg.header_image || pkg.card_image) : "https://goimomi.com/logo.png",
    pkg ? `book ${pkg.title}, ${pkg.category} tour, ${pkg.starting_city} package, holiday details Goimomi` : "holiday details, tour package Goimomi"
  );


  useEffect(() => {
    simpleCache(`package_${id}`, () => api.get(`/api/packages/${id}/`))
      .then((res) => setPkg(res.data))
      .catch((err) => console.error("Error fetching package details:", err));

    simpleCache("accommodations", () => api.get("/api/accommodations/"))
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        const enriched = data.map(acc => ({
            ...acc,
            stars: acc.star_category ? acc.star_category.split(' ')[0] : '3'
        }));
        setAccommodations(enriched);
      })
      .catch((err) => console.error("Error fetching accommodations:", err));

    simpleCache("sightseeing_masters", () => api.get("/api/sightseeing-masters/"))
      .then((res) => setSightseeingMasters(Array.isArray(res.data) ? res.data : (res.data.results || [])))
      .catch((err) => console.error("Error fetching sightseeing masters:", err));

    const handleClickOutside = (event) => {
      if (!event.target.closest(".holiday-details-price-info")) {
        setPricePopupOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [id]);

  // PDF generation logic moved to pdfGenerator utility

  if (!pkg) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="w-full bg-gray-50 pb-20">

      {/* PREMIUM HERO HEADER - Full Width & Attractive */}
      <div className="relative w-full h-[540px] overflow-hidden group">
        <img
          src={getImageUrl(pkg.header_image || pkg.card_image)}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          alt={pkg.title}
        />
        {/* Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full pb-10">
          <div className="w-[85%] mx-auto">
            {/* Badges Row */}
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#16a34a] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                {pkg.category || "International Tour"}
              </span>
              {pkg.fixed_departure && (
                <button 
                  onClick={() => {
                    setActiveTab("Dates");
                    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-4 py-1.5 rounded-full border border-white/20 uppercase tracking-widest shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-700 hover:bg-white/20 transition-all cursor-pointer"
                >
                  Fixed Departure
                </button>
              )}
            </div>

            {/* Main Title Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1 animate-in fade-in slide-in-from-left-4 duration-700">
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-2xl mb-3">
                  {pkg.title}
                </h1>

                {/* Metadata Row inside Hero */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-white/90">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-[#16a34a] uppercase tracking-widest mb-0.5">Duration</span>
                    <span className="text-[13px] font-extrabold uppercase">{pkg.nights || pkg.days - 1}N / {pkg.days}D</span>
                  </div>
                  <div className="w-px h-6 bg-white/20 hidden md:block"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-[#16a34a] uppercase tracking-widest mb-0.5">Starting From</span>
                    <span className="text-[13px] font-extrabold uppercase">{pkg.starting_city}</span>
                  </div>
                  <div className="w-px h-6 bg-white/20 hidden md:block"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-[#16a34a] uppercase tracking-widest mb-0.5">Best Offer</span>
                    <div className="flex items-center gap-2">
                       {markupPrice > currentPrice && (
                         <span className="text-[11px] text-white/60 line-through decoration-[#16a34a] font-bold">₹{Number(markupPrice).toLocaleString('en-IN')}</span>
                       )}
                       <span className="text-[15px] font-black uppercase text-white tracking-tight">₹{Number(currentPrice || 0).toLocaleString('en-IN')} <span className="text-[8px] opacity-70 font-medium">/ PER PERSON</span></span>
                    </div>
                  </div>
                  {availableDates.length > 0 && (
                    <>
                      <div className="w-px h-6 bg-white/20 hidden md:block"></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[#16a34a] uppercase tracking-widest mb-0.5">Available Dates</span>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {availableDates.map((d, di) => (
                            <button 
                              key={di} 
                              onClick={() => setSelectedSlotIdx(di)}
                              className={`text-[11px] font-black px-2 py-0.5 rounded-md border transition-all uppercase ${
                                selectedSlotIdx === di 
                                ? "bg-white text-[#16a34a] border-white shadow-lg" 
                                : "bg-white/10 text-white border-white/5 hover:bg-white/20"
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="w-px h-6 bg-white/20 hidden md:block"></div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <Hotel size={16} className="text-white mb-1 opacity-70" />
                      <span className="text-[8px] font-black uppercase opacity-60">Hotels</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Utensils size={16} className="text-white mb-1 opacity-70" />
                      <span className="text-[8px] font-black uppercase opacity-60">Meals</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <ArrowRight size={16} className="text-white mb-1 opacity-70" />
                      <span className="text-[8px] font-black uppercase opacity-60">Transfers</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="w-[85%] mx-auto flex gap-10 mt-12">
        {/* LEFT CONTENT */}
        <div className="w-[65%]">

          {/* DESCRIPTION SECTION - Ultra Minimized */}
          <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-1 rounded-full bg-[#16a34a]"></div>
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Description</h3>
            </div>
            <p className="text-gray-600 text-[13px] leading-relaxed font-medium">
              {pkg.description || 'Embark on an unforgettable journey through breathtaking landscapes and vibrant cultures.'}
            </p>
          </div>

          {/* Highlights Summary - Minimized */}
          {pkg.highlights && pkg.highlights.length > 0 && (
            <div className="mb-8 bg-green-50/40 rounded-xl p-4 border border-green-100/50">
              <h3 className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-green-500"></div>
                Package Highlights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {((pkg.highlights_raw && Array.isArray(pkg.highlights_raw) && pkg.highlights_raw.length > 0) ? pkg.highlights_raw.map(h => ({ text: h })) : (pkg.highlights || [])).map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1.5 w-1 h-1 rounded-full bg-green-400 flex-shrink-0"></div>
                    <span className="text-[13px] text-gray-800 font-medium leading-tight">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TABS HEADER - STICKY / FLOATING */}
          <div ref={tabsRef} className="sticky top-[100px] z-30 bg-white/95 backdrop-blur-md py-3 mb-4 -mx-4 px-4 shadow-sm border-b border-gray-100">
            <div className="flex flex-row overflow-x-auto gap-2 pb-1 custom-scrollbar no-scrollbar">
              {["Itinerary", "Sightseeing", "Hotels", "Dates", "Inclusions & Exclusions", "Terms & Policy"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-[10px] font-black rounded-lg shadow-sm transition-all flex-shrink-0 whitespace-nowrap uppercase tracking-wider ${activeTab === tab
                    ? "bg-[#16a34a] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="animate-in fade-in duration-500">

            {activeTab === "Dates" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
                {slots.map((s, i) => {
                  const tierKey = Object.keys(s.tiers || {}).find(k => k.toLowerCase() === (selectedTier || "standard").toLowerCase());
                  const tierRows = s.tiers?.[tierKey] || [];
                  const priceData = tierRows[0];
                  const price = priceData ? (priceData.offer_price || priceData.Offer_price || priceData.price) : (pkg?.Offer_price || pkg?.offer_price);
                  const slotMarkupPrice = priceData ? (priceData.markup_price || priceData.Markup_price || priceData.market_price || priceData.Market_price) : (pkg?.price || price);
                  const isSelected = selectedSlotIdx === i;
                  
                  // Check if date is in the past
                  const travelDateObj = s.travel_date ? new Date(s.travel_date) : null;
                  const isPast = travelDateObj && travelDateObj < new Date().setHours(0, 0, 0, 0);

                  return (
                    <div
                      key={i}
                      onClick={() => !isPast && setSelectedSlotIdx(i)}
                      className={`p-2.5 border rounded-xl text-center transition-all ${
                        isPast 
                          ? "bg-red-50/50 border-red-100 opacity-70 cursor-not-allowed"
                          : isSelected
                            ? "bg-green-50 border-[#16a34a] shadow-md scale-[1.02] cursor-pointer"
                            : "bg-white border-gray-100 hover:border-green-100 hover:bg-gray-50/50 cursor-pointer"
                      }`}
                    >
                      <p className={`text-[9px] font-black uppercase tracking-tight mb-1 ${
                        isPast ? "text-red-500" : (isSelected ? "text-[#16a34a]" : "text-gray-400")
                      }`}>
                        {s.travel_date 
                          ? new Date(s.travel_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                          : "DATE TBA"}
                      </p>
                      <div className="flex flex-col items-center justify-center">
                        {slotMarkupPrice > price && (
                          <p className={`text-[9px] line-through font-bold opacity-70 -mb-0.5 ${isPast ? "text-red-300 decoration-red-400/30" : "text-gray-400 decoration-red-500/30"}`}>
                            ₹{Number(slotMarkupPrice).toLocaleString('en-IN')}
                          </p>
                        )}
                        <p className={`text-[13px] font-black leading-tight ${
                          isPast ? "text-red-700" : (isSelected ? "text-[#15803d]" : "text-gray-900")
                        }`}>
                          ₹{Number(price || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <p className={`text-[7px] font-bold uppercase tracking-tighter mt-1 ${
                        isPast ? "text-red-400" : (isSelected ? "text-green-600/60" : "text-gray-400")
                      }`}>Per Person</p>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "Itinerary" && (
              <div className="space-y-16">
                {pkg.itinerary?.map((item, index) => {
                  let details = {};
                  try {
                    details = typeof item.details_json === 'string' ? JSON.parse(item.details_json || '{}') : item.details_json;
                  } catch (e) {
                    console.error("Error parsing details_json in itinerary map:", e);
                  }
                  return (
                    <div key={index} className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${index * 100}ms` }}>
                      {/* Day Header */}
                      <div className="border-b-2 border-green-600/10 mb-6 w-full flex items-center gap-3">
                        <div className="bg-[#16a34a] text-white px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-lg shadow-green-900/10">
                          Day {String(item.day_number).padStart(2, '0')}
                        </div>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-green-600/20 to-transparent"></div>
                      </div>

                      {/* Main Itinerary Card */}
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mb-4 hover:border-green-100/50 transition-all group/card">
                        <div className="flex flex-col md:flex-row justify-between gap-5 mb-3">
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                            <div className="relative">
                              <p className="text-gray-600 text-[13px] leading-relaxed">
                                {item.description}
                              </p>
                            </div>

                            {/* Detailed Vehicle / Transfer Info */}
                            {details?.vehicle_transfers && Object.entries(details.vehicle_transfers).some(([_, v]) => v.selected) && (
                              <div className="mt-4 space-y-2.5">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Transfers & Logistics</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {Object.entries(details.vehicle_transfers).map(([key, data]) => {
                                    if (!data.selected) return null;
                                    const labels = {
                                      airport: 'Arrival / Departure Transfer',
                                      sightseeing: 'Sightseeing Transfer',
                                      intercity: 'Intercity Transfer'
                                    };
                                    return (
                                      <div key={key} className="flex flex-col gap-1 p-2 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Car size={12} />
                                          </div>
                                          <span className="text-[12px] font-bold text-gray-800">{labels[key]}</span>
                                          <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-blue-600 text-white rounded-md ml-auto">
                                            {data.mode}
                                          </span>
                                        </div>
                                        {data.description && (
                                          <p className="text-[11px] text-gray-500 font-medium pl-7 leading-relaxed">
                                            {data.description}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Legacy Transfers Info (Fallback) */}
                            {!details?.vehicle_transfers && (details?.transfers || details?.intercity_transfer) && (
                              <div className="mt-6 flex items-center gap-2 text-[13px] font-bold text-gray-800">
                                <span className="text-gray-500">Transfers :</span>
                                <span>{details.transfers || details.intercity_transfer}</span>
                              </div>
                            )}

                            {/* Sightseeing List */}
                            {Array.isArray(details?.sightseeing) && details.sightseeing.length > 0 && (
                                <div className="mt-3">
                                   <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sightseeing Included</p>
                                   <div className="flex flex-wrap gap-2">
                                      {details.sightseeing.map((s, si) => (
                                          <div key={si} className="flex items-center gap-1.5">
                                              <div className="w-1 h-1 rounded-full bg-green-100 border border-green-200"></div>
                                              <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-100">
                                                  {s}
                                              </span>
                                          </div>
                                      ))}
                                   </div>
                                </div>
                            )}
                          </div>
                          {item.image && (
                            <div className="shrink-0">
                               <img
                                  src={getImageUrl(item.image)}
                                  alt={item.title}
                                  className="w-full md:w-64 h-48 object-cover rounded-2xl shadow-sm border border-gray-50 transition-all group-hover/card:scale-[1.02]"
                               />
                            </div>
                          )}
                        </div>

                        {/* Meals Inclusion Row */}
                        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-x-8 gap-y-3">
                          {[
                            { label: 'Breakfast', val: details?.meals_included?.includes('Breakfast') || details?.meals?.breakfast },
                            { label: 'Lunch', val: details?.meals_included?.includes('Lunch') || details?.meals?.lunch },
                            { label: 'Dinner', val: details?.meals_included?.includes('Dinner') || details?.meals?.dinner }
                          ].map((m, mi) => (
                            <div key={mi} className="flex flex-col">
                              <span className="text-[12px] text-gray-300 font-medium mb-1">{m.label}</span>
                              <span className={`text-[14px] font-medium ${m.val ? 'text-gray-900' : 'text-gray-300'}`}>
                                {m.val ? 'Included' : 'Not Included'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hotel Card for this Day */}
                      {Array.isArray(details?.accommodations) && details.accommodations.map((h, hi) => {
                          const master = accommodations.find(a => a.id === h.hotelId || a.name === h.hotelName);
                          return (
                            <div key={hi} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mt-3 group hover:border-[#16a34a]/30 transition-all">
                               <h4 className="text-[16px] font-bold text-gray-900 mb-1 leading-tight">
                                  {h.hotelName || master?.name || "Stay Included"}
                               </h4>
                               <div className="flex gap-0.5 mb-2">
                                 {[...Array(5)].map((_, si) => (
                                   <Star key={si} size={11} className={si < Number(h.stars || master?.stars || 3) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                                 ))}
                               </div>
                               <div className="space-y-0.5">
                                  <p className="text-[12px] text-gray-400 font-medium tracking-tight">Room Included</p>
                                  <p className="text-[14px] font-black text-gray-800 tracking-tight">{h.roomType || "Standard"}</p>
                                  <p className="text-[12px] text-gray-500 font-medium">Meals at hotel: <span className="text-[#16a34a] font-bold">{h.mealPlan || "As per plan"}</span></p>
                               </div>
                            </div>
                          );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "Hotels" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                {(() => {
                  const allAccs = [];
                  pkg.itinerary?.forEach(day => {
                    try {
                      const d = typeof day.details_json === 'string' ? JSON.parse(day.details_json || '{}') : day.details_json;
                      if (Array.isArray(d?.accommodations)) {
                      d.accommodations.forEach(acc => {
                        if (acc && !allAccs.find(a => (a?.hotelId && a.hotelId === acc?.hotelId) || (a?.hotelName && a.hotelName === acc?.hotelName))) {
                          allAccs.push(acc);
                        }
                      });
                      }
                    } catch (e) {
                      console.error("Error parsing details_json in hotels map:", e);
                    }
                  });

                  if (allAccs.length === 0) return (
                    <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                      <p className="text-gray-400 font-medium">No hotels specified for this package.</p>
                    </div>
                  );

                  return allAccs.map((h, i) => {
                    if (!h) return null;
                    let master = accommodations.find(a => a.id === h.hotelId);
                    if (master && h.hotelName && master.name !== h.hotelName) {
                      const nameMatch = accommodations.find(a => a.name === h.hotelName);
                      if (nameMatch) { master = nameMatch; }
                      else { master = null; }
                    }
                    if (!master && h.hotelName) master = accommodations.find(a => a.name === h.hotelName);

                    return (
                      <div key={`hotel-${i}`} className="border border-gray-100 rounded-xl p-3 bg-white mb-2 shadow-sm w-full transition-all hover:border-green-100">
                        <h4 className="text-[13px] font-bold text-gray-900 mb-1 leading-tight">
                          {h.hotelName || master?.name || "Premium Hotel"}
                        </h4>

                        <div className="flex items-center gap-1 mb-1.5 pb-1.5 border-b border-gray-50">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                            {h.roomType || "Standard Room"}
                          </span>
                          <div className="flex gap-0.5 ml-auto">
                            {[...Array(5)].map((_, si) => (
                              <Star
                                key={si}
                                size={9}
                                className={si < Number(h.stars || master?.stars || 3) ? "text-yellow-400 fill-yellow-400" : "text-gray-100"}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium tracking-tight">
                            <MapPin size={10} className="text-gray-300" />
                            <span>{master?.city || "Featured City"}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                             <p className="text-[9px] font-black text-[#16a34a] uppercase bg-green-50 px-1.5 py-0.5 rounded">{h.mealPlan || "Room Only"}</p>
                             <span className="text-[9px] text-gray-300 font-bold uppercase">Included</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {activeTab === "Sightseeing" && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-50">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-[3px] h-5 bg-[#16a34a] rounded-full"></div>
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Sightseeing Included</h3>
                </div>

                {(() => {
                  const activities = pkg.itinerary?.flatMap(day => {
                    let d = {};
                    try {
                      d = typeof day.details_json === 'string' ? JSON.parse(day.details_json || '{}') : day.details_json;
                    } catch (e) {
                      console.error("Error parsing details_json in sightseeing flatMap:", e);
                    }
                    return (d?.sightseeing || []).filter(s => s && s.trim()).map(s => ({ text: s, dayNum: day.day_number }));
                  }) || [];

                  if (activities.length > 0) {
                    return (
                      <div className="space-y-3">
                        {activities.map((act, i) => {
                          const master = sightseeingMasters.find(m => m.name === act.text);
                          return (
                            <div key={i} className="flex gap-4 p-3 bg-white rounded-xl items-start border border-gray-100 hover:border-green-100 shadow-sm transition-all group">
                              <div className="bg-green-50 text-[#16a34a] text-[9px] font-black px-2.5 py-1 rounded-full shrink-0 border border-green-100 mt-0.5">
                                DAY {act.dayNum}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">{master?.city || "Tour Activity"}</p>
                                <h4 className="text-[14px] font-black text-gray-900 group-hover:text-[#16a34a] transition-colors">{act.text}</h4>
                                {master?.description && (
                                  <p className="text-[11px] text-gray-500 leading-snug line-clamp-2 mt-1">{master.description}</p>
                                )}
                              </div>
                                {master?.image && (
                                  <img src={getImageUrl(master.image)} alt={act.text} className="w-20 h-20 object-cover rounded-xl shrink-0 border border-gray-100 shadow-sm hidden sm:block group-hover:scale-105 transition-transform" />
                                )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    return (
                      <div className="text-center py-8 border border-dashed border-gray-100 bg-gray-50/30 rounded-xl">
                        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest">Included as per itinerary</p>
                      </div>
                    );
                  }
                })()}
              </div>
            )}

            {activeTab === "Inclusions & Exclusions" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50/30 p-5 rounded-2xl border border-green-100">
                  <h3 className="text-sm font-black mb-4 text-[#14532d] flex items-center gap-2 tracking-wider">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    INCLUSIONS
                  </h3>
                  <ul className="space-y-2">
                    {(pkg.inclusions_raw && Array.isArray(pkg.inclusions_raw) && pkg.inclusions_raw.length > 0) ? (
                      pkg.inclusions_raw.map((inc, i) => (
                        <li key={i} className="text-gray-700 flex items-start gap-2 text-xs font-medium">
                          <span className="text-green-500 font-black">✓</span>
                          <span>{inc}</span>
                        </li>
                      ))
                    ) : pkg.inclusions?.map((inc, i) => (
                      <li key={i} className="text-gray-700 flex items-start gap-2 text-xs font-medium">
                        <span className="text-green-500 font-black">✓</span>
                        <span>{inc.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50/30 p-5 rounded-2xl border border-red-100">
                  <h3 className="text-sm font-black mb-4 text-red-800 flex items-center gap-2 tracking-wider">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    EXCLUSIONS
                  </h3>
                  <ul className="space-y-2">
                    {(pkg.exclusions_raw && Array.isArray(pkg.exclusions_raw) && pkg.exclusions_raw.length > 0) ? (
                      pkg.exclusions_raw.map((exc, i) => (
                        <li key={i} className="text-gray-700 flex items-start gap-2 text-xs font-medium">
                          <span className="text-red-500 font-black">×</span>
                          <span>{exc}</span>
                        </li>
                      ))
                    ) : pkg.exclusions?.map((exc, i) => (
                      <li key={i} className="text-gray-700 flex items-start gap-2 text-xs font-medium">
                        <span className="text-red-500 font-black">×</span>
                        <span>{exc.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "Terms & Policy" && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Terms & Policy</h3>
                <div className="text-gray-600 text-[11px] leading-relaxed space-y-3">
                  {(pkg.terms_and_policies_raw && Array.isArray(pkg.terms_and_policies_raw) && pkg.terms_and_policies_raw.length > 0) ? (
                    pkg.terms_and_policies_raw.map((policy, i) => (
                      <p key={i}>• {policy}</p>
                    ))
                  ) : (pkg.cancellation_policies_raw && Array.isArray(pkg.cancellation_policies_raw) && pkg.cancellation_policies_raw.length > 0) ? (
                    pkg.cancellation_policies_raw.map((policy, i) => (
                      <p key={i}>• {policy}</p>
                    ))
                  ) : (pkg.cancellation_policies && Array.isArray(pkg.cancellation_policies) && pkg.cancellation_policies.length > 0) ? (
                    pkg.cancellation_policies.map((policy, i) => (
                      <p key={i}>• {policy.text}</p>
                    ))
                  ) : (
                    <>
                      <p>• The itinerary is subject to change based on weather conditions, flight schedules, and other logistics.</p>
                      <p>• Prices are starting from and may vary during peak seasons or due to availability.</p>
                      <p>• 5% GST and TCS as per government regulations will be applicable.</p>
                      <p>• Passport should be valid for at least 6 months from the date of travel.</p>
                    </>
                  )}
                  <p className="pt-3 text-[10px] italic text-gray-400 font-bold uppercase tracking-tight">Please refer to our main Terms & Policy page for full details.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PRICE CARD - Ultra Compact */}
        <div className="w-[30%] sticky top-28 bg-white shadow-sm rounded-xl p-3 h-fit border border-gray-100/50">

          {/* Tier Selection Dropdown */}
          <div className="mb-4">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="w-full bg-white border border-gray-200 p-2 text-[13px] font-bold outline-none rounded-lg shadow-sm focus:border-[#16a34a] transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E')] bg-[length:12px_12px] bg-[right_12px_center] bg-no-repeat pr-10 hover:border-gray-300"
            >
              {pkg.package_categories?.length > 0 ? pkg.package_categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              )) : <option value="Standard">Standard</option>}
            </select>
          </div>

          {/* Price Row */}
          <div className="flex justify-between items-end mb-3 pb-3 border-b border-gray-50">
            <div className="space-y-1">
               <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest leading-none">Best Price</p>
               {discountPercentage > 0 && (
                <div className="px-2 py-0.5 bg-red-50 text-red-500 text-[9px] font-black rounded-full inline-block animate-pulse">
                  {discountPercentage}% OFF
                </div>
               )}
            </div>
            
            <div className="text-right relative holiday-details-price-info">
              {markupPrice && markupPrice > currentPrice && (
                <p className="line-through text-gray-400 decoration-red-500/40 text-[13px] mb-[-4px] font-bold opacity-70">₹ {Number(markupPrice || 0).toLocaleString('en-IN')}</p>
              )}
              <div className="flex items-center justify-end gap-1.5">
                <p className="text-2xl font-black text-gray-900 tracking-tighter drop-shadow-sm leading-none">₹ {Number(currentPrice || 0).toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Per Person</p>
                  <button
                    onClick={() => setPricePopupOpen(!pricePopupOpen)}
                    className="text-gray-300 hover:text-green-600 transition-colors"
                  >
                    <Info size={12} />
                  </button>
                </div>
              </div>

              {pricePopupOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-lg shadow-xl border border-gray-50 z-[60] p-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <p className="text-[9px] font-black text-gray-900 mb-1 border-b border-gray-50 pb-1 uppercase tracking-widest">Pricing Info</p>
                  <p className="text-[9px] text-gray-500 leading-tight">
                    Dynamic pricing based on peak season and availability.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex items-center gap-2 border-t border-gray-50 pt-2 mb-3">
             <div className="px-2 py-1 bg-green-50 rounded text-[#16a34a] text-[9px] font-black uppercase">{pkg.days}D / {pkg.nights}N</div>
             <div className="px-2 py-1 bg-gray-50 rounded text-gray-500 text-[9px] font-black uppercase">{pkg.category || "Tour"}</div>
          </div>

          {/* Enquire Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-[#16a34a] text-white py-2 rounded-lg text-[11px] font-black hover:bg-[#15803d] transition-all uppercase tracking-widest shadow-lg shadow-green-200"
          >
            Enquire Now
          </button>

          {/* Download Button */}
          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="w-full bg-white text-[#16a34a] border border-[#16a34a] py-2 rounded-lg mt-2 text-[11px] font-black hover:bg-green-50 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5"
          >
            <FileDown size={14} />
            Brochure
          </button>
        </div>
      </div>

      <DownloadPDFModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        packageName={pkg?.title}
        onDownload={() => {
          downloadPackagePDF(pkg);
        }}
      />

      <ZohoTripForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={{
          packageTitle: pkg?.title,
          category: pkg?.category
        }}
      />
    </div>
  );
};

export default HolidayDetails;



