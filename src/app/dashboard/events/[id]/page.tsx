"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { getS3PublicUrl } from '@/lib/awsConfig';

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

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchEvent(params.id as string);
    }
  }, [params?.id]);

  const fetchEvent = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events?id=${id}`);
      const data = await res.json();
      if (data.success && data.events && data.events.length > 0) {
        setEvent(data.events[0]);
      } else if (data.success && data.event) {
        setEvent(data.event);
      } else {
        setError("Event not found");
      }
    } catch (err) {
      setError("An error occurred while fetching event");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">Loading...</div>
    );
  }
  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p className="text-gray-600">{error || "Event not found."}</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded">Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="relative h-64 w-full">
          <Image
            src={event.image_key ? getS3PublicUrl(event.image_key) : '/images/placeholder.jpg'}
            alt={event.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
          <p className="text-gray-700 mb-2"><span className="font-semibold">Location:</span> {event.location}</p>
          <p className="text-gray-700 mb-2"><span className="font-semibold">Date:</span> {event.event_date}</p>
          <p className="text-gray-700 mb-2"><span className="font-semibold">Time:</span> {event.event_time}</p>
          <p className="text-gray-700 mb-2"><span className="font-semibold">Category:</span> {event.category}</p>
          <p className="text-gray-700 mb-4"><span className="font-semibold">Description:</span> {event.description}</p>
          <div className="flex items-center text-gray-500 text-sm">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(event.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
} 