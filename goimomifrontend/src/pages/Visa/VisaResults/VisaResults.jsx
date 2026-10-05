import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../../api";
import { CheckCircle, Home, Plane, Calendar, Search, X, Copy, ChevronDown, Share2, Mail, Eye, MessageCircle, Zap } from "lucide-react";
import { getImageUrl } from "../../../utils/imageUtils";
import usePageSEO from "../../../hooks/usePageSEO";
import visaBg from "../../../assets/Hero/visa_bg.jpg";
import {
    all196Countries,
    visaDestinationCountryAliases,
    visaDestinationImageOverrides,
} from "../../../data/countriesVisaData";

const normaliseCountry = (name = "") => name.trim().toLowerCase();

const getCountryHeroImage = (name) => {
    const key = visaDestinationCountryAliases[normaliseCountry(name)] || normaliseCountry(name);
    const override = Object.entries(visaDestinationImageOverrides).find(
        ([country]) => normaliseCountry(country) === key
    )?.[1];

    if (override) return override;
    return all196Countries.find((country) => normaliseCountry(country.name) === key)?.image || visaBg;
};


/**
 * Visa Search Results Page
 * 
 * Features:
 * - Real-time visa package listing based on nationality and destination country
 * - Comprehensive documentation requirements popup and fee breakdown breakdown
 * - Bulk visa sharing via Email, WhatsApp, and link copying
 * - Direct transition to VisaApplication checkout workflow
 */
