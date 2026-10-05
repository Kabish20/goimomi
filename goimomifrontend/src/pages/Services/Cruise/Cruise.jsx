import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Award, ShieldCheck, Headphones, Star, ArrowRight, BadgeCheck, Sparkles, ChevronDown, Globe, Anchor, Compass, Sunrise, Utensils, Music } from "lucide-react";
import api from "../../../api";
import ZohoCruiseForm from "../../../components/forms/ZohoCruiseForm";
import usePageSEO from "../../../hooks/usePageSEO";
import cruiseHeroImg from "../../../assets/cruise_hero.jpg";
import cruiseHero1 from "../../../assets/Hero/CruiseHeader/cruise-hero-01.png";
import cruiseHero2 from "../../../assets/Hero/CruiseHeader/cruise-hero-02.png";
import cruiseHero3 from "../../../assets/Hero/CruiseHeader/cruise-hero-03.png";
import cruiseHero4 from "../../../assets/Hero/CruiseHeader/cruise-hero-04.png";
import cruiseHero5 from "../../../assets/Hero/CruiseHeader/cruise-hero-05.png";
import { simpleCache } from "../../../utils/cache";

const cruiseHeroImages = [cruiseHero1, cruiseHero2, cruiseHero3, cruiseHero4, cruiseHero5];

/**
 * Luxury Cruise Holidays Page
 * 
 * Features:
 * - Dynamic animated hero carousel of ocean cruise liners
 * - Cruise calendar and schedules (Cordelia Cruises, International sailings)
 * - Cabin categories, amenities, entertainment, and culinary offerings
 * - Direct Zoho cruise enquiry and booking modal integration
 */
