import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight, MapPin, Compass, Globe, Star, Users, Briefcase, CheckCircle2, Camera, Heart, ShieldCheck, Headphones, CreditCard, Sun, Mountain, Waves, Building, Sparkles, CalendarDays, BadgeCheck } from "lucide-react";
import usePageSEO from "../../../hooks/usePageSEO";

// Assets
import leisure1 from "../../../assets/Hero/leisure1.jpeg";
import leisure2 from "../../../assets/Hero/leisure2.jpeg";
import leisure3 from "../../../assets/Hero/leisure3.jpeg";
import leisure4 from "../../../assets/Hero/leisure4.jpeg";
import leisure5 from "../../../assets/Hero/leisure5.jpeg";
import leisureHeader1 from "../../../assets/Hero/LeisureHeader/leisure-header-01.png";
import leisureHeader2 from "../../../assets/Hero/LeisureHeader/leisure-header-02.png";
import leisureHeader3 from "../../../assets/Hero/LeisureHeader/leisure-header-03.png";
import leisureHeader4 from "../../../assets/Hero/LeisureHeader/leisure-header-04.png";
import leisureHeader5 from "../../../assets/Hero/LeisureHeader/leisure-header-05.png";
import blueseaImg from "../../../assets/Hero/bluesea.png";
import sunsetImg from "../../../assets/Hero/sunset.png";
import umrahImg from "../../../assets/umrah.png";
import umrahImg2 from "../../../assets/umrah2.png";
import cusHolidays from "../../../assets/cusholidays.png";

const leisureHeroImages = [leisureHeader1, leisureHeader2, leisureHeader3, leisureHeader4, leisureHeader5];

