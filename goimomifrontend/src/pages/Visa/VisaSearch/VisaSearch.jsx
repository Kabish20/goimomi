import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Home, Plane, Calendar, MapPin, ChevronDown, ShieldCheck, Headphones, CheckCircle2, FileText, Clock, Award, BadgeCheck, Star, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import api from "../../../api";
import visaHero1 from "../../../assets/Hero/VisaHeader/visa-hero-01.png";
import visaHero2 from "../../../assets/Hero/VisaHeader/visa-hero-02.png";
import visaHero3 from "../../../assets/Hero/VisaHeader/visa-hero-03.png";
import visaHero4 from "../../../assets/Hero/VisaHeader/visa-hero-04.png";
import visaHero5 from "../../../assets/Hero/VisaHeader/visa-hero-05.png";
import CountryVisaCard from "../../../components/holidays/CountryVisaCard";
import {
  all196Countries,
  visaDestinationCountryAliases,
  visaDestinationCountryNames,
  visaDestinationFallbackCountries,
  visaDestinationImageOverrides,
} from "../../../data/countriesVisaData";
import usePageSEO from "../../../hooks/usePageSEO";

const normaliseCountryName = (name) => (name || "").trim().toLowerCase();

const getVisaDestinationKey = (name) => {
  const normalisedName = normaliseCountryName(name);
  return visaDestinationCountryAliases[normalisedName] || normalisedName;
};

const visaDestinationKeys = new Set(
  visaDestinationCountryNames.map(getVisaDestinationKey)
);

const isVisaDestination = (name) =>
  visaDestinationKeys.has(getVisaDestinationKey(name));

const visaHeroImages = [visaHero1, visaHero2, visaHero3, visaHero4, visaHero5];

/**
 * Visa Search & Discovery Hub
 * 
 * Features:
 * - Dynamic animated hero carousel of top global destinations
 * - Dual country picker: "I am a citizen of" and "I am travelling to"
 * - Instant nationality compatibility check and visa requirements lookup
 * - Curated visa deals, popular destinations, and step-by-step application guidance
 */
