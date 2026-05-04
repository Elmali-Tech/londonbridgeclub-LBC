'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import UserProfile from '@/app/components/profile/UserProfile';
import { SubscriptionStatus, updateSubscriptionStatus } from '@/lib/subscriptionUtils';
import ImageUpload from '@/app/components/profile/ImageUpload';
import PostCard, { Post as PostType } from '@/app/components/dashboard/PostCard';
import { toast } from 'react-hot-toast';
import Loading from '@/app/components/ui/Loading';
import { supabase } from '@/lib/supabase';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';
import Image from 'next/image';
import { Plus, CheckCircle } from 'lucide-react';

interface UserProfileData {
  id: number;
  full_name: string;
  username?: string;
  headline?: string;
  bio?: string;
  profile_image_key?: string;
  banner_image_key?: string;
  location?: string;
  industry?: string;
  status?: 'personal' | 'corporate';
  linkedin_url?: string;
  website_url?: string;
  date_of_birth?: string;
  created_at: string;
  isFollowing: boolean;
  stats: {
    followers: number;
    following: number;
    posts: number;
  };
}

// Interface for user tags
interface UserTags {
  job_title: string[];
  goals: string[];
  interests: string[];
}

interface PostApiResponse {
  id: number;
  user_id: number;
  content: string;
  visibility: 'public' | 'connections' | 'private';
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  is_liked: boolean;
  media?: Array<{
    id: number;
    post_id: number;
    s3_bucket_name: string;
    s3_key: string;
    media_type: string;
    media_original_name: string;
    media_size: number;
    media_content_type: string;
    created_at: string;
  }>;
}

