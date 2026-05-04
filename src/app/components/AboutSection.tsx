import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutSection() {
  return (
    <section className="py-16" id="about">
      <div className="container mx-auto px-4">
        <div className="text-center mb-4">
          <h5 className="text-amber-500 text-sm tracking-widest uppercase">HELLO!</h5>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">ABOUT LONDON BRIDGE CLUB</h2>
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <Image
              src="https://images.unsplash.com/photo-1639762681057-408e52192e55?ixlib=rb-4.0.3&auto=format&fit=crop&w=2574&q=80"
              alt="Digital Network"
              width={600}
              height={600}
              className="w-full h-auto object-cover rounded-sm shadow-lg"
            />
          </div>
          
          <div className="flex flex-col space-y-6">
            <p className="text-gray-700 text-lg leading-relaxed">
              With our extensive years of experience, we embarked on a journey to realize our dream. We envisioned establishing a club that would facilitate the buying and selling of all kinds of services and products, adhering to universally accepted international norms and principles.
            </p>
            
            <p className="text-gray-700 text-lg leading-relaxed">
              To bring this dream to life, we founded our company in London in 2023. As our first goal, we prepared a manifesto to transform this platform into a Blockchain-based structure.
            </p>
            
            <div className="mt-4">
              <Link
                href="/about"
                className="inline-flex items-center bg-lime-500 hover:bg-lime-600 text-white px-6 py-3 rounded-sm transition-all group"
              >
                <span className="font-medium tracking-wide">ABOUT US</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 