import React from 'react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* YouTube video background */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <div className="relative w-full h-full">
          <iframe 
            className="absolute top-0 left-0 w-full h-full object-cover"
            src="https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=YOUR_VIDEO_ID"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="London Bridge Club"
          ></iframe>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 text-center text-white">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up">
          <span className="text-amber-500">LONDON BRIDGE</span> CLUB
        </h1>
        <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
          Connect with London's elite business professionals in an exclusive networking environment designed to foster meaningful relationships and growth opportunities.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/membership" className="bg-lime-500 hover:bg-lime-600 text-black px-8 py-3 rounded-sm font-medium text-lg transition-all transform hover:scale-105">
            JOIN NOW
          </Link>
          <Link href="#about" className="bg-transparent hover:bg-white/10 border border-white px-8 py-3 rounded-sm font-medium text-lg transition-all">
            LEARN MORE
          </Link>
        </div>
      </div>
    </section>
  );
} 