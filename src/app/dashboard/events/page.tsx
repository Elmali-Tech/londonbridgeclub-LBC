"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getS3PublicUrl } from '@/lib/awsConfig';
import Link from "next/link";
import { useAuth } from '@/context/AuthContext';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';

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

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events');
      const data = await response.json();
      if (data.success) {
        setEvents(data.events.filter((e: Event) => e.is_active));
      } else {
        setError('Failed to fetch events');
      }
    } catch (err) {
      setError('An error occurred while fetching events');
    } finally {
      setIsLoading(false);
    }
  };

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
              {filteredEvents.map(event => (
                <Link href={`/dashboard/events/${event.id}`} key={event.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-amber-200 block">
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
                    <div className="flex items-center text-gray-500 text-sm">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(event.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
} 