const VisaResults = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [visas, setVisas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDocPopup, setActiveDocPopup] = useState(null);
    const [activePricePopup, setActivePricePopup] = useState(null);
    const [viewDetailsVisa, setViewDetailsVisa] = useState(null);
    const [emailModalVisa, setEmailModalVisa] = useState(null);
    const [sharingEmail, setSharingEmail] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);
    const [selectedVisas, setSelectedVisas] = useState([]);
    const [, setIsBulkSharing] = useState(false);
    const [viewBulkData, setViewBulkData] = useState(null);

    const getTomorrowDate = (days = 1) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    // Search state managed locally for interactivity
    const [citizenOf, setCitizenOf] = useState(searchParams.get("citizenOf") || "India");
    const [goingTo, setGoingTo] = useState(searchParams.get("goingTo") || "");
    const [departureDate, setDepartureDate] = useState(searchParams.get("departureDate") || getTomorrowDate(1));
    const [returnDate, setReturnDate] = useState(searchParams.get("returnDate") || "");

    const goingToParam = searchParams.get("goingTo");
    usePageSEO(
        goingToParam ? `${goingToParam} Visa Services | Goimomi Holidays` : "Visa Search Results | Goimomi Holidays",
        goingToParam ? `Explore visa options for ${goingToParam}. Get details on fees, processing time, and documents required for your trip.` : "Find the right visa for your next international trip with Goimomi Holidays.",
        undefined,
        goingToParam ? `${goingToParam} visa, visa fees, visa processing time, ${goingToParam} tourism visa` : "visa search, travel visa search, visa explorer"
    );

    // Dropdown and Search Logic
    const [countries, setCountries] = useState([]);
    const [countriesLoading, setCountriesLoading] = useState(false);
    const [showCitizenDropdown, setShowCitizenDropdown] = useState(false);
    const [showGoingToDropdown, setShowGoingToDropdown] = useState(false);
    const [citizenSearch, setCitizenSearch] = useState(searchParams.get("citizenOf") || "India");
    const [goingToSearch, setGoingToSearch] = useState(searchParams.get("goingTo") || "");

    const citizenRef = useRef(null);
    const goingToRef = useRef(null);

    useEffect(() => { fetchCountries(); }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (citizenRef.current && !citizenRef.current.contains(event.target)) {
                setShowCitizenDropdown(false);
            }
            if (goingToRef.current && !goingToRef.current.contains(event.target)) {
                setShowGoingToDropdown(false);
            }
            // Close price popup when clicking outside
            if (!event.target.closest(".price-info-container")) {
                setActivePricePopup(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchCountries = async () => {
        try {
            setCountriesLoading(true);
            const response = await api.get("/api/countries/");
            // Ensure response.data is an array and filter out any invalid entries
            const validCountries = Array.isArray(response.data) ? response.data.filter(c => c && c.name) : [];
            setCountries(validCountries);
        } catch (error) {
            console.error("Error fetching countries:", error);
            setCountries([]);
        } finally {
            setCountriesLoading(false);
        }
    };

    const fetchVisas = useCallback(async (signal) => {
        const country = goingToParam;
        setSelectedVisas([]);
        setVisas([]);

        if (!country) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await api.get(`/api/visas/?country=${encodeURIComponent(country)}`, { signal });

            // Ensure response.data is an array before filtering
            const rawData = Array.isArray(response.data) ? response.data : [];

            // Strict matching to prevent cross-contamination while supporting country aliases
            const normalise = (name = "") => {
                const clean = name.trim().toLowerCase();
                return visaDestinationCountryAliases[clean] || clean;
            };
            const strictFilteredVisas = rawData.filter(v => {
                if (!v || !v.country || !country) return false;
                return normalise(v.country) === normalise(country);
            });

            setVisas(strictFilteredVisas);
        } catch (error) {
            if (signal?.aborted) return;
            console.error("Error fetching visas:", error);
            setVisas([]);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [goingToParam]);

    useEffect(() => {
        const controller = new AbortController();
        fetchVisas(controller.signal);
        return () => controller.abort();
    }, [fetchVisas]);

    const handleSearchRefresh = () => {
        const destination = goingTo || goingToSearch;
        if (!destination) {
            alert("Please select a destination country");
            return;
        }
        const citizen = citizenOf || citizenSearch || "India";
        const params = new URLSearchParams({
            citizenOf: citizen,
            goingTo: destination,
            departureDate,
            returnDate
        });
        setSearchParams(params);
    };

    const filteredCitizenCountries = (countries || []).filter(c =>
        c && c.name && c.name.toLowerCase().includes((citizenSearch || "").toLowerCase())
    );

    const filteredGoingToCountries = (countries || []).filter(c =>
        c && c.name && c.name.toLowerCase().includes((goingToSearch || "").toLowerCase())
    );



    const handleSelect = (visa) => {
        navigate(`/visa/apply/${visa.id}`, {
            state: {
                visa,
                citizenOf,
                departureDate,
                returnDate
            }
        });
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
    };

    const toggleVisaSelection = (visa) => {
        setSelectedVisas(prev =>
            prev.some(v => v.id === visa.id)
                ? prev.filter(v => v.id !== visa.id)
                : [...prev, visa]
        );
    };

    const getSelectedVisasData = () => {
        return selectedVisas;
    };

    const generateBulkShareText = (selectedData) => {
        let text = `Hello, please find details with regards to your visa query for Multiple Options:\n\n`;

        selectedData.forEach((visa, index) => {
            text += `OPTION ${index + 1}:\n`;
            text += `VISA: ${visa.title}\n`;
            text += `Country: ${visa.country_details?.name || visa.country}\n`;
            text += `Type: ${visa.visa_type}\n`;
            text += `Entry: ${visa.entry_type}\n`;
            text += `Price: ₹${Number(visa.selling_price || 0).toLocaleString('en-IN')}\n`;
            text += `Processing Time: ${visa.processing_time}\n`;
            text += `Documents Required: ${visa.documents_required || "N/A"}\n`;
            text += `Photography Requirements: ${visa.photography_required || "N/A"}\n`;
            text += `-------------------------------------------------------------\n\n`;
        });

        text += `Thank you for choosing goimomi.com\n`;
        text += `In case of any support :\n`;
        text += `Contact : +91 8110082222\n`;
        text += `Email : hello@goimomi.com\n\n`;
        text += `Terms & Conditions: Visa approval depends on authorities. Fees non-refundable.`;

        return text;
    };

    const handleBulkView = () => {
        const selectedData = getSelectedVisasData();
        if (selectedData.length === 0) return;
        setViewBulkData(selectedData);
    };

    const handleBulkWhatsApp = () => {
        const selectedData = getSelectedVisasData();
        if (selectedData.length === 0) return;
        const text = generateBulkShareText(selectedData);
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleBulkEmailInitiate = () => {
        const selectedData = getSelectedVisasData();
        if (selectedData.length === 0) return;
        setIsBulkSharing(true);
        setEmailModalVisa({
            title: `${selectedData.length} Selected Visas`,
            isBulk: true,
            data: selectedData
        });
    };

    const handleEmailShare = async (e) => {
        e.preventDefault();
        if (!sharingEmail || !emailModalVisa) return;

        setSendingEmail(true);

        const selectedData = emailModalVisa.isBulk ? emailModalVisa.data : [emailModalVisa];
        const subject = emailModalVisa.isBulk
            ? `Visa Information: Multiple Options for ${selectedData[0]?.country_details?.name || selectedData[0]?.country}`
            : `Visa Information: ${emailModalVisa.country_details?.name || emailModalVisa.country} ${emailModalVisa.title}`;

        const body = emailModalVisa.isBulk
            ? generateBulkShareText(selectedData)
            : `Hello, please find details with regards to your visa query for:
${emailModalVisa.country_details?.name || emailModalVisa.country}
1 Adult
${emailModalVisa.visa_type}

Below mentioned prices are the total price(s) inclusive of taxes:
-------------------------------------------------------------
VISA: ${emailModalVisa.title}
Country: ${emailModalVisa.country_details?.name || emailModalVisa.country}
Type: ${emailModalVisa.visa_type}
Entry: ${emailModalVisa.entry_type}
Validity: ${emailModalVisa.validity || "N/A"}
Duration: ${emailModalVisa.duration || "N/A"}
Processing Time: ${emailModalVisa.processing_time}
Price: ₹${Number(emailModalVisa.selling_price || 0).toLocaleString('en-IN')}
-------------------------------------------------------------
Thank you for choosing goimomi.com
In case of any support :
Contact : +91 8110082222
Email : hello@goimomi.com

Terms & Conditions:
Visa approval, processing time, and entry depend on authorities. Fees are non-refundable, delays may occur, rules may change, and overstaying may cause penalties.`;

        try {
            await api.post('/api/send-visa-details/', {
                email: sharingEmail,
                subject,
                body
            });

            alert("Details sent successfully to " + sharingEmail);
            setEmailModalVisa(null);
            setSharingEmail("");
            setIsBulkSharing(false);
        } catch (error) {
            console.error("Error sending email:", error);
            window.location.href = `mailto:${sharingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            setEmailModalVisa(null);
            setSharingEmail("");
            setIsBulkSharing(false);
        } finally {
            setSendingEmail(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#14532d] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Searching for visas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Search Bar - Sticky & Interactive at the top */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 py-3.5">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex flex-col md:flex-row gap-2 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
                        {/* Citizen Of */}
                        <div className="flex-1 relative" ref={citizenRef}>
                            <div
                                className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                                onClick={() => setShowCitizenDropdown(!showCitizenDropdown)}
                            >
                                <Home size={16} className="text-gray-400" />
                                <div className="flex-1">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Citizen of</p>
                                    <input
                                        type="text"
                                        value={citizenSearch}
                                        onChange={(e) => {
                                            setCitizenSearch(e.target.value);
                                            setShowCitizenDropdown(true);
                                        }}
                                        className="w-full outline-none text-sm text-gray-900 font-bold placeholder:text-gray-300"
                                        placeholder="Country"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showCitizenDropdown ? 'rotate-180' : ''}`} />
                            </div>

                            {showCitizenDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto z-50">
                                    {countriesLoading ? (
                                        <div className="px-3 py-2 text-[10px] text-gray-400 text-center flex items-center justify-center gap-2 italic">
                                            <div className="w-3 h-3 border border-[#14532d] border-t-transparent rounded-full animate-spin"></div>
                                            Loading...
                                        </div>
                                    ) : filteredCitizenCountries.length > 0 ? (
                                        filteredCitizenCountries.map((country) => (
                                            <div
                                                key={country.id}
                                                className={`px-3 py-2 text-sm hover:bg-green-50 cursor-pointer flex items-center gap-2 ${citizenOf === country.name ? 'text-[#14532d] font-bold' : 'text-gray-700'}`}
                                                onClick={() => {
                                                    setCitizenOf(country.name);
                                                    setCitizenSearch(country.name);
                                                    setShowCitizenDropdown(false);
                                                }}
                                            >
                                                {country.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-xs text-gray-400 text-center italic">No results</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Going To */}
                        <div className="flex-1 relative" ref={goingToRef}>
                            <div
                                className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                                onClick={() => setShowGoingToDropdown(!showGoingToDropdown)}
                            >
                                <Plane size={16} className="text-gray-400" />
                                <div className="flex-1">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Going to</p>
                                    <input
                                        type="text"
                                        value={goingToSearch}
                                        onChange={(e) => {
                                            setGoingToSearch(e.target.value);
                                            setShowGoingToDropdown(true);
                                        }}
                                        className="w-full outline-none text-sm text-gray-900 font-bold placeholder:text-gray-300"
                                        placeholder="Destination"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${showGoingToDropdown ? 'rotate-180' : ''}`} />
                            </div>

                            {showGoingToDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto z-50">
                                    {countriesLoading ? (
                                        <div className="px-3 py-2 text-[10px] text-gray-400 text-center flex items-center justify-center gap-2 italic">
                                            <div className="w-3 h-3 border border-[#14532d] border-t-transparent rounded-full animate-spin"></div>
                                            Loading...
                                        </div>
                                    ) : filteredGoingToCountries.length > 0 ? (
                                        filteredGoingToCountries.map((country) => (
                                            <div
                                                key={country.id}
                                                className={`px-3 py-2 text-sm hover:bg-green-50 cursor-pointer flex items-center gap-2 ${goingTo === country.name ? 'text-[#14532d] font-bold' : 'text-gray-700'}`}
                                                onClick={() => {
                                                    setGoingTo(country.name);
                                                    setGoingToSearch(country.name);
                                                    setShowGoingToDropdown(false);
                                                }}
                                            >
                                                {country.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-3 py-2 text-xs text-gray-400 text-center italic">No results</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Departure Date */}
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100">
                            <Calendar size={16} className="text-gray-400" />
                            <div className="flex-1">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Departure</p>
                                <input
                                    type="date"
                                    value={departureDate}
                                    onChange={(e) => setDepartureDate(e.target.value)}
                                    className="w-full outline-none text-sm text-gray-900 font-bold"
                                />
                            </div>
                        </div>

                        {/* Return Date */}
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100">
                            <Calendar size={16} className="text-gray-400" />
                            <div className="flex-1">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Return</p>
                                <input
                                    type="date"
                                    value={returnDate}
                                    onChange={(e) => setReturnDate(e.target.value)}
                                    className="w-full outline-none text-sm text-gray-900 font-bold"
                                />
                            </div>
                        </div>

                        {/* Search Button */}
                        <button
                            onClick={handleSearchRefresh}
                            className="px-6 py-2 bg-[#14532d] hover:bg-[#0f4a24] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            <Search size={16} />
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Country Banner */}
            <section
                className="relative isolate w-full h-[280px] md:h-[360px] overflow-hidden flex items-center justify-center bg-[#082f3a]"
            >
                <img
                    src={getCountryHeroImage(goingTo)}
                    alt={`${goingTo || "International"} visa destination`}
                    className="absolute inset-0 z-0 block h-full w-full object-cover object-center"
                    onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = visaBg;
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#062d38]/85 via-[#062d38]/65 to-[#062d38]/95" />
                <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
                    <div className="flex items-center justify-center gap-3 text-emerald-400 mb-3">
                        <div className="w-8 h-[2px] bg-emerald-400" />
                        <span className="text-[11px] uppercase tracking-[0.4em] font-black">
                            Visa Requirements & Processing
                        </span>
                        <div className="w-8 h-[2px] bg-emerald-400" />
                    </div>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase italic tracking-tighter text-white leading-none mb-3">
                        {goingTo ? `${goingTo} Visas` : "International Visas"}
                    </h1>
                    <p className="text-slate-300 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                        Accurate, hassle-free visa processing for {goingTo || "your destination"} with certified documentation support and 98% approval rate.
                    </p>
                </div>
            </section>

            {/* Results */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
                {goingTo && visas.length > 0 && (
                    <div className="mb-5 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.28em] font-black text-[#14532d]">Visa data cards</p>
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">Available options for {goingTo}</h2>
                        </div>
                        <span className="hidden sm:block text-xs font-bold text-gray-400">{visas.length} option{visas.length === 1 ? "" : "s"}</span>
                    </div>
                )}
                {visas.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                        <p className="text-gray-600 text-lg">No visas found for {goingTo}</p>
                        <button
                            onClick={() => navigate("/visa")}
                            className="mt-4 text-[#14532d] hover:text-[#0f4a24] font-semibold"
                        >
                            Try another search
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {visas.map((visa) => {

                            return (
                                <div
                                    key={visa.id}
                                    className={`bg-white rounded-2xl shadow-md border-2 transition-all relative ${selectedVisas.some(v => v.id === visa.id) ? 'border-[#14532d] ring-4 ring-[#14532d]/10' : 'border-gray-200'}`}
                                >
                                    {/* Selection Checkbox */}
                                    <div
                                        className="absolute top-4 left-4 z-20 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleVisaSelection(visa);
                                        }}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedVisas.some(v => v.id === visa.id) ? 'bg-[#14532d] border-[#14532d]' : 'bg-white/50 backdrop-blur-sm border-white'}`}>
                                            {selectedVisas.some(v => v.id === visa.id) && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                    </div>
                                    {/* Header with Background Image/Video */}
                                    <div className="relative min-h-[5.5rem] md:h-24 bg-[#14532d] border-b border-black/10 rounded-t-2xl overflow-hidden p-3 flex flex-col justify-between">
                                        {visa.card_image && (
                                            <img
                                                src={getImageUrl(visa.card_image)}
                                                alt={visa.title}
                                                className="absolute inset-0 w-full h-full object-cover opacity-60"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#14532d] to-transparent" />

                                        {/* Share Bar */}
                                        <div className="self-end flex items-center gap-2 md:gap-3 bg-black/20 backdrop-blur-md px-2 md:px-3 py-1 rounded-lg border border-white/10 z-10 transition-all hover:bg-black/30">
                                            <div className="flex items-center gap-1.5 text-white/90 font-bold text-[9px] md:text-[10px] uppercase tracking-wider">
                                                <Share2 size={11} className="text-white/70" />
                                                <span className="hidden sm:inline">Share By :</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 md:gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const text = `Hello, please find details with regards to your visa query for:
${visa.country_details?.name || visa.country}
1 Adult
${visa.visa_type}

Below mentioned prices are the total price(s) inclusive of taxes:
-------------------------------------------------------------
VISA: ${visa.title}
Country: ${visa.country_details?.name || visa.country}
Type: ${visa.visa_type}
Entry: ${visa.entry_type}
Validity: ${visa.validity || "N/A"}
Duration: ${visa.duration || "N/A"}
Processing Time: ${visa.processing_time}
Price: ₹${Number(visa.selling_price || 0).toLocaleString('en-IN')}
-------------------------------------------------------------
Thank you for choosing goimomi.com
In case of any support :
Contact : +91 8110082222
Email : hello@goimomi.com

Terms & Conditions:
Visa approval, processing time, and entry depend on authorities. Fees are non-refundable, delays may occur, rules may change, and overstaying may cause penalties.`;
                                                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                                    }}
                                                    className="flex items-center gap-1 text-white hover:text-white/80 font-bold text-[9px] md:text-[10px] transition-colors"
                                                >
                                                    <MessageCircle size={12} />
                                                    WhatsApp
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEmailModalVisa(visa);
                                                    }}
                                                    className="flex items-center gap-1 text-white hover:text-white/80 font-bold text-[9px] md:text-[10px] transition-colors"
                                                >
                                                    <Mail size={12} />
                                                    Email
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewDetailsVisa(visa);
                                                    }}
                                                    className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400 font-bold text-[9px] md:text-[10px] transition-colors"
                                                >
                                                    <Eye size={12} />
                                                    View
                                                </button>
                                            </div>
                                        </div>

                                        <div className="z-10 text-white pl-6 md:pl-8 pr-2 mt-auto">
                                            <h3 className="text-lg md:text-2xl font-bold drop-shadow-md leading-tight">{visa.title}</h3>
                                            {visa.country_details?.name && (
                                                <p className="text-[10px] md:text-xs font-medium text-green-100 uppercase tracking-widest mt-0.5">{visa.country_details.name}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content Container */}
                                    <div className="p-6">


                                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                            {/* Details Grid */}
                                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 bg-gray-50/50 p-4 rounded-xl w-full">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</span>
                                                    <span className="text-sm font-semibold text-gray-900 line-clamp-1">{visa.visa_type}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Entry</span>
                                                    <span className="text-sm font-semibold text-gray-900">{visa.entry_type}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Validity</span>
                                                    <span className="text-sm font-semibold text-gray-900">{visa.validity || "N/A"}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Duration</span>
                                                    <span className="text-sm font-semibold text-gray-900">{visa.duration || "N/A"}</span>
                                                </div>

                                                {/* Documents - Popup */}
                                                <div className="flex flex-col gap-1 relative">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Documents</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDocPopup(activeDocPopup === `doc_${visa.id}` ? null : `doc_${visa.id}`);
                                                        }}
                                                        className="text-sm font-semibold text-[#14532d] hover:underline text-left"
                                                    >
                                                        View Here
                                                    </button>

                                                    {activeDocPopup === `doc_${visa.id}` && (
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-44 bg-white rounded-lg shadow-2xl border border-gray-100 z-[100] p-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            {/* Arrow */}
                                                            <div className="absolute -top-1 w-2 h-2 bg-white border-t border-l border-gray-100 rotate-45 left-1/2 -translate-x-1/2"></div>
                                                            <div className="flex justify-between items-center mb-1.5 px-0.5">
                                                                <h4 className="font-bold text-gray-900 text-[9px] uppercase tracking-wider">Documents</h4>
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCopy(visa.documents_required);
                                                                        }}
                                                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1 rounded transition-colors"
                                                                    >
                                                                        <Copy size={9} />
                                                                        <span className="text-[8px] font-bold">Copy</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDocPopup(null);
                                                                        }}
                                                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                                <ul className="list-disc pl-3 space-y-0.5">
                                                                    {visa.documents_required ? visa.documents_required.split(',').map((doc, idx) => (
                                                                        <li key={idx} className="text-[10px] text-gray-700 leading-tight">{doc.trim()}</li>
                                                                    )) : (
                                                                        <li className="text-[9px] text-gray-500 italic">No docs listed.</li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Photography - Popup */}
                                                <div className="flex flex-col gap-1 relative">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Photo</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveDocPopup(activeDocPopup === `photo_${visa.id}` ? null : `photo_${visa.id}`);
                                                        }}
                                                        className="text-sm font-semibold text-[#14532d] hover:underline text-left"
                                                    >
                                                        View Here
                                                    </button>

                                                    {activeDocPopup === `photo_${visa.id}` && (
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-44 bg-white rounded-lg shadow-2xl border border-gray-100 z-[100] p-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            {/* Arrow */}
                                                            <div className="absolute -top-1 w-2 h-2 bg-white border-t border-l border-gray-100 rotate-45 left-1/2 -translate-x-1/2"></div>
                                                            <div className="flex justify-between items-center mb-1.5 px-0.5">
                                                                <h4 className="font-bold text-gray-900 text-[9px] uppercase tracking-wider">Photography</h4>
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCopy(visa.photography_required);
                                                                        }}
                                                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1 rounded transition-colors"
                                                                    >
                                                                        <Copy size={9} />
                                                                        <span className="text-[8px] font-bold">Copy</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDocPopup(null);
                                                                        }}
                                                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                                <ul className="list-disc pl-3 space-y-0.5">
                                                                    {visa.photography_required ? visa.photography_required.split(',').map((req, idx) => (
                                                                        <li key={idx} className="text-[10px] text-gray-700 leading-tight">{req.trim()}</li>
                                                                    )) : (
                                                                        <li className="text-[9px] text-gray-500 italic">No requirements listed.</li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Processing Time</span>
                                                    <span className="text-sm font-semibold text-gray-900">{visa.processing_time}</span>
                                                </div>
                                            </div>

                                            {/* Price and Action */}
                                            <div className="flex flex-row md:flex-col items-center md:items-end gap-4 min-w-[150px]">
                                                <div className="flex items-center gap-1 relative price-info-container">
                                                    <span className="text-xl font-bold text-gray-900">₹{Number(visa.selling_price || 0).toLocaleString('en-IN')}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActivePricePopup(activePricePopup === visa.id ? null : visa.id);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                                    >
                                                        <svg className="w-4 h-4 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>

                                                    {activePricePopup === visa.id && (
                                                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[60] p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                            <div className="flex flex-col gap-1">
                                                                <p className="text-xs font-bold text-gray-900">Conditions Applied</p>
                                                                <div className="h-0.5 w-8 bg-green-600 rounded-full mb-1"></div>
                                                                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                                                                    Prices are dynamic and subject to change based on embassy rules and availability.
                                                                </p>
                                                            </div>
                                                            {/* Arrow */}
                                                            <div className="absolute -bottom-1.5 right-1 w-3 h-3 bg-white border-b border-r border-gray-100 rotate-45"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleSelect(visa)}
                                                    className="px-8 py-2 bg-white border border-[#14532d] text-[#14532d] rounded-full font-semibold hover:bg-[#14532d] hover:text-white transition-all text-sm"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* View Details Modal */}
            {viewDetailsVisa && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewDetailsVisa(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-4 py-3 border-b">
                            <button
                                onClick={() => {
                                    const text = `Hello, please find details with regards to your visa query for:
${viewDetailsVisa.country_details?.name || viewDetailsVisa.country}
1 Adult
${viewDetailsVisa.visa_type}

Below mentioned prices are the total price(s) inclusive of taxes:
-------------------------------------------------------------
VISA: ${viewDetailsVisa.title}
Country: ${viewDetailsVisa.country_details?.name || viewDetailsVisa.country}
Type: ${viewDetailsVisa.visa_type}
Entry: ${viewDetailsVisa.entry_type}
Validity: ${viewDetailsVisa.validity || "N/A"}
Duration: ${viewDetailsVisa.duration || "N/A"}
Processing Time: ${viewDetailsVisa.processing_time}
Documents Required: ${viewDetailsVisa.documents_required || "N/A"}
Photography Requirements: ${viewDetailsVisa.photography_required || "N/A"}
Price: ₹${Number(viewDetailsVisa.selling_price || 0).toLocaleString('en-IN')}
-------------------------------------------------------------
Thank you for choosing goimomi.com
In case of any support :
Contact : +91 8110082222
Email : hello@goimomi.com

Terms & Conditions:
Visa approval, processing time, and entry depend on authorities. Fees are non-refundable, delays may occur, rules may change, and overstaying may cause penalties.`;
                                    navigator.clipboard.writeText(text);
                                    alert("Details copied to clipboard!");
                                }}
                                className="flex items-center gap-1.5 text-[#14532d] font-bold text-[10px] hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors border border-green-100"
                            >
                                <Copy size={12} />
                                Copy
                            </button>
                            <h3 className="text-base font-bold text-gray-800">View Details</h3>
                            <button onClick={() => setViewDetailsVisa(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 max-h-[70vh] overflow-y-auto">
                            <div className="font-sans text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                                <p>Hello, please find details with regards to your visa query for:</p>
                                <p className="font-bold">{viewDetailsVisa.country_details?.name || viewDetailsVisa.country}</p>
                                <p>1 Adult</p>
                                <p>{viewDetailsVisa.visa_type}</p>
                                <br />
                                <p>Below mentioned prices are the total price(s) inclusive of taxes:</p>
                                <p className="text-gray-400 text-[10px]">-------------------------------------------------------------</p>
                                <div className="space-y-2">
                                    <div className="space-y-0.5">
                                        <p><span className="font-bold">VISA:</span> {viewDetailsVisa.title}</p>
                                        <p><span className="font-bold">Country:</span> {viewDetailsVisa.country_details?.name || viewDetailsVisa.country}</p>
                                        <p><span className="font-bold">Type:</span> {viewDetailsVisa.visa_type}</p>
                                        <p><span className="font-bold">Entry:</span> {viewDetailsVisa.entry_type}</p>
                                        <p><span className="font-bold">Validity:</span> {viewDetailsVisa.validity || "N/A"}</p>
                                        <p><span className="font-bold">Duration:</span> {viewDetailsVisa.duration || "N/A"}</p>
                                        <p><span className="font-bold">Processing Time:</span> {viewDetailsVisa.processing_time}</p>
                                    </div>

                                    {viewDetailsVisa.documents_required && (
                                        <div>
                                            <p className="font-bold mb-1">Documents Required:</p>
                                            <ul className="list-disc pl-4 space-y-0.5">
                                                {viewDetailsVisa.documents_required.split(',').map((doc, idx) => (
                                                    <li key={idx} className="text-gray-600">{doc.trim()}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {viewDetailsVisa.photography_required && (
                                        <div>
                                            <p className="font-bold mb-1">Photography Requirements:</p>
                                            <ul className="list-disc pl-4 space-y-0.5">
                                                {viewDetailsVisa.photography_required.split(',').map((req, idx) => (
                                                    <li key={idx} className="text-gray-600">{req.trim()}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <p className="pt-1"><span className="font-bold">Price:</span> ₹{Number(viewDetailsVisa.selling_price || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <p className="text-gray-400 text-[10px]">-------------------------------------------------------------</p>
                                <p>Thank you for choosing goimomi.com</p>
                                <p>In case of any support :</p>
                                <p>Contact : <span className="font-bold">+91 8110082222</span></p>
                                <p>Email : <span className="font-bold">hello@goimomi.com</span></p>
                                <br />
                                <div className="border-t border-gray-100 pt-3 mt-1">
                                    <p className="font-bold text-[10px] text-gray-900 mb-1 tracking-wider uppercase">Terms & Conditions:</p>
                                    <p className="text-gray-500 text-[10px] leading-relaxed italic">
                                        Visa approval, processing time, and entry depend on authorities. Fees are non-refundable, delays may occur, rules may change, and overstaying may cause penalties.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Email Share Modal */}
            {emailModalVisa && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEmailModalVisa(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Share via Email</h3>
                                <button onClick={() => setEmailModalVisa(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-6">Enter the email address where you'd like to send the visa details.</p>

                            <form onSubmit={handleEmailShare} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="example@email.com"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14532d]/20 focus:border-[#14532d] outline-none transition-all text-sm"
                                        value={sharingEmail}
                                        onChange={(e) => setSharingEmail(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={sendingEmail}
                                    className="w-full py-3 bg-[#14532d] hover:bg-[#0f4a24] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#14532d]/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {sendingEmail ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail size={16} />
                                            Send Details
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk View Modal */}
            {viewBulkData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewBulkData(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-4 py-3 border-b">
                            <button
                                onClick={() => {
                                    const text = generateBulkShareText(viewBulkData);
                                    navigator.clipboard.writeText(text);
                                    alert("All details copied to clipboard!");
                                }}
                                className="flex items-center gap-1.5 text-[#14532d] font-bold text-[10px] hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors border border-green-100"
                            >
                                <Copy size={12} />
                                Copy All
                            </button>
                            <h3 className="text-base font-bold text-gray-800">Selected Visas</h3>
                            <button onClick={() => setViewBulkData(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 max-h-[70vh] overflow-y-auto">
                            <div className="font-sans text-[12px] text-gray-700 leading-relaxed">
                                <p className="mb-4">Hello, please find details with regards to your visa query for Multiple Options:</p>

                                {viewBulkData.map((visa, index) => (
                                    <div key={index} className="mb-6 border-b border-gray-100 pb-4 last:border-0 last:mb-0 last:pb-0">
                                        <p className="font-bold text-[#14532d] mb-2">OPTION {index + 1}</p>
                                        <div className="space-y-0.5">
                                            <p><span className="font-bold">VISA:</span> {visa.title}</p>
                                            <p><span className="font-bold">Country:</span> {visa.country_details?.name || visa.country}</p>
                                            <p><span className="font-bold">Type:</span> {visa.visa_type}</p>
                                            <p><span className="font-bold">Entry:</span> {visa.entry_type}</p>
                                            <p><span className="font-bold">Processing Time:</span> {visa.processing_time}</p>

                                            {visa.documents_required && (
                                                <div className="mt-1">
                                                    <p className="font-bold text-[11px]">Documents:</p>
                                                    <ul className="list-disc pl-4 space-y-0.5">
                                                        {visa.documents_required.split(',').map((doc, idx) => (
                                                            <li key={idx} className="text-gray-600">{doc.trim()}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {visa.photography_required && (
                                                <div className="mt-1">
                                                    <p className="font-bold text-[11px]">Photography:</p>
                                                    <ul className="list-disc pl-4 space-y-0.5">
                                                        {visa.photography_required.split(',').map((req, idx) => (
                                                            <li key={idx} className="text-gray-600">{req.trim()}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <p className="pt-1"><span className="font-bold">Price:</span> ₹{Number(visa.selling_price || 0).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                ))}

                                <p className="text-gray-400 text-[10px]">-------------------------------------------------------------</p>
                                <p>Thank you for choosing goimomi.com</p>
                                <p>In case of any support :</p>
                                <p>Contact : <span className="font-bold">+91 8110082222</span></p>
                                <p>Email : <span className="font-bold">hello@goimomi.com</span></p>
                                <br />
                                <div className="border-t border-gray-100 pt-3 mt-1">
                                    <p className="font-bold text-[10px] text-gray-900 mb-1 tracking-wider uppercase">Terms & Conditions:</p>
                                    <p className="text-gray-500 text-[10px] leading-relaxed italic">
                                        Visa approval, processing time, and entry depend on authorities. Fees are non-refundable, delays may occur, rules may change, and overstaying may cause penalties.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Multi-Share Bar */}
            {selectedVisas.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] w-[90%] max-w-lg">
                    <div className="bg-[#14532d] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold">{selectedVisas.length} Visas Selected</span>
                            <button
                                onClick={() => setSelectedVisas([])}
                                className="text-[10px] text-green-200 hover:text-white underline text-left"
                            >
                                Clear Selection
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBulkView}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 text-yellow-400"
                            >
                                <Eye size={14} />
                                View
                            </button>
                            <button
                                onClick={handleBulkWhatsApp}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 text-white"
                            >
                                <MessageCircle size={14} />
                                Share WhatsApp
                            </button>
                            <button
                                onClick={handleBulkEmailInitiate}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 text-white"
                            >
                                <Mail size={14} />
                                Share Email
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ---------------- WHY CHOOSE US SECTION (PREMIUM DESIGN) ---------------- */}
            <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-[#14532d]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-[#14532d] tracking-tight mb-4">
                            Trust the Experts
                        </h2>
                        <div className="w-20 h-1.5 bg-gradient-to-r from-[#14532d] to-[#22c55e] mx-auto rounded-full"></div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Why Goimomi Holidays */}
                        <div className="group bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white/40 hover:border-[#14532d]/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl fade-up">
                            <div className="w-14 h-14 bg-gradient-to-br from-[#14532d] to-[#22c55e] rounded-2xl flex items-center justify-center text-white mb-6 transform group-hover:rotate-6 transition-transform shadow-lg shadow-green-200">
                                <Zap size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight">Why Goimomi Holidays?</h3>
                            <p className="text-gray-600 text-[13px] leading-relaxed font-medium">
                                Established in 2010, Goimomi Holidays has since positioned itself as one of the leading companies,
                                providing <span className="text-[#14532d] font-bold">great offers</span>, competitive airfares, and a <span className="text-[#14532d] font-bold">seamless booking experience</span>. We deliver amazing perks like Instant Discounts and MyRewardsProgram to make every journey better.
                            </p>
                        </div>

                        {/* Booking Flights with Goimomi Holidays */}
                        <div className="group bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white/40 hover:border-[#14532d]/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl fade-up" style={{ animationDelay: "0.1s" }}>
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center text-white mb-6 transform group-hover:rotate-6 transition-transform shadow-lg shadow-blue-200">
                                <Search size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight">Smart Flight Booking</h3>
                            <p className="text-gray-600 text-[13px] leading-relaxed font-medium">
                                Find the <span className="text-blue-600 font-bold">best deals</span> in just a few clicks. Our 24/7 dedicated helpline caters to over <span className="text-blue-600 font-bold">5 million happy customers</span>. Experience personalized travel planning that puts your convenience first, every single time.
                            </p>
                        </div>

                        {/* Domestic Flights with Goimomi Holidays */}
                        <div className="group bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl border border-white/40 hover:border-[#14532d]/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl fade-up" style={{ animationDelay: "0.2s" }}>
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-300 rounded-2xl flex items-center justify-center text-white mb-6 transform group-hover:rotate-6 transition-transform shadow-lg shadow-amber-200">
                                <Plane size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight">Leading Domestic Expert</h3>
                            <p className="text-gray-600 text-[13px] leading-relaxed font-medium">
                                India's <span className="text-amber-600 font-bold">leading player</span> for flight bookings. We guarantee the lowest prices with instant notifications for fare drops, <span className="text-amber-600 font-bold">amazing discounts</span>, and effortless rebook options for your domestic travel.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};


export default VisaResults;



