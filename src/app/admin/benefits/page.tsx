"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { Benefit } from "@/types/database";
import Cookies from "js-cookie";
import { FiGrid, FiList, FiPlus, FiEdit2, FiTrash2, FiImage, FiGift, FiStar } from "react-icons/fi";

export default function AdminBenefitsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "discount" as "discount" | "service" | "event" | "exclusive",
    partner_name: "",
    partner_website: "",
    discount_percentage: "",
    discount_code: "",
    valid_until: "",
    terms_conditions: "",
    is_active: true,
    premium: false,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
    const hasAccess = userRole === "admin" || userRole === "opportunity_manager";
    if (!isLoading && !hasAccess) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    fetchBenefits();
  }, []);

  const fetchBenefits = async () => {
    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch("/api/admin/benefits", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setBenefits(data.benefits);
      } else {
        toast.error("Failed to fetch benefits");
      }
    } catch (error) {
      toast.error("Failed to fetch benefits");
    } finally {
      setLoadingBenefits(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "discount",
      partner_name: "",
      partner_website: "",
      discount_percentage: "",
      discount_code: "",
      valid_until: "",
      terms_conditions: "",
      is_active: true,
      premium: false,
    });
    setSelectedImage(null);
    setImagePreview(null);
    setEditingBenefit(null);
    setShowCreateForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === "boolean") {
          submitData.append(key, value ? "true" : "false");
        } else {
          submitData.append(key, value.toString());
        }
      });

      if (selectedImage) submitData.append("image", selectedImage);

      const url = editingBenefit ? `/api/admin/benefits/${editingBenefit.id}` : "/api/admin/benefits";
      const method = editingBenefit ? "PUT" : "POST";
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: submitData,
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Benefit ${editingBenefit ? "updated" : "created"} successfully`);
        fetchBenefits();
        resetForm();
      } else {
        toast.error(data.error || "Failed to save benefit");
      }
    } catch (error) {
      toast.error("Failed to save benefit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setFormData({
      title: benefit.title,
      description: benefit.description,
      category: benefit.category,
      partner_name: benefit.partner_name || "",
      partner_website: benefit.partner_website || "",
      discount_percentage: benefit.discount_percentage?.toString() || "",
      discount_code: benefit.discount_code || "",
      valid_until: benefit.valid_until || "",
      terms_conditions: benefit.terms_conditions || "",
      is_active: benefit.is_active,
      premium: benefit.premium || false,
    });

    if (benefit.image_key) {
      setImagePreview(
        `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com/${benefit.image_key}`
      );
    } else {
      setImagePreview(null);
    }
    setShowCreateForm(true);
  };

  const handleDelete = async (benefitId: number) => {
    if (!confirm("Are you sure you want to delete this benefit?")) return;

    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch(`/api/admin/benefits/${benefitId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Benefit deleted successfully");
        fetchBenefits();
      } else {
        toast.error("Failed to delete benefit");
      }
    } catch (error) {
      toast.error("Failed to delete benefit");
    }
  };

  const getCategoryBadge = (category: string) => {
    const styles = {
      discount: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
      service: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
      event: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
      exclusive: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    };
    return styles[category as keyof typeof styles] || styles.discount;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager";
  
  const filteredBenefits = benefits.filter(ben => 
    ben.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ben.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ben.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hasAccess) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Benefits Manager</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Organize exclusive community perks, partnerships, and service discounts.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs lg:w-64 shrink-0">
            <input
              type="text"
              placeholder="Search perks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors placeholder:text-gray-400"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiGrid /> Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "list" ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiList /> List
            </button>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
          >
            <FiPlus /> New Benefit
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiGift className="text-indigo-600" /> {editingBenefit ? "Edit Perk Details" : "Launch New Perk"}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6" encType="multipart/form-data">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="E.g. VIP Gym Access"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="discount">Discount Code</option>
                <option value="service">Service Provider</option>
                <option value="event">VIP Event Access</option>
                <option value="exclusive">Exclusive Promotion</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Partner Brand Name</label>
              <input
                name="partner_name"
                value={formData.partner_name}
                onChange={handleInputChange}
                placeholder="Name of the providing agency..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Discount Code (Optional)</label>
              <input
                name="discount_code"
                value={formData.discount_code}
                onChange={handleInputChange}
                placeholder="PROMO20"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1.5 flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Discount %</label>
                <input
                  name="discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={handleInputChange}
                  placeholder="0 - 100"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Expires</label>
                <input
                  name="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Partner Website</label>
              <input
                name="partner_website"
                type="url"
                value={formData.partner_website}
                onChange={handleInputChange}
                placeholder="https://theirwebsite.com"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detailed pitch about the service..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cover Graphic</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiImage className="w-8 h-8 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP (MAX. 5MB)</p>
                  </div>
                  <input type="file" name="image" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              {imagePreview && (
                <div className="mt-4 relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  <Image src={imagePreview} alt="Preview" fill className="object-contain p-2" />
                </div>
              )}
            </div>

            <div className="space-y-1.5 md:col-span-2 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300">Flag as Active</label>
              </div>
              <div className="flex items-center gap-3 p-3 border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl">
                <input
                  type="checkbox"
                  name="premium"
                  id="premium"
                  checked={formData.premium}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-600"
                />
                <label htmlFor="premium" className="text-sm font-bold text-amber-800 dark:text-amber-500 flex flex-row items-center gap-1.5"><FiStar /> Premium Member Exclusive</label>
              </div>
            </div>
            
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingBenefit ? "Save Changes" : "Create Benefit"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loadingBenefits ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredBenefits.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiGift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No benefits matched criteria</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">Clear search filters or register a new perks tier.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBenefits.map((benefit) => (
            <div key={benefit.id} className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700/50 transition-all duration-300 flex flex-col">
              <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {benefit.image_key ? (
                  <div className="relative h-full w-full p-4 flex items-center justify-center">
                    <Image src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com/${benefit.image_key}`} alt={benefit.title} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-600/20 dark:to-purple-600/20">
                    <FiGift className="w-16 h-16 text-indigo-300 dark:text-indigo-700/50 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
                
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur shadow-sm ${getCategoryBadge(benefit.category)}`}>
                    {benefit.category}
                  </span>
                </div>
                
                <div className="absolute top-4 right-4 flex gap-1.5 flex-col items-end">
                  {!benefit.is_active && (
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-red-500/90 text-white backdrop-blur shadow-sm">
                      Suspended
                    </span>
                  )}
                  {benefit.premium && (
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 rounded-lg bg-amber-500/90 text-white backdrop-blur shadow-sm">
                      <FiStar /> VIP Tier
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between">
                   <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-2">{benefit.title}</h3>
                </div>
                
                <div className="mt-4 space-y-2 flex-1">
                  {benefit.partner_name && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Partner</span>
                      <span className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{benefit.partner_name}</span>
                    </div>
                  )}
                  {benefit.discount_percentage && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Discount Factor</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400">{benefit.discount_percentage}% OFF</span>
                    </div>
                  )}
                  {benefit.discount_code && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Passcode</span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded">{benefit.discount_code}</span>
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-3 pt-2 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  {benefit.valid_until ? (
                    <span className="text-xs font-bold text-gray-400">Valid: {new Date(benefit.valid_until).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-xs font-bold text-gray-400">Timeless</span>
                  )}
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(benefit)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(benefit.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 font-bold">Benefit Asset</th>
                  <th className="px-6 py-4 font-bold">Metrics</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredBenefits.map((benefit) => (
                  <tr key={benefit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex-shrink-0 border border-gray-100 dark:border-gray-700 flex items-center justify-center p-1">
                          {benefit.image_key ? (
                            <Image src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com/${benefit.image_key}`} alt={benefit.title} fill className="object-contain p-1" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-500/5">
                              <FiGift className="w-5 h-5 text-indigo-500/50 dark:text-indigo-400/50" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-base">{benefit.title}</p>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{benefit.partner_name || "General Perk"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium space-y-1">
                      {benefit.discount_percentage ? <p><span className="text-gray-400">Discount:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold">{benefit.discount_percentage}%</span></p> : null}
                      {benefit.discount_code ? <p><span className="text-gray-400">Code:</span> <span className="font-mono">{benefit.discount_code}</span></p> : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg ${getCategoryBadge(benefit.category)}`}>
                          {benefit.category}
                        </span>
                        {benefit.premium && <span className="text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-500 flex items-center"><FiStar className="mr-0.5"/> Premium Tier</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <button onClick={() => handleEdit(benefit)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(benefit.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
