import { useState, useRef, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../api";
import { CheckCircle, Upload, User, FileText, Image as ImageIcon, Trash2, X, Plus, MapPin, Zap, Loader2, Sparkles } from "lucide-react";
import { getImageUrl } from "../../../utils/imageUtils";
import { parsePassportImage } from "../../../utils/passportParser";
import usePageSEO from "../../../hooks/usePageSEO";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import visaBg from "../../../assets/Hero/visa_bg.jpg";



/**
 * Visa Online Application & Document Upload Workflow
 * 
 * Features:
 * - Multi-step traveler application pipeline (Internal ID, Group Name, Traveler Docs, Review, Submit)
 * - Automated Passport OCR parsing using Tesseract.js / PassportParser
 * - File upload and validation for passport front/back, photograph, and supplemental documents
 * - Real-time quotation, processing fee calculation, and payment checkout
 */
const VisaApplication = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const visa = location.state?.visa;
    const getTomorrowDate = (days = 1) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    const [appDepartureDate, setAppDepartureDate] = useState(location.state?.departureDate || getTomorrowDate(1));
    const [appReturnDate, setAppReturnDate] = useState(location.state?.returnDate || "");
    const citizenOf = location.state?.citizenOf || "India";

    // Steps for Sidebar
    const steps = [
        { id: "internal_id", label: "Internal ID" },
        { id: "group_name", label: "Group Name" },
        { id: "traveler_1", label: "Traveler 1", subSteps: ["Passport", "Traveler Photo"] },
        { id: "review", label: "Review" },
        { id: "submit", label: "Submit" }
    ];

    const [visaData, setVisaData] = useState(visa || null);
    const [isLoadingVisa, setIsLoadingVisa] = useState(!visa);
    const [selectedVisaType, setSelectedVisaType] = useState(visa?.title || "");

    useEffect(() => {
        if (visaData) {
            setSelectedVisaType(visaData.title);
        }
    }, [visaData]);

    // Data State
    const [countries, setCountries] = useState([]);

    // Travelers State
    const [applicants, setApplicants] = useState([{
        first_name: "",
        last_name: "",
        phone: "",
        passport_number: "",
        nationality: citizenOf,
        sex: "",
        dob: "",
        place_of_birth: "",
        place_of_issue: "",
        date_of_issue: "",
        date_of_expiry: "",
        passport_front: null,
        photo: null,
        passport_front_preview: null,
        photo_preview: null,
        additional_documents: []
    }]);

    const [errors, setErrors] = useState({});

    const [submitting, setSubmitting] = useState(false);
    const [pricePopupOpen, setPricePopupOpen] = useState(false);
    const pricePopupRef = useRef(null);

    // Refs for scrolling to sections

    const [currentStep] = useState("internal_id");

    // Form State
    const [applicationType, setApplicationType] = useState("Individual");
    const [internalId, setInternalId] = useState("");
    const [groupName, setGroupName] = useState("");

    useEffect(() => {
        if (!visa && id) {
            const fetchVisa = async () => {
                try {
                    setIsLoadingVisa(true);
                    const response = await api.get(`/api/visas/${id}/`);
                    setVisaData(response.data);
                } catch (error) {
                    console.error("Error fetching visa:", error);
                } finally {
                    setIsLoadingVisa(false);
                }
            };
            fetchVisa();
        }
    }, [visa, id]);

    // Use visaData instead of visa for the rest of the component
    const currentVisa = visaData;
    const VISA_FEES = Number(currentVisa?.cost_price) || 0;
    const SERVICE_FEES = Number(currentVisa?.service_charge) || 0;
    const TOTAL_PRICE = (VISA_FEES + SERVICE_FEES) * (applicants?.length || 1);

    usePageSEO(
        currentVisa ? `Apply for ${currentVisa.title} | Goimomi Holidays` : "Visa Application | Goimomi Holidays",
        currentVisa ? `Submit your application for ${currentVisa.title} for ${currentVisa.country}. Fast and secure online visa processing with Goimomi Holidays.` : "Complete your international visa application with Goimomi Holidays.",
        currentVisa?.card_image ? getImageUrl(currentVisa.card_image) : undefined,
        currentVisa ? `apply for ${currentVisa.title}, ${currentVisa.country} visa application, online visa form` : "visa application, online visa form"
    );



    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const response = await api.get("/api/countries/");
                setCountries(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error("Error fetching countries:", error);
            }
        };
        fetchCountries();
    }, []);

    // Close price popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pricePopupRef.current && !pricePopupRef.current.contains(event.target)) {
                setPricePopupOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleApplicantChange = (index, field, value) => {
        if (!applicants[index]) return;
        setApplicants(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });

        // Clear error for this field
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[`applicant_${index}_${field}`];
            return newErrors;
        });
    };

    const handleFileChange = async (index, field, file) => {
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setApplicants(prev => {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    [field]: file,
                    [`${field}_preview`]: previewUrl,
                    ...(field === 'passport_front' ? { is_scanning: true, scan_status: 'scanning' } : {})
                };
                return updated;
            });

            // Clear error
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`applicant_${index}_${field}`];
                return newErrors;
            });

            // Auto-fill form fields if uploading passport front
            if (field === 'passport_front' && file.type.startsWith('image/')) {
                try {
                    const parsedData = await parsePassportImage(file);
                    setApplicants(prev => {
                        const updated = [...prev];
                        if (!updated[index]) return prev;
                        const curr = updated[index];
                        updated[index] = {
                            ...curr,
                            is_scanning: false,
                            scan_status: 'completed',
                            passport_number: parsedData.passport_number || curr.passport_number,
                            first_name: parsedData.first_name || curr.first_name,
                            last_name: parsedData.last_name || curr.last_name,
                            nationality: parsedData.nationality || curr.nationality,
                            sex: parsedData.sex || curr.sex,
                            dob: parsedData.dob || curr.dob,
                            place_of_birth: parsedData.place_of_birth || curr.place_of_birth,
                            place_of_issue: parsedData.place_of_issue || curr.place_of_issue,
                            date_of_issue: parsedData.date_of_issue || curr.date_of_issue,
                            date_of_expiry: parsedData.date_of_expiry || curr.date_of_expiry,
                        };
                        return updated;
                    });
                } catch (err) {
                    console.error("Passport parsing error:", err);
                    setApplicants(prev => {
                        const updated = [...prev];
                        if (updated[index]) {
                            updated[index] = { ...updated[index], is_scanning: false, scan_status: 'failed' };
                        }
                        return updated;
                    });
                }
            }
        }
    };

    const removeFile = (index, field) => {
        setApplicants(prev => {
            const updated = [...prev];
            if (!updated[index]) return prev;
            updated[index] = {
                ...updated[index],
                [field]: null,
                [`${field}_preview`]: null
            };
            return updated;
        });
    };

    const addAdditionalDocument = (applicantIndex) => {
        setApplicants(prev => {
            const updated = [...prev];
            if (!updated[applicantIndex]) return prev;
            updated[applicantIndex] = {
                ...updated[applicantIndex],
                additional_documents: [
                    ...updated[applicantIndex].additional_documents,
                    { id: Date.now() + Math.random(), file: null, preview: null }
                ]
            };
            return updated;
        });
    };

    const removeAdditionalDocument = (applicantIndex, docIndex) => {
        setApplicants(prev => {
            const updated = [...prev];
            if (!updated[applicantIndex]) return prev;
            const newDocs = [...updated[applicantIndex].additional_documents];
            newDocs.splice(docIndex, 1);
            updated[applicantIndex] = {
                ...updated[applicantIndex],
                additional_documents: newDocs
            };
            return updated;
        });
    };

    const handleAdditionalFileChange = (applicantIndex, docIndex, file) => {
        if (file) {
            setApplicants(prev => {
                const updated = [...prev];
                if (!updated[applicantIndex]) return prev;
                const newDocs = [...updated[applicantIndex].additional_documents];
                newDocs[docIndex] = {
                    ...newDocs[docIndex],
                    file: file,
                    preview: URL.createObjectURL(file)
                };
                updated[applicantIndex] = {
                    ...updated[applicantIndex],
                    additional_documents: newDocs
                };
                return updated;
            });
        }
    };

    const addApplicant = () => {
        setApplicants([...applicants, {
            first_name: "",
            last_name: "",
            phone: "",
            passport_number: "",
            nationality: citizenOf,
            sex: "",
            dob: "",
            place_of_birth: "",
            place_of_issue: "",
            date_of_issue: "",
            date_of_expiry: "",
            passport_front: null,
            photo: null,
            passport_front_preview: null,
            photo_preview: null,
            additional_documents: []
        }]);
    };

    const removeApplicant = (index) => {
        const updated = applicants.filter((_, i) => i !== index);
        setApplicants(updated);
    };

    const validateForm = () => {
        let newErrors = {};
        let isValid = true;

        if (!appDepartureDate) {
            newErrors.departure_date = "Departure date is required";
            isValid = false;
        }
        if (!appReturnDate) {
            newErrors.return_date = "Return date is required";
            isValid = false;
        } else if (appDepartureDate && new Date(appReturnDate) <= new Date(appDepartureDate)) {
            newErrors.return_date = "Return date must be after departure date";
            isValid = false;
        }

        applicants.forEach((applicant, index) => {
            // Passport Number
            if (!applicant.passport_number.trim()) {
                newErrors[`applicant_${index}_passport_number`] = "Passport number is required";
                isValid = false;
            } else if (!/^[a-zA-Z0-9]+$/.test(applicant.passport_number)) {
                newErrors[`applicant_${index}_passport_number`] = "Invalid passport format (alphanumeric only)";
                isValid = false;
            }

            // First Name
            if (!applicant.first_name.trim()) {
                newErrors[`applicant_${index}_first_name`] = "First name is required";
                isValid = false;
            }

            // Phone validation: MUST be at least 10 digits total, and exactly 10 after +91
            const phoneDigits = (applicant.phone || "").replace(/\D/g, "");
            if (!phoneDigits || phoneDigits.length < 10) {
                newErrors[`applicant_${index}_phone`] = "At least 10 digits required";
                isValid = false;
            } else if (phoneDigits.startsWith("91") && phoneDigits.length !== 12) {
                // For India (91), it should be 12 digits (91 + 10 digits).
                newErrors[`applicant_${index}_phone`] = "Exactly 10 digits required after +91";
                isValid = false;
            }

            // Nationality
            if (!applicant.nationality) {
                newErrors[`applicant_${index}_nationality`] = "Nationality is required";
                isValid = false;
            }

            // Sex
            if (!applicant.sex) {
                newErrors[`applicant_${index}_sex`] = "Sex is required";
                isValid = false;
            }

            // DOB
            if (!applicant.dob) {
                newErrors[`applicant_${index}_dob`] = "Date of birth is required";
                isValid = false;
            } else {
                const dobDate = new Date(applicant.dob);
                const today = new Date();
                // Set today's time to 00:00:00 for accurate date comparison
                today.setHours(0, 0, 0, 0);
                if (dobDate >= today) {
                    newErrors[`applicant_${index}_dob`] = "Date of birth must be in the past";
                    isValid = false;
                }
            }

            // Place of Birth
            if (!applicant.place_of_birth.trim()) {
                newErrors[`applicant_${index}_place_of_birth`] = "Place of birth is required";
                isValid = false;
            }

            // Place of Issue
            if (!applicant.place_of_issue.trim()) {
                newErrors[`applicant_${index}_place_of_issue`] = "Place of issue is required";
                isValid = false;
            }


            // Date of Issue
            if (!applicant.date_of_issue) {
                newErrors[`applicant_${index}_date_of_issue`] = "Date of issue is required";
                isValid = false;
            }

            // Date of Expiry
            if (!applicant.date_of_expiry) {
                newErrors[`applicant_${index}_date_of_expiry`] = "Date of expiry is required";
                isValid = false;
            } else {
                const expiryDate = new Date(applicant.date_of_expiry);
                const today = new Date();
                // Set today's time to 00:00:00 for accurate date comparison
                today.setHours(0, 0, 0, 0);
                if (expiryDate <= today) {
                    newErrors[`applicant_${index}_date_of_expiry`] = "Passport has expired";
                    isValid = false;
                }
            }

            // Files
            if (!applicant.passport_front) {
                newErrors[`applicant_${index}_passport_front`] = "Passport image is required";
                isValid = false;
            }
            if (!applicant.photo) {
                newErrors[`applicant_${index}_photo`] = "Traveler photo is required";
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            // Scroll to the first error
            const firstErrorField = document.querySelector('.text-red-500.text-xs.mt-1, .text-red-500.text-xs.mt-2');
            if (firstErrorField) {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("visa", id);
            formData.append("application_type", applicationType);
            formData.append("internal_id", internalId);
            formData.append("group_name", groupName);
            formData.append("departure_date", appDepartureDate);
            formData.append("return_date", appReturnDate);
            formData.append("total_price", TOTAL_PRICE);

            // Filter out previews and nulls
            const applicantsData = applicants.map(({ passport_front, photo, passport_front_preview, photo_preview, ...rest }) => rest);
            formData.append("applicants_data", JSON.stringify(applicantsData));

            applicants.forEach((applicant, index) => {
                if (applicant.passport_front) {
                    formData.append(`applicant_${index}_passport_front`, applicant.passport_front);
                }
                if (applicant.photo) {
                    formData.append(`applicant_${index}_photo`, applicant.photo);
                }

                // Append additional documents
                applicant.additional_documents.forEach((doc, docIndex) => {
                    if (doc.file) {
                        formData.append(`applicant_${index}_additional_doc_${docIndex}`, doc.file);
                    }
                });
            });

            const response = await api.post("/api/visa-applications/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.data && response.data.payment_url) {
                window.location.href = response.data.payment_url;
            } else {
                alert("Application submitted successfully!");
                navigate("/");
            }
        } catch (error) {
            console.error("Error submitting application:", error);
            alert("Failed to submit application. Please try again.");
            setSubmitting(false);
        }
    };

    // Check if steps are complete for Sidebar visual feedback
    const isStepComplete = (stepId) => {
        switch (stepId) {
            case "internal_id":
                return internalId.trim().length > 0;
            case "group_name":
                return groupName.trim().length > 0;
            case "traveler_1": {
                // Basic check for traveler 1 completion
                const app = applicants[0];
                return app && app.first_name && app.passport_number && app.passport_front && app.photo;
            }
            case "review":
                // Considered complete if we have at least one valid traveler
                return applicants.length > 0 && isStepComplete("traveler_1");
            default:
                return false;
        }
    };

    const isSubStepComplete = (stepId, subLabel) => {
        if (stepId === "traveler_1") {
            const app = applicants[0];
            if (!app) return false;
            if (subLabel === "Passport") return !!app.passport_front;
            if (subLabel === "Traveler Photo") return !!app.photo;
        }
        return false;
    };

    if (isLoadingVisa) return <div className="p-10 text-center">Loading...</div>;
    if (!currentVisa) return <div className="p-10 text-center">Visa not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block w-72 bg-white h-screen sticky top-0 p-8 border-r border-gray-100 overflow-y-auto">
                <div className="space-y-8">
                    {steps.map((step) => {
                        const completed = isStepComplete(step.id);
                        const active = currentStep === step.id;

                        return (
                            <div key={step.id}>
                                <div className={`flex items-center gap-3 font-semibold ${completed || active ? "text-[#14532d]" : "text-gray-400"
                                    }`}>
                                    <div className={`mt-0.5`}>
                                        {completed ? (
                                            <CheckCircle size={18} fill="#14532d" className="text-white" />
                                        ) : (
                                            <div className={`w-4 h-4 rounded-full border-2 ${active ? "border-[#14532d]" : "border-gray-300"}`} />
                                        )}
                                    </div>
                                    <span>{step.label}</span>
                                </div>

                                {/* Substeps line */}
                                {step.subSteps && (
                                    <div className="ml-2.5 pl-4 border-l-2 border-gray-100 my-2 space-y-3">
                                        {step.subSteps.map(sub => {
                                            const subCompleted = isSubStepComplete(step.id, sub);
                                            return (
                                                <div key={sub} className={`flex items-center gap-2 text-sm ${subCompleted ? "text-[#14532d]" : "text-gray-500"}`}>
                                                    <CheckCircle size={14} className={subCompleted ? "text-[#14532d] fill-green-50" : "text-gray-300"} />
                                                    <span>{sub}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">


                {/* Header Section with Background Image/Video */}
                <div
                    className="relative mb-8 rounded-2xl overflow-hidden shadow-lg border border-gray-100 min-h-[200px] flex items-center"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${visaBg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    {currentVisa?.header_image && (
                        <img
                            src={getImageUrl(currentVisa.header_image)}
                            alt={currentVisa.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-40"
                        />
                    )}

                    <div className="relative z-10 p-6 md:p-10 w-full">
                        <div className="max-w-4xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 drop-shadow-md">
                                        {currentVisa?.title || "Visa Application"}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/30 uppercase tracking-widest">
                                            <MapPin size={12} /> {currentVisa?.country || "Destination"}
                                        </span>
                                        <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/30 uppercase tracking-widest">
                                            {currentVisa?.visa_type || "Tourist Visa"}
                                        </span>
                                        <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white border border-white/30 uppercase tracking-widest">
                                            {currentVisa?.entry_type || "Single Entry"}
                                        </span>
                                    </div>
                                </div>


                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Section 1: Application Type */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Are You Applying For</h2>

                        <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Departure Date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    className={`w-full px-3 py-2 rounded-xl border ${errors.departure_date ? 'border-red-500' : 'border-gray-200'} focus:border-[#14532d] outline-none transition-colors bg-gray-50/50 text-sm`}
                                    value={appDepartureDate}
                                    onChange={(e) => {
                                        setAppDepartureDate(e.target.value);
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.departure_date;
                                            return next;
                                        });
                                    }}
                                />
                                {errors.departure_date && <p className="text-red-500 text-xs mt-1">{errors.departure_date}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Return Date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    className={`w-full px-3 py-2 rounded-xl border ${errors.return_date ? 'border-red-500' : 'border-gray-200'} focus:border-[#14532d] outline-none transition-colors bg-gray-50/50 text-sm`}
                                    value={appReturnDate}
                                    onChange={(e) => {
                                        setAppReturnDate(e.target.value);
                                        setErrors(prev => {
                                            const next = { ...prev };
                                            delete next.return_date;
                                            return next;
                                        });
                                    }}
                                />
                                {errors.return_date && <p className="text-red-500 text-xs mt-1">{errors.return_date}</p>}
                            </div>
                        </div>

                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={() => setApplicationType("Individual")}
                                className={`px-8 py-2 rounded-full font-semibold transition-all text-sm ${applicationType === "Individual"
                                    ? "bg-[#14532d] text-white shadow-md"
                                    : "bg-white border border-gray-200 text-gray-500"
                                    }`}
                                style={{ backgroundColor: applicationType === "Individual" ? '#14532d' : '' }}
                            >
                                Individual
                            </button>
                            <button
                                onClick={() => setApplicationType("Group")}
                                className={`px-8 py-2 rounded-full font-semibold transition-all text-sm ${applicationType === "Group"
                                    ? "bg-[#14532d] text-white shadow-md"
                                    : "bg-white border border-gray-200 text-gray-500"
                                    }`}
                                style={{ backgroundColor: applicationType === "Group" ? '#14532d' : '' }}
                            >
                                Group
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Internal ID</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#14532d] outline-none transition-colors bg-gray-50/50 text-sm"
                                    value={internalId}
                                    onChange={(e) => setInternalId(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2">Group Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#14532d] outline-none transition-colors bg-gray-50/50 text-sm"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-500 mb-2">Visa Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={selectedVisaType}
                                    readOnly
                                    className="w-full px-3 py-2 rounded-xl border border-[#14532d] text-gray-900 bg-gray-50 font-medium outline-none text-sm cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Travelers Forms */}
                    {applicants.map((applicant, index) => (
                        <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Traveler {index + 1}</h2>
                                <div className="flex items-center gap-4">
                                    {index === 0 && (
                                        <button
                                            onClick={addApplicant}
                                            className="px-4 py-1.5 text-[#14532d] border border-[#14532d] rounded-full font-medium hover:bg-green-50 text-xs flex items-center gap-2 transition-all shadow-sm"
                                        >
                                            <User size={14} /> + Add Another Traveler
                                        </button>
                                    )}
                                    {applicants.length > 1 && (
                                        <button
                                            onClick={() => removeApplicant(index)}
                                            className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium transition-colors"
                                        >
                                            <Trash2 size={16} /> Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Passport Upload */}
                            <div className="mb-8">
                                <h3 className="text-md font-bold text-gray-900 mb-1">Upload Traveler's Front Passport Page</h3>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-3xl">
                                    Vietnam requires a scan of the traveler's passport. Upload a clear passport image and your details will be filled automatically. However, it is mandatory to review the information before submitting to ensure there are no mistakes.
                                </p>

                                <div className={`border-2 border-dashed ${errors[`applicant_${index}_passport_front`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-2xl p-6 text-center hover:bg-gray-50 transition-colors w-full md:w-2/3 relative group cursor-pointer`}>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => handleFileChange(index, 'passport_front', e.target.files[0])}
                                    />
                                    {applicant.passport_front_preview ? (
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault(); // Prevent opening file dialog
                                                    removeFile(index, 'passport_front');
                                                }}
                                                className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
                                                title="Remove file"
                                                type="button"
                                            >
                                                <X size={16} />
                                            </button>
                                            <img src={applicant.passport_front_preview} alt="Passport Preview" className="h-48 mx-auto object-contain rounded-lg shadow-sm" />
                                            <div className="mt-2 text-[#14532d] font-semibold text-sm flex items-center justify-center gap-2">
                                                <CheckCircle size={16} /> File Selected: {applicant.passport_front.name}
                                            </div>
                                            {applicant.is_scanning ? (
                                                <div className="mt-3 p-2.5 bg-amber-50 text-amber-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-amber-200 animate-pulse">
                                                    <Loader2 size={16} className="animate-spin text-amber-600" /> Reading passport details automatically...
                                                </div>
                                            ) : applicant.scan_status === 'completed' ? (
                                                <div className="mt-3 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-emerald-200">
                                                    <Sparkles size={16} className="text-emerald-600" /> Passport scanned! Relevant fields below have been auto-filled. Please review carefully.
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#14532d]">
                                                <Upload size={24} />
                                            </div>
                                            <h4 className="font-semibold text-gray-900 mb-1">Drag and drop files to upload</h4>
                                            <p className="text-gray-400 text-sm mb-4">or</p>
                                            <button className="px-6 py-2 bg-[#14532d] text-white rounded-lg text-sm font-semibold">Select file</button>
                                            <p className="text-xs text-gray-400 mt-4">Supports JPEG, JPG, PDF, PNG. Max file size 5MB</p>
                                        </>
                                    )}
                                </div>
                                {errors[`applicant_${index}_passport_front`] && <p className="text-red-500 text-xs mt-2">{errors[`applicant_${index}_passport_front`]}</p>}
                            </div>

                            {/* Manual Form Fields */}
                            <div className="grid md:grid-cols-2 gap-4 mb-8 border-t border-gray-100 pt-6 text-sm">
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1.5 ">Passport Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_passport_number`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors text-sm`}
                                        value={applicant.passport_number}
                                        onChange={(e) => handleApplicantChange(index, "passport_number", e.target.value)}
                                    />
                                    {errors[`applicant_${index}_passport_number`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_passport_number`]}</p>}
                                </div>
                                <div className="hidden md:block"></div> {/* Spacer */}

                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1.5">First Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_first_name`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors text-sm`}
                                        value={applicant.first_name}
                                        onChange={(e) => handleApplicantChange(index, "first_name", e.target.value)}
                                    />
                                    {errors[`applicant_${index}_first_name`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_first_name`]}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1.5 ">Last Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-[#14532d] transition-colors text-sm"
                                        value={applicant.last_name}
                                        onChange={(e) => handleApplicantChange(index, "last_name", e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                                    <div className="mt-1">
                                        <PhoneInput
                                            country={"in"}
                                            value={applicant.phone}
                                            onChange={(phone) => handleApplicantChange(index, "phone", phone)}
                                            inputProps={{
                                                name: `phone_${index}`,
                                                required: true,
                                            }}
                                            containerClass="!w-full"
                                            inputClass={`!w-full !px-3 !py-2 !rounded-xl !border ${errors[`applicant_${index}_phone`] ? '!border-red-500' : '!border-gray-200'} !outline-none focus:!border-[#14532d] !transition-colors !text-sm !h-[38px]`}
                                            buttonClass="!bg-white !border !border-gray-200 !rounded-l-xl"
                                        />
                                    </div>
                                    {errors[`applicant_${index}_phone`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_phone`]}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1.5">Nationality <span className="text-red-500">*</span></label>
                                    <select
                                        required
                                        className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_nationality`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors bg-white text-sm`}
                                        value={applicant.nationality}
                                        onChange={(e) => handleApplicantChange(index, "nationality", e.target.value)}
                                    >
                                        <option value="">Select Nationality</option>
                                        {countries.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                    {errors[`applicant_${index}_nationality`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_nationality`]}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-900 mb-1.5">Sex <span className="text-red-500">*</span></label>
                                        <select
                                            required
                                            className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_sex`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors bg-white text-sm`}
                                            value={applicant.sex}
                                            onChange={(e) => handleApplicantChange(index, "sex", e.target.value)}
                                        >
                                            <option value="">Select...</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        {errors[`applicant_${index}_sex`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_sex`]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-900 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_dob`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors text-gray-500 uppercase text-sm`}
                                            value={applicant.dob}
                                            onChange={(e) => handleApplicantChange(index, "dob", e.target.value)}
                                        />
                                        {errors[`applicant_${index}_dob`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_dob`]}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1.5">Place of Birth <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_place_of_birth`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors text-sm`}
                                        value={applicant.place_of_birth}
                                        onChange={(e) => handleApplicantChange(index, "place_of_birth", e.target.value)}
                                    />
                                    {errors[`applicant_${index}_place_of_birth`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_place_of_birth`]}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1.5">Place of Issue <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_place_of_issue`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors text-sm`}
                                        value={applicant.place_of_issue}
                                        onChange={(e) => handleApplicantChange(index, "place_of_issue", e.target.value)}
                                    />
                                    {errors[`applicant_${index}_place_of_issue`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_place_of_issue`]}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-900 mb-1.5">Date of Issue <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_date_of_issue`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors text-gray-500 uppercase text-sm`}
                                            value={applicant.date_of_issue}
                                            onChange={(e) => handleApplicantChange(index, "date_of_issue", e.target.value)}
                                        />
                                        {errors[`applicant_${index}_date_of_issue`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_date_of_issue`]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-900 mb-1.5">Date of Expiry <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            className={`w-full px-3 py-2 rounded-xl border ${errors[`applicant_${index}_date_of_expiry`] ? 'border-red-500' : 'border-gray-200'} outline-none focus:border-[#14532d] transition-colors text-gray-500 uppercase text-sm`}
                                            value={applicant.date_of_expiry}
                                            onChange={(e) => handleApplicantChange(index, "date_of_expiry", e.target.value)}
                                        />
                                        {errors[`applicant_${index}_date_of_expiry`] && <p className="text-red-500 text-xs mt-1">{errors[`applicant_${index}_date_of_expiry`]}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Photo Upload */}
                            <div>
                                <h3 className="text-md font-bold text-gray-900 mb-1">Upload Traveler Photo</h3>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-3xl">
                                    {currentVisa?.country || "The country"} requires a passport-sized photo of the traveler.
                                    {currentVisa?.photography_required ? (
                                        <span className="block mt-1 font-medium text-gray-700">Requirements: {currentVisa.photography_required}</span>
                                    ) : (
                                        " You can upload a selfie of the traveler."
                                    )}
                                </p>

                                <div className={`border-2 border-dashed ${errors[`applicant_${index}_photo`] ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-2xl p-6 text-center hover:bg-gray-50 transition-colors w-full md:w-1/2 relative group cursor-pointer`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => handleFileChange(index, 'photo', e.target.files[0])}
                                    />
                                    {applicant.photo_preview ? (
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    removeFile(index, 'photo');
                                                }}
                                                className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
                                                title="Remove file"
                                                type="button"
                                            >
                                                <X size={16} />
                                            </button>
                                            <img src={applicant.photo_preview} alt="Photo Preview" className="h-40 mx-auto object-cover rounded-lg shadow-sm" />
                                            <div className="mt-2 text-[#14532d] font-semibold text-sm flex items-center justify-center gap-2">
                                                <CheckCircle size={16} /> Image Selected
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#14532d]">
                                                <ImageIcon size={24} />
                                            </div>
                                            <h4 className="font-semibold text-gray-900 mb-1">Drag and drop files to upload</h4>
                                            <p className="text-gray-400 text-sm mb-4">or</p>
                                            <button className="px-6 py-2 bg-[#14532d] text-white rounded-lg text-sm font-semibold">Select file</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Additional Documents */}
                            <div className="mt-10 border-t border-gray-100 pt-8">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">Additional Documents</h3>
                                    <button
                                        onClick={() => addAdditionalDocument(index)}
                                        className="text-[#14532d] font-medium text-sm flex items-center gap-1 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors border border-[#14532d]"
                                    >
                                        <Plus size={16} /> Add Document
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-3xl">
                                    If you have any other supporting documents (e.g., flight tickets, hotel bookings, etc.), you can upload them here.
                                </p>

                                <div className="space-y-6">
                                    {applicant.additional_documents.map((doc, docIndex) => (
                                        <div key={doc.id} className="relative">
                                            {/* Header with Remove button */}
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-semibold text-gray-700">Document {docIndex + 1}</span>
                                                <button
                                                    onClick={() => removeAdditionalDocument(index, docIndex)}
                                                    className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                                                >
                                                    <Trash2 size={14} /> Remove Slot
                                                </button>
                                            </div>

                                            <div className={`border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors w-full md:w-1/2 relative group cursor-pointer`}>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => handleAdditionalFileChange(index, docIndex, e.target.files[0])}
                                                />
                                                {doc.preview ? (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                // Clear the file but keep the slot
                                                                const updated = [...applicants];
                                                                updated[index].additional_documents[docIndex].file = null;
                                                                updated[index].additional_documents[docIndex].preview = null;
                                                                setApplicants(updated);
                                                            }}
                                                            className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
                                                            title="Remove file"
                                                            type="button"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                        {doc.file?.type?.includes('pdf') ? (
                                                            <div className="h-40 flex items-center justify-center bg-gray-100 rounded-lg">
                                                                <FileText size={48} className="text-gray-400" />
                                                            </div>
                                                        ) : (
                                                            <img src={doc.preview} alt="Document Preview" className="h-40 mx-auto object-cover rounded-lg shadow-sm" />
                                                        )}
                                                        <div className="mt-2 text-[#14532d] font-semibold text-sm flex items-center justify-center gap-2">
                                                            <CheckCircle size={16} /> File Selected: {doc.file?.name || 'Selected'}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#14532d]">
                                                            <FileText size={24} />
                                                        </div>
                                                        <h4 className="font-semibold text-gray-900 mb-1">Drag and drop files to upload</h4>
                                                        <p className="text-gray-400 text-sm mb-4">or</p>
                                                        <button className="px-6 py-2 bg-[#14532d] text-white rounded-lg text-sm font-semibold">Select file</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {applicant.additional_documents.length === 0 && (
                                        <div className="text-sm text-gray-400 italic">No additional documents added.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex justify-center pb-20 xl:hidden">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full max-w-md py-4 bg-[#14532d] text-white rounded-xl font-bold hover:bg-[#0f4a24] shadow-xl transition-all flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                        {submitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                        ) : (
                            <Zap size={20} />
                        )}
                        {submitting ? "Processing Application..." : "Complete & Apply Now"}
                    </button>
                </div>
                {/* Right/Bottom Price Details Floating Card or Inline */}
                <div className="fixed bottom-0 right-0 p-4 w-full md:w-auto z-50">
                    {/* Can be implemented as a sticky footer or sidebar widget. 
                         For now, let's keep it simple as per screenshot which shows it as a card possibly on the right side on large screens. 
                         I'll add it as a floating widget for now designated for desktop, or inline.
                     */}
                </div>
            </main>

            {/* Right Side Price Panel (Desktop) */}
            <div className="hidden xl:block w-96 p-8 sticky top-0 h-screen overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Visa Information</h3>
                    <div className="space-y-4 mb-8">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Destination</p>
                            <p className="text-sm text-gray-900 font-semibold">{currentVisa?.country || "Destination"} - {selectedVisaType || "Visa"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Citizen of</p>
                            <p className="text-sm text-gray-900 font-semibold">{citizenOf}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Travel Particulars</p>
                            <p className="text-sm text-gray-900 font-semibold">
                                {applicants?.length || 1} Traveler(s) • {currentVisa?.entry_type || "Entry"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-0.5">Dates</p>
                            <p className="text-sm text-gray-900 font-semibold">{appDepartureDate || "N/A"} - {appReturnDate || "N/A"}</p>
                        </div>
                    </div>



                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Price Details</h3>
                        </div>
                        <div className="flex justify-between items-center mt-4 relative" ref={pricePopupRef}>
                            <div className="flex items-center gap-1.5 ">
                                <span className="text-gray-900 font-bold">Total Amount</span>
                                <button
                                    onClick={() => setPricePopupOpen(!pricePopupOpen)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                >
                                    <svg className="w-4 h-4 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                                {pricePopupOpen && (
                                    <div className="absolute bottom-full left-0 mb-3 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[60] p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-bold text-gray-900">Conditions Applied</p>
                                            <div className="h-0.5 w-8 bg-[#14532d] rounded-full mb-1"></div>
                                            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                                                Final prices include taxes and service charges. Subject to embassy rule changes.
                                            </p>
                                        </div>
                                        {/* Arrow */}
                                        <div className="absolute -bottom-1.5 left-2 w-3 h-3 bg-white border-b border-r border-gray-100 rotate-45"></div>
                                    </div>
                                )}
                            </div>
                            <span className="text-2xl font-bold text-[#14532d]">₹{TOTAL_PRICE.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full py-4 bg-[#14532d] text-white rounded-xl font-bold hover:bg-[#0f4a24] shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        {submitting ? "Applying..." : "Apply"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper components


export default VisaApplication;



