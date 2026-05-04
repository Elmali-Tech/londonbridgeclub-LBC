'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User } from '@/types/database';
import { HiCake, HiSparkles } from 'react-icons/hi';

interface LeftSidebarProps {
  user: User | null;
}

interface BirthdayUser {
  id: number;
  full_name: string;
  headline?: string;
  profile_image_key?: string;
}

interface RecentUser {
  id: number;
  full_name: string;
  headline?: string;
  profile_image_key?: string;
  created_at: string;
}

export default function LeftSidebar({ user }: LeftSidebarProps) {
  const [birthdayUsers, setBirthdayUsers] = useState<BirthdayUser[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch birthday users
        const birthdayRes = await fetch('/api/users/birthdays');
        if (birthdayRes.ok) {
          const birthdayData = await birthdayRes.json();
          setBirthdayUsers(birthdayData.users || []);
        }

        // Fetch recent users
        const recentRes = await fetch('/api/users/recent');
        if (recentRes.ok) {
          const recentData = await recentRes.json();
          setRecentUsers(recentData.users || []);
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
      {/* Profile Card */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-gray-200 to-gray-300"></div>
        <div className="px-4 pb-4 -mt-8 relative">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-sm mx-auto">
            {user?.profile_image_key ? (
              <Image
                src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                alt={user.full_name || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-lg">
                {user?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
              </div>
            )}
          </div>
          <div className="text-center mt-3">
            <h3 className="font-semibold text-black text-lg">{user?.full_name}</h3>
            <p className="text-gray-600 text-sm mt-1">{user?.headline || user?.email}</p>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-3">
          <a 
            href="/dashboard/profile"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:from-amber-600 hover:to-amber-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            View Profile
          </a>
        </div>
      </div>

      {/* Birthday Users Section */}
      {!loading && (
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <HiCake className="w-5 h-5 text-pink-500" />
              <h3 className="text-black font-semibold text-sm">Birthdays Today</h3>
            </div>
          </div>
          {birthdayUsers.length > 0 ? (
            <div className="px-4 py-3 space-y-3">
              {birthdayUsers.map((birthdayUser) => (
                <Link
                  key={birthdayUser.id}
                  href={`/dashboard/users/${birthdayUser.id}`}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-pink-200">
                    {birthdayUser.profile_image_key ? (
                      <Image
                        src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${birthdayUser.profile_image_key}`}
                        alt={birthdayUser.full_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                        {birthdayUser.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-1">
                      <HiCake className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-pink-600">
                      {birthdayUser.full_name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {birthdayUser.headline || 'Member'}
                    </p>
                  </div>
                  <div className="text-xl">🎉</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No birthdays today</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Users Section */}
      {!loading && (
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <HiSparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-black font-semibold text-sm">New Members</h3>
            </div>
          </div>
          {recentUsers.length > 0 ? (
            <>
              <div className="px-4 py-3 space-y-3">
                {recentUsers.map((recentUser) => (
                  <Link
                    key={recentUser.id}
                    href={`/dashboard/users/${recentUser.id}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {recentUser.profile_image_key ? (
                        <Image
                          src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${recentUser.profile_image_key}`}
                          alt={recentUser.full_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                          {recentUser.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-amber-600">
                          {recentUser.full_name}
                        </h4>
                        <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
                          NEW
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {recentUser.headline || 'Member'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="px-4 pb-3">
                <Link
                  href="/dashboard/members"
                  className="text-xs text-gray-600 hover:text-amber-600 font-medium transition-colors block text-center"
                >
                  See All Members
                </Link>
              </div>
            </>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No new members this week</p>
              <Link
                href="/dashboard/members"
                className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors mt-2 inline-block"
              >
                See All Members
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 