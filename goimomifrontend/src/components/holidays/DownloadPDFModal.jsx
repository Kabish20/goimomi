import React, { useState } from "react";
import { X, User, Phone, Mail, FileDown, Loader2 } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import api from "../../api";

const DownloadPDFModal = ({ isOpen, onClose, onDownload, packageName }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    let newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      newErrors.phone = "Valid phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    // Sync lead to backend and Zoho CRM
    try {
      await api.post('/api/enquiry-form/', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        destination: packageName || 'Brochure Download',
        purpose: `Brochure download for package: ${packageName || 'Holiday Package'}`,
        enquiry_type: 'General',
      });
    } catch (err) {
      console.warn("Brochure lead submission notice:", err);
    }

    setTimeout(async () => {
      await onDownload(formData);
      setLoading(false);
      onClose();
      setFormData({ name: "", email: "", phone: "" });
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-[340px] bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header - Minimized */}
        <div className="bg-[#14532d] px-5 py-4 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-md">
              <FileDown size={22} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black uppercase tracking-tight">Download PDF</h3>
              <p className="text-white/80 text-[10px] font-medium">Enter details to get brochure</p>
            </div>
          </div>
          
          {packageName && (
            <div className="mt-3 overflow-hidden">
              <p className="text-white bg-black/10 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider truncate">
                {packageName}
              </p>
            </div>
          )}
        </div>

        {/* Form Body - More Compact */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          {/* Name Field */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <User size={10} className="text-gray-300" />
              Name
            </label>
            <input
              type="text"
              className={`w-full bg-gray-50 border ${errors.name ? 'border-red-300' : 'border-gray-100'} rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[#14532d] focus:bg-white transition-all`}
              placeholder="Your Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && <p className="text-[9px] text-red-500 font-bold ml-1">{errors.name}</p>}
          </div>

          {/* Email Field */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Mail size={10} className="text-gray-300" />
              Email
            </label>
            <input
              type="email"
              className={`w-full bg-gray-50 border ${errors.email ? 'border-red-300' : 'border-gray-100'} rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[#14532d] focus:bg-white transition-all`}
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            {errors.email && <p className="text-[9px] text-red-500 font-bold ml-1">{errors.email}</p>}
          </div>

          {/* Phone Field */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
              <Phone size={10} className="text-gray-300" />
              Phone
            </label>
            <div className={`phone-input-container !h-9 ${errors.phone ? 'phone-error' : ''}`}>
              <PhoneInput
                country={"in"}
                value={formData.phone}
                onChange={(phone) => setFormData({ ...formData, phone })}
                containerClass="!w-full"
                inputClass="!w-full !bg-gray-50 !border-gray-100 !h-9 !rounded-lg !text-[12px] !pl-10 !outline-none focus:!border-[#14532d] focus:!bg-white"
                buttonClass="!bg-transparent !border-none !rounded-l-lg pr-1"
              />
            </div>
            {errors.phone && <p className="text-[9px] text-red-500 font-bold ml-1">{errors.phone}</p>}
          </div>

          {/* Submit Button - More Compact */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#14532d] hover:bg-[#0f4022] text-white py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest shadow-md shadow-green-50/20 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Wait...
              </>
            ) : (
              <>
                <FileDown size={14} />
                Download Brochure
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 text-center">
          <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest">
            Privacy Protected • Secure
          </p>
        </div>
      </div>
    </div>
  );
};

export default DownloadPDFModal;
