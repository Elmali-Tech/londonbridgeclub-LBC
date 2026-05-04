'use client';

import React from 'react';
import { HiX } from 'react-icons/hi';

interface CookieConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export default function CookieConsentModal({ 
  isOpen, 
  onAccept, 
  onDecline, 
  onClose 
}: CookieConsentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Content */}
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              We use cookies to enhance your experience and analyze site traffic. 
              <a 
                href="/cookies" 
                className="text-blue-600 hover:text-blue-700 underline ml-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
              </a>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onDecline}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
