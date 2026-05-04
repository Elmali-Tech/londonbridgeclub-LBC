'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiCake, HiX } from 'react-icons/hi';

interface BirthdayUser {
  id: number;
  full_name: string;
  headline?: string;
  profile_image_key?: string;
}

export default function BirthdayBanner() {
  const [birthdayUsers, setBirthdayUsers] = useState<BirthdayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    // Fetch birthday users
    async function fetchBirthdayUsers() {
      try {
        const response = await fetch('/api/users/birthdays');
        if (response.ok) {
          const data = await response.json();
          setBirthdayUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching birthday users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBirthdayUsers();
  }, []);

  const handleClose = () => {
    setIsClosed(true);
  };

  // Don't render if loading, closed, or no birthdays
  if (loading || isClosed || birthdayUsers.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-200 rounded-lg mb-4 shadow-sm relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-2 left-4 text-4xl">🎂</div>
        <div className="absolute bottom-2 right-8 text-4xl">🎉</div>
      </div>

      {/* Close button - top right with border */}
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm z-10"
        aria-label="Close birthday banner"
      >
        <HiX className="w-4 h-4 text-gray-600" />
      </button>

      <div className="p-5 pr-12 relative">
        <div className="flex items-center gap-4">
          {/* Icon with background */}
          <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-2.5 rounded-full flex-shrink-0">
            <HiCake className="w-5 h-5 text-amber-700" />
          </div>
          
          {/* Content */}
          <div className="flex flex-col gap-2 flex-1">
            {/* Header text */}
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-gray-900">
                {birthdayUsers.length === 1 
                  ? '🎉 Birthday Celebration!' 
                  : '🎉 Birthday Celebrations!'}
              </h3>
              <span className="text-sm text-gray-600">
                Let's wish {birthdayUsers.length === 1 ? 'them' : 'them all'} a wonderful day
              </span>
            </div>
            
            {/* Birthday users - inline */}
            <div className="flex items-center gap-3 flex-wrap">
              {birthdayUsers.map((user, index) => (
                <React.Fragment key={user.id}>
                  <Link
                    href={`/dashboard/users/${user.id}`}
                    className="flex items-center gap-2.5 hover:bg-white/80 rounded-lg px-3 py-2 transition-all border border-transparent hover:border-amber-200 hover:shadow-sm group"
                  >
                    {/* Profile Picture */}
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-300 flex-shrink-0 shadow-sm">
                      {user.profile_image_key ? (
                        <Image
                          src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                          alt={user.full_name}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm">
                          {user.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </div>
                      )}
                    </div>

                    {/* User Name */}
                    <span className="text-sm font-medium text-gray-900 group-hover:text-amber-700 transition-colors">
                      {user.full_name}
                    </span>
                    
                    {/* Birthday emoji */}
                    <span className="text-lg">🎂</span>
                  </Link>
                  
                  {/* Separator */}
                  {index < birthdayUsers.length - 1 && (
                    <span className="text-amber-300 font-bold">•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

