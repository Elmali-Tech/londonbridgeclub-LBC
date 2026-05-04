"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { getS3PublicUrl } from "@/lib/awsConfig";
import { FiGrid, FiList, FiPlus, FiEdit2, FiTrash2, FiImage, FiCalendar } from "react-icons/fi";

interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  event_date: string;
  event_time: string;
  category: string;
  image_key: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminEventsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    event_date: "",
    event_time: "",
    category: "",
    is_active: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch("/api/admin/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      } else {
        toast.error("Failed to fetch events");
      }
    } catch (error) {
      toast.error("Failed to fetch events");
    } finally {
      setLoadingEvents(false);
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
      location: "",
      event_date: "",
      event_time: "",
      category: "",
      is_active: true,
    });
    setSelectedImage(null);
    setImagePreview(null);
    setEditingEvent(null);
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
      
      const url = editingEvent ? `/api/admin/events/${editingEvent.id}` : "/api/admin/events";
      const method = editingEvent ? "PUT" : "POST";
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: submitData,
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Event ${editingEvent ? "updated" : "created"} successfully`);
        fetchEvents();
        resetForm();
      } else {
        toast.error(data.error || "Failed to save event");
      }
    } catch (error) {
      toast.error("Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      event_date: event.event_date || "",
      event_time: event.event_time || "",
      category: event.category || "",
      is_active: event.is_active,
    });
    if (event.image_key) {
      setImagePreview(getS3PublicUrl(event.image_key));
    } else {
      setImagePreview(null);
    }
    setShowCreateForm(true);
  };

  const handleDelete = async (eventId: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const token = localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Event deleted successfully");
        fetchEvents();
      } else {
        toast.error("Failed to delete event");
      }
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin";
  
  const filteredEvents = events.filter(ev => 
    ev.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ev.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!hasAccess) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Events Planner</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Organize club meetings, seminars, and organizational deadlines.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-3 flex-1">
          <div className="relative w-full sm:max-w-xs lg:w-64 shrink-0">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors placeholder:text-gray-400"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white dark:bg-gray-700 text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiGrid /> Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "list" ? "bg-white dark:bg-gray-700 text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
          >
            <FiPlus /> New Event
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingEvent ? "Edit Event details" : "Create New Event"}
            </h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6" encType="multipart/form-data">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="E.g. Annual Partner Summit"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Location</label>
              <input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="E.g. Main Conference Hall"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Category</label>
              <input
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="E.g. Seminar, Workshop, Executive Meeting"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Calendar Date</label>
              <input
                name="event_date"
                type="date"
                value={formData.event_date}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                required 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Time</label>
              <input
                name="event_time"
                type="time"
                value={formData.event_time}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detailed explanation of the event..."
                rows={4}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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

            <div className="space-y-1.5 md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                id="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
              />
              <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300">Flag as Active</label>
            </div>
            
            <div className="flex items-center gap-3 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
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

      {loadingEvents ? (
        <div className="py-20 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-24 text-center">
          <FiCalendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No events found</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">Try adjusting your search criteria or schedule a new event.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div key={event.id} className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-all duration-300 flex flex-col">
              <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {event.image_key ? (
                  <div className="relative h-full w-full p-4 flex items-center justify-center">
                    <Image src={getS3PublicUrl(event.image_key)} alt={event.title} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-emerald-500/10">
                    <FiCalendar className="w-16 h-16 text-gray-300 dark:text-gray-700 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
                
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-white backdrop-blur shadow-sm uppercase tracking-wider">
                    {event.category || "General"}
                  </span>
                </div>
                
                <div className="absolute top-4 right-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg backdrop-blur shadow-sm ${event.is_active ? "bg-emerald-500/90 text-white" : "bg-gray-800/90 text-gray-300"}`}>
                    {event.is_active ? "Upcoming" : "Passed"}
                  </span>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors line-clamp-2">{event.title}</h3>
                
                <div className="mt-4 space-y-2 flex-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Date</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{event.event_date}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Location</span>
                    <span className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{event.location || "TBA"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Time</span>
                    <span className="font-bold text-gray-900 dark:text-white">{event.event_time || "TBA"}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Fixed: {new Date(event.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(event)} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(event.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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
                  <th className="px-6 py-4 font-bold">Event Log</th>
                  <th className="px-6 py-4 font-bold">Schedule</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex-shrink-0 border border-gray-100 dark:border-gray-700 flex items-center justify-center p-1">
                          {event.image_key ? (
                            <Image src={getS3PublicUrl(event.image_key)} alt={event.title} fill className="object-contain p-1" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-emerald-500/5">
                              <FiCalendar className="w-5 h-5 text-emerald-500/50 dark:text-emerald-400/50" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-base">{event.title}</p>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{event.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                      <p><span className="text-gray-400">Date:</span> {event.event_date}</p>
                      <p><span className="text-gray-400">Time:</span> {event.event_time}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${event.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {event.is_active ? "Active" : "Passed"}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{event.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(event)} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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