const VisaSearch = () => {
  const navigate = useNavigate();
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % visaHeroImages.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);
  usePageSEO(
    "Online Visa Services | Fast & Reliable Processing | Goimomi Holidays",
    "Apply for international visas online with Goimomi Holidays. Get expert assistance and fast, hassle-free visa processing for over 100+ countries.",
    undefined,
    "online visa, visa application, travel visa services, fast visa processing, international visa assistance, visa office"
  );

  const [citizenOf, setCitizenOf] = useState("India");
  const [goingTo, setGoingTo] = useState("");
  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };
  const [travelDate, setTravelDate] = useState(getTomorrowDate());
  const [returnDate, setReturnDate] = useState("");
  const [countries, setCountries] = useState([]);
  const [, setLoading] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [showCitizenDropdown, setShowCitizenDropdown] = useState(false);
  const [showGoingToDropdown, setShowGoingToDropdown] = useState(false);
  const [citizenSearch, setCitizenSearch] = useState("India");
  const [goingToSearch, setGoingToSearch] = useState("");
  const [, setPopularDestinations] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [countryFilter, setCountryFilter] = useState("");
  const citizenRef = useRef(null);
  const goingToRef = useRef(null);

  const displayCountries = useMemo(() => {
    const map = new Map();

    all196Countries.forEach((c) => {
      if (!c?.name) return;

      const key = getVisaDestinationKey(c.name);
      if (visaDestinationKeys.has(key)) map.set(key, c);
    });

    visaDestinationFallbackCountries.forEach((c) => {
      const key = getVisaDestinationKey(c.name);
      if (visaDestinationKeys.has(key)) map.set(key, c);
    });

    (countries || []).forEach((c) => {
      if (!c?.name) return;

      const key = getVisaDestinationKey(c.name);
      if (visaDestinationKeys.has(key) && !map.has(key)) {
        map.set(key, {
          name: c.name,
          flag: c.flag || "🌐",
          image: c.card_image || c.image || "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=800&auto=format&fit=crop",
        });
      }
    });

    Object.entries(visaDestinationImageOverrides).forEach(([name, image]) => {
      const key = getVisaDestinationKey(name);
      const existingCountry = map.get(key);

      if (existingCountry) {
        map.set(key, { ...existingCountry, image });
      }
    });

    // Let a destination-specific image uploaded in the admin/API replace the
    // static image. This keeps country cards unique as new images are added.
    (countries || []).forEach((country) => {
      if (!country?.name || (!country.card_image && !country.image)) return;

      const key = getVisaDestinationKey(country.name);
      if (!visaDestinationKeys.has(key)) return;

      const existingCountry = map.get(key);

      map.set(key, {
        ...existingCountry,
        name: existingCountry?.name || country.name,
        flag: country.flag || existingCountry?.flag || "🌐",
        image: country.card_image || country.image || existingCountry?.image,
      });
    });

    const list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    if (!countryFilter.trim()) return list;
    return list.filter((item) =>
      item.name.toLowerCase().includes(countryFilter.toLowerCase().trim())
    );
  }, [countries, countryFilter]);

  const handleCountryCardSelect = (countryName) => {
    setGoingTo(countryName);
    const params = new URLSearchParams({
      citizenOf,
      goingTo: countryName,
      departureDate: travelDate || "",
      returnDate: returnDate || "",
    });
    navigate(`/visa/results?${params.toString()}`);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const popularVisasRes = await api.get("/api/visas/?is_popular=true");
        const vData = Array.isArray(popularVisasRes.data) 
          ? popularVisasRes.data 
          : (popularVisasRes.data?.results || []);
          
        const dests = vData.map((v) => ({
          id: v.id,
          name: v.title,
          country: v.country,
          card_image: v.card_image,
          region: "",
        }));
        setPopularDestinations(dests);
        
        setCountriesLoading(true);
        try {
          const countriesRes = await api.get("/api/countries/");
          const rawData = countriesRes.data;
          const countriesList = Array.isArray(rawData)
            ? rawData
            : (rawData?.results || []);
            
          const filtered = countriesList.filter((c) => c && c.name);
          setCountries(filtered);
        } catch (err) {
          console.error("Error fetching countries:", err);
        } finally {
          setCountriesLoading(false);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (citizenRef.current && !citizenRef.current.contains(event.target))
        setShowCitizenDropdown(false);
      if (goingToRef.current && !goingToRef.current.contains(event.target))
        setShowGoingToDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allAvailableCountries = useMemo(() => {
    if (countries && countries.length > 0) return countries;
    return all196Countries.map((c, idx) => ({ id: idx + 1, name: c.name }));
  }, [countries]);

  const filteredCitizenCountries = (allAvailableCountries || []).filter((c) =>
    c?.name?.toLowerCase().includes((citizenSearch || "").toLowerCase())
  );
  const filteredGoingToCountries = (allAvailableCountries || []).filter((c) =>
    c?.name &&
    isVisaDestination(c.name) &&
    c.name.toLowerCase().includes((goingToSearch || "").toLowerCase())
  );

  const handleSearch = () => {
    const destination = goingTo || goingToSearch;
    if (!destination) {
      alert("Please select a destination country");
      return;
    }
    const citizen = citizenOf || citizenSearch || "India";
    const params = new URLSearchParams({
      citizenOf: citizen,
      goingTo: destination,
      departureDate: travelDate || "",
      returnDate: returnDate || "",
    });
    navigate(`/visa/results?${params.toString()}`);
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const stats = [
    { value: "100+", label: "Countries Covered" },
    { value: "10K+", label: "Visas Processed" },
    { value: "98%", label: "Approval Rate" },
    { value: "24h", label: "Express Processing" },
  ];

  const agentAdvantages = [
    {
      icon: <Award className="w-5 h-5" />,
      title: "Expert Documentation Review",
      desc: "Our certified visa specialists meticulously verify every document before submission — eliminating errors that cause rejections and delays at embassies.",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Highest Approval Rate",
      desc: "With a 98% visa approval record built over 10+ years, we know exactly what each embassy needs. Your application is prepared to the highest standard.",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Express Turnaround",
      desc: "Need your visa urgently? Our priority processing service fast-tracks your application through embassy channels — with same-day or next-day confirmation for eligible countries.",
    },
    {
      icon: <Headphones className="w-5 h-5" />,
      title: "Dedicated Visa Consultant",
      desc: "You're assigned a personal visa consultant from start to finish — answering queries, tracking application status, and keeping you informed at every step.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Bank-Level Data Security",
      desc: "All passport copies, photographs, and personal documents are handled with strict confidentiality protocols and encrypted storage — your data is never shared.",
    },
    {
      icon: <BadgeCheck className="w-5 h-5" />,
      title: "IATA-Certified & Compliant",
      desc: "Goimomi Holidays is IATA-certified and operates in full compliance with embassy and government regulations — giving your application the credibility it needs.",
    },
  ];

  const visaTypes = [
    {
      icon: "✈️",
      title: "Tourist Visa",
      desc: "Explore new cultures, landmarks, and destinations with confidence. We handle every stage of your tourist visa application — from form filling to appointment booking.",
      tags: ["Leisure", "Family", "Honeymoon"],
      color: "from-blue-500/10 to-blue-600/5 border-blue-100",
      accent: "text-blue-600",
    },
    {
      icon: "💼",
      title: "Business Visa",
      desc: "Attending a conference, meeting suppliers, or signing contracts abroad? Our business visa specialists ensure your application reflects strong professional ties.",
      tags: ["Corporate", "Trade", "Meetings"],
      color: "from-orange-500/10 to-orange-600/5 border-orange-100",
      accent: "text-orange-600",
    },
    {
      icon: "🕌",
      title: "Umrah / Pilgrimage Visa",
      desc: "Undertake your sacred journey with total peace of mind. We manage Saudi Umrah visa applications with the reverence and care this spiritual journey deserves.",
      tags: ["Umrah", "Hajj", "Ziyarat"],
      color: "from-emerald-500/10 to-emerald-600/5 border-emerald-100",
      accent: "text-emerald-700",
    },
    {
      icon: "⚡",
      title: "eVisa / Visa on Arrival",
      desc: "For countries offering electronic visas or visa on arrival, we streamline the online application process — ensuring accurate submission and instant confirmation.",
      tags: ["eVisa", "VoA", "Online"],
      color: "from-purple-500/10 to-purple-600/5 border-purple-100",
      accent: "text-purple-600",
    },
    {
      icon: "🎓",
      title: "Student Visa",
      desc: "Pursue your international education dreams with expert student visa guidance. We advise on financial documentation, course letters, and embassy interview preparation.",
      tags: ["Education", "Study Abroad"],
      color: "from-rose-500/10 to-rose-600/5 border-rose-100",
      accent: "text-rose-600",
    },
    {
      icon: "🌐",
      title: "Multi-Entry Visa",
      desc: "Frequent international travellers can benefit from multi-entry visas that allow multiple visits within a validity period. We identify the best option for your travel pattern.",
      tags: ["Frequent Travel", "Long-Term"],
      color: "from-amber-500/10 to-amber-600/5 border-amber-100",
      accent: "text-amber-600",
    },
  ];

  const processSteps = [
    {
      step: "01",
      icon: <Search className="w-5 h-5" />,
      title: "Search Your Destination",
      desc: "Enter your nationality and destination country in the search tool above to instantly view available visa options and requirements.",
    },
    {
      step: "02",
      icon: <FileText className="w-5 h-5" />,
      title: "Document Checklist",
      desc: "Our system generates a personalised document checklist. Your visa consultant reviews everything before submission to ensure zero errors.",
    },
    {
      step: "03",
      icon: <Sparkles className="w-5 h-5" />,
      title: "Application Submission",
      desc: "We prepare and lodge your application with the respective embassy or online portal — on your behalf, with professional cover letters if required.",
    },
    {
      step: "04",
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: "Approval & Delivery",
      desc: "Once your visa is approved, we notify you immediately. eVisas are emailed instantly; sticker visas are coordinated for secure pickup or courier delivery.",
    },
  ];

  const faqs = [
    {
      q: "How early should I apply for my visa?",
      a: "We recommend applying at least 3–4 weeks before your travel date. For countries like the UK, US, or Schengen zone, 6–8 weeks is ideal, especially during peak seasons when embassy appointments are limited.",
    },
    {
      q: "What documents are typically required for a tourist visa?",
      a: "Commonly required documents include a valid passport (6+ months validity), recent passport-size photographs, bank statements (last 3 months), confirmed flight tickets, hotel bookings, travel insurance, and a completed application form. Requirements vary by country — our consultants provide a personalised checklist.",
    },
    {
      q: "Do you handle visa rejections or re-applications?",
      a: "Yes. If your visa is rejected, our specialists analyse the rejection reason and advise on the best course of action — whether that's strengthening your documentation or appealing the decision. Our 98% approval rate is a result of thorough preparation at every stage.",
    },
    {
      q: "Is it safe to submit my passport and personal documents to Goimomi?",
      a: "Absolutely. We operate with strict confidentiality protocols. All documents are handled by IATA-certified professionals and kept in encrypted, secure systems. We never share your information with third parties beyond the relevant embassy.",
    },
    {
      q: "Can you help with urgent or last-minute visa applications?",
      a: "Yes — our express processing service is designed for urgent cases. Depending on the destination and visa type, we offer priority handling with same-day or next-business-day turnaround for many popular countries.",
    },
    {
      q: "What is the difference between an e-Visa and a sticker visa?",
      a: "An e-Visa (Electronic Visa) is issued digitally and must be printed before travel. A sticker visa is physically stamped or affixed to your passport by the embassy. Both are equally valid; the type depends on the destination country's policy.",
    },
  ];

  const testimonials = [
    {
      name: "Ashwin Retnam",
      role: "UAE Visa — Processed in 18 Hours",
      quote:
        "Excellent visa processing service! The Goimomi team helped me get my UAE visa in less than 24 hours. Extremely professional, communicated clearly on every requirement. Highly recommended!",
      rating: 5,
      flag: "🇦🇪",
    },
    {
      name: "Abdul Hafiz",
      role: "Saudi Arabia Visa — Group Processing",
      quote:
        "Best price for visa processing. Beautifully organised and well-equipped team. They were in touch with us right until we returned home. My entire family travelled without a single issue.",
      rating: 5,
      flag: "🇸🇦",
    },
    {
      name: "Kalaivani Ganesan",
      role: "Schengen Visa — Italy & France",
      quote:
        "The visa clearing process was handled so professionally. Every document was verified, the itinerary was spot-on, and the team guided us through the entire interview preparation. Total satisfaction!",
      rating: 5,
      flag: "🇪🇺",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className="relative w-full pt-16 md:pt-24 pb-32 md:pb-36 bg-slate-900 overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {visaHeroImages.map((image, index) => (
            <img
              key={image}
              src={image}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                index === heroImageIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
              }`}
            />
          ))}
        </div>
        {/* Overlay layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/90" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center text-white mb-10"
          >
            <div className="flex items-center justify-center gap-3 text-emerald-400 mb-4">
              <div className="w-10 h-[2px] bg-emerald-400" />
              <span className="text-[11px] uppercase tracking-[0.5em] font-black">
                Expert Visa Assistance Since 2010
              </span>
              <div className="w-10 h-[2px] bg-emerald-400" />
            </div>

            <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.85] mb-5">
              VISA
              <br />
              <span className="text-white/25">SERVICES</span>
            </h1>

            <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-6">
              Professional, accurate, and stress-free visa processing for 100+ countries — backed by certified
              consultants, a 98% approval record, and express turnaround options.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-5">
              {["IATA Certified", "98% Approval Rate", "10K+ Visas Processed", "24h Express Option"].map(
                (badge) => (
                  <div key={badge} className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{badge}</span>
                  </div>
                )
              )}
            </div>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="bg-white rounded-2xl shadow-2xl p-2 relative z-[100]"
          >
            <div className="flex flex-col md:flex-row gap-2">
              {/* Citizen Of */}
              <div className="flex-1 relative" ref={citizenRef}>
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-400 transition-colors cursor-pointer"
                  onClick={() => setShowCitizenDropdown(!showCitizenDropdown)}
                >
                  <Home size={20} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium">Citizen of</p>
                    <input
                      type="text"
                      value={citizenSearch}
                      onChange={(e) => { setCitizenSearch(e.target.value); setShowCitizenDropdown(true); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                      className="w-full outline-none text-gray-900 font-medium placeholder:text-gray-400 cursor-pointer"
                      placeholder="Select country"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCitizenDropdown ? "rotate-180" : ""}`} />
                </div>
                {showCitizenDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-[200]">
                    {countriesLoading ? (
                      <div className="px-4 py-3 text-gray-500 text-center flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#14532d] border-t-transparent rounded-full animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : filteredCitizenCountries.length > 0 ? (
                      filteredCitizenCountries.map((country) => (
                        <div
                          key={country.id}
                          className={`px-4 py-3 hover:bg-green-50 cursor-pointer flex items-center justify-between ${citizenOf === country.name ? "bg-green-50 text-[#14532d]" : "text-gray-700"}`}
                          onClick={() => { setCitizenOf(country.name); setCitizenSearch(country.name); setShowCitizenDropdown(false); }}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin size={16} className={citizenOf === country.name ? "text-[#14532d]" : "text-gray-400"} />
                            <span>{country.name}</span>
                          </div>
                          {citizenOf === country.name && <div className="w-2 h-2 rounded-full bg-[#14532d]" />}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">No countries found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Going To */}
              <div className="flex-1 relative" ref={goingToRef}>
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-400 transition-colors cursor-pointer"
                  onClick={() => setShowGoingToDropdown(!showGoingToDropdown)}
                >
                  <Plane size={20} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium">Going to</p>
                    <input
                      type="text"
                      value={goingToSearch}
                      onChange={(e) => { setGoingToSearch(e.target.value); setShowGoingToDropdown(true); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                      className="w-full outline-none text-gray-900 font-medium placeholder:text-gray-400 cursor-pointer"
                      placeholder="Select destination"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showGoingToDropdown ? "rotate-180" : ""}`} />
                </div>
                {showGoingToDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-[200]">
                    {countriesLoading ? (
                      <div className="px-4 py-3 text-gray-500 text-center flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#14532d] border-t-transparent rounded-full animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : filteredGoingToCountries.length > 0 ? (
                      filteredGoingToCountries.map((country) => (
                        <div
                          key={country.id}
                          className={`px-4 py-3 hover:bg-green-50 cursor-pointer flex items-center justify-between ${goingTo === country.name ? "bg-green-50 text-[#14532d]" : "text-gray-700"}`}
                          onClick={() => { setGoingTo(country.name); setGoingToSearch(country.name); setShowGoingToDropdown(false); }}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin size={16} className={goingTo === country.name ? "text-[#14532d]" : "text-gray-400"} />
                            <span>{country.name}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">No countries found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Travel Date */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-400 transition-colors">
                <Calendar size={20} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium">Departure Date</p>
                  <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} className="w-full outline-none text-gray-900 font-medium" />
                </div>
              </div>

              {/* Return Date */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-emerald-400 transition-colors">
                <Calendar size={20} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium">Return Date</p>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full outline-none text-gray-900 font-medium" />
                </div>
              </div>

              {/* Search Button */}
              <button
                id="visa-search-btn"
                onClick={handleSearch}
                className="px-8 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-colors shadow-lg text-sm uppercase tracking-wider"
              >
                <Search size={18} />
                Search
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── ANIMATED STATS STRIP ────────────────────────────────────────── */}
      <div className="bg-emerald-800 py-8 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label} className="text-white">
              <p className="text-4xl font-black italic tracking-tighter text-white">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── ALL VISA DESTINATIONS CARDS GRID ─── */}
      <div className="py-20 px-6 bg-slate-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-400 font-black">
                Explore World Destinations
              </span>
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mt-2">
                All Visa <span className="text-emerald-400">Destinations</span>
              </h2>
              <p className="text-slate-400 text-sm mt-3 max-w-lg">
                Browse through all international travel destinations. Click any country card to view instant visa requirements and processing options.
              </p>
            </div>

            {/* Quick Country Search Field */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search destination country..."
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all shadow-inner"
              />
              {countryFilter && (
                <button
                  type="button"
                  onClick={() => setCountryFilter("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {displayCountries.map((c) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <CountryVisaCard country={c} onSelect={handleCountryCardSelect} />
              </motion.div>
            ))}
          </div>

          {displayCountries.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <p className="text-base font-semibold">No countries found matching "{countryFilter}"</p>
              <button
                onClick={() => setCountryFilter("")}
                className="mt-3 text-xs font-bold text-emerald-400 uppercase tracking-wider underline"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>
      </div>



      {/* ─── WHY CHOOSE US ───────────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-700/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-emerald-900/30 rounded-full blur-[120px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "50px 50px" }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-400 font-black">
              Why Professional Agent Processing
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none mt-2 mb-4">
              Why Book Your Visa <br />
              <span className="text-emerald-400">Through Goimomi?</span>
            </h2>
            <p className="max-w-2xl mx-auto text-slate-400 text-sm leading-relaxed">
              Online visa portals let you apply on your own — but a specialist agent like Goimomi delivers expert
              document review, personalised guidance, and a 98% success rate that self-service simply cannot match.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {agentAdvantages.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-7 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-700/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold uppercase tracking-tight text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── VISA TYPES ──────────────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">
              Our Scope
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2 mb-4">
              Visa Services We <span className="text-emerald-700">Specialise In</span>
            </h2>
            <p className="max-w-xl mx-auto text-slate-500 text-sm leading-relaxed">
              Whether you're travelling for leisure, business, pilgrimage, or education — our certified consultants
              handle the right visa type with precision and care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visaTypes.map((type, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`p-7 rounded-2xl border bg-gradient-to-br ${type.color} hover:shadow-lg transition-all group cursor-pointer`}
                onClick={() => navigate("/visa")}
              >
                <div className="text-3xl mb-4">{type.icon}</div>
                <h3 className={`text-lg font-black uppercase tracking-tight mb-2 ${type.accent}`}>{type.title}</h3>
                <p className="text-slate-600 text-[13px] leading-relaxed mb-4">{type.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {type.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-black uppercase tracking-widest bg-white/60 px-2.5 py-1 rounded-full text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Simple Process</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2 mb-4">
              How Your Visa <span className="text-emerald-700">Gets Done</span>
            </h2>
            <p className="max-w-lg mx-auto text-slate-500 text-sm leading-relaxed">
              A clear, transparent 4-step process designed to make your visa application completely stress-free.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex flex-col items-start p-7 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all group"
              >
                {i < processSteps.length - 1 && (
                  <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-200 hidden lg:block z-10" />
                )}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-4xl font-black italic text-slate-100 group-hover:text-emerald-100 transition-colors">
                    {s.step}
                  </span>
                  <div className="w-11 h-11 rounded-xl bg-emerald-700 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    {s.icon}
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight mb-2">{s.title}</h3>
                <p className="text-slate-500 text-[13px] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TESTIMONIALS ────────────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">
              Client Experiences
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
              Visas Approved. <span className="text-emerald-700">Travellers Happy.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-emerald-200 hover:shadow-xl transition-all flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{t.flag}</span>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{t.role.split("—")[0].trim()}</span>
                  </div>
                </div>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-800 flex items-center justify-center text-white font-black text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{t.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── FAQ SECTION ─────────────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Got Questions?</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
              Visa FAQ — <span className="text-emerald-700">Quick Answers</span>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-7 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-bold text-slate-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-emerald-700 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-7 pb-6 text-slate-600 text-[13px] leading-relaxed border-t border-slate-50 pt-4">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CTA SECTION ─────────────────────────────────────────────────── */}
      <div className="py-20 px-6">
        <div className="max-w-5xl mx-auto rounded-[2rem] bg-gradient-to-br from-emerald-800 to-emerald-950 p-10 md:p-16 relative overflow-hidden text-center shadow-[0_50px_120px_rgba(20,83,45,0.25)]">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-[80px]" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-[80px]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-emerald-200 text-[9px] font-black uppercase tracking-widest mb-6 border border-white/10">
              Speak to a Visa Expert — Free Consultation
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4 leading-[0.9]">
              Ready to Start Your <br />
              <span className="text-emerald-400">Visa Application?</span>
            </h2>

            <p className="text-emerald-100/70 max-w-xl mx-auto mb-4 text-sm font-medium leading-relaxed">
              Don't risk a rejection with a self-filed application. Talk to our certified visa consultants today —
              free guidance, document checklist, and expert submission — no hidden fees.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-emerald-200/80 text-[11px] font-bold uppercase tracking-widest">
              {["Free Consultation", "98% Approval Rate", "Express Processing Available"].map((b) => (
                <div key={b} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {b}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="visa-cta-consult"
                onClick={() => navigate("/contactus")}
                className="w-full sm:w-60 px-8 py-4 bg-white text-emerald-800 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all shadow-2xl rounded-sm"
              >
                TALK TO AN EXPERT
              </button>
              <button
                id="visa-cta-apply"
                onClick={() => document.querySelector("#visa-search-btn")?.click() || window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-full sm:w-60 px-8 py-4 bg-transparent border-2 border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all rounded-sm"
              >
                SEARCH VISA NOW
              </button>
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
};

export default VisaSearch;



