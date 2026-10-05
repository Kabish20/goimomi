import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import api from "../../../api";
import { Share2, Mail, Eye, MessageCircle, X, Copy, CheckCircle, ChevronDown, Search, FileDown, ArrowRight, Hotel, Utensils } from "lucide-react";
import usePageSEO from "../../../hooks/usePageSEO";
import { getImageUrl } from "../../../utils/imageUtils";
import jsPDF from "jspdf";
import ZohoTripForm from "../../../components/forms/ZohoTripForm";
import DownloadPDFModal from "../../../components/holidays/DownloadPDFModal";
import goimomilogo from "../../../assets/goimomilogo.png";
import pdfImg1 from "../../../assets/pdf/BALI - awesome waterfalls near UBUD.jpeg";
import pdfImg2 from "../../../assets/pdf/Egypt.jpeg";
import pdfImg3 from "../../../assets/pdf/FAMILY FUN IN VIETNAM _ Tailor-made tour - Exotic Voyages.jpeg";
import pdfImg4 from "../../../assets/pdf/16 of the Best Places to Visit in Italy.jpeg";
import pdfImg5 from "../../../assets/pdf/Petra (Jordan).jpeg";
import pdfImg6 from "../../../assets/pdf/The Colosseum, Rome.jpeg";
import pdfImg7 from "../../../assets/pdf/Matera_ The City of Stones.jpeg";
import pdfImg8 from "../../../assets/pdf/20 Best City Breaks in the World - Travel Den.jpeg";
import pdfImg9 from "../../../assets/pdf/A guide to the Azores.jpeg";
import pdfImg10 from "../../../assets/pdf/5 Day Phuket Thailand Itinerary - Guide To Things To Do.jpeg";
import pdfImg11 from "../../../assets/pdf/10 Top Cities In India To Visit - Hand Luggage Only - Travel, Food And Photography Blog.jpeg";
import pdfImg12 from "../../../assets/pdf/Navigating Japanese Culture_ 20 Essential Etiquette Tips for Travelers.jpeg";
import pdfImg13 from "../../../assets/pdf/amazing places in the world to travel.jpeg";
import pdfImg14 from "../../../assets/pdf/The ultimate travel Guide to Cappadocia, Turkey - Jyo Shankar.jpeg";
import pdfImg15 from "../../../assets/pdf/100 Most Beautiful UNESCO World Heritage Sites - Road Affair.jpeg";
import pdfImg16 from "../../../assets/pdf/15 Best Places In Turkey To Visit - Hand Luggage Only - Travel, Food And Photography Blog.jpeg";


/**
 * HolidayCard
 * 
 * Renders an individual package card with interactive tabs:
 * - Hotels: Accommodations and star ratings
 * - Inclusions: Sightseeing, transfers, meals, and flight tags
 * - Itinerary Preview: Day-by-day activity breakdown
 * - Dynamic PDF quotation generator and direct Zoho enquiry modal
 */
