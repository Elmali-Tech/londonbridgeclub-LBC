"use client";
import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getS3PublicUrl } from '@/lib/awsConfig';
import Link from "next/link";
import { useAuth } from '@/context/AuthContext';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";

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

type RsvpStatus = "attending" | "maybe" | "declined" | null;

const RSVP_OPTIONS: { value: "attending" | "maybe" | "declined"; label: string; color: string }[] = [
  { value: "attending", label: "Attending", color: "bg-green-600 hover:bg-green-700 text-white" },
  { value: "maybe",     label: "Maybe",     color: "bg-amber-500 hover:bg-amber-600 text-white" },
  { value: "declined",  label: "Decline",   color: "bg-red-500 hover:bg-red-600 text-white" },
];

const STATUS_BADGE: Record<string, string> = {
  attending: "bg-green-100 text-green-700 border border-green-200",
  maybe:     "bg-amber-100 text-amber-700 border border-amber-200",
  declined:  "bg-red-100 text-red-700 border border-red-200",
};

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [rsvpStatuses, setRsvpStatuses] = useState<Record<number, RsvpStatus>>({});
  const [rsvpLoading, setRsvpLoading] = useState<Record<number, boolean>>({});
  const [openRsvpFor, setOpenRsvpFor] = useState<number | null>(null);

  const authToken = () => localStorage.getItem("authToken") || Cookies.get("authToken") || "";

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events');
      const data = await response.json();
      if (data.success) {
        const active: Event[] = data.events.filter((e: Event) => e.is_active);
        setEvents(active);
        fetchAllRsvps(active);
      } else {
        setError('Failed to fetch events');
      }
    } catch {
      setError('An error occurred while fetching events');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllRsvps = async (evts: Event[]) => {
    const token = authToken();
    if (!token) return;
    const results = await Promise.allSettled(
      evts.map((e) =>
        fetch(`/api/events/${e.id}/rsvp`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((d) => ({ id: e.id, status: (d.rsvp?.status ?? null) as RsvpStatus }))
      )
    );
    const map: Record<number, RsvpStatus> = {};
    results.forEach((r) => { if (r.status === "fulfilled") map[r.value.id] = r.value.status; });
    setRsvpStatuses(map);
  };

  const handleRsvp = useCallback(async (eventId: number, status: "attending" | "maybe" | "declined") => {
    setRsvpLoading((p) => ({ ...p, [eventId]: true }));
    try {
      const token = authToken();
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setRsvpStatuses((p) => ({ ...p, [eventId]: status }));
        toast.success(`RSVP updated: ${status}`);
      } else {
        toast.error("Failed to update RSVP");
      }
    } catch {
      toast.error("Failed to update RSVP");
    } finally {
      setRsvpLoading((p) => ({ ...p, [eventId]: false }));
      setOpenRsvpFor(null);
    }
  }, []);

  const handleCancelRsvp = useCallback(async (eventId: number) => {
    setRsvpLoading((p) => ({ ...p, [eventId]: true }));
    try {
      const token = authToken();
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRsvpStatuses((p) => ({ ...p, [eventId]: null }));
        toast.success("RSVP cancelled");
      } else {
        toast.error("Failed to cancel RSVP");
      }
    } catch {
      toast.error("Failed to cancel RSVP");
    } finally {
      setRsvpLoading((p) => ({ ...p, [eventId]: false }));
      setOpenRsvpFor(null);
    }
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || event.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardContainer user={user}>
      <div className="max-w-5xl mx-auto py-8">
        <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold mb-4">Events</h1>
        </div>
        <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading events</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600">No active events at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEvents.map(event => {
                const status = rsvpStatuses[event.id] ?? null;
                const loading = rsvpLoading[event.id] ?? false;
                const isOpen = openRsvpFor === event.id;

                return (
                  <div key={event.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-amber-200 flex flex-col">
                    <Link href={`/dashboard/events/${event.id}`} className="block">
                      <div className="relative h-48 w-full">
                        <Image
                          src={event.image_key ? getS3PublicUrl(event.image_key) : '/images/placeholder.jpg'}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-white text-xl font-bold line-clamp-2">{event.title}</h3>
                          <p className="text-gray-200 text-sm flex items-center mt-1">{event.location}</p>
                        </div>
                      </div>
                      <div className="p-6">
                        <p className="text-gray-600 text-sm mb-2"><span className="font-semibold">Date:</span> {event.event_date}</p>
                        <p className="text-gray-600 text-sm mb-2"><span className="font-semibold">Time:</span> {event.event_time}</p>
                        <p className="text-gray-600 text-sm mb-2"><span className="font-semibold">Category:</span> {event.category}</p>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>
                      </div>
                    </Link>

                    {/* RSVP section — outside Link to prevent navigation on click */}
                    <div className="px-6 pb-5 mt-auto border-t border-gray-100 pt-4">
                      {status ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${STATUS_BADGE[status]}`}>
                            ✓ {status}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setOpenRsvpFor(isOpen ? null : event.id)}
                              disabled={loading}
                              className="text-xs font-semibold text-gray-500 hover:text-amber-600 underline underline-offset-2"
                            >
                              Change
                            </button>
                            <button
                              onClick={() => handleCancelRsvp(event.id)}
                              disabled={loading}
                              className="text-xs font-semibold text-red-400 hover:text-red-600 underline underline-offset-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setOpenRsvpFor(isOpen ? null : event.id)}
                          disabled={loading}
                          className="w-full py-2 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                        >
                          {loading ? "Updating…" : "RSVP to this event"}
                        </button>
                      )}

                      {isOpen && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {RSVP_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => handleRsvp(event.id, opt.value)}
                              disabled={loading}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${opt.color} disabled:opacity-50`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
