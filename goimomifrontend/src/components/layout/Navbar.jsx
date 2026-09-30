import React, { useRef, useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Building2, Plane } from 'lucide-react';
import logo from '../../assets/goimomilogo.png'
import AdminLogin from '../../pages/General/AdminLogin/AdminLogin.jsx'

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopHoliday, setDesktopHoliday] = useState(false)
  const [mobileHoliday, setMobileHoliday] = useState(false)
  const [desktopUmrah, setDesktopUmrah] = useState(false)
  const [mobileUmrah, setMobileUmrah] = useState(false)
  const [desktopBusiness, setDesktopBusiness] = useState(false)
  const [mobileBusiness, setMobileBusiness] = useState(false)
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(86)

  const headerRef = useRef(null)
  const holidayRef = useRef(null)
  const umrahRef = useRef(null)
  const businessRef = useRef(null)

  const location = useLocation()

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setMobileHoliday(false);
    setMobileUmrah(false);
    setMobileBusiness(false);
  };

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, location.search]);

  // Measure dynamic header height accurately
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
        const height = headerRef.current.offsetHeight;
        setHeaderHeight(height);
        document.documentElement.style.setProperty('--navbar-height', `${height}px`);
      }
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (holidayRef.current && !holidayRef.current.contains(event.target)) {
        setDesktopHoliday(false);
      }
      if (umrahRef.current && !umrahRef.current.contains(event.target)) {
        setDesktopUmrah(false);
      }
      if (businessRef.current && !businessRef.current.contains(event.target)) {
        setDesktopBusiness(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body & document scroll when mobile menu or admin login is open
  useEffect(() => {
    if (mobileOpen || isAdminLoginOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [mobileOpen, isAdminLoginOpen]);

  const isVisaActive = location.pathname.startsWith('/visa');
  const isBusinessActive = 
    location.pathname.startsWith('/business') || 
    location.pathname.startsWith('/canton') || 
    location.pathname.startsWith('/megashow') || 
    location.pathname.startsWith('/chithirai-global') ||
    (location.pathname === '/holidays' && location.search.includes('Business'));
  const isUmrahActive = 
    location.pathname.startsWith('/customizedumrah') || 
    location.pathname.startsWith('/customized-umrah') || 
    (location.pathname === '/holidays' && location.search.includes('Umrah'));
  const isHolidayActive = 
    location.pathname.toLowerCase() === '/trendingdomesticdestination' ||
    location.pathname.toLowerCase() === '/trendinginternationaldestination' ||
    location.pathname.toLowerCase() === '/bali' ||
    location.pathname.toLowerCase() === '/thailand' ||
    location.pathname.toLowerCase() === '/dubai' ||
    location.pathname.toLowerCase() === '/kerala' ||
    location.pathname.toLowerCase() === '/goa' ||
    location.pathname.toLowerCase() === '/sikkim' ||
    location.pathname.toLowerCase() === '/manali' ||
    location.pathname.toLowerCase() === '/azerbaijan' ||
    location.pathname.toLowerCase() === '/kashmir' ||
    location.pathname === '/holidayhome' ||
    location.pathname.startsWith('/holiday/') || 
    location.pathname.toLowerCase().startsWith('/customizedholidays') || 
    location.pathname.toLowerCase().startsWith('/europeantours') || 
    (location.pathname === '/holidays' && !location.search.includes('Umrah') && !location.search.includes('Business'));
  const isCabActive = location.pathname.startsWith('/cab');
  const isCruiseActive = location.pathname.startsWith('/cruise');
  const isShopActive = location.pathname.startsWith('/shop') || location.pathname.startsWith('/goimomi-product');

  const animatedButton =
    "flex flex-col items-center justify-center text-xs hover:text-goimomi-primary active:scale-90 transition-transform duration-200 focus:outline-none";

  return (
    <header ref={headerRef} className="w-full sticky top-0 z-[100] bg-white">
      {/* Top bar */}
      <div className="bg-goimomi-primary text-white text-xs hidden md:block">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-2">
              <span className="text-sm">📞</span> +91 8110082222
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm">✉️</span> hello@goimomi.com
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="opacity-95 font-medium">24/7 Customer Support Available</span>
            <div className="flex items-center gap-2">
              <a
                href="https://b2b.goimomi.com/"
                className="bg-white text-goimomi-primary rounded-full px-3 py-1 font-bold hover:bg-green-50 transition-all text-xs uppercase tracking-wide"
                rel="noopener noreferrer"
              >
                Agent Login
              </a>
              <button
                onClick={() => setIsAdminLoginOpen(true)}
                className="bg-white text-goimomi-primary rounded-full px-3 py-1 font-black hover:bg-green-50 transition-all text-xs uppercase tracking-wide shadow-sm"
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="border-b bg-white/95 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-4 py-2.5">

          {/* Logo */}
          <Link to="/" className="hover:opacity-90 transition-opacity">
            <img src={logo} alt="Goimomi Holidays" className="h-[65px] w-auto" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-5 text-slate-700">
            <NavLink to="/flights" className={({ isActive }) => `order-[-6] ${animatedButton} ${isActive ? "text-goimomi-primary font-black" : ""}`}>
              <Plane aria-hidden="true" strokeWidth={1.25} className="w-9 h-9 mb-1" />
              <span className="font-bold text-[11px] uppercase tracking-wide">Flights</span>
            </NavLink>
            <NavLink to="/hotel" className={({ isActive }) => `order-[-5] ${animatedButton} ${isActive ? "text-goimomi-primary font-black" : ""}`}>
              <Building2 aria-hidden="true" strokeWidth={1.25} className="w-9 h-9 mb-1" />
              <span className="font-bold text-[11px] uppercase tracking-wide">Hotels</span>
            </NavLink>
            {/* Visa */}
            <NavLink to="/visa" className={({ isActive }) => `order-[-4] ${animatedButton} ${isActive || isVisaActive ? "text-goimomi-primary font-black" : ""}`}>
              <img src="https://cdn-icons-png.flaticon.com/128/15544/15544932.png" alt="Visa" className="w-9 h-9 mb-1 object-contain" />
              <span className="font-bold text-[11px] uppercase tracking-wide">Visa</span>
            </NavLink>

            {/* Business Travel Dropdown */}
            <div className="relative order-[-2]" ref={businessRef}>
              <button
                type="button"
                className={`${animatedButton} ${isBusinessActive ? "text-goimomi-primary font-black" : ""}`}
                onClick={() => {
                  setDesktopBusiness(!desktopBusiness);
                  setDesktopUmrah(false);
                  setDesktopHoliday(false);
                }}
              >
                <img src="https://cdn-icons-png.flaticon.com/128/9638/9638464.png" alt="Business Travel" className="w-9 h-9 mb-1 object-contain" />
                <span className="font-bold text-[11px] uppercase tracking-wide flex items-center gap-0.5">
                  Business Travel
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 transition-transform duration-300 ${desktopBusiness ? "rotate-180" : "rotate-0"}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.205l3.71-3.974a.75.75 0 1 1 1.08 1.04l-4.24 4.54a.75.75 0 0 1-1.08 0l-4.24-4.54a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>

              {desktopBusiness && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-56 rounded-xl border border-slate-100 bg-white text-slate-700 shadow-xl animate-slideDown z-50">
                  <NavLink
                    to="/businesshome"
                    onClick={() => setDesktopBusiness(false)}
                    className="block px-4 py-2 text-xs font-black text-[#14532d] hover:bg-goimomi-light text-left w-full uppercase tracking-widest border-b"
                  >
                    Business Packages
                  </NavLink>
                  <NavLink
                    to="/holidays?category=Business Travel"
                    onClick={() => setDesktopBusiness(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    Business Travel
                  </NavLink>
                  <NavLink
                    to="/chithirai-global"
                    onClick={() => setDesktopBusiness(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    Chithirai Global
                  </NavLink>
                  <NavLink
                    to="/canton"
                    onClick={() => setDesktopBusiness(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    Canton Fair
                  </NavLink>
                  <NavLink
                    to="/megashowbangkok"
                    onClick={() => setDesktopBusiness(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    Mega Show Bangkok
                  </NavLink>
                </div>
              )}
            </div>

            {/* Umrah / Hajj Dropdown */}
            <div className="relative order-[-1]" ref={umrahRef}>
              <button
                type="button"
                className={`${animatedButton} ${isUmrahActive ? "text-goimomi-primary font-black" : ""}`}
                onClick={() => {
                  setDesktopUmrah(!desktopUmrah);
                  setDesktopHoliday(false);
                  setDesktopBusiness(false);
                }}
              >
                <img src="https://cdn-icons-png.flaticon.com/128/5203/5203166.png" alt="Umrah / Hajj" className="w-9 h-9 mb-1 object-contain" />
                <span className="font-bold text-[11px] uppercase tracking-wide flex items-center gap-0.5">
                  Umrah / Hajj
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 transition-transform duration-300 ${desktopUmrah ? "rotate-180" : "rotate-0"}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.205l3.71-3.974a.75.75 0 1 1 1.08 1.04l-4.24 4.54a.75.75 0 0 1-1.08 0l-4.24-4.54a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>

              {desktopUmrah && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-56 rounded-xl border border-slate-100 bg-white text-slate-700 shadow-xl animate-slideDown z-50">
                  <NavLink
                    to="/holidayhome"
                    onClick={() => setDesktopUmrah(false)}
                    className="block px-4 py-2 text-xs font-black text-[#14532d] hover:bg-goimomi-light text-left w-full uppercase tracking-widest border-b"
                  >
                    Umrah Packages
                  </NavLink>
                  <NavLink
                    to="/holidays?category=Umrah"
                    onClick={() => setDesktopUmrah(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    Umrah
                  </NavLink>
                  <NavLink
                    to="/customizedumrah"
                    onClick={() => setDesktopUmrah(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    Customized Umrah
                  </NavLink>
                </div>
              )}
            </div>

            {/* Holidays Dropdown */}
            <div className="relative order-[-3]" ref={holidayRef}>
              <button
                type="button"
                className={`${animatedButton} ${isHolidayActive ? "text-goimomi-primary font-black" : ""}`}
                onClick={() => {
                  setDesktopHoliday(!desktopHoliday);
                  setDesktopUmrah(false);
                  setDesktopBusiness(false);
                }}
              >
                <img src="https://cdn-icons-png.flaticon.com/128/9369/9369093.png" alt="Holidays" className="w-9 h-9 mb-1 object-contain" />
                <span className="font-bold text-[11px] uppercase tracking-wide flex items-center gap-0.5">
                  Holidays
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3 w-3 transition-transform duration-300 ${desktopHoliday ? "rotate-180" : "rotate-0"}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.205l3.71-3.974a.75.75 0 1 1 1.08 1.04l-4.24 4.54a.75.75 0 0 1 .02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>

              {desktopHoliday && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-72 rounded-xl border border-slate-100 bg-white text-slate-700 shadow-xl animate-slideDown z-50">
                  <NavLink
                    to="/holidayhome"
                    onClick={() => setDesktopHoliday(false)}
                    className="block px-4 py-2 text-xs font-black text-[#14532d] hover:bg-goimomi-light text-left w-full uppercase tracking-widest border-b"
                  >
                    Holiday Packages
                  </NavLink>
                  <NavLink
                    to="/holidays?category=Domestic"
                    onClick={() => setDesktopHoliday(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    Domestic
                  </NavLink>
                  <NavLink
                    to="/holidays?category=International"
                    onClick={() => setDesktopHoliday(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    International
                  </NavLink>
                  <NavLink to="/trendingdomesticdestination" onClick={() => setDesktopHoliday(false)} className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full">Trending Domestic</NavLink>
                  <NavLink to="/trendinginternationaldestination" onClick={() => setDesktopHoliday(false)} className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full">Trending International</NavLink>
                  <NavLink
                    to="/customizedHolidays"
                    onClick={() => setDesktopHoliday(false)}
                    className="block px-4 py-2 text-xs font-semibold hover:bg-goimomi-light text-left w-full"
                  >
                    Customized Holidays
                  </NavLink>
                  <NavLink
                    to="/Europeantours"
                    onClick={() => setDesktopHoliday(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold hover:bg-goimomi-light"
                  >
                    European Tours
                  </NavLink>
                </div>
              )}
            </div>

            {/* Cabs */}
            <NavLink to="/cab" className={({ isActive }) =>
              `${animatedButton} ${isActive || isCabActive ? "text-goimomi-primary font-black" : ""}`
            }>
              <img src="https://cdn-icons-png.flaticon.com/128/4874/4874225.png" alt="Cabs" className="w-9 h-9 mb-1 object-contain" />
              <span className="font-bold text-[11px] uppercase tracking-wide">Cabs</span>
            </NavLink>

            {/* Cruise Bookings */}
            <NavLink to="/cruise" className={({ isActive }) =>
              `${animatedButton} ${isActive || isCruiseActive ? "text-goimomi-primary font-black" : ""}`
            }>
              <img src="https://cdn-icons-png.flaticon.com/128/4320/4320227.png" alt="Cruise" className="w-9 h-9 mb-1 object-contain" />
              <span className="font-bold text-[11px] uppercase tracking-wide">Cruise</span>
            </NavLink>

            {/* Goimomi Shop */}
            <div className="relative group">
              <NavLink
                to="/shop"
                id="nav-shop-link"
                className={({ isActive }) =>
                  `${animatedButton} ${isActive || isShopActive ? "text-goimomi-primary font-black" : ""}`
                }
              >
                <div className="relative">
                  <img
                    src="https://cdn-icons-png.flaticon.com/128/1170/1170576.png"
                    alt="Shop"
                    className="w-9 h-9 mb-1 object-contain"
                  />
                  <span
                    className="absolute -top-1.5 -right-1.5 bg-[#16a34a] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none shadow-md"
                  >
                    New
                  </span>
                </div>
                <span className="font-bold text-[11px] uppercase tracking-wide">
                  Shop
                </span>
              </NavLink>
            </div>

          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 rounded-lg border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-700 focus:outline-none focus:ring-2 focus:ring-goimomi-primary/20"
            onClick={() => mobileOpen ? closeMobileMenu() : setMobileOpen(true)}
          >
            <span className="sr-only">Toggle menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden animate-fadeIn"
          style={{ top: `${headerHeight}px` }}
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Menu Drawer Container */}
      {mobileOpen && (
        <div 
          className="fixed left-0 right-0 bottom-0 z-[100] lg:hidden bg-white shadow-2xl overflow-y-auto custom-scrollbar border-t border-slate-100 flex flex-col justify-between animate-fadeIn"
          style={{ 
            top: `${headerHeight}px`,
            height: `calc(100dvh - ${headerHeight}px)`,
            maxHeight: `calc(100dvh - ${headerHeight}px)`
          }}
        >
          <div className="px-5 py-4 space-y-2.5 text-base font-medium pb-16 flex-1">
            <NavLink
              to="/flights"
              className={({ isActive }) => `flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`}
              onClick={closeMobileMenu}
            >
              <Plane aria-hidden="true" strokeWidth={1.25} className="w-6 h-6" />
              Flights
            </NavLink>
            <NavLink
              to="/hotel"
              className={({ isActive }) => `flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`}
              onClick={closeMobileMenu}
            >
              <Building2 aria-hidden="true" strokeWidth={1.25} className="w-6 h-6" />
              Hotels
            </NavLink>

            <NavLink 
              to="/visa" 
              className={({ isActive }) => `order-[-4] flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive || isVisaActive ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`} 
              onClick={closeMobileMenu}
            >
              <img src="https://cdn-icons-png.flaticon.com/128/15544/15544932.png" alt="Visa" className="w-6 h-6 object-contain" />
              Visa
            </NavLink>

            {/* Mobile Business Travel Accordion */}
            <div className="rounded-xl overflow-hidden border border-slate-100/80 bg-slate-50/50 p-1 order-[-2]">
              <button
                type="button"
                onClick={() => {
                  setMobileBusiness(!mobileBusiness);
                  setMobileUmrah(false);
                  setMobileHoliday(false);
                }}
                className={`w-full flex items-center justify-between p-2 hover:text-[#14532d] transition text-left rounded-lg ${isBusinessActive ? "text-[#14532d] font-bold" : "text-slate-700"}`}
              >
                <span className="flex items-center gap-3">
                  <img src="https://cdn-icons-png.flaticon.com/128/9638/9638464.png" alt="Business Travel" className="w-6 h-6 object-contain" />
                  Business Travel
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform duration-300 ${mobileBusiness ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.205l3.71-3.974a.75.75 0 1 1 1.08 1.04l-4.24 4.54a.75.75 0 0 1-1.08 0l-4.24-4.54a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {mobileBusiness && (
                <div className="pl-6 pr-2 py-2 space-y-1 bg-white rounded-lg mt-1 border border-slate-100 animate-fadeIn">
                  <NavLink to="/businesshome" className="block py-1.5 text-xs font-black text-[#14532d] hover:text-[#14532d] transition uppercase tracking-widest border-b" onClick={closeMobileMenu}>
                    Business Packages
                  </NavLink>
                  <NavLink to="/holidays?category=Business Travel" className="block py-1.5 text-sm hover:text-[#14532d] transition" onClick={closeMobileMenu}>
                    Business Travel
                  </NavLink>
                  <NavLink to="/chithirai-global" className="block py-1.5 text-sm hover:text-[#14532d] transition" onClick={closeMobileMenu}>
                    Chithirai Global
                  </NavLink>
                  <NavLink to="/canton" className="block py-1.5 text-sm hover:text-[#14532d] transition" onClick={closeMobileMenu}>
                    Canton Fair
                  </NavLink>
                  <NavLink to="/megashowbangkok" className="block py-1.5 text-sm hover:text-[#14532d] transition" onClick={closeMobileMenu}>
                    Mega Show Bangkok
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile Umrah Accordion */}
            <div className="rounded-xl overflow-hidden border border-slate-100/80 bg-slate-50/50 p-1 order-[-1]">
              <button
                type="button"
                onClick={() => {
                  setMobileUmrah(!mobileUmrah);
                  setMobileHoliday(false);
                  setMobileBusiness(false);
                }}
                className={`w-full flex items-center justify-between p-2 hover:text-[#14532d] transition text-left rounded-lg ${isUmrahActive ? "text-[#14532d] font-bold" : "text-slate-700"}`}
              >
                <span className="flex items-center gap-3">
                  <img src="https://cdn-icons-png.flaticon.com/128/5203/5203166.png" alt="Umrah / Hajj" className="w-6 h-6 object-contain" />
                  Umrah / Hajj
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform duration-300 ${mobileUmrah ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.205l3.71-3.974a.75.75 0 1 1 1.08 1.04l-4.24 4.54a.75.75 0 0 1-1.08 0l-4.24-4.54a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {mobileUmrah && (
                <div className="pl-6 pr-2 py-2 space-y-1 bg-white rounded-lg mt-1 border border-slate-100 animate-fadeIn">
                  <NavLink to="/holidayhome" className="block py-1.5 text-xs font-black text-[#14532d] hover:text-[#14532d] transition uppercase tracking-widest border-b" onClick={closeMobileMenu}>
                    Umrah Packages
                  </NavLink>
                  <NavLink to="/holidays?category=Umrah" className="block py-1.5 text-sm hover:text-[#14532d] transition" onClick={closeMobileMenu}>
                    Umrah
                  </NavLink>
                  <NavLink to="/customizedumrah" className="block py-1.5 text-sm hover:text-[#14532d] transition" onClick={closeMobileMenu}>
                    Customized Umrah
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile Holidays Accordion */}
            <div className="rounded-xl overflow-hidden border border-slate-100/80 bg-slate-50/50 p-1 order-[-3]">
              <button
                type="button"
                onClick={() => {
                  setMobileHoliday(!mobileHoliday);
                  setMobileUmrah(false);
                  setMobileBusiness(false);
                }}
                className={`w-full flex items-center justify-between p-2 hover:text-[#14532d] transition text-left rounded-lg ${isHolidayActive ? "text-[#14532d] font-bold" : "text-slate-700"}`}
              >
                <span className="flex items-center gap-3">
                  <img src="https://cdn-icons-png.flaticon.com/128/9369/9369093.png" alt="Holidays" className="w-6 h-6 object-contain" />
                  Holidays
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform duration-300 ${mobileHoliday ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.205l3.71-3.974a.75.75 0 1 1 1.08 1.04l-4.24 4.54a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {mobileHoliday && (
                <div className="pl-6 pr-2 py-2 space-y-1 bg-white rounded-lg mt-1 border border-slate-100 animate-fadeIn">
                  <NavLink
                    to="/holidayhome"
                    className="block py-1.5 text-xs font-black text-[#14532d] hover:text-[#14532d] transition uppercase tracking-widest border-b"
                    onClick={closeMobileMenu}
                  >
                    Holiday Packages Home
                  </NavLink>
                  <NavLink
                    to="/holidays?category=Domestic"
                    className="block py-1.5 text-sm hover:text-[#14532d] transition"
                    onClick={closeMobileMenu}
                  >
                    Domestic
                  </NavLink>
                  <NavLink
                    to="/holidays?category=International"
                    className="block py-1.5 text-sm hover:text-[#14532d] transition"
                    onClick={closeMobileMenu}
                  >
                    International
                  </NavLink>
                  <NavLink to="/trendingdomesticdestination" onClick={closeMobileMenu} className="block py-1.5 text-sm hover:text-[#14532d] transition">Trending Domestic</NavLink>
                  <NavLink to="/trendinginternationaldestination" onClick={closeMobileMenu} className="block py-1.5 text-sm hover:text-[#14532d] transition">Trending International</NavLink>
                  <NavLink
                    to="/customizedHolidays"
                    className="block py-1.5 text-sm hover:text-[#14532d] transition"
                    onClick={closeMobileMenu}
                  >
                    Customized Holidays
                  </NavLink>
                  <NavLink
                    to="/Europeantours"
                    className="block py-1.5 text-sm hover:text-[#14532d] transition"
                    onClick={closeMobileMenu}
                  >
                    European Tours
                  </NavLink>
                </div>
              )}
            </div>

            <NavLink 
              to="/cab" 
              className={({ isActive }) => `flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive || isCabActive ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`} 
              onClick={closeMobileMenu}
            >
              <img src="https://cdn-icons-png.flaticon.com/128/4874/4874225.png" alt="Cabs" className="w-6 h-6 object-contain" />
              Cabs
            </NavLink>

            <NavLink 
              to="/cruise" 
              className={({ isActive }) => `flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive || isCruiseActive ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`} 
              onClick={closeMobileMenu}
            >
              <img src="https://cdn-icons-png.flaticon.com/128/4320/4320227.png" alt="Cruise" className="w-6 h-6 object-contain" />
              Cruise Bookings
            </NavLink>

            <NavLink
              to="/shop"
              id="mobile-nav-shop-link"
              className={({ isActive }) => `flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive || isShopActive ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`}
              onClick={closeMobileMenu}
            >
              <div className="relative">
                <img src="https://cdn-icons-png.flaticon.com/128/1170/1170576.png" alt="Shop" className="w-6 h-6 object-contain" />
                <span className="absolute -top-1 -right-1 bg-[#16a34a] text-white text-[7px] font-black px-1 rounded-full uppercase leading-tight">
                  New
                </span>
              </div>
              <span>Shop</span>
            </NavLink>

            <NavLink 
              to="/blog" 
              className={({ isActive }) => `flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive || location.pathname.startsWith('/blog') ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`} 
              onClick={closeMobileMenu}
            >
              <img src="https://cdn-icons-png.flaticon.com/128/3959/3959542.png" alt="Blog" className="w-6 h-6 object-contain" />
              Travel Blog & Guides
            </NavLink>

            <NavLink 
              to="/aboutus" 
              className={({ isActive }) => `flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`} 
              onClick={closeMobileMenu}
            >
              <img src="https://cdn-icons-png.flaticon.com/128/471/471664.png" alt="About" className="w-6 h-6 object-contain opacity-70" />
              About Us
            </NavLink>

            <NavLink 
              to="/contactus" 
              className={({ isActive }) => `flex items-center justify-start gap-3 py-2.5 hover:text-[#14532d] transition w-full rounded-xl px-2 ${isActive ? "text-[#14532d] font-bold bg-green-50/60" : "text-slate-700"}`} 
              onClick={closeMobileMenu}
            >
              <img src="https://cdn-icons-png.flaticon.com/128/1034/1034153.png" alt="Contact" className="w-6 h-6 object-contain opacity-70" />
              Contact Us
            </NavLink>

            {/* Mobile Support & Logins Block */}
            <div className="pt-4 border-t border-gray-100 space-y-4 text-left">
              {/* Contact info cards */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 border border-slate-100">
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[#14532d]/80 block">24/7 Travel Desk</span>
                <div className="flex flex-col gap-2 text-sm text-slate-600">
                  <a href="tel:+918110082222" className="flex items-center gap-2 hover:text-[#14532d] transition-colors">
                    <span className="text-base shrink-0">📞</span>
                    <span className="font-bold">+91 81100 82222</span>
                  </a>
                  <a href="mailto:hello@goimomi.com" className="flex items-center gap-2 hover:text-[#14532d] transition-colors">
                    <span className="text-base shrink-0">✉️</span>
                    <span className="font-bold">hello@goimomi.com</span>
                  </a>
                </div>
              </div>

              {/* Login buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="https://b2b.goimomi.com/"
                  className="flex-1 text-center bg-slate-100 text-[#14532d] rounded-xl py-2.5 font-bold hover:bg-slate-200 transition-all text-xs uppercase tracking-wide border border-slate-200"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                >
                  Agent Login
                </a>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    setIsAdminLoginOpen(true);
                  }}
                  className="flex-1 text-center bg-[#14532d] text-white rounded-xl py-2.5 font-bold hover:bg-[#1a6338] transition-all text-xs uppercase tracking-wide shadow-sm"
                >
                  Admin Login
                </button>
              </div>
            </div>

            {/* Social Links */}
            <div className="pt-6 border-t border-gray-100 flex flex-col items-center gap-4">
              <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">Follow Our Journey</span>
              <div className="flex items-center gap-6">
                <a href="https://www.instagram.com/goimomi_holidays/" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-2xl shadow-lg shadow-pink-500/20 active:scale-90 transition-transform">
                  <img src="https://cdn-icons-png.flaticon.com/128/2111/2111463.png" className="w-6 h-6 invert brightness-100" alt="Instagram" />
                </a>
                <a href="https://www.facebook.com/goimomi" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-[#1877F2] rounded-2xl shadow-lg shadow-blue-500/20 active:scale-90 transition-transform">
                  <img src="https://cdn-icons-png.flaticon.com/128/733/733547.png" className="w-6 h-6 invert brightness-100" alt="Facebook" />
                </a>
                <a href="https://wa.me/918110082222" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-[#25D366] rounded-2xl shadow-lg shadow-green-500/20 active:scale-90 transition-transform">
                  <img src="https://cdn-icons-png.flaticon.com/128/733/733585.png" className="w-6 h-6 invert brightness-100" alt="WhatsApp" />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      <AdminLogin
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
      />
    </header>
  );
};

export default Navbar;
