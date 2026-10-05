import React from "react";
import { ArrowUpRight, CalendarDays, ChevronRight, Mail, MapPin, PhoneCall, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const contactDetails = {
  email: "hello@goimomi.com",
  phone: "+91 8110082222",
  address: "5, Crescent Park Apartment, Hazrath Sulaiman Street, Kaja Nagar, Trichy - 620020, Tamil Nadu, India",
};

/**
 * Shared Policy Page Layout & Typography Components
 * 
 * Provides consistent semantic hierarchy, sidebar navigation, jump anchors,
 * contact cards, and responsive styling across legal policy documents.
 */
export const PolicySection = ({ id, number, title, children }) => (
  <section id={id} className="scroll-mt-32 border-t border-slate-200 pt-10 first:border-t-0 first:pt-0">
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-[#f0fdf4] px-2 text-[10px] font-black tracking-widest text-[#14532d]">
        {number}
      </span>
      <h2 className="text-xl font-black leading-tight tracking-tight text-slate-950 md:text-2xl">
        {title}
      </h2>
    </div>
    <div className="space-y-4 text-[15px] leading-8 text-slate-600">{children}</div>
  </section>
);

export const PolicyList = ({ items }) => (
  <ul className="space-y-3 pl-5 marker:text-[#e9b343]">
    {items.map((item) => (
      <li key={item} className="pl-2">
        {item}
      </li>
    ))}
  </ul>
);

export const PolicyCallout = ({ title, children, tone = "green" }) => {
  const styles = tone === "gold"
    ? "border-[#e9b343]/40 bg-[#fffaf0] text-[#6f5315]"
    : "border-[#14532d]/15 bg-[#f0fdf4] text-[#245b38]";

  return (
    <div className={`rounded-2xl border p-5 ${styles}`}>
      {title && <p className="mb-1 text-xs font-black uppercase tracking-[0.18em]">{title}</p>}
      <div className="text-sm leading-7">{children}</div>
    </div>
  );
};

export const PolicyContact = ({ subject = "Policy enquiry" }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <a
      href={`mailto:${contactDetails.email}?subject=${encodeURIComponent(subject)}`}
      className="group rounded-2xl border border-slate-200 bg-white p-4 hover:-translate-y-0.5 hover:border-[#14532d]/30 hover:shadow-lg hover:shadow-slate-200/60"
    >
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fdf4] text-[#14532d]">
        <Mail size={17} />
      </span>
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
      <span className="mt-1 block break-all text-sm font-bold text-slate-800 group-hover:text-[#14532d]">{contactDetails.email}</span>
    </a>
    <a
      href={`tel:${contactDetails.phone.replace(/\s/g, "")}`}
      className="group rounded-2xl border border-slate-200 bg-white p-4 hover:-translate-y-0.5 hover:border-[#14532d]/30 hover:shadow-lg hover:shadow-slate-200/60"
    >
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0fdf4] text-[#14532d]">
        <PhoneCall size={17} />
      </span>
      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Travel desk</span>
      <span className="mt-1 block text-sm font-bold text-slate-800 group-hover:text-[#14532d]">{contactDetails.phone}</span>
    </a>
  </div>
);

const PolicyPageLayout = ({
  icon: PageIcon = ShieldCheck,
  eyebrow = "Goimomi Holidays policies",
  title,
  summary,
  lastUpdated = "1 September 2026",
  navigation,
  children,
}) => (
  <div className="min-h-screen bg-[#f7faf8] text-slate-800">
    <section className="relative isolate overflow-hidden bg-[#0d3b22] text-white">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#e9b343]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 left-1/3 h-96 w-96 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#e9b343]/70 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 pt-5 text-xs font-semibold text-white/60">
          <Link to="/" className="hover:text-white">Home</Link>
          <ChevronRight size={13} />
          <span>Policies</span>
          <ChevronRight size={13} />
          <span className="text-white/90">{title}</span>
        </nav>

        <div className="max-w-3xl py-14 md:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f5d47f]">
            {React.createElement(PageIcon, { size: 14 })}
            {eyebrow}
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 md:text-lg">{summary}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-white/65">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={15} className="text-[#e9b343]" />
              Last updated {lastUpdated}
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#e9b343]" />
              Clear, responsible travel terms
            </span>
          </div>
        </div>
      </div>
    </section>

    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:py-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <aside className="lg:sticky lg:top-28">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
          <p className="px-2 pb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">On this page</p>
          <nav aria-label="Policy sections" className="space-y-0.5">
            {navigation.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="block rounded-xl px-2 py-2 text-xs font-bold leading-5 text-slate-600 hover:bg-[#f0fdf4] hover:text-[#14532d]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-4 rounded-2xl bg-[#14532d] p-5 text-white shadow-xl shadow-[#14532d]/15">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f5d47f]">Need help?</p>
          <p className="mt-2 text-sm font-bold leading-6">Our travel desk can explain any booking or policy detail.</p>
          <Link to="/contactus" className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-white hover:text-[#f5d47f]">
            Contact us <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>

      <main className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
        <div className="p-6 md:p-10 lg:p-12">{children}</div>
        <div className="border-t border-slate-200 bg-[#fbfdfb] px-6 py-5 md:px-10 lg:px-12">
          <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-[#14532d]" /> {contactDetails.address}</span>
            <a href={`mailto:${contactDetails.email}`} className="font-bold text-[#14532d] hover:underline">{contactDetails.email}</a>
          </div>
        </div>
      </main>
    </div>
  </div>
);

export default PolicyPageLayout;
