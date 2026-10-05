import React, { useState } from "react";
import { FaCheckCircle, FaPhoneAlt, FaUsers, FaShieldAlt } from "react-icons/fa";
import { FaRegHeart, FaPlane, FaHotel, FaShieldHalved } from "react-icons/fa6";
import { motion } from "framer-motion";
import {
  CheckCircle2, Award, BadgeCheck, Headphones, ShieldCheck,
  ArrowRight, ChevronDown, Globe, Star, Sparkles, BookOpen,
} from "lucide-react";
import ZohoCustomizedForm from "../../../components/forms/ZohoCustomizedForm.jsx";
import usePageSEO from "../../../hooks/usePageSEO";
import umrahImage from "../../../assets/umrah.png";
import umrah2Image from "../../../assets/umrah2.png";
import umrah3Image from "../../../assets/umrah3.png";

/**
 * Customized Umrah Pilgrimage Packages
 * 
 * Features:
 * - Spiritual guidance, accommodation tiers near Haram Sharif (Makkah & Madinah)
 * - Transparent Ziyarat itineraries, ground transportation, and catering options
 * - Integrated lead inquiry modal connecting directly to Zoho CRM
 */
const CustomizedUmrah = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  usePageSEO(
    "Customized Umrah Packages | Sacred Spiritual Journey | Goimomi Holidays",
    "Experience a blessed pilgrimage with Goimomi Holidays' customized Umrah packages. We offer premium accommodation near Haram Sharif, expert religious guidance, seamless visa processing, and comfortable travel arrangements for a sacred spiritual journey.",
    umrahImage,
    "Customized Umrah packages, Umrah pilgrimage 2026, Umrah from India, luxury Umrah stay, economy Umrah package, Makkah Madinah Ziyarat, spiritual travel Goimomi, Umrah visa assistance"
  );

  const openForm = (pkg = "Standard Umrah Package") => {
    setSelectedPackage(pkg);
    setIsFormOpen(true);
  };

  // ─── Data ────────────────────────────────────────────────────────────────
  const stats = [
    { value: "8K+", label: "Pilgrims Served" },
    { value: "15+", label: "Years of Expertise" },
    { value: "100%", label: "Visa Success Rate" },
    { value: "24/7", label: "On-Ground Support" },
  ];

  const agentAdvantages = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: "Expert Religious Guidance",
      desc: "Our experienced Islamic scholars and Mutawwif guides accompany your group through every ritual — Tawaf, Sa'ee, and Ziyarat — ensuring your pilgrimage is spiritually complete and correctly performed.",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      title: "100% Umrah Visa Success",
      desc: "We hold an outstanding visa clearance record. Our in-house documentation team manages the entire Umrah visa process — application, biometrics coordination, and approval tracking — end-to-end.",
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: "Hotels Within Steps of Haram",
      desc: "We've negotiated preferred rates at properties located 50m–500m from Masjid Al-Haram and Masjid An-Nabawi — saving you the exhaustion of long walks, especially for elderly pilgrims and families.",
    },
    {
      icon: <Headphones className="w-5 h-5" />,
      title: "24/7 On-Ground Support Team",
      desc: "Our local Saudi team is available around the clock at both Makkah and Madinah — handling room issues, medical referrals, transport emergencies, and any on-ground situation immediately.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Dedicated Group Coordinator",
      desc: "Every group travels with an assigned Goimomi coordinator who speaks your language, knows your preferences, and ensures the group moves together with dignity, comfort, and zero confusion.",
    },
    {
      icon: <BadgeCheck className="w-5 h-5" />,
      title: "Transparent, All-Inclusive Pricing",
      desc: "No hidden fees. Your package price covers accommodation, flights, visa, ground transport, daily meals, Ziyarat, and all logistics. One price, complete peace of mind.",
    },
  ];

  const journeySteps = [
    {
      step: "01",
      icon: <FaPhoneAlt className="w-4 h-4" />,
      title: "Initial Consultation",
      desc: "Share your travel dates, group size, budget, and preferred package tier. Our Umrah specialist guides you through all options — including special requirements for elderly or differently-abled pilgrims.",
    },
    {
      step: "02",
      icon: <Globe className="w-5 h-5" />,
      title: "Visa & Documentation",
      desc: "We collect all required documents, submit the Umrah visa application, and track the approval — coordinating biometrics appointments and keeping you updated every step of the way.",
    },
    {
      step: "03",
      icon: <FaPlane className="w-4 h-4" />,
      title: "Pre-Departure Orientation",
      desc: "Before you fly, our scholar conducts a detailed Umrah orientation — covering the rituals of Ihram, Tawaf, Sa'ee, and all relevant duas — ensuring every pilgrim is spiritually prepared.",
    },
    {
      step: "04",
      icon: <Sparkles className="w-5 h-5" />,
      title: "Your Blessed Journey",
      desc: "Travel with our dedicated coordinator, stay near Haram, perform your rituals with guidance, visit Ziyarat sites in Makkah and Madinah — and return home spiritually fulfilled.",
    },
  ];

  const packages = [
    {
      img: umrahImage,
      tier: "Economy",
      title: "Economy Umrah Package",
      subtitle: "Essential services for a reverent pilgrimage",
      price: "₹65,000",
      badge: null,
      highlights: [
        "Accommodation: 800m–1.5km from Haram",
        "Economy class return flights",
        "Standard AC coach transfers",
        "Daily breakfast included",
        "Umrah visa processing",
        "7-day package",
        "Group Mutawwif guide",
        "Ziyarat in Makkah & Madinah",
      ],
      pkgKey: "Economy Umrah Package",
      color: "border-emerald-200",
      badgeColor: "",
    },
    {
      img: umrah2Image,
      tier: "Standard",
      title: "Standard Umrah Package",
      subtitle: "The most popular choice — comfort and proximity",
      price: "₹85,000",
      badge: "Most Popular",
      highlights: [
        "Accommodation: 300m–800m from Haram",
        "Economy class return flights",
        "Private AC vehicle transfers",
        "Daily breakfast & dinner",
        "Umrah visa processing",
        "14-day package",
        "Dedicated group scholar guide",
        "Full Ziyarat in Makkah & Madinah",
        "Travel insurance included",
      ],
      pkgKey: "Standard Umrah Package",
      color: "border-yellow-400 shadow-yellow-100",
      badgeColor: "bg-yellow-500 text-black",
    },
    {
      img: umrah3Image,
      tier: "VIP",
      title: "VIP Umrah Package",
      subtitle: "Luxury, proximity, and exclusive care",
      price: "₹1,25,000",
      badge: "Premium",
      highlights: [
        "5-star hotel within 50m–200m of Haram",
        "Business class or premium economy flights",
        "Private vehicle with dedicated driver",
        "All meals — breakfast, lunch & dinner",
        "Umrah visa — priority processing",
        "21-day package",
        "Private scholar for your group only",
        "Exclusive Ziyarat with private transport",
        "Comprehensive travel insurance",
        "VIP lounge access at airport",
      ],
      pkgKey: "VIP Umrah Package",
      color: "border-emerald-700 shadow-emerald-100",
      badgeColor: "bg-emerald-700 text-white",
    },
  ];

  const testimonials = [
    {
      name: "Haji Syed Rahmatullah",
      pkg: "VIP Umrah Package",
      quote: "Alhamdulillah. Everything was perfectly arranged — the hotel was steps from Haram, the scholar guided us beautifully through every ritual, and the team was always reachable. May Allah reward the Goimomi family.",
      emoji: "🕌",
    },
    {
      name: "Fatima & Family (Group of 12)",
      pkg: "Standard Umrah Package",
      quote: "We travelled with parents aged 74 and 78. The team arranged wheelchair assistance, ground floor rooms, and ensured our elders were comfortable throughout. The care they showed was truly exceptional.",
      emoji: "🤲",
    },
    {
      name: "Ibrahim Anwari",
      pkg: "Economy Umrah Package",
      quote: "First Umrah, and I was nervous about the rituals. Our Mutawwif guide explained everything with patience and knowledge. The visa was processed in just 8 days. Went with zero worries, returned with a full heart.",
      emoji: "☪️",
    },
  ];

  const faqs = [
    {
      q: "How long does Umrah visa processing take?",
      a: "Umrah visas typically take 7–15 business days from the date of complete document submission. Our documentation team submits on your behalf, tracks progress daily, and keeps you updated. We recommend applying at least 6 weeks before your intended travel date.",
    },
    {
      q: "What documents are required for an Umrah visa?",
      a: "The standard requirements include a valid passport (minimum 6 months validity), recent photographs, confirmed flight tickets, hotel booking confirmation, Mahram relationship proof for women under 45, vaccination certificates (Meningitis & COVID), and a signed application form. Our team provides a complete checklist and assists at every step.",
    },
    {
      q: "Can elderly or differently-abled pilgrims travel safely?",
      a: "Absolutely. We have extensive experience arranging Umrah for senior pilgrims. We arrange wheelchair assistance at airports, ground floor room allocations, transport with accessible vehicles, and ensure the group pace suits everyone. Our coordinator stays attentive to the needs of all pilgrims throughout.",
    },
    {
      q: "Are group discounts available for large families?",
      a: "Yes. Groups of 10 or more pilgrims receive preferential rates on accommodation, ground transport, and we negotiate preferred fares with airlines. Corporate or mosque group bookings (20+) receive additional custom pricing — please contact us to discuss your group requirements.",
    },
    {
      q: "What is included in the Ziyarat tour?",
      a: "Our Ziyarat program in Makkah includes visits to Masjid Al-Haram, Jabal Al-Nour, Jabal Thawr, Masjid Al-Jinn, and Mina. In Madinah, we visit Masjid An-Nabawi, Masjid Quba, Masjid Al-Qiblatayn, Masjid Al-Ghamama, Jannat Al-Baqi, and Jabal Uhud. All visits are conducted with scholarly commentary.",
    },
  ];

  return (
    <div className="w-full overflow-hidden bg-slate-50">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[90vh] bg-cover bg-center flex flex-col items-center justify-center text-white overflow-hidden"
        style={{ backgroundImage: `url(${umrahImage})` }}
      >
        {/* bottom-to-top dark gradient so image is visible at top, text readable at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        {/* top vignette for logo area */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="relative z-10 text-center px-4 max-w-5xl"
        >
          {/* Arabic Bismillah decorative text */}
          <p className="text-yellow-400 text-2xl mb-4 font-arabic tracking-widest opacity-80">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</p>

          <div className="flex items-center justify-center gap-3 text-yellow-400 mb-5">
            <div className="w-12 h-[2px] bg-yellow-400" />
            <span className="text-[11px] uppercase tracking-[0.5em] font-black">Trusted Umrah Specialist — Since 2010</span>
            <div className="w-12 h-[2px] bg-yellow-400" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.85] mb-5 drop-shadow-2xl">
            YOUR BLESSED
            <br />
            <span className="text-white/40 drop-shadow-lg">UMRAH JOURNEY</span>
          </h1>

          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Perform the sacred pilgrimage of Umrah with complete peace of mind — from Umrah visa to Haram-side hotel,
            from Tawaf guidance to Ziyarat tours. Goimomi handles every worldly detail so you can focus on your ibadah.
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-5 mb-10">
            {["100% Visa Success", "Scholar-Led Guidance", "Hotels Near Haram", "24/7 On-Ground Team"].map(b => (
              <div key={b} className="flex items-center gap-1.5 text-green-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{b}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="umrah-hero-cta"
              onClick={() => openForm()}
              className="px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[11px] uppercase tracking-[0.25em] rounded-sm shadow-2xl transition-all flex items-center gap-3"
            >
              PLAN MY UMRAH
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="tel:+918110082222"
              className="px-10 py-4 bg-transparent border-2 border-white/20 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-sm hover:bg-white/10 transition-all"
            >
              📞 +91 8110082222
            </a>
          </div>
        </motion.div>
      </section>

      {/* ─── STATS STRIP ─────────────────────────────────────────────────── */}
      <div className="bg-green-900 py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-4xl font-black italic tracking-tighter text-yellow-400">{s.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-green-300 font-bold mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── WHY CHOOSE GOIMOMI UMRAH (DARK) ─────────────────────────────── */}
      <section className="py-24 px-6 bg-green-950 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-green-800/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-yellow-400 font-black">Trusted Specialists</span>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none mt-2 mb-4">
              Why Perform Umrah <br /><span className="text-yellow-400">With Goimomi?</span>
            </h2>
            <p className="max-w-2xl mx-auto text-green-300 text-sm leading-relaxed">
              Umrah is one of the most sacred acts of worship. Arranging it with a specialist — not a generic travel portal —
              ensures every part of your journey is managed with the reverence, precision, and care it deserves.
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
                className="p-7 rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-400/40 hover:bg-white/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 mb-5 group-hover:bg-yellow-500 group-hover:text-black transition-all">
                  {item.icon}
                </div>
                <h3 className="text-base font-bold uppercase tracking-tight text-white mb-2">{item.title}</h3>
                <p className="text-green-300 text-[13px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PACKAGE HIGHLIGHTS ──────────────────────────────────────────── */}
      <section className="py-24 bg-green-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-green-800 font-black">What's Included</span>
            <h2 className="text-3xl md:text-4xl font-black text-green-900 uppercase italic tracking-tighter leading-none mt-2">
              Umrah Package <span className="text-yellow-600">Highlights</span>
            </h2>
            <p className="text-gray-600 text-sm mt-3 max-w-lg mx-auto">
              Comprehensive care for your sacred pilgrimage — spiritually, physically, and logistically.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-7 max-w-6xl mx-auto">
            {/* Package Features */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="border-2 border-yellow-400 rounded-2xl p-8 bg-white hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shrink-0">
                  <FaRegHeart className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-black text-green-900 uppercase tracking-tight">Core Package Features</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Flexible durations — 7, 14, or 21-day packages",
                  "Premium accommodation near Masjid Al-Haram",
                  "Direct or connecting flights with leading airlines",
                  "Personal Mutawwif scholar for ritual guidance",
                  "Private AC transportation throughout",
                  "Fast-track Umrah visa processing",
                  "Daily meals covered (breakfast & dinner minimum)",
                  "Complete Makkah & Madinah Ziyarat tours",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-gray-700 text-sm">
                    <FaCheckCircle className="text-yellow-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Additional Services */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="border-2 border-green-400 rounded-2xl p-8 bg-white hover:shadow-xl transition-all"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center shrink-0">
                  <FaShieldAlt className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-black text-green-900 uppercase tracking-tight">Additional Services</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "24/7 on-ground coordinator in Makkah & Madinah",
                  "Group & individual customized packages",
                  "Tawaf & Sa'ee guidance with scholar commentary",
                  "Shopping accompaniment & local assistance",
                  "Madinah ziyarat with private transport",
                  "Zamzam water & pilgrimage kit provided",
                  "Medical referral support & first aid coordination",
                  "Pre-departure Umrah orientation session",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-gray-700 text-sm">
                    <FaCheckCircle className="text-green-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── OUR PACKAGES ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-green-800 font-black">Choose Your Package</span>
            <h2 className="text-3xl md:text-4xl font-black text-green-900 uppercase italic tracking-tighter leading-none mt-2">
              Our Umrah <span className="text-yellow-600">Package Tiers</span>
            </h2>
            <p className="text-gray-600 text-sm mt-3 max-w-lg mx-auto">
              From affordable economy packages to VIP luxury — every tier ensures a spiritually complete and comfortable pilgrimage.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {packages.map((pkg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`border-2 ${pkg.color} rounded-2xl overflow-hidden bg-green-50 hover:shadow-2xl transition-all flex flex-col`}
              >
                <div className="relative h-56 overflow-hidden">
                  <img src={pkg.img} alt={pkg.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {pkg.badge && (
                    <div className={`absolute top-3 right-3 ${pkg.badgeColor} text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest`}>
                      {pkg.badge}
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4">
                    <span className="text-white/60 text-[9px] font-black uppercase tracking-widest">{pkg.tier} Tier</span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-black text-green-900 uppercase tracking-tight mb-1">{pkg.title}</h3>
                  <p className="text-gray-500 text-[12px] mb-4 italic">{pkg.subtitle}</p>

                  <div className="space-y-2 mb-5 flex-1">
                    {pkg.highlights.map((h, j) => (
                      <div key={j} className="flex items-start gap-2 text-gray-700 text-[13px]">
                        <FaCheckCircle className="text-green-600 mt-0.5 shrink-0 text-[11px]" />
                        {h}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-green-100 pt-4 mb-5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Starting From</p>
                    <p className="text-3xl font-black text-green-800 tracking-tight">{pkg.price}<span className="text-sm font-bold text-gray-400 ml-1">/ Person</span></p>
                  </div>

                  <button
                    onClick={() => openForm(pkg.pkgKey)}
                    className="w-full bg-green-800 hover:bg-green-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                  >
                    BOOK {pkg.tier.toUpperCase()} PACKAGE
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES GRID ───────────────────────────────────────────────── */}
      <section className="py-24 bg-green-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-green-800 font-black">End-to-End Care</span>
            <h2 className="text-3xl md:text-4xl font-black text-green-900 uppercase italic tracking-tighter leading-none mt-2">
              Our Umrah <span className="text-yellow-600">Services</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[
              { icon: <FaPlane className="text-5xl text-green-800" />, title: "Flight Arrangements", desc: "Group-coordinated direct and connecting flights from major Indian cities with preferred airline rates." },
              { icon: <FaHotel className="text-5xl text-green-800" />, title: "Haram-Side Hotels", desc: "Pre-negotiated accommodation from 50m to 1.5km from Masjid Al-Haram — across all budget tiers." },
              { icon: <FaShieldHalved className="text-5xl text-green-800" />, title: "Visa & Documentation", desc: "Complete Umrah visa processing — from document collection to application submission and approval tracking." },
              { icon: <FaRegHeart className="text-5xl text-green-800" />, title: "Religious Guidance", desc: "Experienced Mutawwif scholars lead your rituals with knowledge, patience, and spiritual care." },
            ].map((svc, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-8 bg-white rounded-2xl border border-green-100 hover:border-yellow-400 hover:shadow-lg transition-all text-center group"
              >
                <div className="mb-4 flex justify-center group-hover:scale-110 transition-transform">{svc.icon}</div>
                <h3 className="text-base font-black text-green-900 uppercase tracking-tight mb-2">{svc.title}</h3>
                <p className="text-gray-600 text-[13px] leading-relaxed">{svc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW WE PLAN YOUR UMRAH ──────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-green-800 font-black">Our Process</span>
            <h2 className="text-3xl md:text-4xl font-black text-green-900 uppercase italic tracking-tighter leading-none mt-2">
              From Inquiry to <span className="text-yellow-600">Blessed Return</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {journeySteps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative flex flex-col items-start p-7 rounded-2xl bg-green-50 border border-green-100 hover:border-yellow-400 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-4xl font-black italic text-green-100 group-hover:text-yellow-100 transition-colors">{s.step}</span>
                  <div className="w-11 h-11 rounded-xl bg-green-800 flex items-center justify-center text-white group-hover:bg-yellow-500 group-hover:text-black transition-all">
                    {s.icon}
                  </div>
                </div>
                <h3 className="text-base font-bold text-green-900 uppercase tracking-tight mb-2">{s.title}</h3>
                <p className="text-gray-600 text-[13px] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-green-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-green-800 font-black">Pilgrim Stories</span>
            <h2 className="text-3xl md:text-4xl font-black text-green-900 uppercase italic tracking-tighter leading-none mt-2">
              Trusted by Thousands of <span className="text-yellow-600">Pilgrims</span>
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
                className="bg-white rounded-2xl p-8 border border-green-100 hover:border-yellow-400 hover:shadow-xl transition-all flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-green-800 bg-green-50 border border-green-200 rounded-full px-3 py-1">{t.pkg}</span>
                </div>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-green-50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-black text-green-900">{t.name}</p>
                    <p className="text-[11px] text-gray-400 font-medium">{t.pkg}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-green-800 font-black">Common Questions</span>
            <h2 className="text-3xl md:text-4xl font-black text-green-900 uppercase italic tracking-tighter leading-none mt-2">
              Umrah Planning <span className="text-yellow-600">FAQs</span>
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
                className="bg-green-50 rounded-2xl border border-green-100 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-7 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-bold text-green-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-green-800 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-7 pb-6 text-gray-600 text-[13px] leading-relaxed border-t border-green-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────────────────────── */}
      <section
        className="py-28 text-white text-center bg-cover bg-center relative overflow-hidden"
        style={{ backgroundImage: `url(${umrah3Image})` }}
      >
        <div className="absolute inset-0 bg-green-950" style={{ opacity: 0.96 }} />
        <div className="absolute inset-0 bg-gradient-to-b from-green-950 via-green-950/98 to-green-950" />

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-4xl mx-auto px-6"
        >
          <p className="text-yellow-400 text-2xl mb-3 opacity-80">اللّٰهُمَّ لَبَّيْكَ عُمْرَةً</p>
          <span className="text-[10px] uppercase tracking-[0.5em] text-yellow-400 font-black">Begin Your Sacred Journey</span>
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none mt-2 mb-4">
            May Allah Accept <br /><span className="text-yellow-400">Your Umrah</span>
          </h2>
          <p className="text-green-200 text-sm max-w-xl mx-auto mb-10 leading-relaxed">
            Let Goimomi handle all the worldly arrangements — from visa to hotel, from flights to Ziyarat — so your
            heart and mind remain focused only on your ibadah and connection with Allah.
          </p>

          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {[
              { icon: <FaPhoneAlt className="text-yellow-400 text-4xl mx-auto mb-3" />, title: "Call Us", info: "+91 8110082222" },
              { icon: <FaUsers className="text-yellow-400 text-4xl mx-auto mb-3" />, title: "Group Bookings", info: "Special Discounts" },
              { icon: <FaShieldAlt className="text-yellow-400 text-4xl mx-auto mb-3" />, title: "Secure Booking", info: "Safe & Transparent" },
            ].map((card, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md p-7 rounded-2xl border border-white/10 hover:bg-white/15 transition-all">
                {card.icon}
                <h3 className="font-black text-white text-base uppercase tracking-tight">{card.title}</h3>
                <p className="text-yellow-400 font-bold text-sm mt-1">{card.info}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="umrah-cta-plan"
              onClick={() => openForm()}
              className="w-full sm:w-64 px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-2xl rounded-sm"
            >
              PLAN MY UMRAH
            </button>
            <a
              href="tel:+918110082222"
              className="w-full sm:w-64 px-8 py-4 bg-transparent border-2 border-white/20 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all rounded-sm text-center"
            >
              📞 CALL US NOW
            </a>
          </div>
        </motion.div>
      </section>

      <ZohoCustomizedForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={{ packageType: selectedPackage }}
      />
    </div>
  );
};

export default CustomizedUmrah;



