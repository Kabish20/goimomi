import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Bus,
  CalendarDays,
  CheckCircle2,
  Coffee,
  Handshake,
  Hotel,
  MapPin,
  Plane,
  Utensils,
  UsersRound,
} from "lucide-react";
import usePageSEO from "../../hooks/usePageSEO";

import sriLankaImage from "../../assets/Chithirai/Journeys/sri-lanka.png";

const itinerary = [
  {
    day: "DAY 1",
    date: "22 OCT | THURSDAY",
    city: "COLOMBO",
    summary: "Arrive, settle in and start the conversation.",
    activities: [
      { icon: <Plane />, time: "12:00 PM", title: "Arrival at Colombo Airport" },
      { icon: <Hotel />, title: "Check-in to hotel" },
      { icon: <Utensils />, title: "All 3 meals" },
      { icon: <Coffee />, title: "Evening tea & networking" },
      { icon: <UsersRound />, time: "7:00 PM", title: "Business networking meet", detail: "Meet Tamil entrepreneurs in Colombo" },
      { icon: <Handshake />, title: "Dinner & networking" },
      { icon: <BedDouble />, title: "Overnight stay in Colombo" },
    ],
  },
  {
    day: "DAY 2",
    date: "23 OCT | FRIDAY",
    city: "HATTON",
    summary: "Travel through tea country and build new connections.",
    activities: [
      { icon: <Bus />, title: "Check-out after breakfast", detail: "Proceed to Hatton" },
      { icon: <MapPin />, title: "Scenic drive", detail: "Through tea estates & waterfalls" },
      { icon: <Hotel />, title: "Check-in to hotel in Hatton" },
      { icon: <Utensils />, title: "All 3 meals" },
      { icon: <UsersRound />, time: "6:30 PM", title: "Business networking meet", detail: "Meet Tamil entrepreneurs in Hatton" },
      { icon: <Handshake />, title: "Dinner & networking" },
      { icon: <BedDouble />, title: "Overnight stay in Hatton" },
    ],
  },
  {
    day: "DAY 3",
    date: "24 OCT | SATURDAY",
    city: "COLOMBO",
    summary: "Close the journey with memories, ideas and new relationships.",
    activities: [
      { icon: <Utensils />, title: "All 3 meals" },
      { icon: <Hotel />, title: "Check-out after breakfast" },
      { icon: <Bus />, title: "Proceed to Colombo Airport" },
      { icon: <Plane />, title: "Return journey", detail: "With memories & connections" },
    ],
  },
];

const highlights = [
  "3 days / 2 nights",
  "Colombo + Hatton",
  "All 3 meals",
  "Tamil entrepreneur networking",
  "Hotel stays",
  "Scenic tea-country drive",
];

const SriLankaJourney = () => {
  usePageSEO(
    "Sri Lanka Business Journey | Chithirai Global",
    "Explore the Chithirai Global Sri Lanka journey from Colombo to Hatton, with networking meets, scenic drives, meals and hotel stays from 22 to 24 October.",
    sriLankaImage,
    "Chithirai Global Sri Lanka journey, Colombo Hatton itinerary, Tamil entrepreneur networking, Sri Lanka business trip"
  );

  return (
    <div className="w-full overflow-hidden bg-[#f7fbf8] text-slate-800">
      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#08251b] text-white md:min-h-[620px]">
        <img src={sriLankaImage} alt="Sri Lanka tropical coastline" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#061914_0%,rgba(6,25,20,.88)_34%,rgba(6,25,20,.22)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#061914]/90 via-transparent to-transparent" />

        <div className="mx-auto flex min-h-[560px] max-w-7xl items-end px-6 py-16 md:min-h-[620px] md:px-10 md:py-20">
          <div className="max-w-3xl">
            <Link to="/chithirai-global" className="mb-9 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-emerald-200 hover:gap-3">
              <ArrowLeft className="h-4 w-4" /> Back to Chithirai Global
            </Link>
            <div className="flex items-center gap-3 text-emerald-300">
              <span className="h-px w-10 bg-emerald-300" />
              <span className="text-[10px] font-black uppercase tracking-[0.42em]">Chithirai Global Journey</span>
            </div>
            <h1 className="mt-5 text-5xl font-black uppercase leading-[.9] tracking-[-0.055em] sm:text-6xl md:text-8xl">Sri Lanka<span className="block text-emerald-300">Colombo to Hatton</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-100 md:text-lg">Three days of island discovery, Tamil entrepreneur networking and memorable connections across Colombo and Hatton.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-900"><CalendarDays className="h-4 w-4" /> 22–24 October 2026</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><MapPin className="h-4 w-4" /> Colombo + Hatton</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-emerald-100 bg-emerald-50 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-bold text-emerald-950">Joining Global Horizons - Srilanka?</h2><p className="mt-1 text-sm text-slate-600">Share your profile for thoughtful introductions with Tamil entrepreneurs in Colombo.</p></div>
          <Link to="/globalhorizonssrilanka" className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white">Share participant profile</Link>
        </div>
      </section>

      <section className="border-b border-emerald-100 bg-white px-6 py-8 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {highlights.map((highlight) => (
            <div key={highlight} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {highlight}
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-700">The itinerary</span>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.045em] text-slate-950 md:text-6xl">Three days. Two cities. Many connections.</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">Every day balances comfortable travel, local experiences and the conversations that make a Chithirai Global journey special.</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {itinerary.map((day) => (
              <article key={day.day} className="overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-sm">
                <div className="bg-[#08251b] px-6 py-6 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black tracking-[0.35em] text-emerald-300">{day.day}</p>
                      <p className="mt-2 text-xs font-bold tracking-wider text-white/80">{day.date}</p>
                    </div>
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">{day.city}</span>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-slate-200">{day.summary}</p>
                </div>
                <div className="divide-y divide-slate-100 px-6">
                  {day.activities.map((activity) => (
                    <div key={`${day.day}-${activity.title}`} className="flex gap-3 py-4">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        {React.cloneElement(activity.icon, { className: "h-4 w-4" })}
                      </div>
                      <div>
                        {activity.time && <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{activity.time}</p>}
                        <p className="text-sm font-bold leading-5 text-slate-800">{activity.title}</p>
                        {activity.detail && <p className="mt-1 text-xs leading-5 text-slate-500">{activity.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#eaf5ed] px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-9 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-800">Ready for the journey?</span>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.045em] text-slate-950 md:text-6xl">Bring your curiosity. We’ll handle the journey.</h2>
            <p className="mt-5 text-base leading-8 text-slate-600">Register your interest and the Chithirai Global team will share availability, travel details and the next steps.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link to="/chithirai-global?register=1" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-7 py-4 text-sm font-black uppercase tracking-wider text-white hover:-translate-y-1 hover:bg-emerald-800 hover:shadow-xl">Register interest <ArrowRight className="h-4 w-4" /></Link>
            <a href="https://wa.me/918110082222" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-700/30 px-7 py-4 text-sm font-black uppercase tracking-wider text-emerald-900 hover:-translate-y-1 hover:bg-white">WhatsApp us</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SriLankaJourney;
