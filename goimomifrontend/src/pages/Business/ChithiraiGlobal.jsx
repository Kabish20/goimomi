import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Facebook,
  Globe2,
  Handshake,
  Instagram,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  Network,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import emailjs from "emailjs-com";
import api from "../../api";
import usePageSEO from "../../hooks/usePageSEO";

import chithiraiLogo from "../../assets/Chithirai/chithirai-logo-hd.png";
import goimomiLogo from "../../assets/goimomilogo.png";
import heroImage from "../../assets/Chithirai/chithirai-global-hero.png";
import yelagiriImage from "../../assets/Chithirai/Journeys/yelagiri-bleisure.png";
import sriLankaImage from "../../assets/Chithirai/Journeys/sri-lanka-bleisure.png";
import dubaiImage from "../../assets/Chithirai/Journeys/dubai.png";
import pondicherryImage from "../../assets/Chithirai/Journeys/pondicherry-bleisure.png";
import collaborationImage from "../../assets/Home/BusinessHeader/home-business-03.png";

const regions = [
  "Tamil Nadu",
  "Puducherry",
  "Gulf Countries",
  "Far East",
  "United States",
  "Sri Lanka",
  "West Africa",
  "Europe",
];

const pillars = [
  {
    icon: <Network className="h-6 w-6" />,
    title: "Trusted networking",
    description:
      "Meet business owners, founders, professionals and partners through a relationship-first community.",
  },
  {
    icon: <Globe2 className="h-6 w-6" />,
    title: "Global market access",
    description:
      "Find warm introductions and practical connections that help local ideas travel across borders.",
  },
  {
    icon: <Handshake className="h-6 w-6" />,
    title: "Meaningful collaboration",
    description:
      "Turn conversations into partnerships, referrals, knowledge exchange and shared opportunities.",
  },
  {
    icon: <Lightbulb className="h-6 w-6" />,
    title: "Growth support",
    description:
      "Move from ideation to expansion with a network that understands Tamil ambition and global business.",
  },
];

const memberTypes = [
  "Tamil entrepreneurs and founders",
  "Established business owners",
  "Professionals and advisors",
  "Importers, exporters and trade partners",
  "Aspiring entrepreneurs with a strong idea",
  "Tamil businesses ready to expand globally",
];

const journey = [
  {
    number: "01",
    title: "Travel",
    description: "Meet people who share your roots, ambition and appetite for new possibilities.",
  },
  {
    number: "02",
    title: "Connect",
    description: "Exchange knowledge, business stories and the practical lessons behind your journey.",
  },
  {
    number: "03",
    title: "Collaborate",
    description: "Discover trusted partners, referrals and ideas that create value on both sides.",
  },
  {
    number: "04",
    title: "Grow global",
    description: "Use the strength of the network to take your business into new markets with confidence.",
  },
];

const upcomingJourneys = [
  {
    location: "Yelagiri",
    date: "18–20 September 2026",
    type: "Community retreat",
    image: yelagiriImage,
    path: "/chithirai-global/yelagiri",
    description: "Step away from the everyday for a refreshing hill retreat filled with conversations, ideas and meaningful connections.",
    accent: "from-emerald-950/90",
  },
  {
    location: "Sri Lanka",
    date: "22–24 October 2026",
    type: "Island connection",
    image: sriLankaImage,
    path: "/chithirai-global/sri-lanka",
    description: "Bring business relationships into a new setting with a relaxed island journey designed for discovery and connection.",
    accent: "from-[#123a3b]/90",
  },
  {
    location: "Dubai",
    date: "21–22 November 2026",
    type: "Global business circle",
    image: dubaiImage,
    path: "/chithirai-global/dubai",
    registrationName: "International Business Mission Dubai",
    description: "Meet the energy of a global city and open the door to new conversations, partnerships and possibilities.",
    accent: "from-[#201914]/90",
  },
  {
    location: "Pondicherry",
    date: "17–19 December 2026",
    type: "Coastal business retreat",
    image: pondicherryImage,
    path: "/chithirai-global/pondicherry",
    registrationName: "ScaleX Pondicherry",
    description: "Take business conversations to the coast with a relaxed Pondicherry journey filled with seaside moments, shared ideas and new connections.",
    accent: "from-[#3a2118]/90",
  },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Chithirai-Global/100063718911995/?sk=about",
    icon: <Facebook className="h-4 w-4" />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/chithirai_biz/",
    icon: <Instagram className="h-4 w-4" />,
  },
];

