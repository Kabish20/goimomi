import React, { useEffect, useState } from "react";
import api from "../../../api";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, CheckCircle, XCircle, Upload, X, Plus } from "lucide-react";
import AdminSidebar from "../../../components/admin/AdminSidebar/AdminSidebar";
import AdminTopbar from "../../../components/admin/AdminTopbar/AdminTopbar";
import { formatApiError } from "../../../utils/errorHandler";
import { compressImage, compressImages } from "../../../utils/imageUtils";

const ProductAdd = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  
  // Gallery images state
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  // Catalogue Masters state
  const [catalogues, setCatalogues] = useState([]);

  useEffect(() => {
    const fetchCatalogues = async () => {
      try {
        const res = await api.get("/api/cataloguemasters/");
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCatalogues(data);
      } catch (err) {
        console.error("Error fetching catalogues:", err);
      }
    };
    fetchCatalogues();
  }, []);

  const [form, setForm] = useState({
    title:        "",
    description:  "",
    price:        "",
    mrp:          "",
    quantity:     "",
    stock_status: "in_stock",
    image:        null,
    catalogue:    "",
    sub_catalogues: [],
  });

  const selectedCatObj = catalogues.find(c => String(c.id) === String(form.catalogue));
  const availableSubCatalogues = selectedCatObj?.sub_catalogues || [];

  const handleToggleSubCatalogue = (subId) => {
    setForm(prev => {
      const exists = prev.sub_catalogues.includes(subId);
      const updated = exists
        ? prev.sub_catalogues.filter(id => id !== subId)
        : [...prev.sub_catalogues, subId];
      return { ...prev, sub_catalogues: updated };
    });
  };

  const handleSelectAllSubCatalogues = () => {
    if (!availableSubCatalogues.length) return;
    const allIds = availableSubCatalogues.map(s => s.id);
    const isAllSelected = allIds.every(id => form.sub_catalogues.includes(id));
    setForm(prev => ({
      ...prev,
      sub_catalogues: isAllSelected ? [] : allIds
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Selected image is too large (over 25MB). Please select an image under 25MB.");
      return;
    }

    setError("");
    setForm((prev) => ({ ...prev, image: file }));
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGalleryImages = (e) => {
    const rawFiles = Array.from(e.target.files);
    if (!rawFiles.length) return;

    const validFiles = rawFiles.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length < rawFiles.length) {
      setError("Some selected files were skipped because they are not valid images.");
    }

    const oversized = validFiles.filter((f) => f.size > 25 * 1024 * 1024);
    if (oversized.length > 0) {
      setError("Some images were skipped because they exceed 25MB. Please choose smaller files.");
    }

    const acceptedFiles = validFiles.filter((f) => f.size <= 25 * 1024 * 1024);
    if (!acceptedFiles.length) return;

    // Append new files
    setGalleryImages((prev) => [...prev, ...acceptedFiles]);

    // Create previews
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setGalleryPreviews((prev) => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeGalleryImage = (index) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const discountPercent = () => {
    const price = parseFloat(form.price);
    const mrp   = parseFloat(form.mrp);
    if (mrp > 0 && price > 0 && mrp > price) {
      return Math.round(((mrp - price) / mrp) * 100);
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (parseFloat(form.price) > parseFloat(form.mrp)) {
      setError("Selling price cannot be greater than MRP.");
      return;
    }

    setLoading(true);
    setCompressing(true);

    try {
      // 1. Client-side image optimization (downsamples and compresses large camera photos)
      let optimizedFeaturedImage = form.image;
      if (optimizedFeaturedImage instanceof File) {
        optimizedFeaturedImage = await compressImage(optimizedFeaturedImage);
      }

      const optimizedGalleryImages = await compressImages(galleryImages);
      setCompressing(false);

      // 2. Build FormData payload
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "image") {
          if (optimizedFeaturedImage instanceof File) {
            fd.append("image", optimizedFeaturedImage);
          }
        } else if (k === "sub_catalogues") {
          if (Array.isArray(v)) {
            v.forEach((id) => fd.append("sub_catalogues", id));
            if (v.length > 0) fd.append("sub_catalogue", v[0]);
          }
        } else if (v !== null && v !== "") {
          fd.append(k, v);
        }
      });

      // Append multiple gallery images
      optimizedGalleryImages.forEach((file) => {
        fd.append("product_images", file);
      });

      await api.post("/api/goimomi-products/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Product added successfully!");
      setTimeout(() => navigate("/admin/products"), 1500);
    } catch (err) {
      setError(`Failed to add product: ${formatApiError(err, "Please check the form and try again.")}`);
    } finally {
      setLoading(false);
      setCompressing(false);
    }
  };

  return (
    <div className="flex bg-gray-100 h-full overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <AdminTopbar />
        <div className="flex-1 overflow-y-auto p-6">

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate("/admin/products")}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Package size={22} className="text-green-600" /> Add New Product
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to create a product.</p>
            </div>
          </div>

          {/* Alerts */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm flex items-center gap-2">
              <CheckCircle size={16} /> {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-2">
              <XCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Left Column: Consolidate Details, Pricing & Inventory */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                  
                  {/* Part 1: Basic Info */}
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-3 pb-1 border-b border-gray-100">
                      Product Information
                    </h2>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Product ID
                          </label>
                          <input
                            type="text"
                            disabled
                            value="GO-PRO-XXXX (Auto-generated)"
                            className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-emerald-900"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="pa-title">
                            Product Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="pa-title"
                            name="title"
                            required
                            value={form.title}
                            onChange={handleChange}
                            placeholder="e.g. Premium Ihram Set for Hajj & Umrah"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="pa-desc">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="pa-desc"
                          name="description"
                          required
                          rows={3}
                          value={form.description}
                          onChange={handleChange}
                          placeholder="Write a brief summary of features…"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-y"
                        />
                      </div>

                      {/* Catalogue Master & Sub-Catalogues Multi-Choice */}
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="pa-catalogue">
                            Catalogue Master
                          </label>
                          <select
                            id="pa-catalogue"
                            name="catalogue"
                            value={form.catalogue || ""}
                            onChange={(e) => {
                              const catId = e.target.value;
                              setForm(prev => ({ ...prev, catalogue: catId, sub_catalogues: [] }));
                            }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                          >
                            <option value="">Select Catalogue Master (Optional)</option>
                            {catalogues.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Multi-Select Sub Catalogues Display */}
                        {form.catalogue && (
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                🏷️ Sub Catalogues <span className="text-green-700 font-extrabold">({form.sub_catalogues.length} Selected)</span>
                              </span>
                              {availableSubCatalogues.length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleSelectAllSubCatalogues}
                                  className="text-[11px] font-bold text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md border border-green-200 transition-colors"
                                >
                                  {availableSubCatalogues.every(s => form.sub_catalogues.includes(s.id)) ? "Deselect All" : "Select All"}
                                </button>
                              )}
                            </div>

                            {availableSubCatalogues.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">No sub-catalogues available under this master catalogue.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {availableSubCatalogues.map((sub) => {
                                  const isSelected = form.sub_catalogues.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => handleToggleSubCatalogue(sub.id)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                        isSelected
                                          ? "bg-green-600 border-green-600 text-white shadow-xs"
                                          : "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50"
                                      }`}
                                    >
                                      <span>{isSelected ? "✓" : "+"}</span>
                                      <span>{sub.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Part 2: Pricing & Stock (Inline Grid) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="pa-mrp">
                        MRP (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="pa-mrp"
                        name="mrp"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={form.mrp}
                        onChange={handleChange}
                        placeholder="2999"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="pa-price">
                        Selling Price (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="pa-price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={form.price}
                        onChange={handleChange}
                        placeholder="1999"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1" htmlFor="pa-qty">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="pa-qty"
                        name="quantity"
                        type="number"
                        min="0"
                        required
                        value={form.quantity}
                        onChange={handleChange}
                        placeholder="50"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {discountPercent() > 0 && (
                    <div className="p-2 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 font-medium inline-block">
                      🎉 Customer saves <strong>{discountPercent()}%</strong>!
                    </div>
                  )}

                  {/* Part 3: Status Toggle Buttons */}
                  <div className="pt-1 border-t border-gray-50">
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Stock Status
                    </label>
                    <div className="flex gap-2 max-w-xs">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, stock_status: "in_stock" }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          form.stock_status === "in_stock"
                            ? "bg-green-600 border-green-600 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-500 hover:border-green-200 hover:text-green-600"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${form.stock_status === "in_stock" ? "bg-white animate-pulse" : "bg-gray-300"}`} />
                        In Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, stock_status: "out_of_stock" }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          form.stock_status === "out_of_stock"
                            ? "bg-red-500 border-red-500 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${form.stock_status === "out_of_stock" ? "bg-white animate-pulse" : "bg-gray-300"}`} />
                        Out of Stock
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Images & Action Buttons */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                  
                  {/* Featured image */}
                  <div>
                    <h2 className="text-xs font-bold text-gray-800 mb-2 pb-1 border-b border-gray-50">
                      Featured Image
                    </h2>
                    <label
                      htmlFor="pa-image"
                      className="block border border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-green-400 transition text-center overflow-hidden bg-gray-50"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="preview" className="w-full h-24 object-cover" />
                      ) : (
                        <div className="py-5 text-gray-400">
                          <Upload size={20} className="mx-auto mb-1" />
                          <p className="text-[10px] font-semibold">Upload Image</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">JPG, PNG, WebP (Auto-optimized)</p>
                        </div>
                      )}
                      <input id="pa-image" type="file" accept="image/*" className="hidden" onChange={handleImage} />
                    </label>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setForm((p) => ({ ...p, image: null })); }}
                        className="mt-1 text-[10px] text-red-500 hover:text-red-700 transition w-full text-center font-bold"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  {/* Gallery Multiple Images */}
                  <div>
                    <h2 className="text-xs font-bold text-gray-800 mb-2 pb-1 border-b border-gray-50 flex items-center justify-between">
                      <span>Gallery Images</span>
                      <span className="text-[10px] text-gray-400 font-normal">({galleryImages.length} items)</span>
                    </h2>
                    
                    <div className="grid grid-cols-4 gap-1.5">
                      {galleryPreviews.map((preview, index) => (
                        <div key={index} className="relative group aspect-square rounded overflow-hidden border border-gray-100">
                          <img src={preview} alt="gallery-preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                          >
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                      
                      <label
                        htmlFor="pa-gallery"
                        className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded aspect-square cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition text-gray-400"
                      >
                        <Plus size={16} />
                        <span className="text-[8px] font-bold mt-0.5">Add</span>
                        <input
                          id="pa-gallery"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={handleGalleryImages}
                        />
                      </label>
                    </div>
                  </div>

                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/products")}
                    className="flex-1 border border-gray-200 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-50 transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="submit-product"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-1.5 text-xs disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{compressing ? "Optimizing images..." : "Saving..."}</span>
                      </>
                    ) : (
                      <>
                        <Package size={14} />
                        <span>Save Product</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default ProductAdd;