const HolidayCard = ({ pkg, navigate, generateShareText, setEmailModalPkg, downloadPackagePDF, setViewDetailsPkg }) => {
  const [activeTab, setActiveTab] = useState("Hotels");
  const [selectedTier, setSelectedTier] = useState("Standard");
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(0);

  const uniqueHotels = React.useMemo(() => {
    const hotels = [];
    (pkg.itinerary || []).forEach(day => {
      try {
        const details = typeof day.details_json === 'string' ? JSON.parse(day.details_json || '{}') : day.details_json;
        (details?.accommodations || []).forEach(acc => {
          const name = acc.hotelName || acc.hotel_name;
          if (name && !hotels.includes(name)) hotels.push(name);
        });
      } catch (e) {
        console.error("Error parsing details_json in uniqueHotels:", e);
      }
    });
    return hotels;
  }, [pkg.itinerary]);

  const sightseeings = React.useMemo(() => {
    const s = [];
    (pkg.itinerary || []).forEach(day => {
      try {
        const details = typeof day.details_json === 'string' ? JSON.parse(day.details_json || '{}') : day.details_json;
        (details?.sightseeing || []).forEach(item => {
          if (item && !s.includes(item)) s.push(item);
        });
      } catch (e) {
        console.error("Error parsing details_json in sightseeings:", e);
      }
    });
    return s;
  }, [pkg.itinerary]);

  const slots = React.useMemo(() => {
    try {
      const raw = pkg.fixed_departure_data ? (typeof pkg.fixed_departure_data === 'string' ? JSON.parse(pkg.fixed_departure_data) : pkg.fixed_departure_data) : [];
      return raw.map(s => ({
        ...s,
        travel_date: s.travel_date || s.date || s.travelDate || ""
      }));
    } catch (e) { return []; }
  }, [pkg.fixed_departure_data]);

  const currentPrice = React.useMemo(() => {
    if (slots.length > 0) {
      const slot = slots[selectedSlotIdx] || slots[0];
      const tierKey = Object.keys(slot.tiers || {}).find(k => k.toLowerCase() === (selectedTier || "standard").toLowerCase());
      const tierData = slot.tiers?.[tierKey];
      if (tierData && tierData.length > 0) {
        const data = tierData[0];
        return data.offer_price || data.Offer_price || data.price;
      }
    }
    return pkg.Offer_price || pkg.offer_price;
  }, [slots, selectedTier, selectedSlotIdx, pkg.Offer_price, pkg.offer_price]);

  return (
    <div className="bg-white border border-gray-200 rounded-sm shadow-sm mb-4 flex flex-col font-sans max-w-[1000px] mx-auto overflow-hidden">
      {/* HEADER BAR */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/30 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[14px] sm:text-[15px] font-bold text-gray-800 leading-snug">
          <span className="font-extrabold text-black">({pkg.nights || pkg.days - 1}N/{pkg.days}D)</span> - {pkg.fixed_departure ? 'Fix Departure: ' : ''}{pkg.title}
        </h3>

        {/* SHARE PILL BAR - Top Right Corner */}
        <div className="bg-[#4d4d4d] text-white rounded-full py-1 px-3 flex items-center gap-3 shadow-md scale-90 sm:scale-95 origin-right self-end sm:self-auto shrink-0">
          <div className="flex items-center gap-1.5 pr-3 border-r border-gray-500">
            <Share2 size={12} className="text-gray-300" />
            <span className="text-[9px] font-black tracking-widest uppercase">Share :</span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent(generateShareText(pkg))}`, '_blank'); }}
            className="flex items-center gap-1 hover:text-green-400 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle size={12} />
            <span className="text-[9px] font-bold">WhatsApp</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setEmailModalPkg(pkg); }}
            className="flex items-center gap-1 hover:text-blue-400 transition-colors"
            title="Email"
          >
            <Mail size={12} />
            <span className="text-[9px] font-bold">Email</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); downloadPackagePDF(pkg); }}
            className="flex items-center gap-1 hover:text-red-400 transition-colors"
            title="PDF"
          >
            <FileDown size={12} />
            <span className="text-[9px] font-bold">PDF</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setViewDetailsPkg(pkg, selectedTier); }}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity ml-1"
            title="View"
          >
            <Eye size={12} className="text-yellow-500" />
            <span className="text-[9px] font-bold text-yellow-500">View</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* LEFT COLUMN */}
        <div className="w-full md:w-[180px] p-3 flex flex-col items-center shrink-0">
          <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shadow-sm border border-gray-100">
            {pkg.fixed_departure && (
              <div 
                onClick={() => setActiveTab("Dates")}
                className="absolute top-0 left-0 z-20 flex flex-col items-start translate-x-[-2px] translate-y-[-2px] cursor-pointer group"
              >
                <div className="bg-[#1a1a1a] text-white px-3 py-1 text-[11px] font-bold shadow-md rounded-tl-xl group-hover:bg-[#333] transition-colors">
                  Fix Departure
                </div>
                {/* Speech bubble pointer */}
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#1a1a1a] ml-2 group-hover:border-t-[#333] transition-colors"></div>
              </div>
            )}
            <img 
              src={getImageUrl(pkg.card_image)} 
              className="absolute inset-0 w-full h-full object-cover" 
              alt={pkg.title}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <button
            onClick={() => navigate(`/holiday/${pkg.id}`, { state: { selectedTier } })}
            className="w-full mt-2 border border-[#16a34a] text-[#16a34a] py-1 text-[11px] font-medium hover:bg-green-50 transition-colors"
          >
            View Detailed Itinerary
          </button>
        </div>

        {/* MIDDLE COLUMN - Tabs Content */}
        <div className="flex-1 p-0 flex flex-col border-r border-gray-200">
          {/* TABS */}
          <div className="flex border-b border-gray-200">
            {["Hotels", "Sightseeings", "Inclusion", "Exclusion", "Dates"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-[12px] font-medium transition-all relative ${activeTab === tab
                  ? "bg-[#333] text-white"
                  : "text-gray-700 hover:text-[#16a34a]"
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-[#333]"></div>
                )}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="p-3 flex-1">
            {activeTab === "Hotels" && (
              <div className="border border-gray-200 rounded-sm">
                <div className="bg-[#f2f2f2] px-3 py-1 text-[11px] font-bold text-gray-700 border-b border-gray-200 uppercase tracking-tight">
                  Hotels Included in package
                </div>
                <div className="p-3 space-y-2">
                  {uniqueHotels.length > 0 ? uniqueHotels.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></div>
                      <span className="text-[12px] font-black text-[#3498db] tracking-tight">{h}</span>
                    </div>
                  )) : (
                    <div className="p-2 text-center text-gray-400 italic text-[11px]">No hotel details specified.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "Sightseeings" && (
              <div className="flex flex-wrap gap-1.5">
                {sightseeings.length > 0 ? sightseeings.map((s, i) => (
                  <span key={i} className="bg-gray-50 border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 rounded">{s}</span>
                )) : <div className="p-4 text-center text-gray-400 italic w-full">Standard sightseeing included.</div>}
              </div>
            )}

            {activeTab === "Inclusion" && (
              <ul className="grid grid-cols-2 gap-1 text-[11px] text-gray-700">
                {(pkg.inclusions?.length ? pkg.inclusions : [{ text: "Accommodation" }, { text: "Daily Breakfast" }]).map((inc, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-green-600 font-bold">✓</span>
                    {inc.text}
                  </li>
                ))}
              </ul>
            )}

            {activeTab === "Exclusion" && (
              <ul className="grid grid-cols-2 gap-1 text-[11px] text-gray-500">
                {(pkg.exclusions?.length ? pkg.exclusions : [{ text: "Optional Tours" }, { text: "Personal Expenses" }]).map((exc, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500 font-bold">×</span>
                    {exc.text}
                  </li>
                ))}
              </ul>
            )}

            {activeTab === "Dates" && (
              <div className="grid grid-cols-3 gap-1.5">
                {slots.length > 0 ? slots.map((s, i) => {
                  const tierKey = Object.keys(s.tiers || {}).find(k => k.toLowerCase() === (selectedTier || "standard").toLowerCase());
                  const tierRows = s.tiers?.[tierKey] || [];
                  const priceData = tierRows[0];
                  const price = priceData ? (priceData.offer_price || priceData.Offer_price || priceData.price) : null;
                  const isSelected = selectedSlotIdx === i;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedSlotIdx(i)}
                      className={`border px-1.5 py-1 text-center flex flex-col items-center justify-center rounded-sm cursor-pointer transition-all ${
                        isSelected 
                        ? "border-[#16a34a] bg-green-50 shadow-sm" 
                        : "border-gray-100 bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${isSelected ? "text-[#16a34a]" : "text-gray-400"}`}>
                        {s.travel_date 
                          ? new Date(s.travel_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                          : "DATE TBA"}
                      </span>
                      {price && (
                        <span className={`text-[11px] font-black leading-none mt-1 ${isSelected ? "text-[#15803d]" : "text-[#16a34a]"}`}>
                          ₹ {Number(price).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  );
                }) : <div className="p-4 text-center text-gray-400 italic w-full">Contact for availability.</div>}
              </div>
            )}
          </div>


          {/* LOWER ICONS BAR */}
          <div className="px-3 pb-3 flex items-center gap-3">
            <span className="text-[12px] font-bold text-gray-800">Inclusion :</span>
            <div className="flex gap-1.5">
              <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500" title="Hotels"><Hotel size={14} /></div>
              <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500" title="Meals"><Utensils size={14} /></div>
              <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500" title="Transfers"><ArrowRight size={14} /></div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - PRICING */}
        <div className="w-full md:w-[200px] bg-[#fdfdfd] p-4 flex flex-col items-center justify-center">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="w-full bg-white border border-gray-200 p-1.5 text-[13px] outline-none mb-4 rounded-sm"
          >
            {pkg.package_categories?.length > 0 ? pkg.package_categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            )) : <option value="Standard">Standard</option>}
          </select>

          <div className="text-center mb-4">
            <p className="text-[12px] text-gray-400 font-medium">Starting From</p>
            <h4 className="text-[22px] font-black text-[#16a34a] leading-none my-1 tracking-tight">INR {Number(currentPrice || 0).toLocaleString('en-IN')}</h4>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">Per Person</p>
          </div>

          <button
            onClick={() => navigate(`/holiday/${pkg.id}`, { state: { selectedTier } })}
            className="w-full bg-white border border-[#16a34a] text-[#16a34a] py-2 text-[13px] font-bold hover:bg-green-50 transition-colors rounded-sm"
          >
            Enquire
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Holidays Discovery & Catalog Hub
 * 
 * Features:
 * - Comprehensive holiday package search, filtering by destination, starting city, nights, budget, and flights
 * - Dynamic SEO meta tags driven by category and destination parameters
 * - Instant package PDF download and email sharing
 * - Integrated lead booking modal connecting directly to Zoho CRM
 */
