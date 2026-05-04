import React from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Contact() {
  return (
    <>
      <Navbar />
      
      {/* Hero Section - White background */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h1 className="text-5xl md:text-6xl font-light mb-8 text-black italic leading-tight">
              Contact Us
            </h1>
            <p className="text-gray-900 text-xl max-w-3xl mx-auto font-light leading-relaxed">
              Get in touch with us for any questions, suggestions, or membership inquiries.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information Section - White background */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div>
              <h2 className="text-4xl md:text-5xl font-light mb-12 text-gray-900">
                Get in Touch
              </h2>
              
              <div className="space-y-8">
                {/* London Office */}
                <div className="flex items-start">
                  <div className="bg-black p-3 rounded-full mr-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-black font-medium mb-2 text-lg">London Office</h3>
                    <p className="text-gray-600 text-base leading-relaxed">
                      London, United Kingdom
                    </p>
                  </div>
                </div>

                {/* Istanbul Office */}
                <div className="flex items-start">
                  <div className="bg-black p-3 rounded-full mr-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-black font-medium mb-2 text-lg">Istanbul Office</h3>
                    <p className="text-gray-600 text-base leading-relaxed">
                      London Bridge Club Istanbul<br />
                      Balmumcu, Bestekar Sevki Sok.No.11<br />
                      34349, Besiktas, Istanbul
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-black p-3 rounded-full mr-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-black font-medium mb-2 text-lg">Email</h3>
                    <p className="text-gray-600 text-base">info@londonbridge.club</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-black p-3 rounded-full mr-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-black font-medium mb-2 text-lg">Phone</h3>
                    <p className="text-gray-600 text-base">+90 505 404 4488</p>
                    <p className="text-gray-600 text-base">+44 744 415 0564</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Access Links */}
            <div>
              <h2 className="text-4xl md:text-5xl font-light mb-12 text-gray-900">
                Quick Access
              </h2>
              
              <div className="space-y-6">
                <Link 
                  href="/"
                  className="flex items-start group p-6 border border-gray-200 hover:border-black transition-all duration-300 hover:shadow-lg"
                >
                  <div className="bg-gray-100 group-hover:bg-black p-3 rounded-full mr-6 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-black font-medium mb-2 text-lg group-hover:text-black transition-colors duration-300">Homepage</h3>
                    <p className="text-gray-600">Visit our homepage and explore our services</p>
                  </div>
                </Link>
                
                <Link 
                  href="/membership"
                  className="flex items-start group p-6 border border-gray-200 hover:border-black transition-all duration-300 hover:shadow-lg"
                >
                  <div className="bg-gray-100 group-hover:bg-black p-3 rounded-full mr-6 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-black font-medium mb-2 text-lg group-hover:text-black transition-colors duration-300">Membership</h3>
                    <p className="text-gray-600">Explore membership opportunities and join our network</p>
                  </div>
                </Link>
                
                <Link 
                  href="/about"
                  className="flex items-start group p-6 border border-gray-200 hover:border-black transition-all duration-300 hover:shadow-lg"
                >
                  <div className="bg-gray-100 group-hover:bg-black p-3 rounded-full mr-6 transition-colors duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-black font-medium mb-2 text-lg group-hover:text-black transition-colors duration-300">About Us</h3>
                    <p className="text-gray-600">Discover our story, mission and values</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section - Black background */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-light mb-6">
              Ready to Join Our Network?
            </h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto mb-12">
              Connect with London's elite professionals and unlock unprecedented opportunities for growth and collaboration.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                href="/register"
                className="bg-white text-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-100 transition-colors uppercase"
              >
                JOIN NOW
              </Link>
              <Link
                href="/membership"
                className="border border-white text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-white hover:text-black transition-colors uppercase"
              >
                VIEW PLANS
              </Link>
          </div>
        </div>
      </div>
      </section>

      <Footer />
    </>
  );
} 