const ChithiraiGlobal = () => {
  const location = useLocation();
  const [formStatus, setFormStatus] = useState("idle");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState("Chithirai Global");

  const handleOpenRegistration = (event, journeyName = "Chithirai Global") => {
    event?.preventDefault();
    setFormStatus("idle");
    if (typeof journeyName === "string" && journeyName) {
      setSelectedJourney(journeyName);
    }
    setIsRegistrationOpen(true);
  };

  const handleCloseRegistration = () => {
    if (formStatus !== "sending") {
      setIsRegistrationOpen(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("register") === "1") {
      const jParam = params.get("journey");
      if (jParam) {
        setSelectedJourney(jParam);
      }
      setIsRegistrationOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (!isRegistrationOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && formStatus !== "sending") {
        setIsRegistrationOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [formStatus, isRegistrationOpen]);

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();
    setFormStatus("sending");
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      full_name: (formData.get("fullName") || "").trim(),
      company_name: (formData.get("companyName") || "").trim(),
      phone: (formData.get("phone") || "").trim(),
      email: (formData.get("email") || "").trim(),
      whatsapp_number: (formData.get("whatsappNumber") || "").trim(),
      journey: selectedJourney || formData.get("journey") || "Chithirai Global",
      contacting_for: formData.get("contactingFor") || `${selectedJourney} Journey Registration`,
      message: formData.get("message") || `Interested in an upcoming ${selectedJourney} journey.`,
    };

    try {
      // 1. Store details into backend database
      await api.post("/api/business-journey-registrations/", payload);

      // 2. EmailJS notification as backup
      try {
        await emailjs.sendForm("service_x3a6b6q", "template_5n2g5an", form, "2ijCA8UT7XinXqIXE");
      } catch (mailErr) {
        console.warn("EmailJS notification error (backend record saved successfully):", mailErr);
      }

      setFormStatus("success");
      form.reset();
    } catch (err) {
      console.error("Error saving registration to backend:", err);
      // Fallback: if backend had temporary error, try EmailJS
      try {
        await emailjs.sendForm("service_x3a6b6q", "template_5n2g5an", form, "2ijCA8UT7XinXqIXE");
        setFormStatus("success");
        form.reset();
      } catch (mailFallbackErr) {
        console.error("EmailJS fallback also failed:", mailFallbackErr);
        setFormStatus("error");
      }
    }
  };

  usePageSEO(
    "Chithirai Global | Global Networking for Tamil Businesses",
    "Meet Chithirai Global, a trusted network for Tamil entrepreneurs and professionals, with curated journeys, partnerships and global business opportunities.",
    heroImage,
    "Chithirai Global, Tamil business community, Tamil entrepreneurs, global business networking, business collaboration, Goimomi Business, chithiraibiz.com"
  );

  return (
    <div className="w-full overflow-hidden bg-[#fbfcfa] text-slate-800">
      {/* Hero */}
      <section className="relative isolate min-h-[650px] overflow-hidden bg-[#071d17] text-white md:min-h-[720px]">
        <img
          src={heroImage}
          alt="Business leaders collaborating around a table"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#061914_0%,rgba(6,25,20,.96)_27%,rgba(6,25,20,.72)_54%,rgba(6,25,20,.16)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(6,25,20,.88),transparent_55%)]" />
        <div className="absolute -right-24 top-16 -z-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="absolute left-0 right-0 top-0 z-10 border-b border-white/15 bg-[#061914]/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5 md:px-10">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white bg-white p-1 shadow-[0_6px_24px_rgba(0,0,0,.3)] md:h-16 md:w-16">
                <img src={chithiraiLogo} alt="Chithirai Global" className="h-full w-full object-contain" loading="eager" decoding="sync" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-white md:text-base">Chithirai Global</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.25em] text-emerald-200 md:text-[10px]">Business community</p>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/60">Travel partner</span>
              <div className="rounded-xl bg-white px-2.5 py-1.5 shadow-lg">
                <img src={goimomiLogo} alt="Goimomi Holidays" className="h-9 w-auto object-contain md:h-10" loading="eager" decoding="sync" />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex min-h-[650px] max-w-7xl items-center px-6 py-24 md:min-h-[720px] md:px-10">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3 text-emerald-300">
              <span className="h-px w-10 bg-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.42em]">Chithirai Global Community</span>
            </div>
            <h1 className="max-w-xl text-5xl font-black uppercase leading-[0.94] tracking-[-0.06em] sm:text-6xl md:text-8xl">
              Local roots.
              <span className="block text-emerald-300">Global possibilities.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate-200 md:text-lg">
              A connected community for Tamil entrepreneurs, professionals and business leaders who believe the right relationship can take a great idea anywhere.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/contactus"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-7 py-3.5 text-sm font-black uppercase tracking-wider text-[#062016] hover:-translate-y-1 hover:bg-emerald-300 hover:shadow-xl"
              >
                Start a conversation <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/918110082222"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-black uppercase tracking-wider text-white hover:-translate-y-1 hover:border-emerald-300 hover:bg-white/10"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp us
              </a>
            </div>

            <div className="mt-14 grid max-w-lg grid-cols-2 gap-5 border-t border-white/20 pt-6 sm:grid-cols-4">
              {["Travel", "Connect", "Collaborate", "Grow"].map((item) => (
                <div key={item}>
                  <p className="text-sm font-black uppercase tracking-wider text-white">{item}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-emerald-200">Together</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-7 right-6 hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/50 lg:flex">
          <span className="h-px w-8 bg-white/40" />
          Build beyond borders
        </div>
      </section>

      {/* Partnership */}
      <section className="border-b border-slate-200 bg-white px-6 py-12 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-700">A partnership that moves with you</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-950 md:text-3xl">Chithirai Global × Goimomi Holidays</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">Chithirai builds the business relationships. Goimomi Holidays takes care of the journey — business travel, group movement, visas, stays and on-ground coordination.</p>
            </div>
          </div>
          <Link to="/businesshome" className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-800 hover:gap-3">Explore travel support <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {/* Upcoming journeys */}
      <section className="bg-[#f1f8f2] px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-700">Meet, travel, grow</span>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.045em] text-slate-950 md:text-6xl">Upcoming journeys</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-600">Curated community journeys for better conversations, stronger relationships and experiences worth remembering.</p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {upcomingJourneys.map((trip) => (
              <article key={trip.location} className="group overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                <div className="relative h-64 overflow-hidden">
                  <img src={trip.image} alt={`${trip.location} journey`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${trip.accent} via-transparent to-transparent`} />
                  <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-900 shadow-lg">
                    <CalendarDays className="h-3.5 w-3.5" /> {trip.date}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">{trip.type}</p>
                    <h3 className="mt-1 text-3xl font-black uppercase tracking-tight">{trip.location}</h3>
                  </div>
                </div>
                <div className="flex min-h-[230px] flex-col p-6">
                  <p className="text-sm leading-7 text-slate-600">{trip.description}</p>
                  <div className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <MapPin className="h-4 w-4 text-emerald-600" /> Chithirai Global community journey
                  </div>
                  {trip.path ? (
                    <Link to={trip.path} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-black uppercase tracking-wider text-emerald-800 hover:gap-3">
                      View itinerary <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button type="button" onClick={(event) => handleOpenRegistration(event, trip.registrationName || trip.location)} className="mt-auto inline-flex items-center gap-2 pt-6 text-left text-sm font-black uppercase tracking-wider text-emerald-800 hover:gap-3">
                      Register interest <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div
            id="journey-register"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journey-register-title"
            className={isRegistrationOpen ? "fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#061914]/75 p-4 backdrop-blur-sm sm:p-6" : "hidden"}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) handleCloseRegistration();
            }}
          >
            <div className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-2xl md:p-10">
              <button
                type="button"
                aria-label="Close registration form"
                onClick={handleCloseRegistration}
                disabled={formStatus === "sending"}
                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Send className="h-5 w-5" />
              </div>
              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.38em] text-emerald-700">Save your place</p>
              <h3 id="journey-register-title" className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.04em] text-slate-950 md:text-5xl">Register your interest</h3>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">Share your details and our team will contact you with the journey information, availability and next steps.</p>
              <div className="mt-7 space-y-3 text-xs font-bold text-slate-500">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> One form for all three journeys</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Updates through your preferred number</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Goimomi Holidays travel support available</p>
              </div>
            </div>

            <form onSubmit={handleRegistrationSubmit} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="contactingFor" value="Chithirai Global Journey Registration" readOnly />
              <input type="hidden" name="message" value="Interested in an upcoming Chithirai Global journey." readOnly />
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><UserRound className="h-3.5 w-3.5 text-emerald-600" /> Name</span>
                <input name="fullName" type="text" required placeholder="Your full name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><Building2 className="h-3.5 w-3.5 text-emerald-600" /> Company name</span>
                <input name="companyName" type="text" required placeholder="Your company name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><Phone className="h-3.5 w-3.5 text-emerald-600" /> Mobile</span>
                <input name="phone" type="tel" required placeholder="Mobile number" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><Mail className="h-3.5 w-3.5 text-emerald-600" /> Email</span>
                <input name="email" type="email" required placeholder="you@company.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp number</span>
                <input name="whatsappNumber" type="tel" required placeholder="WhatsApp number for updates" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
              </label>

              {formStatus === "success" && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 sm:col-span-2"><CheckCircle2 className="h-5 w-5" /> Thank you. We will contact you soon.</p>}
              {formStatus === "error" && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 sm:col-span-2">We could not send your registration. Please try again or contact us directly.</p>}

              <button type="submit" disabled={formStatus === "sending"} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60 sm:col-span-2">
                {formStatus === "sending" ? "Sending…" : "Submit registration"}
                {formStatus !== "sending" && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
              </div>
          </div>
        </div>
        </div>
      </section>

      {/* Intro */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3 text-emerald-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">One community. Many possibilities.</span>
            </div>
            <h2 className="max-w-xl text-4xl font-black uppercase leading-none tracking-[-0.045em] text-slate-950 md:text-6xl">
              Business grows
              <span className="block text-emerald-700">through people.</span>
            </h2>
          </div>
          <div className="max-w-2xl lg:pb-1">
            <p className="text-lg leading-8 text-slate-600">
              Chithirai Global is a relationship-led platform for Tamil businesses to find trusted connections, exchange knowledge and open doors to new markets. From exploring an idea to expanding an established business, the community helps members move forward together.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {["Trusted introductions", "Knowledge exchange", "Cross-border partnerships"].map((item) => (
                <span key={item} className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
                  <Check className="mr-1 inline-block h-3.5 w-3.5" /> {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-slate-200 bg-white px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-700">What brings us together</span>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-slate-950 md:text-5xl">A network built for action</h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-slate-500">The strongest networks do more than introduce people. They create momentum, confidence and opportunities that last.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar) => (
              <article key={pillar.title} className="group rounded-3xl border border-slate-100 bg-[#fbfcfa] p-7 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200 hover:shadow-xl">
                <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-700 group-hover:text-white">
                  {pillar.icon}
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-950">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Global reach */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl">
            <img src={collaborationImage} alt="International business meeting" className="h-[440px] w-full object-cover opacity-80 md:h-[520px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061914] via-transparent to-transparent" />
            <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-4 text-white">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.38em] text-emerald-300">From home to everywhere</p>
                <p className="mt-2 max-w-xs text-2xl font-black leading-tight">Your next opportunity may be one introduction away.</p>
              </div>
              <Globe2 className="mb-1 h-10 w-10 shrink-0 text-emerald-300" />
            </div>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-700">A global Tamil network</span>
            <h2 className="mt-3 text-4xl font-black uppercase leading-[.95] tracking-[-0.045em] text-slate-950 md:text-6xl">Rooted in identity.<span className="block text-emerald-700">Open to the world.</span></h2>
            <p className="mt-6 text-base leading-8 text-slate-600">Chithirai Global brings together Tamil business communities across regions, making it easier to feel at home while building relationships beyond borders.</p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {regions.map((region) => (
                <div key={region} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 shadow-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> {region}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who it is for */}
      <section className="bg-[#eaf5ed] px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-800">Built for your next chapter</span>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.04em] text-slate-950 md:text-6xl">There is a place for your ambition.</h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">Whether you are starting, scaling or exploring a new market, bring your questions, experience and curiosity to the room.</p>
            <Link to="/contactus" className="mt-8 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-800 hover:gap-3">
              Find your place in the network <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {memberTypes.map((member, index) => (
              <div key={member} className="flex items-start gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-black text-white">{String(index + 1).padStart(2, "0")}</span>
                <span className="pt-1 text-sm font-bold leading-6 text-slate-700">{member}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="bg-white px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-700">How the community works</span>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.045em] text-slate-950 md:text-6xl">Every connection can become momentum.</h2>
          </div>
          <div className="mt-14 grid gap-0 md:grid-cols-4">
            {journey.map((item, index) => (
              <div key={item.number} className="relative border-l border-emerald-200 pb-10 pl-7 last:pb-0 md:border-l-0 md:border-t md:pb-0 md:pl-0 md:pr-7 md:pt-7">
                <div className="absolute -left-2 top-0 h-4 w-4 rounded-full border-4 border-white bg-emerald-600 md:-top-2 md:left-0" />
                <p className="text-sm font-black tracking-[0.25em] text-emerald-700">{item.number}</p>
                <h3 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-950">{item.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-7 text-slate-500">{item.description}</p>
                {index < journey.length - 1 && <ArrowRight className="absolute bottom-10 right-4 hidden h-5 w-5 text-emerald-300 md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-emerald-900/20 bg-[#08251b] px-6 py-12 text-white md:px-10">
        <div className="mx-auto grid max-w-7xl gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <UsersRound />, title: "People first", text: "Relationships before transactions" },
            { icon: <ShieldCheck />, title: "Built on trust", text: "Connections with purpose" },
            { icon: <BadgeCheck />, title: "Shared progress", text: "Success that moves together" },
            { icon: <Building2 />, title: "Global outlook", text: "Local roots, wider markets" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4">
              <div className="text-emerald-300">{React.cloneElement(item.icon, { className: "h-6 w-6" })}</div>
              <div>
                <p className="text-sm font-black uppercase tracking-wider">{item.title}</p>
                <p className="mt-1 text-xs text-emerald-100/60">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-emerald-400 px-6 py-20 text-[#062016] md:px-10 md:py-28">
        <div className="absolute -right-24 -top-40 h-96 w-96 rounded-full border-[70px] border-white/20" />
        <div className="absolute -bottom-52 -left-24 h-96 w-96 rounded-full border-[55px] border-emerald-600/10" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <span className="text-[10px] font-black uppercase tracking-[0.45em] text-emerald-950/70">Your next connection starts here</span>
            <h2 className="mt-4 text-5xl font-black uppercase leading-[.9] tracking-[-0.055em] md:text-7xl">Ready to take your business global?</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-950/75">Tell us what you are building, where you want to go and the kind of people you want to meet. We will help you take the first step.</p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
            <Link to="/contactus" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#062016] px-7 py-4 text-sm font-black uppercase tracking-wider text-white hover:-translate-y-1 hover:bg-[#0b3425] hover:shadow-xl">
              Connect with us <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/businesshome" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#062016]/30 px-7 py-4 text-sm font-black uppercase tracking-wider text-[#062016] hover:-translate-y-1 hover:bg-white/30">
              Explore business travel
            </Link>
          </div>
        </div>
        <div className="relative mx-auto mt-10 flex max-w-7xl flex-wrap gap-3 border-t border-[#062016]/15 pt-6">
          <span className="mr-2 self-center text-[10px] font-black uppercase tracking-[0.35em] text-emerald-950/60">Follow Chithirai</span>
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#062016]/20 bg-white/20 px-4 py-2 text-xs font-bold text-[#062016] hover:-translate-y-0.5 hover:bg-white/40"
            >
              {social.icon}
              {social.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ChithiraiGlobal;
