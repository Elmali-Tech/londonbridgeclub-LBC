"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { getS3PublicUrl } from "@/lib/awsConfig";
import { FiGrid, FiList, FiPlus, FiEdit2, FiTrash2, FiImage, FiTarget } from "react-icons/fi";

interface Opportunity {
  id: number;
  title: string;
  company: string;
  service_detail: string;
  category: string;
  estimated_budget: string;
  description: string;
  image_key: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminOpportunitiesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    service_detail: "",
    category: "",
    estimated_budget: "",
    description: "",
    is_active: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch("/api/admin/opportunities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setOpportunities(data.opportunities);
      } else {
        toast.error("Failed to fetch opportunities");
      }
    } catch (error) {
      toast.error("Failed to fetch opportunities");
    } finally {
      setLoadingOpportunities(false);
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
      company: "",
      service_detail: "",
      category: "",
      estimated_budget: "",
      description: "",
      is_active: true,
    });
    setSelectedImage(null);
    setImagePreview(null);
    setEditingOpportunity(null);
    setShowCreateForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const submitData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value.toString());
      });
      if (selectedImage) {
        submitData.append("image", selectedImage);
      }
      const url = editingOpportunity ? `/api/admin/opportunities/${editingOpportunity.id}` : "/api/admin/opportunities";
      const method = editingOpportunity ? "PUT" : "POST";
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: submitData,
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Opportunity ${editingOpportunity ? "updated" : "created"} successfully`);
        fetchOpportunities();
        resetForm();
      } else {
        toast.error(data.error || "Failed to save opportunity");
      }
    } catch (error) {
      toast.error("Failed to save opportunity");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title || "",
      company: opportunity.company || "",
      service_detail: opportunity.service_detail || "",
      category: opportunity.category || "",
      estimated_budget: opportunity.estimated_budget || "",
      description: opportunity.description || "",
      is_active: opportunity.is_active ?? true,
    });
    if (opportunity.image_key) {
      setImagePreview(getS3PublicUrl(opportunity.image_key));
    } else {
      setImagePreview(null);
    }
    setShowCreateForm(true);
    setTimeout(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDelete = async (opportunityId: number) => {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;
    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch(`/api/admin/opportunities/${opportunityId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Opportunity deleted successfully");
        fetchOpportunities();
      } else {
        toast.error("Failed to delete opportunity");
      }
    } catch (error) {
      toast.error("Failed to delete opportunity");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager";
  
  const filteredOpportunities = opportunities.filter(opp => 
    opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hasAccess) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Opportunities</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Manage your customer opportunities pipeline.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs lg:w-64 shrink-0">
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors placeholder:text-gray-400"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white dark:bg-gray-700 text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiGrid /> Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "list" ? "bg-white dark:bg-gray-700 text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors"
          >
            <FiPlus /> New Opportunity
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden" ref={topRef}>
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingOpportunity ? "Edit Opportunity" : "Create Opportunity"}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6" encType="multipart/form-data">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="E.g. Full Stack Web Project"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Company</label>
              <input
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="E.g. Acme Corp"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Service Area</label>
              <input
                name="service_detail"
                value={formData.service_detail}
                onChange={handleInputChange}
                placeholder="E.g. Software Development"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Category</label>
              <input
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="E.g. Technology"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Estimated Budget</label>
              <input
                name="estimated_budget"
                value={formData.estimated_budget}
                onChange={handleInputChange}
                placeholder="E.g. $10k - $25k"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>
            <div className="hidden md:block"></div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detailed explanation of the opportunity..."
                rows={4}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cover Image</label>
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
            <div className="space-y-1.5 md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-600"
              />
              <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300">Set as Active</label>
            </div>
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingOpportunity ? "Save Changes" : "Create Opportunity"}
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

      {loadingOpportunities ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiTarget className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No opportunities found</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opp) => (
            <div key={opp.id} className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 flex flex-col">
              <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {opp.image_key ? (
                  <div className="relative h-full w-full p-4 flex items-center justify-center">
                    <Image src={getS3PublicUrl(opp.image_key)} alt={opp.title} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-amber-500/10">
                    <FiTarget className="w-16 h-16 text-gray-300 dark:text-gray-700" />
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white backdrop-blur shadow-sm">
                    {opp.category}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg backdrop-blur shadow-sm ${opp.is_active ? "bg-emerald-500/90 text-white" : "bg-gray-800/90 text-gray-300"}`}>
                    {opp.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors line-clamp-1">{opp.title}</h3>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{opp.company}</p>
                
                <div className="mt-4 space-y-2 flex-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Service</span>
                    <span className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{opp.service_detail}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Budget</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{opp.estimated_budget}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl leading-relaxed">
                    {opp.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">{new Date(opp.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(opp)} className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(opp.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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
                  <th className="px-6 py-4 font-bold">Opportunity</th>
                  <th className="px-6 py-4 font-bold">Details</th>
                  <th className="px-6 py-4 font-bold">Status & Date</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredOpportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex-shrink-0 border border-gray-100 dark:border-gray-700 flex items-center justify-center p-1">
                          {opp.image_key ? (
                            <Image src={getS3PublicUrl(opp.image_key)} alt={opp.title} fill className="object-contain p-1" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiTarget className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-base">{opp.title}</p>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{opp.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                      <p><span className="text-gray-400">Svc:</span> {opp.service_detail}</p>
                      <p><span className="text-gray-400">Cat:</span> {opp.category}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">{opp.estimated_budget}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${opp.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {opp.is_active ? "Active" : "Inactive"}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{new Date(opp.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(opp)} className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(opp.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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