const Cruise = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCruise, setSelectedCruise] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % cruiseHeroImages.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  usePageSEO(
    "Luxury Cruise Holidays | Plan Your Voyage | Goimomi Holidays",
    "Sail the high seas in style with Goimomi Holidays' luxury cruise packages. From the vibrant shores of India to exotic international voyages, enjoy gourmet dining, world-class entertainment, and premium ocean-view suites on iconic ships like Cordelia Cruises.",
    cruiseHeroImg,
    "Luxury cruise holidays, Cordelia Cruises calendar 2026, cruise booking India, Mumbai to Goa cruise, international cruise packages, Goimomi Holidays, ocean-view suites, cruise vacation planning"
  );

  const handleBookCruise = (cruiseName) => {
    setSelectedCruise(`Interested in: ${cruiseName}`);
    setIsFormOpen(true);
  };

  const [calendarData, setCalendarData] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const response = await simpleCache("cruise_calendar", () => api.get("/api/cruise-calendar/"));
        setCalendarData(response.data);
      } catch (err) {
        console.error("Error fetching cruise calendar:", err);
      } finally {
        setLoadingCalendar(false);
      }
    };
    fetchCalendar();
  }, []);

  const handleScheduleClick = (row, month, date) => {
    const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    setSelectedCruise(`Enquiry for ${row.cruise_type} (${row.itinerary}) - Sailing Date: ${date} ${formattedMonth}`);
    setIsFormOpen(true);
  };

  // ─── Data ────────────────────────────────────────────────────────────────
  const stats = [
    { value: "50+", label: "Voyages Curated" },
    { value: "15K+", label: "Happy Voyagers" },
    { value: "10+", label: "Cruise Lines" },
    { value: "98%", label: "Satisfaction Rate" },
  ];

  const agentAdvantages = [
    {
      icon: <Award className="w-5 h-5" />,
      title: "Exclusive Cabin Upgrades",
      desc: "As an accredited cruise partner, we negotiate exclusive upgrades — ocean-view balconies, premium onboard credits, and priority embarkation — unavailable when booking direct.",
    },
    {
      icon: <BadgeCheck className="w-5 h-5" />,
      title: "Expert Route Curation",
      desc: "Our cruise specialists analyse itineraries, port timings, deck plans, and dining options to match the perfect voyage to your travel style — saving you hours of research.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Pre & Post Cruise Planning",
      desc: "A cruise is only part of the journey. We arrange flights, airport transfers, pre-cruise hotel stays, and shore excursions for a fully seamless end-to-end experience.",
    },
    {
      icon: <Headphones className="w-5 h-5" />,
      title: "24/7 On-Voyage Support",
      desc: "Our travel desk remains reachable throughout your voyage — handling emergencies, onboard service escalations, or last-minute itinerary changes from port.",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Group & Celebration Packages",
      desc: "Planning a honeymoon, family reunion, or corporate cruise? We arrange dedicated group cabins, private dining tables, and special occasion surprises on your behalf.",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "Visa & Travel Documentation",
      desc: "Multi-port cruises often require multiple visas. Our in-house visa team handles all documentation — port entry permits, shore pass requirements, and travel insurance.",
    },
  ];

  const cruiseExperiences = [
    {
      emoji: "🚢",
      title: "Domestic Cruises",
      desc: "Explore India's stunning coastline on Cordelia Cruises — Mumbai to Goa, Lakshadweep, and South India segments. Perfect for first-time cruisers.",
      tags: ["Mumbai–Goa", "Lakshadweep", "Kochi"],
      color: "from-blue-50 to-indigo-50 border-blue-100",
    },
    {
      emoji: "🌏",
      title: "Southeast Asia Voyages",
      desc: "Sail through Singapore, Thailand, Malaysia, and Vietnam aboard world-class ships with cultural shore excursions curated by our travel experts.",
      tags: ["Singapore", "Thailand", "Vietnam"],
      color: "from-emerald-50 to-teal-50 border-emerald-100",
    },
    {
      emoji: "🏖️",
      title: "Maldives & Indian Ocean",
      desc: "Crystal-clear waters, overwater bungalow extensions, and island-hopping adventures tied into premium cruise itineraries.",
      tags: ["Maldives", "Seychelles", "Réunion"],
      color: "from-cyan-50 to-sky-50 border-cyan-100",
    },
    {
      emoji: "🌍",
      title: "Mediterranean Cruises",
      desc: "Iconic Greek islands, Italian Riviera, Spanish coasts, and Turkish ports — Mediterranean passages curated with shore excursion packages.",
      tags: ["Greece", "Italy", "Spain", "Turkey"],
      color: "from-amber-50 to-orange-50 border-amber-100",
    },
    {
      emoji: "⛵",
      title: "Luxury & Premium Lines",
      desc: "From Royal Caribbean and MSC to Celebrity Cruises — we book across all major international lines with preferred partner perks and cabin upgrades.",
      tags: ["Royal Caribbean", "MSC", "Celebrity"],
      color: "from-violet-50 to-purple-50 border-violet-100",
    },
    {
      emoji: "🎉",
      title: "Themed & Event Cruises",
      desc: "New Year sailings, honeymoon packages, family holiday voyages, and wellness cruises — we match the right sailing to every special occasion.",
      tags: ["Honeymoon", "Family", "New Year"],
      color: "from-rose-50 to-pink-50 border-rose-100",
    },
  ];

  const onboardHighlights = [
    { icon: <Utensils className="w-5 h-5" />, title: "Gourmet Dining", desc: "Multiple specialty restaurants, 24-hour buffets, and themed dining nights curated by world-class chefs." },
    { icon: <Music className="w-5 h-5" />, title: "World-Class Entertainment", desc: "Broadway-style shows, live bands, comedy nights, and themed deck parties every evening at sea." },
    { icon: <Sunrise className="w-5 h-5" />, title: "Ocean-View Suites", desc: "Premium staterooms with private balconies, turn-down service, and panoramic sunrise views." },
    { icon: <Anchor className="w-5 h-5" />, title: "Port Shore Excursions", desc: "Expert-led guided tours at every port — curated to maximise your time ashore with memorable experiences." },
    { icon: <Compass className="w-5 h-5" />, title: "Wellness & Spa", desc: "Full-service spas, wellness decks, yoga at sea, and hydrotherapy pools for ultimate relaxation." },
    { icon: <Star className="w-5 h-5" />, title: "Kids & Family Zones", desc: "Dedicated kids' clubs, family activity decks, and age-specific programming for all family members." },
  ];

  const processSteps = [
    { step: "01", emoji: "📞", title: "Free Cruise Consultation", desc: "Tell us your travel dates, group size, budget, and dream destination — our cruise specialist builds a shortlist tailored to you." },
    { step: "02", emoji: "🚢", title: "Voyage Selection", desc: "We present curated options with cabin comparisons, itinerary breakdowns, dining plans, and pre-booked shore excursions." },
    { step: "03", emoji: "📋", title: "Complete Booking", desc: "We handle all documentation — cabin booking, travel insurance, visa applications, airport transfers, and hotel stays." },
    { step: "04", emoji: "⚓", title: "Set Sail, We Stay", desc: "Embark with confidence. Our 24/7 support desk remains reachable throughout your voyage for anything you need." },
  ];

  const testimonials = [
    {
      name: "Ramesh & Priya Menon",
      voyage: "Cordelia Cruise — Mumbai to Lakshadweep",
      quote: "Goimomi made our anniversary cruise absolutely magical. The cabin upgrade, the private dining arrangement — everything was beyond what we expected. Every detail was handled seamlessly.",
      rating: 5,
      emoji: "🚢",
    },
    {
      name: "The Krishnamurthy Family",
      voyage: "Southeast Asia Cruise — Singapore & Thailand",
      quote: "Travelling with three kids across four countries felt impossible until Goimomi took over. Our cruise specialist handled visas, transfers, and even arranged a kids' club tour. 10/10!",
      rating: 5,
      emoji: "🌏",
    },
    {
      name: "Arun Sundararajan",
      voyage: "Mediterranean — Greece & Italy",
      quote: "My first international cruise was flawlessly planned by the Goimomi team. Shore excursions in Santorini, a private tour in Rome — none of it would've happened without their expertise.",
      rating: 5,
      emoji: "🌍",
    },
  ];

  const faqs = [
    {
      q: "What does a cruise package through Goimomi include?",
      a: "Our cruise packages typically include cabin booking, onboard meal plans, selected shore excursions, travel insurance, and airport/port transfers. We also assist with pre and post-cruise hotel stays, visa applications, and any customisation you need — all as a single, coordinated booking.",
    },
    {
      q: "How early should I book a cruise?",
      a: "We recommend booking at least 3–6 months in advance, especially for peak season sailings (December–January, summer holidays). Early booking ensures better cabin selection, lower fares, and time for visa processing. Our specialists can advise on the ideal booking window for your chosen route.",
    },
    {
      q: "Are visas required for multi-port cruises?",
      a: "Yes, most international cruises visiting multiple countries require valid visas for each port destination. For example, a Southeast Asia cruise may require visas for Thailand, Malaysia, and Vietnam. Our in-house visa team handles all documentation simultaneously — a major advantage of booking through a professional agent.",
    },
    {
      q: "Can you arrange group cruise bookings?",
      a: "Absolutely. Group cruise bookings (10+ cabins) come with special negotiated rates, priority boarding, group dining tables, and custom event coordination on board. We've managed group sailings for corporate events, family reunions, wedding parties, and friendship groups.",
    },
    {
      q: "What happens if I need to cancel or reschedule?",
      a: "Cancellation and rescheduling policies vary by cruise line from fully flexible to non-refundable fares. We ensure you understand the policy before booking and always recommend our comprehensive travel insurance. Our team will guide you through the process and advocate on your behalf if circumstances change.",
    },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* ─── HERO SECTION ─────────────────────────────────────────────────── */}
      <div className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {cruiseHeroImages.map((image, index) => (
            <img
              key={image}
              src={image}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-in-out ${
                index === heroImageIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
              }`}
            />
          ))}
        </div>
        {/* Multi-layer overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/60 to-slate-900/90" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
          >
            <div className="flex items-center justify-center gap-3 text-cyan-400 mb-5">
              <div className="w-12 h-[2px] bg-cyan-400" />
              <span className="text-[11px] uppercase tracking-[0.5em] font-black">Expert Cruise Planning Since 2010</span>
              <div className="w-12 h-[2px] bg-cyan-400" />
            </div>

            <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.82] mb-6 text-white">
              LUXURY
              <br />
              <span className="text-white/20">CRUISES</span>
            </h1>

            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover the world's most beautiful destinations from the deck of a floating palace — expertly curated by
              Goimomi's certified cruise specialists with exclusive upgrades, visa assistance, and end-to-end care.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-5 mb-10">
              {["Accredited Cruise Partner", "Exclusive Cabin Upgrades", "Multi-Port Visa Support", "24/7 On-Voyage Desk"].map(badge => (
                <div key={badge} className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">{badge}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="cruise-hero-cta"
                onClick={() => setIsFormOpen(true)}
                className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-sm shadow-2xl transition-all hover:shadow-cyan-500/30 flex items-center gap-3"
              >
                PLAN YOUR CRUISE
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#calendar"
                className="px-10 py-4 bg-transparent border-2 border-white/20 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-sm hover:bg-white/10 transition-all"
              >
                VIEW SCHEDULE ↓
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── STATS STRIP ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-4xl font-black italic tracking-tighter text-cyan-400">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── CRUISE CALENDAR ──────────────────────────────────────────────── */}
      <div id="calendar" className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">2025–2026 Schedule</span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2 mb-4">
            Cordelia Cruises <span className="text-emerald-700">Calendar</span>
          </h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Click any date to enquire — our cruise specialists will follow up with availability, cabin options, and
            the best fares for your chosen sailing.
          </p>
        </div>

        {loadingCalendar ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-700" />
          </div>
        ) : calendarData.length > 0 ? (
          <div className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden border border-gray-100 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#14532d] text-white divide-x divide-white/5">
                  <th className="py-4 px-6 text-left font-bold uppercase tracking-widest text-[9px] border-b border-white/10 min-w-[130px]">Cruise Nights</th>
                  <th className="py-4 px-6 text-left font-bold uppercase tracking-widest text-[9px] border-b border-white/10 min-w-[150px]">Itinerary</th>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                    <th key={m} className="py-4 px-2 text-center font-bold uppercase tracking-widest text-[9px] border-b border-white/10 min-w-[100px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {calendarData.map((row, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'} hover:bg-green-50/30 transition-all duration-300 divide-x divide-gray-100`}>
                    <td className="py-3 px-6">
                      <div className="font-black text-[#14532d] text-xs uppercase tracking-tight">{row.cruise_type}</div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="text-gray-500 font-medium text-[11px] leading-tight">{row.itinerary}</div>
                    </td>
                    {['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].map((m, mIdx) => {
                      const now = new Date();
                      const currentMonthIdx = now.getMonth();
                      const today = now.getDate();
                      return (
                        <td key={m} className="py-3 px-2 text-center bg-transparent">
                          <div className="flex flex-row flex-wrap items-center justify-center gap-1 min-h-[30px] px-1">
                            {row[m] && row[m] !== "-" ? (
                              row[m].split(',').map((dateStr, dIdx) => {
                                const day = parseInt(dateStr.trim());
                                const isPast = mIdx < currentMonthIdx || (mIdx === currentMonthIdx && day < today);
                                return isPast ? (
                                  <div
                                    key={dIdx}
                                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-red-500 bg-red-50 rounded-lg border border-red-100/50 cursor-not-allowed relative group"
                                  >
                                    {day}
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full border border-white" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-600 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                                      Sailing Completed
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    key={dIdx}
                                    onClick={() => handleScheduleClick(row, m, dateStr.trim())}
                                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-[11px] font-black text-[#14532d] bg-[#f0fdf4] hover:bg-[#14532d] hover:text-white rounded-lg transition-all duration-300 shadow-sm border border-green-100 relative group/btn"
                                    title={`Enquire for ${dateStr.trim()} ${m.toUpperCase()}`}
                                  >
                                    {day}
                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#14532d] group-hover/btn:w-1/2 transition-all duration-300 rounded-full" />
                                  </button>
                                );
                              })
                            ) : (
                              <span className="text-gray-200 font-light">—</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 italic bg-white rounded-3xl shadow-sm border border-gray-100">
            Schedule updates coming soon. Contact us for latest availability.
          </div>
        )}
      </div>

      {/* ─── WHY BOOK THROUGH GOIMOMI (DARK) ─────────────────────────────── */}
      <div className="py-24 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-cyan-700/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-slate-800 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-cyan-400 font-black">Why a Specialist Matters</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none mt-2 mb-4">
              Why Book Your Cruise <br /><span className="text-cyan-400">Through Goimomi?</span>
            </h2>
            <p className="max-w-2xl mx-auto text-slate-400 text-sm leading-relaxed">
              Booking a cruise directly through a cruise line website gives you a cabin. Booking through Goimomi gives you
              an expert, a personalized itinerary, exclusive perks, visa support, and someone in your corner at every port.
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
                className="p-7 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/40 hover:bg-white/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-700/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:bg-cyan-700 group-hover:text-white transition-all">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold uppercase tracking-tight text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CRUISE EXPERIENCES ───────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Explore Our Routes</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
              Cruise Experiences <span className="text-emerald-700">We Specialise In</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cruiseExperiences.map((exp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`p-7 rounded-2xl border bg-gradient-to-br ${exp.color} hover:shadow-lg transition-all cursor-pointer group`}
                onClick={() => handleBookCruise(exp.title)}
              >
                <div className="text-3xl mb-4">{exp.emoji}</div>
                <h3 className="text-base font-black uppercase tracking-tight text-slate-900 mb-2">{exp.title}</h3>
                <p className="text-slate-600 text-[13px] leading-relaxed mb-4">{exp.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {exp.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-black uppercase tracking-widest bg-white/70 px-2.5 py-1 rounded-full text-slate-600">{tag}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── ONBOARD HIGHLIGHTS ───────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Life At Sea</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
              What Awaits You <span className="text-emerald-700">On Board</span>
            </h2>
            <p className="max-w-xl mx-auto text-slate-500 text-sm mt-3 leading-relaxed">
              A cruise is more than transportation — it's the destination itself. Here's what makes every Goimomi-booked sailing unforgettable.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {onboardHighlights.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="p-7 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 mb-5 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold uppercase tracking-tight text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-[13px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── HOW WE PLAN YOUR CRUISE ──────────────────────────────────────── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Our Process</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
              How We Plan Your <span className="text-emerald-700">Perfect Voyage</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex flex-col items-start p-7 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-4xl font-black italic text-slate-100 group-hover:text-emerald-100 transition-colors">{s.step}</span>
                  <span className="text-2xl">{s.emoji}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight mb-2">{s.title}</h3>
                <p className="text-slate-500 text-[13px] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Voyager Stories</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
              Sailed With Goimomi. <span className="text-emerald-700">Loved Every Moment.</span>
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
                className="bg-white rounded-2xl p-8 border border-slate-100 hover:border-emerald-200 hover:shadow-xl transition-all flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{t.voyage}</span>
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
                    <p className="text-[11px] text-slate-400 font-medium">{t.voyage}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Got Questions?</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
              Cruise FAQ — <span className="text-emerald-700">Quick Answers</span>
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-7 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-bold text-slate-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-emerald-700 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-7 pb-6 text-slate-600 text-[13px] leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CTA SECTION ──────────────────────────────────────────────────── */}
      <div className="py-20 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto rounded-[2rem] bg-gradient-to-br from-cyan-800 to-slate-800 border border-white/10 p-10 md:p-14 relative z-10 text-center overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-400/10 rounded-full blur-[60px]" />
          <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-cyan-200 text-[9px] font-black uppercase tracking-widest mb-6 border border-white/10">
            Free Cruise Consultation — No Commitment
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4 leading-[0.9]">
            Ready to Set <span className="text-cyan-400">Sail?</span>
          </h2>
          <p className="text-slate-300/80 max-w-xl mx-auto mb-5 text-sm leading-relaxed">
            Talk to a Goimomi cruise specialist today — personalized route planning, exclusive cabin upgrades,
            visa support, and the best fares guaranteed. One call, the perfect voyage.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {["Free Consultation", "Exclusive Upgrades", "Visa Assistance Included"].map(b => (
              <div key={b} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{b}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="cruise-cta-plan"
              onClick={() => setIsFormOpen(true)}
              className="w-full sm:w-60 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl rounded-sm"
            >
              PLAN MY CRUISE
            </button>
            <a
              href="tel:+918110082222"
              className="w-full sm:w-60 px-8 py-4 bg-transparent border-2 border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all rounded-sm text-center"
            >
              📞 CALL US NOW
            </a>
          </div>
        </motion.div>
      </div>

      <ZohoCruiseForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCruise("");
        }}
        initialData={{ description: selectedCruise }}
      />
    </div>
  );
};

export default Cruise;



