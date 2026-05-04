import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <div className="relative mb-4">
        <div className="h-16 w-16 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-black text-xl font-bold tracking-widest">LBC</span>
        </div>
      </div>
      <span className="text-gray-500 text-sm font-light tracking-wide">Loading, please wait...</span>
    </div>
  );
} 