// ─── Animated Counter ─────────────────────────────────────────────────────────
const AnimatedCounter = ({ target, suffix = "", duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = parseInt(target);
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * Holiday Home Landing Experience
 * 
 * Features:
 * - Animated Hero carousel with immersive holiday destination landscapes
 * - Animated counters for trips arranged, countries covered, and happy travelers
 * - Curated holiday packages (Honeymoon, Family, Adventure, Pilgrimage, Luxury)
 * - Trending domestic & international collections with direct package deep-linking
 */
const HolidayHome = () => {
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % 5);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);
  usePageSEO(
    "Plan Your Perfect Holiday – Goimomi Holidays",
    "Explore our curated collection of domestic and international holiday packages. From exotic European tours to sacred Umrah journeys, Goimomi Holidays offers customized travel experiences for every traveler.",
    null,
    "holiday packages India, international tours, domestic travel, Umrah packages, customized tours, Goimomi Holidays"
  );

  const scrollToCategories = () => {
    document.getElementById("holiday-categories")?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const stats = [
    { value: "15000", suffix: "+", label: "Happy Travellers" },
    { value: "80", suffix: "+", label: "Destinations" },
    { value: "99", suffix: "%", label: "Satisfaction Rate" },
    { value: "12", suffix: "+", label: "Years of Excellence" },
  ];

  const categories = [
    {
      id: "domestic",
      title: "Domestic",
      subtitle: "Explore India's Beauty",
      description: "From the snow-capped Himalayas to the golden shores of Goa — discover India's breathtaking diversity.",
      image: leisure1,
      path: "/holidays?category=Domestic",
      color: "from-orange-500/30 to-rose-600/30",
      icon: <MapPin className="w-5 h-5" />,
      tag: "Best Value",
      accent: "from-orange-500 to-rose-500",
    },
    {
      id: "international",
      title: "International",
      subtitle: "Global Destinations",
      description: "Explore the world's most iconic cities, exotic islands, and hidden cultural gems across 50+ countries.",
      image: leisure3,
      path: "/holidays?category=International",
      color: "from-blue-500/30 to-indigo-600/30",
      icon: <Globe className="w-5 h-5" />,
      tag: "Popular",
      accent: "from-blue-500 to-indigo-500",
    },
    {
      id: "customized",
      title: "Customized Holidays",
      subtitle: "Tailored Experiences",
      description: "Your dream holiday, built exactly the way you want it — choose your dates, destinations, and activities.",
      image: cusHolidays,
      path: "/customizedHolidays",
      color: "from-purple-500/30 to-violet-600/30",
      icon: <Compass className="w-5 h-5" />,
      tag: "Signature",
      accent: "from-purple-500 to-violet-500",
    },
    {
      id: "european",
      title: "European Tour",
      subtitle: "The Heart of Europe",
      description: "Stroll through Parisian boulevards, cruise Swiss lakes, and marvel at Rome's timeless landmarks.",
      image: leisure4,
      path: "/Europeantours",
      color: "from-emerald-500/30 to-teal-600/30",
      icon: <Star className="w-5 h-5" />,
      tag: "Premium",
      accent: "from-emerald-500 to-teal-500",
    },
    {
      id: "umrah",
      title: "Umrah",
      subtitle: "Sacred Pilgrimage",
      description: "A spiritually enriching journey to Makkah and Madinah — guided, comfortable, and deeply fulfilling.",
      image: umrahImg,
      path: "/umrah-package",
      color: "from-amber-500/30 to-yellow-600/30",
      icon: <Users className="w-5 h-5" />,
      tag: "Devotional",
      accent: "from-amber-500 to-yellow-500",
    },
    {
      id: "customized-umrah",
      title: "Customized Umrah",
      subtitle: "Personalized Spiritual Journey",
      description: "Craft your Umrah experience your way — flexible dates, private rooms, and premium services tailored for you.",
      image: umrahImg2,
      path: "/customizedumrah",
      color: "from-rose-500/30 to-pink-600/30",
      icon: <Briefcase className="w-5 h-5" />,
      tag: "Bespoke",
      accent: "from-rose-500 to-pink-500",
    },
  ];

  const whyUs = [
    {
      icon: <BadgeCheck className="w-5 h-5" />,
      title: "Handpicked Itineraries",
      desc: "Every package is personally crafted by our travel experts — no cookie-cutter tours, just genuine experiences.",
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: "Best Price Guarantee",
      desc: "We match or beat any comparable quote. Transparent pricing with zero hidden charges — always.",
    },
    {
      icon: <Headphones className="w-5 h-5" />,
      title: "24/7 Holiday Support",
      desc: "Whether you're at the airport or on the beach, our travel desk is just a call away, any time of day.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Fully Insured Travel",
      desc: "Comprehensive travel insurance included in select packages — covering health, baggage, and trip cancellations.",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Exclusive Upgrades",
      desc: "Enjoy room upgrades, complimentary breakfasts, and surprise amenities at our partner hotels worldwide.",
    },
    {
      icon: <CalendarDays className="w-5 h-5" />,
      title: "Flexible Booking",
      desc: "Easy rescheduling, free date changes up to 30 days before travel, and hassle-free cancellation policies.",
    },
  ];

  const travelTypes = [
    { icon: <Sun className="w-6 h-6" />, label: "Beach Holidays", count: "25+ Packages" },
    { icon: <Mountain className="w-6 h-6" />, label: "Hill Stations", count: "18+ Packages" },
    { icon: <Building className="w-6 h-6" />, label: "City Breaks", count: "30+ Packages" },
    { icon: <Heart className="w-6 h-6" />, label: "Honeymoon", count: "20+ Packages" },
    { icon: <Camera className="w-6 h-6" />, label: "Adventure Tours", count: "15+ Packages" },
    { icon: <Waves className="w-6 h-6" />, label: "Cruise Holidays", count: "10+ Packages" },
  ];

  const testimonials = [
    {
      name: "Sneha & Rohan Kapoor",
      role: "Honeymooners · Maldives Package",
      quote:
        "Our Maldives honeymoon was absolutely magical. Goimomi arranged an overwater villa, sunset dinner cruise, and even a surprise flower decoration on our anniversary night. Couldn't have asked for more!",
      rating: 5,
      destination: "Maldives",
    },
    {
      name: "Arjun Menon",
      role: "Solo Traveller · European Tour",
      quote:
        "Covered 7 countries in 14 days — Paris, Amsterdam, Prague, Vienna and more. Every hotel was great, transfers were smooth, and the tour guide was exceptionally knowledgeable. Worth every rupee!",
      rating: 5,
      destination: "Europe",
    },
    {
      name: "Fatima & Family",
      role: "Family Trip · Customized Umrah",
      quote:
        "We did Umrah with our parents and three children. Goimomi arranged everything — from wheelchairs for elders to a family suite in Madinah. The team's care and attention was beyond our expectations.",
      rating: 5,
      destination: "Saudi Arabia",
    },
  ];

  const travelTips = [
    {
      number: "01",
      title: "Book Early for Best Rates",
      desc: "Holiday packages booked 60-90 days in advance offer savings of up to 35% on flights and hotels. Peak season deals sell fast — secure yours today.",
    },
    {
      number: "02",
      title: "Travel Insurance is Non-Negotiable",
      desc: "A comprehensive travel insurance plan protects against unexpected medical costs, trip cancellations, and lost baggage — a small price for complete peace of mind.",
    },
    {
      number: "03",
      title: "Pack Light, Travel Smart",
      desc: "Most international flights allow 20–23 kg check-in baggage. A well-packed carry-on means faster boarding, no extra fees, and less hassle at every stop.",
    },
    {
      number: "04",
      title: "Currency & Connectivity",
      desc: "Exchange a small amount of local currency before departure. Consider an international SIM or travel eSIM for seamless navigation and communication abroad.",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-slate-50 selection:bg-emerald-200">

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative w-full h-[520px] md:h-[620px] overflow-hidden bg-black group">
        <div className="absolute inset-0">
          <img
            src={leisureHeroImages[heroIndex]}
            alt="Holiday Travel Hero"
            className="w-full h-full object-cover transition-opacity duration-700 scale-110 group-hover:scale-100 opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        </div>

        {/* Decorative grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center px-6 md:px-20 z-10">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-left max-w-3xl"
          >
            <div className="flex items-center gap-3 text-emerald-400 mb-5">
              <div className="w-10 h-[2px] bg-emerald-400" />
              <span className="text-[11px] md:text-xs uppercase tracking-[0.5em] font-black">
                Curated Global Holidays
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-[0.85] mb-5">
              LEISURE
              <br />
              <span className="text-white/20 group-hover:text-emerald-400 transition-colors duration-700">
                TRAVEL
              </span>
              <br />
              <span className="text-2xl md:text-4xl font-black text-white/80 not-italic tracking-tight">
                CRAFTED FOR YOU
              </span>
            </h1>

            <p className="text-slate-300 text-sm md:text-base mb-8 max-w-xl font-medium leading-relaxed">
              From the serene backwaters of Kerala to the romantic boulevards of Paris — we craft holiday experiences
              that linger in your memory for a lifetime. Trusted by 15,000+ happy travellers across India.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <button
                id="holiday-hero-plan"
                onClick={scrollToCategories}
                className="px-8 py-4 bg-emerald-700 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-emerald-800 transition-all transform hover:-translate-y-1 active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center gap-2 rounded-sm"
              >
                PLAN A HOLIDAY <ArrowRight className="w-4 h-4" />
              </button>
              <button
                id="holiday-hero-customize"
                onClick={() => navigate("/customizedHolidays")}
                className="px-8 py-4 bg-transparent border border-white/30 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all rounded-sm"
              >
                CUSTOMIZE MY TRIP
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-5">
              {["IATA Certified", "Best Price Guarantee", "Fully Insured"].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{badge}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>


        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 animate-bounce hidden md:block">
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/10 via-white to-transparent" />
        </div>

        <div className="absolute bottom-6 left-6 md:left-20 z-20 flex items-center gap-2" aria-label="Leisure hero images">
          {leisureHeroImages.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Show leisure hero image ${index + 1}`}
              aria-current={heroIndex === index ? "true" : undefined}
              onClick={() => setHeroIndex(index)}
              className={`h-1.5 rounded-full transition-all ${heroIndex === index ? "w-9 bg-emerald-400" : "w-2 bg-white/50 hover:bg-white"}`}
            />
          ))}
        </div>
      </section>

      {/* ─── ANIMATED STATS BAR ──────────────────────────────────────────── */}
      <section className="bg-emerald-800 py-8 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label} className="text-white">
              <p className="text-4xl font-black italic tracking-tighter text-white">
                <AnimatedCounter target={s.value} suffix={s.suffix} />
              </p>
              <p className="text-[10px] uppercase tracking-widest text-emerald-200 font-bold mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TRAVEL TYPES STRIP ──────────────────────────────────────────── */}
      <section className="py-14 px-6 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Browse By Type</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter mt-2">
              Find Your Perfect <span className="text-emerald-700">Holiday Style</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {travelTypes.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -5 }}
                onClick={() => navigate("/holidays")}
                className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-3 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                  {t.icon}
                </div>
                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-tight mb-1">{t.label}</h3>
                <p className="text-[10px] text-emerald-600 font-bold">{t.count}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES SECTION ──────────────────────────────────────────── */}
      <section id="holiday-categories" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Our Collections</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mt-2">
              Choose Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-emerald-500">
                Adventure
              </span>
            </h2>
          </motion.div>
          <p className="max-w-md text-slate-500 text-sm font-medium leading-relaxed">
            Whether you crave sun-drenched beaches, cultural city breaks, spiritual pilgrimages, or adrenaline-fuelled
            adventures — Goimomi curates it all with care and expertise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ y: -8 }}
              className="relative rounded-[1.5rem] overflow-hidden group cursor-pointer shadow-xl bg-slate-900"
              style={{ aspectRatio: "4/5" }}
              onClick={() => navigate(cat.path)}
            >
              {/* Image */}
              <div className="absolute inset-0">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-70 group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent transition-opacity" />
              </div>

              {/* Colour tint on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

              {/* Tag */}
              <div className="absolute top-5 right-5 z-20">
                <div className="bg-white/15 backdrop-blur-md border border-white/25 px-3 py-1.5 rounded-full">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{cat.tag}</span>
                </div>
              </div>

              {/* Inner border accent */}
              <div className="absolute inset-4 border border-white/5 rounded-[2rem] pointer-events-none group-hover:border-white/20 transition-colors" />

              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-7 z-20">
                {/* Icon + subtitle — visible on hover */}
                <div className="flex items-center gap-3 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 text-white/90">
                  <div className="p-2 bg-white/15 backdrop-blur-md rounded-lg border border-white/25">
                    {cat.icon}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest">{cat.subtitle}</span>
                </div>

                <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">
                  {cat.title}
                </h3>

                {/* Description — visible on hover */}
                <p className="text-white/70 text-[12px] leading-relaxed mb-4 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-75 max-h-0 group-hover:max-h-20 overflow-hidden">
                  {cat.description}
                </p>

                <div className="h-[2px] w-10 bg-white/30 group-hover:w-full transition-all duration-700 ease-out" />

                <div className="mt-5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                  <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Explore Journey</span>
                  <div className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform group-hover:rotate-[-45deg]">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── FEATURED EXPERIENCE BANNER ──────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={blueseaImg} alt="Ocean Holiday" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-400 font-black">
                Why Travel With Us
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-none mt-2 mb-4">
                More Than Just <br />
                <span className="text-emerald-400">A Holiday Package</span>
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                At Goimomi, we believe a holiday is not just a trip — it's a story. Our travel curators invest hours
                researching destinations, vetting hotels, and designing itineraries that balance bucket-list sights with
                authentic local experiences. When you travel with us, every detail is taken care of — so you can
                simply live in the moment.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Personally vetted hotels & resorts",
                  "No hidden costs — ever",
                  "Expert local guides at every stop",
                  "Flexible itinerary customisation",
                  "Group discounts for 8+ travellers",
                  "Dedicated trip coordinator",
                  "Real-time support on WhatsApp",
                  "Eco-friendly travel options",
                ].map((pt) => (
                  <div key={pt} className="flex items-center gap-2.5 text-[12px] font-semibold text-slate-300">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    {pt}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="rounded-2xl overflow-hidden h-56 col-span-2">
                <img src={leisure2} alt="Holiday" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-2xl overflow-hidden h-40">
                <img src={leisure5} alt="Destination" className="w-full h-full object-cover" />
              </div>
              <div className="rounded-2xl overflow-hidden h-40">
                <img src={sunsetImg} alt="Sunset" className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── WHY CHOOSE US ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Our Promise</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2 mb-4">
              The Goimomi <span className="text-emerald-700">Difference</span>
            </h2>
            <p className="max-w-lg mx-auto text-slate-500 text-sm leading-relaxed">
              Six reasons why 15,000+ travellers consistently choose Goimomi for their most cherished holidays.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyUs.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-7 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-5 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight mb-2">{item.title}</h3>
                <p className="text-slate-500 text-[13px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Traveller Stories</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
              Memories Made With <span className="text-emerald-700">Goimomi</span>
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
                className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:border-emerald-200 hover:shadow-xl transition-all flex flex-col"
              >
                {/* Destination badge */}
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-4 w-fit">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{t.destination}</span>
                </div>

                {/* Stars */}
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
      </section>

      {/* ─── TRAVEL TIPS ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Travel Smarter</span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2">
                Essential Travel <span className="text-emerald-700">Tips</span>
              </h2>
            </div>
            <p className="max-w-sm text-slate-500 text-sm leading-relaxed">
              Advice from our seasoned travel experts to help you make the most of every holiday.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {travelTips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-5 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group"
              >
                <span className="text-4xl font-black italic text-slate-100 group-hover:text-emerald-100 transition-colors shrink-0 leading-none mt-1">
                  {tip.number}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight mb-2">{tip.title}</h3>
                  <p className="text-slate-500 text-[13px] leading-relaxed">{tip.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto rounded-[2rem] bg-gradient-to-br from-emerald-800 to-emerald-950 p-10 md:p-16 relative overflow-hidden text-center shadow-[0_50px_120px_rgba(20,83,45,0.25)]">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-[80px]" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-[80px]" />

          {/* Floating decoration images */}
          <div className="absolute left-0 top-0 h-full w-48 hidden xl:block overflow-hidden rounded-l-[2rem]">
            <img src={leisure3} alt="" className="w-full h-full object-cover opacity-20" />
          </div>
          <div className="absolute right-0 top-0 h-full w-48 hidden xl:block overflow-hidden rounded-r-[2rem]">
            <img src={leisure4} alt="" className="w-full h-full object-cover opacity-20" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-emerald-200 text-[9px] font-black uppercase tracking-widest mb-6 border border-white/10">
              Your Next Adventure Awaits
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4 leading-[0.9]">
              Every Journey Tells A <br />
              <span className="text-emerald-400">Different Story.</span>
            </h2>

            <p className="text-emerald-100/70 max-w-xl mx-auto mb-4 text-sm font-medium leading-relaxed">
              Let our expert travel curators design the perfect itinerary for your next getaway — honeymoon, family
              vacation, solo adventure, or a sacred pilgrimage. We'll handle every detail.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-10 text-emerald-200/80 text-[11px] font-bold uppercase tracking-widest">
              {["No Booking Fee", "Free Itinerary Planning", "Cancel Anytime"].map((b) => (
                <div key={b} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {b}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="holiday-cta-experts"
                onClick={() => navigate("/contactus")}
                className="w-full sm:w-56 px-8 py-4 bg-white text-emerald-800 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all shadow-2xl rounded-sm"
              >
                TALK TO EXPERTS
              </button>
              <button
                id="holiday-cta-customize"
                onClick={() => navigate("/customizedHolidays")}
                className="w-full sm:w-56 px-8 py-4 bg-transparent border-2 border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all rounded-sm"
              >
                CUSTOMIZE MY TRIP
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HolidayHome;