export default function UserProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userTags, setUserTags] = useState<UserTags>({
    job_title: [],
    goals: [],
    interests: []
  });
  const [loadingTags, setLoadingTags] = useState(false);
  
  // Get userId from pathname
  const pathParts = pathname.split('/');
  const userId = pathParts[pathParts.length - 1];
  
  // Check if viewing own profile
  const isCurrentUser = user ? String(user.id) === userId : false;
  
  // Redirect to personal profile page if viewing own profile
  useEffect(() => {
    if (isCurrentUser) {
      router.push('/dashboard/profile');
    }
  }, [isCurrentUser, router]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('Session not found. Please log in again.');
        }

        // Fetch user profile
        const response = await fetch(`/api/users/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch user profile');
        }

        setProfileData(data.user);

        // Fetch user's posts
        const postsResponse = await fetch(`/api/posts/user/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const postsData = await postsResponse.json();

        if (!postsData.success) {
          throw new Error(postsData.error || 'Failed to fetch user posts');
        }

        // Format post data for the UI and add author info
        const formattedPosts = postsData.posts.map((post: PostApiResponse) => ({
          ...post,
          isLiked: post.is_liked ? true : false, // Ensure boolean type
          author: {
            id: data.user.id,
            full_name: data.user.full_name,
            headline: data.user.headline || '',
            profile_image_key: data.user.profile_image_key
          }
        }));

        setPosts(formattedPosts);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading the profile');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user, userId]);

  // Fetch user tags
  useEffect(() => {
    const fetchUserTags = async () => {
      if (!userId) return;
      
      try {
        setLoadingTags(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('Session not found. Please log in again.');
        }

        const response = await fetch(`/api/user-tags?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Error loading tags');
        }

        setUserTags(data.tags);

      } catch (err) {
        console.error('Error loading tags:', err);
        // Don't show error toast for tags, just log it
      } finally {
        setLoadingTags(false);
      }
    };

    fetchUserTags();
  }, [userId]);

  // Handle follow user
  const handleFollow = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ followingId: userId })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to follow user');
      }

      // Update local state
      if (profileData) {
        setProfileData({
          ...profileData,
          isFollowing: true,
          stats: {
            ...profileData.stats,
            followers: profileData.stats.followers + 1
          }
        });
      }
    } catch (err) {
      console.error('Error following user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to follow user');
    }
  };

  // Handle unfollow user
  const handleUnfollow = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      const response = await fetch(`/api/connections?followingId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to unfollow user');
      }

      // Update local state
      if (profileData) {
        setProfileData({
          ...profileData,
          isFollowing: false,
          stats: {
            ...profileData.stats,
            followers: Math.max(0, profileData.stats.followers - 1)
          }
        });
      }
    } catch (err) {
      console.error('Error unfollowing user:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to unfollow user');
    }
  };

  // Handle message user
  const handleMessage = async () => {
    if (!user || !profileData) {
      toast.error('Please log in to send messages');
      return;
    }

    if (!profileData.id) {
      toast.error('User profile data is incomplete');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      // Create or get existing chat using our new API
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'direct',
          participant_ids: [profileData.id]
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create chat');
      }

      // Wait a bit for the messaging hook to reload chats, then redirect
      setTimeout(() => {
        router.push(`/dashboard/chat/${data.chat.id}`);
        toast.success(`Started chat with ${profileData.full_name}`);
      }, 1000);
    } catch (err) {
      console.error('Error starting conversation:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start conversation');
    }
  };

  // Handle like for posts
  const handleLikePost = async (postId: number, isLiked: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      // Call like API endpoint
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `Failed to ${isLiked ? 'unlike' : 'like'} post`);
      }

      // Update posts state
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes_count: isLiked ? Math.max(0, post.likes_count - 1) : post.likes_count + 1,
              isLiked: !isLiked
            };
          }
          return post;
        })
      );
    } catch (err) {
      console.error('Error toggling like:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to perform action');
    }
  };

  // Handle comment added
  const handleCommentAdded = (postId: number) => {
    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments_count: post.comments_count + 1
          };
        }
        return post;
      })
    );
  };

  if (loading) {
    return (
      <DashboardContainer user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      </DashboardContainer>
    );
  }

  if (error) {
    return (
      <DashboardContainer user={user}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </DashboardContainer>
    );
  }

  if (!profileData) {
    return (
      <DashboardContainer user={user}>
        <div className="text-center py-12">
          <p className="text-gray-600">User not found</p>
        </div>
      </DashboardContainer>
    );
  }

  // Get user initials from full_name
  const getUserInitials = (fullName: string) => {
    return fullName.split(' ').map(name => name[0]).join('').toUpperCase();
  };

  return (
    <DashboardContainer user={user} showLeftSidebar={true} showRightSidebar={true}>
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Profile Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
          {/* Banner Section */}
          <div className="relative h-48 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600">
            {profileData.banner_image_key ? (
              <Image
                src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${profileData.banner_image_key}`}
                alt="Profile Banner"
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            )}
          </div>

          {/* Profile Content */}
          <div className="px-6 pb-6 pt-1">
            <div className="flex flex-col md:flex-row md:items-end justify-between -mt-20 mb-6 gap-6">
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white">
                  {profileData.profile_image_key ? (
                    <Image
                      src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${profileData.profile_image_key}`}
                      alt={profileData.full_name || 'Profile'}
                      width={160}
                      height={160}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-black text-5xl uppercase">
                      {getUserInitials(profileData.full_name)}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pb-2">
                {profileData.isFollowing ? (
                  <button
                    onClick={handleUnfollow}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-full text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95 border border-gray-200"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Following
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className="flex items-center gap-2 px-8 py-2.5 bg-amber-500 text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Follow
                  </button>
                )}
                <button
                  onClick={handleMessage}
                  className="flex items-center gap-2 px-8 py-2.5 border-2 border-amber-500 text-amber-600 rounded-full text-sm font-black uppercase tracking-widest hover:bg-amber-50 transition-all active:scale-95"
                >
                  Message
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <h1 className="text-3xl font-black text-gray-900 mb-1">{profileData.full_name}</h1>
                <p className="text-lg font-bold text-gray-600 mb-2 leading-tight">
                  {profileData.headline || "London Bridge Club Member"}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {profileData.location || "United Kingdom"}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 hidden md:block" />
                  <span className="text-amber-600">
                    {profileData.stats.followers} Connections
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {profileData.industry && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-black text-gray-700 uppercase tracking-tight">{profileData.industry}</span>
                  </div>
                )}
                {profileData.status && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-amber-600">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black text-amber-600 uppercase tracking-tight">
                      {profileData.status === 'corporate' ? 'Corporate Entity' : 'Individual Partner'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (About & Activity) */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-black text-gray-900 mb-4 uppercase tracking-tight">About</h2>
              <p className="text-gray-600 leading-relaxed font-medium">
                {profileData.bio || "No description provided."}
              </p>
            </div>

            {/* Experience/Info (Tags) Section */}
            {(userTags.job_title.length > 0 || userTags.goals.length > 0 || userTags.interests.length > 0) && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">Professional Insights</h2>
                
                <div className="space-y-6">
                  {userTags.job_title.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Roles & Positions</h3>
                      <div className="flex flex-wrap gap-2">
                        {userTags.job_title.map((tag, i) => (
                          <span key={i} className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-black uppercase border border-blue-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {userTags.goals.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Core Objectives</h3>
                      <div className="flex flex-wrap gap-2">
                        {userTags.goals.map((tag, i) => (
                          <span key={i} className="px-4 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-black uppercase border border-green-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {userTags.interests.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Areas of Interest</h3>
                      <div className="flex flex-wrap gap-2">
                        {userTags.interests.map((tag, i) => (
                          <span key={i} className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-black uppercase border border-purple-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Feed */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Activity</h2>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase">
                  {posts.length} Posts
                </span>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={(postId) => handleLikePost(postId, post.isLiked)}
                      onCommentAdded={() => handleCommentAdded(post.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-6">
            {/* Contact Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Contact Profile</h2>
              <div className="space-y-4">
                {profileData.linkedin_url && (
                  <a href={profileData.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white group-hover:bg-blue-700 transition-colors">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </div>
                    <span className="text-xs font-black text-gray-600 uppercase group-hover:text-blue-600 transition-colors">LinkedIn Profile</span>
                  </a>
                )}
                {profileData.website_url && (
                  <a href={profileData.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-white group-hover:bg-black transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    </div>
                    <span className="text-xs font-black text-gray-600 uppercase group-hover:text-black transition-colors">Professional Site</span>
                  </a>
                )}
              </div>
            </div>

            {/* Birthday Section */}
            {profileData.date_of_birth && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Network Insights</h2>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center text-amber-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="text-xs font-black text-gray-500 uppercase">
                    Birthday: {new Date(profileData.date_of_birth).toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
} 