const Holidays = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // ===================== FILTER STATES =====================
  const [category, setCategory] = useState("");
  const [destination, setDestination] = useState("");

  const seoTitle = category 
    ? `Best ${category} Packages | Luxury Travel Deals | Goimomi Holidays`
    : destination
      ? `${destination} Tour Packages | Handpicked Itineraries | Goimomi Holidays`
      : "Premium Holiday Packages | Curated Travel Experiences | Goimomi Holidays";
      
  const seoDesc = category
    ? `Explore our exclusive ${category} travel packages. Immerse yourself in premium itineraries, 4-star accommodations, and seamless travel planning designed by Goimomi Holidays experts.`
    : destination
      ? `Discover the magic of ${destination} with our handpicked tour packages. Enjoy a stress-free vacation with Goimomi Holidays' luxury stays, expert local guides, and personalized travel solutions.`
      : "Browse Goimomi Holidays' collection of premium tour packages. From exotic beach escapes to mountain adventures, our expertly curated itineraries ensure a life-changing travel experience tailored to your dreams.";

  const seoKeywords = category
    ? `${category} packages, ${category} travel, ${category} tour, Goimomi Holidays, holiday deals`
    : destination
      ? `${destination} tour packages, visit ${destination}, ${destination} travel deals, Goimomi Holidays, vacation in ${destination}`
      : "holiday packages, tour packages, travel agency India, luxury vacations, Goimomi Holidays, premium travel experiences, custom holiday planning";

  usePageSEO(seoTitle, seoDesc, null, seoKeywords);

  useEffect(() => {
    // 1. Check Query Params (Priority)
    const categoryParam = searchParams.get("category");

    if (categoryParam) {
      setCategory(categoryParam);
    }
    // 2. Check State (Fallback)
    else if (location.state?.category) {
      setCategory(location.state.category);
    }
    // 3. Default (Reset)
    else {
      setCategory("");
    }

    if (location.state?.filter) {
      setDestination(location.state.filter);
    }
  }, [searchParams, location.state]);

  const [nights, setNights] = useState("");
  const [startingCity, setStartingCity] = useState("");
  const [budget, setBudget] = useState([0, 1000000]);
  const [flightFilter, setFlightFilter] = useState("All");

  const [isDestOpen, setIsDestOpen] = useState(false);
  const [destSearch, setDestSearch] = useState("");
  const [isStartCityOpen, setIsStartCityOpen] = useState(false);
  const [startCitySearch, setStartCitySearch] = useState("");

  const [selectedPkgTitle, setSelectedPkgTitle] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewDetailsPkg, setViewDetailsPkg] = useState(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadingPkg, setDownloadingPkg] = useState(null);

  const openDownloadModal = (pkg) => {
    setDownloadingPkg(pkg);
    setIsDownloadModalOpen(true);
  };

  const handleOpenPreview = async (pkg, tier = "Standard") => {
    setSelectedPkgTitle(pkg.title);
    setViewDetailsPkg({ ...pkg, selectedTier: tier }); // Set initial data from list
    
    try {
      // Fetch full details to get itinerary descriptions and other extra fields
      const res = await api.get(`/api/packages/${pkg.id}/`);
      if (res.data) {
        setViewDetailsPkg({ ...res.data, selectedTier: tier });
      }
    } catch (err) {
      console.error("Error fetching full package details:", err);
    }
  };
  const [emailModalPkg, setEmailModalPkg] = useState(null);
  const [, setActivePricePopup] = useState(null);
  const [sharingEmail, setSharingEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // ===================== PACKAGE DATA =====================
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [destinationsList, setDestinationsList] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [startingCitiesList, setStartingCitiesList] = useState([]);

  useEffect(() => {
    // Fetch regions for destination filter
    const fetchRegions = async () => {
      try {
        setRegionsLoading(true);
        const res = await api.get("/api/regions/");
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setDestinationsList(data);
      } catch (err) {
        console.error("Error fetching regions:", err);
      } finally {
        setRegionsLoading(false);
      }
    };
    
    fetchRegions();

    setLoading(true);
    // Fetch packages
    api.get("/api/packages/")
      .then((res) => {
        const data = res.data.results || (Array.isArray(res.data) ? res.data : []);
        setPackages(data);
        
        // Derive starting cities list from available packages
        if (data && Array.isArray(data)) {
          const uniqueStartingCities = [...new Set(data.map(p => p.starting_city).filter(Boolean))].map((name, index) => ({ id: `sc-${index}`, name }));
          setStartingCitiesList(uniqueStartingCities);
        }
      })
      .catch((err) => console.error("Error fetching packages:", err))
      .finally(() => setLoading(false));
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dest-dropdown-container")) {
        setIsDestOpen(false);
      }
      if (!event.target.closest(".startcity-dropdown-container")) {
        setIsStartCityOpen(false);
      }
      // Close price popup when clicking outside
      if (!event.target.closest(".holiday-price-info-container")) {
        setActivePricePopup(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredDestinationsList = (destinationsList || []).filter(dest =>
    (dest?.name?.toLowerCase().includes(destSearch.toLowerCase()) ||
     dest?.country_name?.toLowerCase().includes(destSearch.toLowerCase()) ||
     dest?.country?.toString().toLowerCase().includes(destSearch.toLowerCase()))
  );

  const filteredStartingCitiesList = (startingCitiesList || []).filter(city =>
    city?.name?.toLowerCase().includes(startCitySearch.toLowerCase())
  );

  // Helper to fix image URLs

  const generateShareText = (pkg) => {
    let text = `Hello, please find details with regards to your holiday query for:
${pkg.title}
Duration: ${pkg.days} Days / ${pkg.days - 1} Nights
Starting From: ₹ ${Number(pkg.Offer_price || 0).toLocaleString('en-IN')}

${pkg.description ? `Description:\n${pkg.description}\n` : ""}
Highlights:
${pkg.highlights?.map(h => `• ${h.text}`)?.join("\n") || "• Accommodation\n• Daily Breakfast\n• Sightseeing\n• Transfers"}

${pkg.inclusions?.length > 0 ? `Inclusions:\n${pkg.inclusions.map(inc => `• ${inc.text}`).join("\n")}\n` : ""}
${pkg.exclusions?.length > 0 ? `Exclusions:\n${pkg.exclusions.map(exc => `• ${exc.text}`).join("\n")}\n` : ""}
Itinerary Summary:
${pkg.itinerary?.map(day => `Day ${day.day_number}: ${day.title}${day.description ? `\n  (${day.description})` : ""}`)?.join("\n") || ""}

Destinations: ${pkg.starting_city}${pkg.destinations?.length > 0 ? " • " + pkg.destinations.map(d => d.name).join(" • ") : ""}

Thank you for choosing goimomi.com
Contact : +91 8110082222
Email : hello@goimomi.com`;
    return text;
  };

  const generateItineraryOnlyText = (pkg) => {
    if (!pkg.itinerary || pkg.itinerary.length === 0) return "No itinerary details available.";
    return `Itinerary Summary for ${pkg.title}:
${pkg.itinerary.map(day => `Day ${day.day_number}: ${day.title}${day.description ? `\n  - ${day.description}` : ""}`).join("\n\n")}`;
  };


  const downloadPackagePDF = async (pkg) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const sidebarWidth = 50;
    const padding = 15;

    // Helper functions
    const addHeader = (doc, title) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.addImage(goimomilogo, 'PNG', padding, 4, 42, 14);
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(8);
      doc.text(title, pageWidth - padding, 12, { align: "right" });
      doc.setDrawColor(243, 244, 246);
      doc.line(padding, 20, pageWidth - padding, 20);
    };

    const addFooter = (doc, pageNum, totalPages) => {
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - padding, pageHeight - 10, { align: "right" });
      doc.text("© goimomi.com | +91 8110082222 | hello@goimomi.com", padding, pageHeight - 10);
    };

    // PAGE 1: COVER
    // Vertical strip of images on the left (2 columns)
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, sidebarWidth, pageHeight, 'F');

    const baseImgs = [pdfImg1, pdfImg2, pdfImg3, pdfImg4, pdfImg5, pdfImg6, pdfImg7, pdfImg8, pdfImg9, pdfImg10, pdfImg11, pdfImg12, pdfImg13, pdfImg14, pdfImg15, pdfImg16];
    const imgSize = 24; // each image cell height (no gap)
    const colW = sidebarWidth / 2;
    let sidebarY = 0;
    let imgIndex = 0;
    while (sidebarY + imgSize <= pageHeight) {
      try {
        doc.addImage(baseImgs[imgIndex % baseImgs.length], 'JPEG', 0, sidebarY, colW, imgSize, undefined, 'FAST');
        doc.addImage(baseImgs[(imgIndex + 1) % baseImgs.length], 'JPEG', colW, sidebarY, colW, imgSize, undefined, 'FAST');
      } catch (e) { /* sidebar images */ }

      sidebarY += imgSize;
      imgIndex += 2;
    }

    // Main Content
    let centerX = sidebarWidth + (pageWidth - sidebarWidth) / 2;

    // Logo
    try { doc.addImage(goimomilogo, 'PNG', centerX - 35, 25, 70, 25); } catch (e) { /* logo error */ }


    // Title
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    const titleLines = doc.splitTextToSize(pkg.title.toUpperCase(), pageWidth - sidebarWidth - 30);
    doc.text(titleLines, centerX, 90, { align: "center" });

    // Subtitle (City & Nights)
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`${pkg.starting_city} (${pkg.nights || pkg.days - 1}N)`, centerX, 110, { align: "center" });

    // Category / Land
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.category || "India", centerX, 122, { align: "center" });



    // PAGE 2: TITLE, DESCRIPTION, HIGHLIGHTS
    doc.addPage();
    addHeader(doc, pkg.title);

    let y = 35;
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(pkg.title, padding, y);
    y += 12;

    // Overview Title
    doc.setFontSize(14);
    doc.text("Trip Overview", padding, y);
    y += 8;

    // Description
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    if (pkg.description) {
      const descLines = doc.splitTextToSize(pkg.description, pageWidth - (padding * 2));
      doc.text(descLines, padding, y);
      y += (descLines.length * 5) + 15;
    }

    // Highlights
    if (pkg.highlights && pkg.highlights.length > 0) {
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Trip Highlights", padding, y);
      y += 10;

      pkg.highlights.forEach(h => {
        const splitText = doc.splitTextToSize(h.text, pageWidth - (padding * 2) - 10);
        doc.setFillColor(20, 83, 45); 
        doc.circle(padding + 2, y - 1, 1, 'F');
        doc.setTextColor(75, 85, 99); 
        doc.setFontSize(10); 
        doc.setFont("helvetica", "normal");
        doc.text(splitText, padding + 7, y); 
        y += (splitText.length * 5) + 2; 
        if (y > pageHeight - 30) { 
          addFooter(doc, 2, 4); 
          doc.addPage(); 
          addHeader(doc, pkg.title); 
          y = 35; 
        }
      });
    }
    addFooter(doc, 2, 4);

    // PAGE 3: DAY WISE ITINERARY
    doc.addPage();
    addHeader(doc, "Day Wise Itinerary");
    y = 35;

    if (pkg.itinerary && pkg.itinerary.length > 0) {
      pkg.itinerary.forEach((day) => {
        if (y > pageHeight - 50) {
          addFooter(doc, 3, 4);
          doc.addPage();
          addHeader(doc, "Day Wise Itinerary (Contd.)");
          y = 35;
        }

        // Day Header
        doc.setFillColor(243, 244, 246);
        doc.rect(padding, y, pageWidth - (padding * 2), 10, 'F');
        doc.setTextColor(20, 83, 45);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`DAY ${day.day_number}: ${day.title}`, padding + 5, y + 7);
        y += 15;

        // Day Description
        if (day.description) {
          doc.setTextColor(75, 85, 99);
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          const splitDesc = doc.splitTextToSize(day.description, pageWidth - (padding * 2) - 10);
          doc.text(splitDesc, padding + 5, y);
          y += (splitDesc.length * 4.5) + 12;
        }
      });
    }
    addFooter(doc, 3, 4);

    // PAGE 4: INCLUSION & EXCLUSION
    doc.addPage();
    addHeader(doc, "Package Details & Policies");
    y = 35;

    // Inclusions
    if (pkg.inclusions && pkg.inclusions.length > 0) {
      doc.setTextColor(20, 83, 45);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("What's Included", padding, y);
      y += 10;

      doc.setTextColor(75, 85, 99);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      pkg.inclusions.forEach(inc => {
        const splitInc = doc.splitTextToSize(`• ${inc.text}`, pageWidth - (padding * 2) - 10);
        doc.setTextColor(75, 85, 99); 
        doc.setFontSize(10); 
        doc.setFont("helvetica", "normal");
        doc.text(splitInc, padding + 5, y); 
        y += (splitInc.length * 5) + 2;
        if (y > pageHeight - 30) { 
          addFooter(doc, 4, 4);
          doc.addPage(); 
          addHeader(doc, "Package Details (Contd.)"); 
          y = 35; 
          doc.setTextColor(20, 83, 45); doc.setFontSize(14); doc.setFont("helvetica", "bold");
          doc.text("What's Included (Contd.)", padding, y); y += 10;
        }
      });
      y += 15;
    }

    // Exclusions
    if (pkg.exclusions && pkg.exclusions.length > 0) {
      doc.setTextColor(220, 38, 38); // Red
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("What's Excluded", padding, y);
      y += 10;

      doc.setTextColor(75, 85, 99);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      pkg.exclusions.forEach(exc => {
        const splitExc = doc.splitTextToSize(`• ${exc.text}`, pageWidth - (padding * 2) - 10);
        doc.setTextColor(75, 85, 99); 
        doc.setFontSize(10); 
        doc.setFont("helvetica", "normal");
        doc.text(splitExc, padding + 5, y); 
        y += (splitExc.length * 5) + 2;
        if (y > pageHeight - 30) { 
          addFooter(doc, 4, 4);
          doc.addPage(); 
          addHeader(doc, "Package Details (Contd.)"); 
          y = 35; 
          doc.setTextColor(220, 38, 38); doc.setFontSize(14); doc.setFont("helvetica", "bold");
          doc.text("What's Excluded (Contd.)", padding, y); y += 10;
        }
      });
    }

    addFooter(doc, 4, 4);

    doc.save(`GoImomi_${pkg.title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleEmailShare = async (e) => {
    e.preventDefault();
    if (!sharingEmail || !emailModalPkg) return;
    setSendingEmail(true);

    const subject = `Holiday Package Information: ${emailModalPkg.title}`;
    const body = generateShareText(emailModalPkg);

    try {
      await api.post('/api/send-visa-details/', {
        email: sharingEmail,
        subject,
        body
      });
      alert("Details sent successfully to " + sharingEmail);
      setEmailModalPkg(null);
      setSharingEmail("");
    } catch (error) {
      console.error("Error sending email:", error);
      window.location.href = `mailto:${sharingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setEmailModalPkg(null);
      setSharingEmail("");
    } finally {
      setSendingEmail(false);
    }
  };

  // ===================== FILTERED LIST =====================
  const filtered = packages.filter((pkg) => {
    if (!pkg) return false;
    const categoryMatch = !category ? true : (
      pkg.category?.toLowerCase() === category.toLowerCase() ||
      (category.toLowerCase() === 'business travel' && pkg.category?.toLowerCase() === 'business trip') ||
      (category.toLowerCase() === 'business trip' && pkg.category?.toLowerCase() === 'business travel')
    );

    // Destination match
    const destinationMatch = !destination ? true : (
      Array.isArray(pkg.destinations) && pkg.destinations.some(d => d.name === destination)
    );

    // Ensure price is a number
    let price = Number(pkg.Offer_price || pkg.offer_price || 0);
    
    // Fallback to first slot price if 0 and fixed departure
    if (price === 0 && pkg.fixed_departure && pkg.fixed_departure_data) {
      try {
        const slots = typeof pkg.fixed_departure_data === 'string' ? JSON.parse(pkg.fixed_departure_data) : pkg.fixed_departure_data;
        if (slots && slots.length > 0) {
          const firstSlot = slots[0];
          const tierKey = Object.keys(firstSlot.tiers || {}).find(k => k.toLowerCase() === 'standard') || Object.keys(firstSlot.tiers || {})[0];
          const tierData = firstSlot.tiers?.[tierKey];
          if (tierData && tierData.length > 0) {
            price = Number(tierData[0].offer_price || tierData[0].Offer_price || tierData[0].price || 0);
          }
        }
      } catch {
        // Keep the default price when fixed-departure data is malformed.
      }
    }

    const flightMatch =
      flightFilter === "All" ||
      (flightFilter === "With Flight" && pkg.with_flight === true) ||
      (flightFilter === "Without Flight" && pkg.with_flight === false);

    return (
      categoryMatch &&
      destinationMatch &&
      flightMatch &&
      (nights ? (pkg.nights || pkg.days - 1) === Number(nights) : true) &&
      (startingCity ? pkg.starting_city === startingCity : true) &&
      price >= budget[0] &&
      price <= budget[1]
    );
  });

  return (
    <div className="w-full flex bg-gray-50 min-h-screen">

      {/* ====================== LEFT FILTER PANEL ====================== */}
      <div className="w-[18%] min-w-[210px] bg-white border-r border-gray-100 sticky top-[140px] self-start h-[calc(100vh-140px)] overflow-y-auto hidden md:block custom-scrollbar">
        <div className="p-4 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.1em]">Filters</h3>
            <button
              onClick={() => {
                setCategory("");
                setDestination("");
                setNights("");
                setStartingCity("");
                setBudget([0, 1000000]);
                setFlightFilter("All");
              }}
              className="text-[9px] font-black text-[#14532d] hover:underline uppercase tracking-tighter"
            >
              Reset All
            </button>
          </div>

          {/* DESTINATION (SEARCHABLE) */}
          <div className="relative dest-dropdown-container">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 underline decoration-[#14532d]/20 underline-offset-4">
              Destination
            </label>
            <div
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-100 rounded-xl cursor-pointer flex justify-between items-center transition-all hover:bg-white hover:border-green-100"
              onClick={() => setIsDestOpen(!isDestOpen)}
            >
              <span className={`text-[11px] truncate ${destination ? "text-gray-900 font-bold" : "text-gray-400 font-medium"}`}>
                {destination || "Select Destination"}
              </span>
              <ChevronDown size={12} className={`text-gray-400 transition-transform duration-300 ${isDestOpen ? 'rotate-180' : ''}`} />
            </div>

            {isDestOpen && (
              <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 bg-gray-50/50">
                  <div className="relative">
                    <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-white border border-gray-100 rounded-lg outline-none focus:border-[#14532d] transition-all"
                      value={destSearch}
                      onChange={(e) => setDestSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <ul className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
                  <li
                    className={`px-3 py-1.5 hover:bg-green-50 cursor-pointer text-[11px] font-medium transition-colors ${!destination ? 'text-[#14532d] bg-green-50/50' : 'text-gray-600'}`}
                    onClick={() => {
                      setDestination("");
                      setIsDestOpen(false);
                      setDestSearch("");
                    }}
                  >
                    Any Destination
                  </li>
                  {regionsLoading ? (
                    <div className="px-3 py-4 flex flex-col items-center justify-center gap-2">
                       <div className="w-4 h-4 border-2 border-[#14532d] border-t-transparent rounded-full animate-spin"></div>
                       <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Loading...</span>
                    </div>
                  ) : filteredDestinationsList.length > 0 ? (
                    filteredDestinationsList.map((dest) => (
                      <li
                        key={dest.id}
                        className={`px-3 py-1.5 hover:bg-green-50 cursor-pointer text-[11px] transition-colors ${destination === dest.name ? 'text-[#14532d] bg-green-50/50 font-bold' : 'text-gray-600'}`}
                        onClick={() => {
                          setDestination(dest.name);
                          setIsDestOpen(false);
                          setDestSearch("");
                        }}
                      >
                        <div className="flex flex-col">
                          <span>{dest.name}</span>
                          {(dest.region || dest.country_name || dest.country) && (
                            <span className="text-[8px] text-gray-400 font-medium uppercase tracking-tight">
                              {dest.region && (dest.country_name || dest.country)
                                ? `${dest.region} (${dest.country_name || dest.country})`
                                : dest.region || dest.country_name || dest.country}
                            </span>
                          )}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-gray-400 text-[9px] text-center italic">No destinations found</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* FLIGHT FILTER */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 underline decoration-[#14532d]/20 underline-offset-4">
              Package Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {["All", "With Flight", "Without Flight"].map((option) => (
                <button
                  key={option}
                  onClick={() => setFlightFilter(option)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl text-[9px] font-black transition-all border leading-none ${flightFilter === option
                    ? "bg-[#14532d] border-[#14532d] text-white shadow-sm"
                    : "bg-gray-50/40 border-gray-50 text-gray-400 hover:border-gray-200 hover:bg-white"
                    }`}
                  title={option}
                >
                  <span className="text-center">
                    {option === "All" ? "ALL" : option === "With Flight" ? "FLIGHT" : "NO FLT"}
                  </span>
                  {flightFilter === option && <CheckCircle size={8} />}
                </button>
              ))}
            </div>
          </div>

          {/* NIGHTS */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 underline decoration-[#14532d]/20 underline-offset-4">
              Duration (Nights)
            </label>
            <div className="relative group">
              <select
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-100 rounded-xl outline-none text-[11px] font-bold text-gray-900 appearance-none cursor-pointer transition-all hover:bg-white hover:border-green-100"
                value={nights}
                onChange={(e) => setNights(e.target.value)}
              >
                <option value="">Any Duration</option>
                {[...Array(29)].map((_, i) => (
                  <option key={i + 2} value={i + 2}>{i + 2} Nights</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors" />
            </div>
          </div>

          {/* STARTING CITY (SEARCHABLE) */}
          <div className="relative startcity-dropdown-container">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2 underline decoration-[#14532d]/20 underline-offset-4">
              Starting From
            </label>
            <div
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-100 rounded-xl cursor-pointer flex justify-between items-center transition-all hover:bg-white hover:border-green-100"
              onClick={() => setIsStartCityOpen(!isStartCityOpen)}
            >
              <span className={`text-[11px] truncate ${startingCity ? "text-gray-900 font-bold" : "text-gray-400 font-medium"}`}>
                {startingCity || "Select City"}
              </span>
              <ChevronDown size={12} className={`text-gray-400 transition-transform duration-300 ${isStartCityOpen ? 'rotate-180' : ''}`} />
            </div>

            {isStartCityOpen && (
              <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-2 bg-gray-50/50">
                  <div className="relative">
                    <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search city..."
                      className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-white border border-gray-100 rounded-lg outline-none focus:border-[#14532d] transition-all"
                      value={startCitySearch}
                      onChange={(e) => setStartCitySearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <ul className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
                  <li
                    className={`px-3 py-1.5 hover:bg-green-50 cursor-pointer text-[11px] font-medium transition-colors ${!startingCity ? 'text-[#14532d] bg-green-50/50' : 'text-gray-600'}`}
                    onClick={() => {
                      setStartingCity("");
                      setIsStartCityOpen(false);
                      setStartCitySearch("");
                    }}
                  >
                    Any City
                  </li>
                  {filteredStartingCitiesList.length > 0 ? (
                    filteredStartingCitiesList.map((city) => (
                      <li
                        key={city.id}
                        className={`px-3 py-1.5 hover:bg-green-50 cursor-pointer text-[11px] transition-colors ${startingCity === city.name ? 'text-[#14532d] bg-green-50/50 font-bold' : 'text-gray-600'}`}
                        onClick={() => {
                          setStartingCity(city.name);
                          setIsStartCityOpen(false);
                          setStartCitySearch("");
                        }}
                      >
                        <div className="flex flex-col">
                          <span>{city.name}</span>
                          {city.region && <span className="text-[8px] text-gray-400 font-medium uppercase tracking-tight">{city.region}</span>}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-gray-400 text-[9px] text-center italic">No cities found</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* BUDGET */}
          <div className="pt-1">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest underline decoration-[#14532d]/20 underline-offset-4">
                Budget
              </label>
              <span className="text-[10px] font-black text-[#14532d] bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                ₹{Number(budget[1] || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="relative pt-3">
              <input
                type="range"
                min="0"
                max="1000000"
                step="5000"
                value={budget[1]}
                onChange={(e) => setBudget([0, Number(e.target.value)])}
                className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#14532d]"
                style={{
                  background: `linear-gradient(to right, #14532d 0%, #14532d ${(budget[1] / 1000000) * 100}%, #f3f4f6 ${(budget[1] / 1000000) * 100}%, #f3f4f6 100%)`
                }}
              />
              <div className="flex justify-between text-[8px] font-black text-gray-400 mt-2 uppercase tracking-widest">
                <span>Free</span>
                <span>₹10,00,000+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================== RIGHT SIDE (PACKAGE LISTING) ====================== */}
      <div className="flex-1 p-8 overflow-y-auto h-[calc(100vh-140px)] custom-scrollbar bg-white/50 backdrop-blur-sm">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              Explorer Packages
              {category && <span className="text-[#14532d] ml-2">• {category}</span>}
            </h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">Discover handpicked destinations for your next adventure</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14532d]"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-20 text-center">
            <h3 className="text-2xl font-semibold text-gray-400">No Holiday Packages Found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your filters or search criteria to find matching packages.</p>
            <button
              onClick={() => {
                setCategory("");
                setDestination("");
                setNights("");
                setStartingCity("");
                setBudget([0, 200000]);
                setFlightFilter("All");
              }}
              className="mt-6 bg-[#14532d] text-white px-8 py-2 rounded-lg font-semibold hover:bg-[#0f4022] transition-colors shadow-lg"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((pkg) => (
              <HolidayCard
                key={pkg.id}
                pkg={pkg}
                navigate={navigate}
                generateShareText={generateShareText}
                setEmailModalPkg={setEmailModalPkg}
                downloadPackagePDF={openDownloadModal}
                setViewDetailsPkg={handleOpenPreview}
              />
            ))}
          </div>
        )}
      </div>

      <DownloadPDFModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        packageName={downloadingPkg?.title}
        onDownload={() => {
          downloadPackagePDF(downloadingPkg);
        }}
      />

      <ZohoTripForm 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        packageName={selectedPkgTitle || viewDetailsPkg?.title} 
      />

      {viewDetailsPkg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm" onClick={() => setViewDetailsPkg(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center px-3 py-2 border-b border-gray-100 bg-white gap-2">
              <button
                onClick={() => {
                  const text = generateShareText(viewDetailsPkg);
                  navigator.clipboard.writeText(text);
                  alert("Full details copied to clipboard!");
                }}
                className="flex items-center gap-1 text-[#16a34a] font-bold text-[9px] hover:bg-green-50 px-2 py-1 rounded-md transition-all border border-[#16a34a]/30 uppercase shadow-sm"
              >
                <Copy size={10} />
                <span>FULL</span>
              </button>
              <button
                onClick={() => {
                  const text = generateItineraryOnlyText(viewDetailsPkg);
                  navigator.clipboard.writeText(text);
                  alert("Itinerary copied to clipboard!");
                }}
                className="flex items-center gap-1 text-[#16a34a] font-bold text-[9px] hover:bg-green-50 px-2 py-1 rounded-md transition-all border border-[#16a34a]/30 uppercase shadow-sm"
              >
                <Copy size={10} />
                <span>ITRY</span>
              </button>
              
              <div className="flex-1 text-center">
                <h3 className="text-[11px] font-black text-gray-300 uppercase tracking-widest">PREVIEW</h3>
              </div>

              <button onClick={() => setViewDetailsPkg(null)} className="text-gray-400 hover:text-gray-600 transition-colors ml-auto">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="font-sans text-[11px] text-gray-700 leading-snug space-y-3">
                <div>
                  <p className="mb-1 text-gray-400 text-[10px]">Hello, find details for your query:</p>
                  <p className="font-bold text-[#16a34a] text-[13px] mb-0.5 leading-tight">{viewDetailsPkg.title}</p>
                  <p className="text-gray-600 font-bold">Duration: {viewDetailsPkg.days}D / {viewDetailsPkg.nights || viewDetailsPkg.days - 1}N</p>
                  <p className="text-[#16a34a] font-black text-[12px]">
                    Starting: ₹ {Number((() => {
                      const p = viewDetailsPkg;
                      const tier = p.selectedTier || "Standard";
                      let slots = [];
                      try {
                        slots = p.fixed_departure_data
                          ? typeof p.fixed_departure_data === "string"
                            ? JSON.parse(p.fixed_departure_data)
                            : p.fixed_departure_data
                          : [];
                      } catch (e) {
                        /* invalid JSON */
                        console.error("Error parsing fixed_departure_data in preview:", e);
                      }

                        if (slots.length > 0) {
                          const slot = slots[0];
                          const tierData = slot.tiers?.[tier];
                          if (tierData && tierData.length > 0) return tierData[0].offer_price || tierData[0].Offer_price;
                        }
                        return p.Offer_price || p.offer_price;
                      })() || 0).toLocaleString('en-IN')}
                    {viewDetailsPkg.selectedTier && <span className="ml-1 text-[9px] font-bold text-gray-400">({viewDetailsPkg.selectedTier})</span>}
                  </p>
                </div>

                {viewDetailsPkg.description && (
                  <div>
                    <p className="font-bold text-gray-800 border-b border-gray-50 mb-1">Description:</p>
                    <p className="text-gray-500 italic leading-tight">{viewDetailsPkg.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="font-bold text-gray-800 border-b border-gray-50 mb-1">Highlights & Inclusions:</p>
                      <div className="space-y-0.5">
                        {(viewDetailsPkg.highlights?.length ? viewDetailsPkg.highlights : [{text: "Accommodation"}, {text: "Daily Breakfast"}, {text: "Sightseeing"}, {text: "Transfers"}]).map((h, i) => (
                          <p key={i} className="text-gray-600">• {h.text}</p>
                        ))}
                      </div>
                    </div>

                    {viewDetailsPkg.inclusions?.length > 0 && (
                      <div className="bg-green-50/30 p-2 rounded border border-green-50">
                        <p className="font-bold text-[#14532d] text-[10px] uppercase mb-1">Inclusions:</p>
                        <div className="space-y-0.5">
                          {viewDetailsPkg.inclusions.map((inc, i) => (
                            <p key={i} className="text-green-700">✓ {inc.text}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewDetailsPkg.exclusions?.length > 0 && (
                      <div className="bg-red-50/30 p-2 rounded border border-red-50">
                        <p className="font-bold text-red-800 text-[10px] uppercase mb-1">Exclusions:</p>
                        <div className="space-y-0.5">
                          {viewDetailsPkg.exclusions.map((exc, i) => (
                            <p key={i} className="text-red-600">× {exc.text}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {viewDetailsPkg.itinerary?.length > 0 && (
                    <div className="border-l border-gray-100 pl-4">
                      <p className="font-bold text-gray-800 border-b border-gray-50 mb-1">Itinerary Summary:</p>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {viewDetailsPkg.itinerary.map((day, i) => (
                          <div key={i} className="bg-gray-50/50 p-1.5 rounded">
                            <p className="font-bold text-gray-700 text-[9px] leading-tight">Day {day.day_number}: {day.title}</p>
                            {day.description && <p className="text-gray-400 italic mt-0.5 ml-1 leading-tight text-[8px]">{day.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                   <p className="font-bold text-gray-800 text-[10px]">
                    Destinations: <span className="font-normal text-gray-500 ml-1">
                      {viewDetailsPkg.starting_city || "Any City"}
                      {viewDetailsPkg.destinations?.length > 0 
                        ? " • " + viewDetailsPkg.destinations.map(d => d.name).join(" • ") 
                        : " • Srinagar • Srinagar"}
                    </span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-50">
                  <div className="bg-[#f0f9f1] border-l-[2px] border-[#16a34a] p-2 rounded-r-md space-y-0.5">
                    <p className="italic text-[10px] text-gray-400">Thank you for choosing goimomi.com</p>
                    <p className="font-bold text-[#16a34a] text-[12px]">Call: +91 8110082222</p>
                    <p className="text-gray-500 font-medium text-[10px]">hello@goimomi.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Share Modal */}
      {emailModalPkg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEmailModalPkg(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Share via Email</h3>
                <button onClick={() => setEmailModalPkg(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Enter the email address to share {emailModalPkg.title}.</p>
              <form onSubmit={handleEmailShare}>
                <input
                  type="email"
                  value={sharingEmail}
                  onChange={(e) => setSharingEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-[#14532d] outline-none transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="w-full py-3 bg-[#14532d] text-white rounded-xl font-bold hover:bg-[#0f4a24] transition-all disabled:opacity-50"
                >
                  {sendingEmail ? "Sending..." : "Send Details"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Holidays;



