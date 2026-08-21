'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import CookieConsentModal from '@/app/components/CookieConsentModal';

export default function Register() {
  const [showCookieModal, setShowCookieModal] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setShowCookieModal(true);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowCookieModal(false);
  };

  const handleDeclineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowCookieModal(false);
  };

  const handleCloseCookieModal = () => {
    setShowCookieModal(false);
  };

  return (
    <>
      <Navbar currentPage="register" />

      <CookieConsentModal
        isOpen={showCookieModal}
        onAccept={handleAcceptCookies}
        onDecline={handleDeclineCookies}
        onClose={handleCloseCookieModal}
      />

      <div className="min-h-screen bg-white flex items-center justify-center py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-light mb-6 italic leading-tight text-black">
              Membership By Invitation
            </h1>
            <p className="text-gray-600 text-lg font-light mb-4">
              Public self-registration is currently closed. New memberships are set up
              directly by our team.
            </p>
            <p className="text-gray-600 text-lg font-light mb-10">
              Get in touch and we will guide you through the right membership path.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-block bg-black text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
              >
                Contact Us
              </Link>
              <Link
                href="/login"
                className="inline-block bg-white text-black border border-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition-colors uppercase"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
