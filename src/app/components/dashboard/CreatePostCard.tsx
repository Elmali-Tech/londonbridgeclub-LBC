'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { User } from '@/types/database';
import CreatePostModal from './CreatePostModal';

interface CreatePostCardProps {
  user: User | null;
}

export default function CreatePostCard({ user }: CreatePostCardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-300 p-4">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-300">
            {user?.profile_image_key ? (
              <Image
                src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                alt={user.full_name || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold">
                {user?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
              </div>
            )}
          </div>
          <button 
            onClick={openCreateModal}
            className="flex-1 text-left bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-3 rounded-full border transition-colors cursor-pointer"
          >
            Write something...
          </button>
        </div>
        <div className="flex items-center gap-3 sm:gap-6 mt-4 pt-3 border-t border-gray-200 overflow-x-auto">
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">Photo</span>
          </button>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">Video</span>
          </button>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">Event</span>
          </button>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium hidden sm:inline">Article</span>
          </button>
        </div>
      </div>

      {/* CreatePost Modal */}
      {showCreateModal && (
        <CreatePostModal 
          user={user} 
          onClose={closeCreateModal}
        />
      )}
    </>
  );
} 