import React, { useState } from "react";
import { Phone, Mail, Send, Instagram, Facebook, Linkedin, Clock, CheckCircle2, Headphones, BadgeCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { FiMail, FiUser, FiMessageCircle } from "react-icons/fi";
import { motion } from "framer-motion";
import usePageSEO from "../../../hooks/usePageSEO";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import emailjs from "emailjs-com";
import api from "../../../api";

const Contact = () => {
  usePageSEO(
    "Contact Goimomi Holidays | 24/7 Travel Support",
    "Reach out to Goimomi Holidays for expert assistance with holiday packages, VISA consulting, or custom trip planning. Our travel experts are available 24/7 to help you design your perfect journey.",
    null,
    "contact Goimomi Holidays, travel support India, holiday inquiry, visa consultation, trip planning help"
  );

  const [showSuccess, setShowSuccess] = useState(false);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});

  const validateForm = (formData) => {
    const newErrors = {};
    const fullName = formData.get("fullName");
    const email = formData.get("email");
    const contactingFor = formData.get("contactingFor");
    const message = formData.get("message");

    if (!fullName || fullName.trim().length < 3) {
      newErrors.fullName = "Name must be at least 3 characters";
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email address";
    }
    const phoneDigits = (phone || "").replace(/\D/g, "");
    if (!phoneDigits || phoneDigits.length < 10) {
      newErrors.phone = "Phone number must be at least 10 digits";
    } else if (phoneDigits.startsWith("91") && phoneDigits.length !== 12) {
      newErrors.phone = "Exactly 10 digits required after +91";
    }
    if (!contactingFor) {
      newErrors.contactingFor = "Please select an option";
    }
    if (!message || message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    if (!validateForm(formData)) return;

    const fullName = (formData.get("fullName") || "").trim();
    const email = (formData.get("email") || "").trim();
    const contactingFor = formData.get("contactingFor") || "General Enquiry";
    const message = (formData.get("message") || "").trim();

    // 1. Submit to backend API & Zoho CRM Lead
    api.post('/api/enquiry-form/', {
      name: fullName,
      email: email,
      phone: phone,
      destination: contactingFor,
      purpose: `Contact Us Enquiry: ${contactingFor}\nMessage: ${message}`,
      enquiry_type: 'General',
    }).catch((err) => {
      console.warn("Backend enquiry submission notice:", err);
    });

    // 2. EmailJS notification
    emailjs
      .sendForm("service_x3a6b6q", "template_5n2g5an", e.target, "2ijCA8UT7XinXqIXE")
      .then(
        () => {
          setShowSuccess(true);
          setErrors({});
          setPhone("");
          e.target.reset();
        },
        (error) => {
          console.warn("EmailJS notice:", error.text);
          setShowSuccess(true);
          setErrors({});
          setPhone("");
          e.target.reset();
        }
      );
  };

  const offices = [
    {
      icon: "🇮🇳",
      city: "Trichy, India",
      label: "Head Office",
      address: "5, Crescent Park Apartment, Hazrath Sulaiman Street, Kaja Nagar, Trichy – 620020",
    },
    {
      icon: "🇮🇳",
      city: "Mahabubnagar, India",
      label: "Regional Office",
      address: "#5-3-21/5/3, Plot No: 2, Behind Ali's Mart, Z&Z Colony, Raichur Road, Mahabubnagar – 509 001, Telangana",
    },
    {
      icon: "🇸🇦",
      city: "Jeddah, Saudi Arabia",
      label: "Saudi Operations",
      address: "8807, Prince Majid Street, 2104, Al Aziziyah Dist., 23342, Jeddah, Kingdom of Saudi Arabia",
    },
  ];

  const agentPromises = [
    { icon: <Clock className="w-5 h-5" />, title: "Response Within 2 Hours", desc: "Every enquiry submitted is reviewed and responded to within 2 business hours by a named travel consultant." },
    { icon: <Headphones className="w-5 h-5" />, title: "24/7 Support Line", desc: "Our support desk is staffed around the clock — for emergencies, itinerary questions, or last-minute travel changes." },
    { icon: <BadgeCheck className="w-5 h-5" />, title: "No Obligation Consultation", desc: "Every conversation with our team is free and commitment-free. Talk to an expert, get a quote, decide at your pace." },
    { icon: <ShieldCheck className="w-5 h-5" />, title: "Data Privacy Guaranteed", desc: "Your contact information is used only to respond to your enquiry and is never shared with third parties. Ever." },
  ];

  const services = [
    "✈️  Flight Ticketing & Air Packages",
    "🏖️  Customized Holiday Planning",
    "🕌  Umrah & Hajj Packages",
    "🌍  Visa Processing (80+ Countries)",
    "🚢  Cruise Bookings",
    "🚗  Cab & Transfer Services",
    "🏢  Corporate Travel Management",
    "📋  Group & MICE Travel",
  ];

  return (
    <div className="w-full overflow-hidden bg-slate-50">

      {/* ─── SUCCESS POPUP ────────────────────────────────────────────────── */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-10 max-w-sm text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Message Sent!</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Thank you for reaching out. A Goimomi travel expert will get back to you within 2 hours.
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full bg-emerald-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-800 transition"
            >
              CLOSE
            </button>
          </motion.div>
        </div>
      )}

      {/* ─── HERO BANNER ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900 py-20 px-6 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-700/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-900/20 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <div className="flex items-center justify-center gap-3 text-emerald-400 mb-5">
            <div className="w-12 h-[2px] bg-emerald-400" />
            <span className="text-[11px] uppercase tracking-[0.5em] font-black">Talk to a Travel Expert</span>
            <div className="w-12 h-[2px] bg-emerald-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.85] text-white mb-4">
            WE'RE HERE TO
            <br />
            <span className="text-white/25">HELP YOU TRAVEL</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-8">
            Whether you're planning a dream holiday, a pilgrimage, a visa application, or a group trip —
            our certified travel experts are just one message away. No robots, no queues. Real people, real expertise.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {["Response in 2 Hours", "24/7 Support", "Free Consultation", "No Obligation"].map(b => (
              <div key={b} className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider">{b}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── QUICK CONTACT STRIP ──────────────────────────────────────────── */}
      <div className="bg-emerald-700 py-5 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8">
          <a href="tel:+918110082222" className="flex items-center gap-3 text-white group">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-emerald-200 font-black">Call Us Now</p>
              <p className="text-sm font-black">+91 8110082222</p>
            </div>
          </a>
          <div className="w-[1px] h-10 bg-white/20 hidden md:block" />
          <a href="mailto:hello@goimomi.com" className="flex items-center gap-3 text-white group">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-emerald-200 font-black">Email Us</p>
              <p className="text-sm font-black">hello@goimomi.com</p>
            </div>
          </a>
          <div className="w-[1px] h-10 bg-white/20 hidden md:block" />
          <a href="https://wa.me/918110082222" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-white group">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-emerald-200 font-black">WhatsApp</p>
              <p className="text-sm font-black">Chat Instantly</p>
            </div>
          </a>
          <div className="w-[1px] h-10 bg-white/20 hidden md:block" />
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-emerald-200 font-black">Available</p>
              <p className="text-sm font-black">24 / 7 Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT GRID ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-14">

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="space-y-10"
        >
          {/* Intro */}
          <div>
            <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-700 font-black">Your Travel Experts</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mt-2 mb-4">
              Get in <span className="text-emerald-700">Touch</span>
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              The Goimomi team is more than a booking desk — we're experienced travel consultants who understand every
              detail of a great journey. Reach us through any channel and a real expert will respond, personally.
            </p>
          </div>

          {/* Services We Handle */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-7">
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 mb-4">We Can Help You With</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {services.map((svc, i) => (
                <div key={i} className="text-[12px] text-slate-600 font-medium">{svc}</div>
              ))}
            </div>
          </div>

          {/* Office Locations */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 mb-4">Our Offices</h3>
            <div className="space-y-4">
              {offices.map((office, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  <div className="text-2xl mt-0.5 shrink-0">{office.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-slate-900">{office.city}</p>
                      <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{office.label}</span>
                    </div>
                    <p className="text-[12px] text-slate-500 leading-relaxed">{office.address}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Agent Promises */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 mb-4">Our Commitment to You</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agentPromises.map((p, i) => (
                <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-emerald-200 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
                    {p.icon}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight text-slate-900 mb-1">{p.title}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 mb-4">Follow Us</h3>
            <div className="flex gap-3">
              {[
                { icon: <Instagram className="w-5 h-5" />, label: "Instagram", href: "https://instagram.com/goimomi" },
                { icon: <Facebook className="w-5 h-5" />, label: "Facebook", href: "https://facebook.com/goimomi" },
                { icon: <Linkedin className="w-5 h-5" />, label: "LinkedIn", href: "https://linkedin.com/company/goimomi" },
              ].map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white hover:bg-emerald-700 transition-all"
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT PANEL — FORM ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          {/* Form card */}
          <div className="bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
            {/* Card header */}
            <div className="bg-slate-900 px-8 py-6">
              <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-400 font-black">Free Consultation</span>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mt-1">Send Us a Message</h3>
              <p className="text-slate-400 text-[12px] mt-1">A named travel expert will respond within 2 hours.</p>
            </div>

            <div className="p-8">
              <form className="space-y-5" onSubmit={handleSubmit}>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Full Name *</label>
                  <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-2.5 focus-within:ring-4 focus-within:ring-emerald-700/5 focus-within:border-emerald-700 transition-all ${errors.fullName ? "border-red-400" : "border-slate-200"}`}>
                    <FiUser className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      name="fullName"
                      className="w-full outline-none text-slate-800 text-sm bg-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.fullName && <p className="text-red-500 text-[10px] mt-1">{errors.fullName}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Email Address *</label>
                  <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-2.5 focus-within:ring-4 focus-within:ring-emerald-700/5 focus-within:border-emerald-700 transition-all ${errors.email ? "border-red-400" : "border-slate-200"}`}>
                    <FiMail className="text-slate-400 shrink-0" />
                    <input
                      type="email"
                      name="email"
                      className="w-full outline-none text-slate-800 text-sm bg-transparent"
                      placeholder="you@example.com"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-[10px] mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Phone Number *</label>
                  <PhoneInput
                    country={"in"}
                    value={phone}
                    onChange={(phone) => setPhone(phone)}
                    inputProps={{ name: "phone", required: true }}
                    containerClass="!w-full"
                    inputClass={`!w-full !outline-none !text-slate-800 !text-sm !h-[44px] !border-2 !rounded-xl focus-within:!ring-4 focus-within:!ring-emerald-700/5 focus-within:!border-emerald-700 !transition-all ${errors.phone ? "!border-red-400" : "!border-slate-200"}`}
                    buttonClass="!bg-transparent !border-2 !border-slate-200 !rounded-l-xl"
                  />
                  {errors.phone && <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>}
                </div>

                {/* Contacting For */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">I'm Enquiring About *</label>
                  <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-2.5 focus-within:ring-4 focus-within:ring-emerald-700/5 focus-within:border-emerald-700 transition-all ${errors.contactingFor ? "border-red-400" : "border-slate-200"}`}>
                    <select
                      name="contactingFor"
                      className="w-full outline-none text-slate-800 text-sm bg-transparent"
                    >
                      <option value="">Select a service</option>
                      <option value="Visa">Visa Processing</option>
                      <option value="Tour Package">Tour Package</option>
                      <option value="Umrah">Umrah Package</option>
                      <option value="Hajj">Hajj Package</option>
                      <option value="Group Ticket">Group Ticket</option>
                      <option value="Passport Assistance">Passport Assistance</option>
                      <option value="Insurance">Travel Insurance</option>
                      <option value="Cruise">Cruise Package</option>
                      <option value="Cab Transfer">Cab / Transfer</option>
                      <option value="Corporate Travel">Corporate Travel</option>
                      <option value="Feedback">Feedback</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {errors.contactingFor && <p className="text-red-500 text-[10px] mt-1">{errors.contactingFor}</p>}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Your Message *</label>
                  <div className={`flex items-start gap-2 border-2 rounded-xl px-4 py-2.5 focus-within:ring-4 focus-within:ring-emerald-700/5 focus-within:border-emerald-700 transition-all ${errors.message ? "border-red-400" : "border-slate-200"}`}>
                    <FiMessageCircle className="text-slate-400 mt-1 shrink-0" />
                    <textarea
                      rows="4"
                      name="message"
                      className="w-full outline-none text-slate-800 text-sm resize-none bg-transparent"
                      placeholder="Tell us about your travel plans, destination, dates, group size, or any specific requirements..."
                    />
                  </div>
                  {errors.message && <p className="text-red-500 text-[10px] mt-1">{errors.message}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  id="contact-submit-btn"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 rounded-xl transition-all shadow-xl text-[10px] uppercase tracking-[0.25em] flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  SEND MY MESSAGE
                </button>

                <p className="text-center text-[10px] text-slate-400 font-medium">
                  🔒 Your information is private and secure. We'll never spam you.
                </p>
              </form>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── MAP / CLOSING STRIP ──────────────────────────────────────────── */}
      <div className="bg-slate-900 py-14 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <span className="text-[10px] uppercase tracking-[0.5em] text-emerald-400 font-black">We'd Love to Hear from You</span>
          <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-none mt-2 mb-4">
            Start Planning Your <span className="text-emerald-400">Journey Today</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mb-8 leading-relaxed">
            Every great journey starts with a conversation. Whether you know exactly where you want to go or you're still exploring ideas —
            we're here to listen, advise, and design the perfect trip for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:+918110082222"
              className="w-full sm:w-auto px-10 py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl rounded-sm"
            >
              📞 CALL US NOW
            </a>
            <a
              href="https://wa.me/918110082222"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-10 py-4 bg-transparent border-2 border-white/20 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all rounded-sm"
            >
              💬 WHATSAPP US
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;



