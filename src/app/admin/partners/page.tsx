"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Partner } from "@/types/database";
import { toast } from "react-hot-toast";
import { AllowedFileTypes } from "@/lib/awsConfig";
import Image from "next/image";
import { FiGrid, FiList, FiPlus, FiEdit2, FiTrash2, FiImage, FiBriefcase, FiLink } from "react-icons/fi";

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website_url: "",
    logo: null as File | null,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager";

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) {
      router.push("/admin");
    }
  }, [hasAccess, isLoadingAuth, router, user]);

  useEffect(() => {
    fetchPartners();
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase.from('customer_opportunities').select('company_name');
      if (data) setOpportunities(data);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setPartners(data || []);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("An error occurred while loading partner companies");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPartners = partners.filter((partner) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      partner.name.toLowerCase().includes(searchLower) ||
      (partner.description && partner.description.toLowerCase().includes(searchLower))
    );
  });

  const handleOpenModal = (partner: Partner | null = null) => {
    if (partner) {
      setIsEditMode(true);
      setSelectedPartner(partner);
      setFormData({
        name: partner.name,
        description: partner.description,
        website_url: partner.website_url || "",
        logo: null,
      });
      setLogoPreview(
        partner.logo_key
          ? `${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com`}/${partner.logo_key}`
          : null,
      );
    } else {
      setIsEditMode(false);
      setSelectedPartner(null);
      setFormData({
        name: "",
        description: "",
        website_url: "",
        logo: null,
      });
      setLogoPreview(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setLogoPreview(null);
      setFormData({
        name: "",
        description: "",
        website_url: "",
        logo: null,
      });
    }, 300);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!AllowedFileTypes.PARTNERS_LOGOS.includes(file.type)) {
        toast.error("Unsupported file format. Supported formats: JPG, PNG, WEBP, SVG");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size is too large. Maximum upload size is 5MB");
        return;
      }

      setFormData((prev) => ({ ...prev, logo: file }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", "PARTNERS_LOGOS");

      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/upload/s3", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "An error occurred while uploading the logo");
      }

      return data.key;
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("An error occurred while uploading the logo");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      toast.error("Company name and description are required");
      return;
    }

    try {
      setIsSubmitting(true);
      let logo_key = selectedPartner?.logo_key || null;

      if (formData.logo) {
        const uploadedKey = await uploadLogo(formData.logo);
        if (uploadedKey) {
          if (isEditMode && selectedPartner?.logo_key) {
            const token = localStorage.getItem("authToken");
            await fetch(
              `/api/upload/s3?key=${encodeURIComponent(selectedPartner.logo_key)}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );
          }
          logo_key = uploadedKey;
        }
      }

      if (isEditMode && selectedPartner) {
        const { error } = await supabase
          .from("partners")
          .update({
            name: formData.name,
            description: formData.description,
            website_url: formData.website_url || null,
            logo_key,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedPartner.id);

        if (error) throw error;
        toast.success("Partner company updated successfully");
      } else {
        const { error } = await supabase.from("partners").insert({
          name: formData.name,
          description: formData.description,
          website_url: formData.website_url || null,
          logo_key,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        toast.success("Partner company added successfully");
      }

      handleCloseModal();
      fetchPartners();

      // Send system notification
      try {
        const token = localStorage.getItem("authToken");
        await fetch("/api/send-mail/system-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: isEditMode ? "Partner Updated" : "Partner Registered",
            details: `Partner "${formData.name}" has been ${isEditMode ? "updated" : "onboarded"}. (By: ${user?.full_name})`
          }),
        });
      } catch (notifyError) {
        console.error("Notification Error:", notifyError);
      }
    } catch (error) {
      console.error("Error saving partner:", error);
      toast.error(
        isEditMode
          ? "An error occurred while updating the partner company"
          : "An error occurred while adding the partner company",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePartner = async (id: number) => {
    try {
      setIsSubmitting(true);
      const partnerToDelete = partners.find((p) => p.id === id);

      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;

      if (partnerToDelete?.logo_key) {
        const token = localStorage.getItem("authToken");
        await fetch(
          `/api/upload/s3?key=${encodeURIComponent(partnerToDelete.logo_key)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      setPartners(partners.filter((partner) => partner.id !== id));
      setDeleteConfirmId(null);
      toast.success("Partner company deleted successfully");

      // Send system notification
      try {
        const token = localStorage.getItem("authToken");
        await fetch("/api/send-mail/system-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "Partner Deleted",
            details: `Partner "${partnerToDelete?.name}" (ID: ${id}) has been removed. (By: ${user?.full_name})`
          }),
        });
      } catch (notifyError) {
        console.error("Notification Error:", notifyError);
      }
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error("An error occurred while deleting the partner company");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!hasAccess) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Partner Entities</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Manage your B2B corporate network and official affiliates.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs lg:w-64 shrink-0">
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-gray-400"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiGrid /> Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "list" ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiList /> List
            </button>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
          >
            <FiPlus /> New Partner
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiBriefcase className="text-blue-600" /> {isEditMode ? "Modify Partner" : "Onboard Corporate Partner"}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6" encType="multipart/form-data">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Entity Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="E.g. London Tech Solutions"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Homepage Domain (URL)</label>
              <input
                name="website_url"
                type="url"
                value={formData.website_url}
                onChange={handleInputChange}
                placeholder="https://theirwebsite.com"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Corporate Details / Mission</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Operational background and service sector descriptors..."
                rows={4}
                required
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Brand Vector / Imagery</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <FiImage className="w-8 h-8 text-gray-400 mb-3" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold text-blue-600 dark:text-blue-500">Click to upload brand logo</span> or drag and drop</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG (Transparent Preferred. MAX 5MB)</p>
                  </div>
                  <input type="file" name="logo" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              </div>
              {logoPreview && (
                <div className="mt-4 relative w-40 h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-sm">
                  <Image src={logoPreview} alt="Preview" fill className="object-contain p-3" />
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Syncing..." : isEditMode ? "Save Changes" : "Register Partner"}
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiBriefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No affiliates located</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">Verify your query or expand your corporate network.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => (
            <div key={partner.id} className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700/50 transition-all duration-300">
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 overflow-hidden flex-shrink-0 relative shadow-sm">
                    {partner.logo_key ? (
                      <Image 
                        src={`${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com`}/${partner.logo_key}`} 
                        alt={partner.name} 
                        fill 
                        className="object-contain p-2" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent flex items-center justify-center">
                        <FiBriefcase className="w-8 h-8 text-blue-500/30" />
                      </div>
                    )}
                  </div>
                  <div>
                     <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight mb-1">{partner.name}</h3>
                     <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {partner.website_url ? (
                          <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                            <FiLink className="w-3 h-3" /> Visit Domain
                          </a>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5"><FiLink className="w-3 h-3" /> Unlinked</span>
                        )}
                        <span className="text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500">
                          {opportunities.filter(o => o.company_name?.toLowerCase() === partner.name.toLowerCase()).length} Prospects
                        </span>
                     </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-4 leading-relaxed flex-1">
                  {partner.description}
                </p>

                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Partner ID: {partner.id}
                  </span>
                  
                  {deleteConfirmId === partner.id ? (
                    <div className="flex items-center gap-2">
                       <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                       <button onClick={() => handleDeletePartner(partner.id)} disabled={isSubmitting} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">Confirm</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(partner)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(partner.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                  <th className="px-6 py-4 font-bold">Brand Entity</th>
                  <th className="px-6 py-4 font-bold">Core Profile</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 overflow-hidden relative flex-shrink-0 shadow-sm">
                          {partner.logo_key ? (
                            <Image 
                               src={`${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com`}/${partner.logo_key}`} 
                               alt={partner.name} 
                               fill 
                               className="object-contain p-1.5" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-blue-500/5">
                              <FiBriefcase className="w-6 h-6 text-blue-500/30" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-base">{partner.name}</p>
                          {partner.website_url ? (
                             <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1.5 mt-0.5"><FiLink /> Routing</a>
                          ) : (
                             <span className="text-xs text-gray-400 font-medium tracking-wide">None Found</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium max-w-sm">
                       <p className="line-clamp-2 leading-relaxed">{partner.description}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                       {deleteConfirmId === partner.id ? (
                          <div className="flex items-center justify-end gap-2">
                             <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                             <button onClick={() => handleDeletePartner(partner.id)} disabled={isSubmitting} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50">Confirm</button>
                          </div>
                       ) : (
                          <div className="flex items-center justify-end gap-2">
                             <button onClick={() => handleOpenModal(partner)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteConfirmId(partner.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                       )}
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
