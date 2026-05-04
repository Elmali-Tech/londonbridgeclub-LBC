'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getS3PublicUrl } from '@/lib/awsConfig';
import { MdWorkOutline, MdCardGiftcard, MdArrowForward } from 'react-icons/md';
import Cookies from 'js-cookie';

interface SuggestedUser {
  id: number;
  full_name: string;
  headline?: string;
  profile_image_key?: string;
  isFollowing?: boolean;
  followerCount?: number;
}

interface Opportunity {
  id: number;
  title: string;
  company: string;
  category: string;
  image_key: string | null;
}

interface Benefit {
  id: number;
  title: string;
  partner_name: string | null;
  discount_percentage: number | null;
  image_key: string | null;
}



export default function RightSidebar() {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [loadingBenefits, setLoadingBenefits] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        // 1. Kullanıcının takip ettiklerini al
        const followingRes = await fetch(`/api/users/${user.id}/following`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const followingData = await followingRes.json();
        const followingIds = (followingData.following || []).map((u: { id: number }) => u.id);
        // 2. Bu kişilerin takip ettiklerini topla
        const secondDegreeIds: number[] = [];
        for (const fid of followingIds) {
          if (fid === user.id) continue;
          const res = await fetch(`/api/users/${fid}/following`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success && data.following) {
            secondDegreeIds.push(...data.following.map((u: { id: number }) => u.id));
          }
        }
        // 3. Kendi ID'ni ve zaten takip ettiklerini çıkar
        const excludeIds = new Set([...followingIds, user.id]);
        const uniqueSecondDegreeIds = Array.from(new Set(secondDegreeIds)).filter(
          (id) => !excludeIds.has(id)
        );
        // 4. Bu kullanıcıların bilgilerini çek
        let secondDegreeUsers: SuggestedUser[] = [];
        if (uniqueSecondDegreeIds.length > 0) {
          const res = await fetch('/api/suggested-users?ids=' + uniqueSecondDegreeIds.join(','), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success) secondDegreeUsers = data.users;
        }
        // 5. Eğer öneri azsa, en çok takipçisi olanlardan tamamla
        let mostFollowed: SuggestedUser[] = [];
        if (secondDegreeUsers.length < 5) {
          const res = await fetch('/api/suggested-users?mostFollowed=1&exclude=' + [...excludeIds].join(','), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success) mostFollowed = data.users;
        }
        // 6. Sonuçları birleştir
        const allSuggestions = [...secondDegreeUsers, ...mostFollowed]
          .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)
          .slice(0, 5);
        setSuggestedUsers(allSuggestions);
      } catch {
        setSuggestedUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [user]);

  // Fetch opportunities
  useEffect(() => {
    const fetchOpportunities = async () => {
      setLoadingOpportunities(true);
      try {
        const response = await fetch('/api/admin/opportunities');
        const data = await response.json();
        if (data.success) {
          // Sadece aktif olanları al ve ilk 3'ünü göster
          const activeOpportunities = data.opportunities
            .filter((opp: any) => opp.is_active)
            .slice(0, 3);
          setOpportunities(activeOpportunities);
        }
      } catch (error) {
        console.error('Error fetching opportunities:', error);
      } finally {
        setLoadingOpportunities(false);
      }
    };
    fetchOpportunities();
  }, []);

  // Fetch benefits
  useEffect(() => {
    const fetchBenefits = async () => {
      setLoadingBenefits(true);
      try {
        const token = Cookies.get('authToken') || localStorage.getItem('authToken');
        if (!token) return;
        
        const response = await fetch('/api/benefits', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (data.success) {
          // Sadece aktif olanları al ve ilk 3'ünü göster
          const activeBenefits = data.benefits
            .filter((benefit: any) => benefit.is_active)
            .slice(0, 3);
          setBenefits(activeBenefits);
        }
      } catch (error) {
        console.error('Error fetching benefits:', error);
      } finally {
        setLoadingBenefits(false);
      }
    };
    fetchBenefits();
  }, []);

  return (
    <aside className="w-full space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
      {/* Opportunities Section */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdWorkOutline className="text-amber-600 text-xl" />
              <h3 className="text-black font-semibold text-base">Opportunities</h3>
            </div>
            <Link 
              href="/dashboard/opportunities" 
              className="text-amber-600 hover:text-amber-700 transition-colors"
            >
              <MdArrowForward className="text-lg" />
            </Link>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {loadingOpportunities ? (
            <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">No opportunities yet</div>
          ) : (
            opportunities.map((opp) => (
              <Link
                key={opp.id}
                href={`/dashboard/opportunities/${opp.id}`}
                className="block group hover:bg-gray-50 rounded-lg p-3 transition-all border border-transparent hover:border-amber-200"
              >
                <div className="flex gap-3">
                  {opp.image_key ? (
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={getS3PublicUrl(opp.image_key)}
                        alt={opp.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                      <MdWorkOutline className="text-white text-2xl" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-black font-medium text-sm group-hover:text-amber-600 transition-colors line-clamp-2">
                      {opp.title}
                    </h4>
                    <p className="text-gray-500 text-xs mt-1">{opp.company}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                      {opp.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        {opportunities.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <Link 
              href="/dashboard/opportunities" 
              className="w-full text-center text-amber-600 text-sm font-medium hover:text-amber-700 transition-colors block"
            >
              View All Opportunities
            </Link>
          </div>
        )}
      </div>

      {/* Benefits Section */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MdCardGiftcard className="text-emerald-600 text-xl" />
              <h3 className="text-black font-semibold text-base">Member Benefits</h3>
            </div>
            <Link 
              href="/dashboard/benefits" 
              className="text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <MdArrowForward className="text-lg" />
            </Link>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {loadingBenefits ? (
            <div className="text-center py-4 text-gray-500 text-sm">Loading...</div>
          ) : benefits.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">No benefits yet</div>
          ) : (
            benefits.map((benefit) => (
              <div
                key={benefit.id}
                className="group hover:bg-gray-50 rounded-lg p-3 transition-all border border-transparent hover:border-emerald-200"
              >
                <div className="flex gap-3">
                  {benefit.image_key ? (
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={getS3PublicUrl(benefit.image_key)}
                        alt={benefit.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <MdCardGiftcard className="text-white text-2xl" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {benefit.discount_percentage && (
                      <span className="inline-block mb-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                        {benefit.discount_percentage}% OFF
                      </span>
                    )}
                    <h4 className="text-black font-medium text-sm group-hover:text-emerald-600 transition-colors line-clamp-2">
                      {benefit.title}
                    </h4>
                    {benefit.partner_name && (
                      <p className="text-gray-500 text-xs mt-1 line-clamp-1">{benefit.partner_name}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {benefits.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
            <Link 
              href="/dashboard/benefits" 
              className="w-full text-center text-emerald-600 text-sm font-medium hover:text-emerald-700 transition-colors block"
            >
              View All Benefits
            </Link>
          </div>
        )}
      </div>
      {/* People you may know */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="p-4">
          <h3 className="text-black font-semibold text-base mb-3">People you may know:</h3>
        </div>
        <div className="px-4 pb-4 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : suggestedUsers.length === 0 ? (
            <div className="text-center text-gray-500">No suggestions</div>
          ) : suggestedUsers.map(user => (
            <div key={user.id} className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                {user.profile_image_key ? (
                  <Image
                    src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                    alt={user.full_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-200 text-black font-bold">
                    {user.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/dashboard/users/${user.id}`} className="text-black font-medium text-sm hover:underline">
                  {user.full_name}
                </Link>
                <p className="text-gray-500 text-xs">{user.headline}</p>
                {user.followerCount !== undefined && (
                  <p className="text-gray-400 text-xs">{user.followerCount} followers</p>
                )}
              </div>
              <button className="px-3 py-1.5 text-xs font-medium border border-gray-600 text-gray-600 bg-white hover:border-gray-800 hover:bg-gray-50 rounded transition-colors flex-shrink-0">
                Connect
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4">
          <Link href="/dashboard/members" className="w-full text-center text-gray-600 text-sm font-medium hover:text-black transition-colors block">
            See All
          </Link>
        </div>
      </div>
      
      {/* Join discussion */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden relative">
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-full shadow-lg mb-2">
              <span className="font-semibold text-sm">Coming Soon</span>
            </div>
            <p className="text-gray-600 text-xs">Discussion feature is under development</p>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="text-black font-semibold text-base mb-3">Join discussion</h3>
        </div>
        <div className="px-4 pb-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 flex-shrink-0">
              <Image
                src="https://randomuser.me/api/portraits/women/1.jpg"
                alt="User 1"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
              <Image
                src="https://randomuser.me/api/portraits/men/2.jpg"
                alt="User 2"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
              <Image
                src="https://randomuser.me/api/portraits/women/3.jpg"
                alt="User 3"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-black font-medium text-sm hover:underline cursor-pointer">#CoronaVirus</h4>
              <p className="text-gray-500 text-xs">19,259 post</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 flex-shrink-0">
              <Image
                src="https://randomuser.me/api/portraits/men/4.jpg"
                alt="User 4"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
              <Image
                src="https://randomuser.me/api/portraits/women/5.jpg"
                alt="User 5"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
              <Image
                src="https://randomuser.me/api/portraits/men/6.jpg"
                alt="User 6"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-black font-medium text-sm hover:underline cursor-pointer">#Economy</h4>
              <p className="text-gray-500 text-xs">26,254 post</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 flex-shrink-0">
              <Image
                src="https://randomuser.me/api/portraits/women/7.jpg"
                alt="User 7"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
              <Image
                src="https://randomuser.me/api/portraits/men/8.jpg"
                alt="User 8"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
              <Image
                src="https://randomuser.me/api/portraits/women/9.jpg"
                alt="User 9"
                width={20}
                height={20}
                className="rounded-full border border-white"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-black font-medium text-sm hover:underline cursor-pointer">#CuteDogs</h4>
              <p className="text-gray-500 text-xs">1,087,254 post</p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">
          <Link href="/dashboard/members" className="w-full text-center text-gray-600 text-sm font-medium hover:text-black transition-colors block">
            See All
          </Link>
        </div>
      </div>
    </aside>
  );
} 