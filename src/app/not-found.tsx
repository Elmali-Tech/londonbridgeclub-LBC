'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function NotFound() {
  const [count, setCount] = useState(10);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timer);
          window.location.href = '/';
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Navbar />
      
      {/* Hero Section with 404 - White background */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <div className="text-[120px] md:text-[180px] font-light text-black leading-none mb-8">
                      404
                    </div>
            <h1 className="text-4xl md:text-5xl font-light mb-8 text-black italic leading-tight">
              Page Not Found
            </h1>
            <p className="text-gray-600 text-xl max-w-3xl mx-auto font-light leading-relaxed">
              The page you're looking for doesn't exist or has been moved.
                    </p>
                  </div>
                </div>
      </section>
            
      {/* Main Content - White background */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
                Let's Get You Back on Track
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                The page you're trying to access may have been moved, removed, or never existed. 
                You can continue by returning to our homepage or exploring other sections.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/"
                  className="bg-black text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase text-center"
                >
                  Return to Homepage
                </Link>
                <Link
                  href="/contact"
                  className="border border-black text-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition-colors uppercase text-center"
                >
                  Contact Us
                </Link>
              </div>
              
              <div className="mt-8">
                <p className="text-gray-500 text-sm">
                  You will be redirected to the homepage in <span className="text-black font-medium">{count}</span> seconds...
                </p>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gray-50 p-12 rounded-lg text-center">
                <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mx-auto mb-8">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.489.901-6.077 2.377m-.92 3.734C6.085 21.761 9.159 22 12.001 22c2.842 0 5.916-.239 7.001-.889M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-4">Lost your way?</h3>
                <p className="text-gray-600">Don't worry, it happens to everyone. Let's help you find what you're looking for.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation - Gray background */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
              Perhaps you'd like to visit
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Link href="/membership" className="group p-6 bg-white border border-gray-200 hover:border-black rounded-lg transition-all duration-300 hover:shadow-lg text-center">
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-black rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <svg className="w-6 h-6 text-black group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Membership</h3>
              <p className="text-gray-600 text-sm">Explore our membership plans</p>
              </Link>
            
            <Link href="/about" className="group p-6 bg-white border border-gray-200 hover:border-black rounded-lg transition-all duration-300 hover:shadow-lg text-center">
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-black rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <svg className="w-6 h-6 text-black group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">About Us</h3>
              <p className="text-gray-600 text-sm">Learn about our story</p>
              </Link>
            
            <Link href="/login" className="group p-6 bg-white border border-gray-200 hover:border-black rounded-lg transition-all duration-300 hover:shadow-lg text-center">
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-black rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <svg className="w-6 h-6 text-black group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Login</h3>
              <p className="text-gray-600 text-sm">Access your account</p>
              </Link>
            
            <Link href="/contact" className="group p-6 bg-white border border-gray-200 hover:border-black rounded-lg transition-all duration-300 hover:shadow-lg text-center">
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-black rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <svg className="w-6 h-6 text-black group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Contact</h3>
              <p className="text-gray-600 text-sm">Get in touch</p>
              </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
} 