import React, { useState } from "react";
import api from "../../../api";
import { useLocation, useNavigate } from "react-router-dom";
import { FaMoon, FaCalendarAlt, FaHotel, FaWallet, FaGlobe } from "react-icons/fa";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import SuccessModal from "../../../components/common/SuccessModal";
import usePageSEO from "../../../hooks/usePageSEO";

/**
 * Dedicated Holiday Package Lead Enquiry Page
 * 
 * Features:
 * - Dynamic pre-filling with selected package details, duration, and default traveler counts
 * - Traveler details form: name, email, phone with country code, budget, departure date
 * - Direct lead synchronization with backend and Zoho CRM
 */
const PackageEnquiryPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const packageData = location.state?.pkg;

    usePageSEO(
        packageData ? `Enquire for ${packageData.title} | Goimomi Holidays` : "Holiday Package Enquiry | Goimomi Holidays",
        packageData ? `Request a quote for our ${packageData.title} package. Get the best deals and personalized travel assistance for your trip.` : "Enquire about our international and domestic holiday packages. Get personalized quotes and travel expert advice.",
        packageData?.card_image,
        "holiday enquiry, travel quote, package booking, vacation planning, goimomi holidays"
    );

    const getTomorrowDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        message: "",
        budget: "",
        departure_date: getTomorrowDate(),
        adults: 2,
        children: 0,
        nights: packageData?.days ? parseInt(packageData.days) - 1 : 4,
        hotel_rating: "3",
        package_type: packageData?.title || "Customized Holiday",
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!formData.full_name) newErrors.full_name = "Full name is required";
        if (!formData.email) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Email is invalid";
        }
        
        const phoneDigits = (formData.phone || "").replace(/\D/g, "");
        if (!phoneDigits || phoneDigits.length < 10) {
            newErrors.phone = "At least 10 digits required";
        } else if (phoneDigits.startsWith("91") && phoneDigits.length !== 12) {
            newErrors.phone = "Exactly 10 digits required after +91";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePayBooking = async (e) => {
        if (e) e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const unitPrice = parseFloat(packageData?.price || packageData?.Offer_price || 0);
            const calcTotal = unitPrice > 0 ? unitPrice * (parseInt(formData.adults) || 1) : 10000;

            const response = await api.post("/api/package-bookings/", {
                package: packageData?.id || null,
                package_title: packageData?.title || formData.package_type,
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                travel_date: formData.departure_date,
                adults: formData.adults,
                children: formData.children,
                total_price: calcTotal
            });

            if (response.data && response.data.payment_url) {
                window.location.href = response.data.payment_url;
            } else {
                setShowSuccessModal(true);
                setTimeout(() => {
                    navigate("/");
                }, 3000);
            }
        } catch (error) {
            console.error("Error creating package booking payment session:", error);
            alert("Unable to initiate online payment. Please try sending an enquiry request.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const packageTitle = packageData?.title || formData.package_type;
            await api.post("/api/holiday-form/", {
                package_type: packageTitle,
                start_city: packageData?.starting_city || "Not specified",
                nationality: "Not specified",
                travel_date: formData.departure_date,
                rooms: 1,
                room_details: [{
                    adults: Number(formData.adults),
                    children: Number(formData.children),
                    child_ages: [],
                }],
                adults: Number(formData.adults),
                children: Number(formData.children),
                star_rating: formData.hotel_rating,
                holiday_type: packageData?.category || "Holiday Package",
                budget: formData.budget,
                full_name: formData.full_name,
                email: formData.email,
                phone: formData.phone,
                message: [
                    packageData?.id ? "Package ID: " + packageData.id : null,
                    formData.message,
                ].filter(Boolean).join("\n"),
                nights: Number(formData.nights),
                cities: [{
                    destination: packageData?.destination_name || packageTitle,
                    nights: Number(formData.nights),
                }],
            });
            setShowSuccessModal(true);
            setTimeout(() => {
                navigate("/");
            }, 3000);
        } catch (error) {
            console.error("Error submitting enquiry:", error);
            alert("Submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12">
            <SuccessModal 
                isOpen={showSuccessModal} 
                onClose={() => setShowSuccessModal(false)}
                title="Enquiry Received!"
                message="Thank you for reaching out. Our travel experts will get back to you with a customized quote shortly."
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 text-[#14532d] text-xs font-black uppercase tracking-widest mb-4">
                        <FaGlobe className="text-sm" /> Handcrafted Vacations
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
                        {packageData?.title ? `Book / Enquire for ${packageData.title}` : "Customize Your Holiday"}
                    </h1>
                    <p className="text-gray-500 font-medium text-sm md:text-base">
                        Get instant payment & booking confirmation or send a free enquiry to our expert travel team.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left: Package Info */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                                {packageData?.title ? `About ${packageData.title}` : "Customize Your Perfect Trip"}
                            </h2>

                            {packageData && (
                                <div className="space-y-4">
                                    <div className="relative h-56 rounded-2xl overflow-hidden shadow-inner">
                                        <img 
                                            src={packageData.card_image} 
                                            alt={packageData.title}
                                            className="w-full h-full object-cover" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4 text-white">
                                            <span className="uppercase tracking-widest text-xs font-bold text-green-300">{packageData.destination_name || "International"}</span>
                                            <h3 className="text-2xl font-black text-white">{packageData.title}</h3>
                                            <div className="flex items-center gap-4 text-xs font-bold mt-2">
                                                <span className="flex items-center gap-1"><FaMoon className="text-[#14532d]" /> {packageData.days} Days / {parseInt(packageData.days) - 1} Nights</span>
                                                <span className="flex items-center gap-1"><FaWallet className="text-[#14532d]" /> ₹{parseFloat(packageData.price || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4 text-sm font-medium text-gray-600">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-50 text-[#14532d] flex items-center justify-center font-bold">✓</div>
                                    <span>Instant payment receipt & booking invoice</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-50 text-[#14532d] flex items-center justify-center font-bold">✓</div>
                                    <span>24/7 dedicated trip support line</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-50 text-[#14532d] flex items-center justify-center font-bold">✓</div>
                                    <span>Free itinerary modifications post-booking</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-green-900/5 border border-gray-100">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Name *</label>
                                    <input 
                                        type="text" 
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        className={`w-full px-5 py-4 bg-gray-50 border-2 ${errors.full_name ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:bg-white focus:border-[#14532d] transition-all outline-none font-medium text-gray-900`}
                                        placeholder="John Doe" 
                                    />
                                    {errors.full_name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.full_name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Address *</label>
                                    <input 
                                        type="email" 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`w-full px-5 py-4 bg-gray-50 border-2 ${errors.email ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:bg-white focus:border-[#14532d] transition-all outline-none font-medium text-gray-900`}
                                        placeholder="john@example.com" 
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.email}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Mobile Number *</label>
                                    <PhoneInput
                                        country={"in"}
                                        value={formData.phone}
                                        onChange={(phone) => {
                                            setFormData(prev => ({ ...prev, phone: phone }));
                                            if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
                                        }}
                                        inputStyle={{
                                            width: '100%',
                                            height: '58px',
                                            backgroundColor: '#f9fafb',
                                            borderWidth: '2px',
                                            borderColor: errors.phone ? '#ef4444' : 'transparent',
                                            borderRadius: '1rem',
                                            fontSize: '1rem',
                                            fontWeight: '500',
                                            color: '#111827'
                                        }}
                                        buttonStyle={{
                                            backgroundColor: '#f9fafb',
                                            border: 'none',
                                            borderRadius: '1rem 0 0 1rem',
                                            paddingLeft: '8px'
                                        }}
                                    />
                                    {errors.phone && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.phone}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Travel Date *</label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            type="date" 
                                            name="departure_date"
                                            value={formData.departure_date}
                                            onChange={handleChange}
                                            className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#14532d] transition-all outline-none font-medium text-gray-900" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Adults</label>
                                        <select 
                                            name="adults"
                                            value={formData.adults}
                                            onChange={handleChange}
                                            className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#14532d] transition-all outline-none font-medium text-gray-900"
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                                <option key={num} value={num}>{num} Adult{num > 1 ? 's' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Children</label>
                                        <select 
                                            name="children"
                                            value={formData.children}
                                            onChange={handleChange}
                                            className="w-full px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#14532d] transition-all outline-none font-medium text-gray-900"
                                        >
                                            {[0, 1, 2, 3, 4, 5].map(num => (
                                                <option key={num} value={num}>{num} Child{num > 1 ? 'ren' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Hotel Rating Preference</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {["3", "4", "5", "Luxury"].map((star) => (
                                            <label 
                                                key={star}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-xs transition-all ${
                                                    formData.hotel_rating === star 
                                                        ? 'border-[#14532d] bg-green-50/50 text-[#14532d]' 
                                                        : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                }`}
                                            >
                                                <input 
                                                    type="radio" 
                                                    name="hotel_rating"
                                                    value={star}
                                                    checked={formData.hotel_rating === star}
                                                    onChange={handleChange}
                                                    className="hidden" 
                                                />
                                                <FaHotel className={formData.hotel_rating === star ? "text-[#14532d]" : "text-gray-300"} />
                                                {star} Star
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Additional Requests (Optional)</label>
                                    <textarea 
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#14532d] transition-all outline-none font-medium text-gray-900"
                                        placeholder="Tell us about your interests, specific places you want to visit, or special requirements..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <button 
                                    type="button"
                                    onClick={handlePayBooking}
                                    disabled={submitting}
                                    className="w-full bg-[#14532d] text-[#ffffff] py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-green-900/20 hover:bg-[#0f4a24] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {submitting ? "Processing..." : "💳 Book & Pay Online"}
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-white text-[#14532d] border-2 border-[#14532d] py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-50 transition-all disabled:opacity-50"
                                >
                                    {submitting ? "Submitting..." : "Send Free Enquiry"}
                                </button>
                            </div>

                            <p className="text-center text-xs text-gray-400 font-bold">
                                🔒 Safe & Secure Payments · Instant Invoice · Privacy Protected
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackageEnquiryPage;
