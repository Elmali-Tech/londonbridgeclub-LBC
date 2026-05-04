import React from 'react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface UserStats {
  followers: number;
  following: number;
  posts: number;
}

interface UserProfileProps {
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
  created_at: string;
  isFollowing: boolean;
  stats: UserStats;
  isCurrentUser: boolean;
  onFollow: (userId: number) => Promise<void>;
  onUnfollow: (userId: number) => Promise<void>;
  onMessage: () => Promise<void>;
}

export default function UserProfile({
  id,
  full_name,
  username,
  headline,
  bio,
  profile_image_key,
  banner_image_key,
  location,
  industry,
  linkedin_url,
  website_url,
  created_at,
  isFollowing,
  stats,
  isCurrentUser,
  onFollow,
  onUnfollow,
  onMessage
}: UserProfileProps) {
  
  // Handle follow/unfollow with loading state
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleConnectionToggle = async () => {
    try {
      setIsLoading(true);
      if (isFollowing) {
        await onUnfollow(id);
        toast.success(`You unfollowed ${full_name}`);
      } else {
        await onFollow(id);
        toast.success(`You now follow ${full_name}`);
      }
    } catch (error) {
      toast.error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} this user`);
      console.error('Connection toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get user initials from full_name
  const getUserInitials = () => {
    if (!full_name) return '';
    return full_name.split(' ').map(name => name[0]).join('');
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="flex flex-col">
      {/* Profile Header */}
      <div className="relative bg-gray-900 rounded-sm border border-gray-800 shadow-lg overflow-hidden">
        {/* Cover Photo */}
        <div className="h-48 bg-gradient-to-r from-blue-900 to-purple-900 relative">
          {!banner_image_key && (
            <>
              {/* Cover pattern - Only show if no banner image */}
              <div className="absolute inset-0 bg-[url('/background-pattern.svg')] opacity-10"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,183,77,0.1)_0%,rgba(0,0,0,0)_70%)]"></div>
            </>
          )}
          
          {banner_image_key && (
            <div className="h-full w-full">
              <Image
                src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${banner_image_key}`}
                alt={`${full_name}'s banner`}
                fill
                className="object-cover"
              />
            </div>
          )}
        </div>
        
        {/* Profile Info */}
        <div className="px-6 pt-0 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end mt-[-50px] sm:mt-[-65px] mb-4 gap-4">
            {/* Profile Image */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-3xl border-4 border-gray-900 shadow-xl overflow-hidden">
              {profile_image_key ? (
                <div className="relative w-full h-full">
                  <Image
                    src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${profile_image_key}`}
                    alt={full_name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                getUserInitials()
              )}
            </div>
              
            <div className="flex flex-col">
              <h1 className="text-2xl sm:text-3xl font-bold">{full_name}</h1>
              {headline && (
                <p className="text-gray-300 mt-1">{headline}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {location && (
                  <div className="flex items-center text-gray-400 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {location}
                  </div>
                )}
                {industry && (
                  <div className="flex items-center text-gray-400 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {industry}
                  </div>
                )}
              </div>
              
              {/* Member since */}
              <div className="text-gray-400 text-sm mt-1">
                Member since {formatDate(created_at)}
              </div>
            </div>
            
            {/* Connect/Follow button - Only show if not current user */}
            {!isCurrentUser && (
              <div className="ml-auto mt-4 sm:mt-0 flex gap-2">
                <button
                  onClick={onMessage}
                  className="px-5 py-2 rounded-md text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-amber-500 hover:bg-amber-600 text-gray-900 focus:ring-amber-500 hover:shadow-lg hover:shadow-amber-500/20 cursor-pointer flex items-center gap-2 transform hover:scale-105 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </button>
                <button
                  onClick={handleConnectionToggle}
                  disabled={isLoading}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    isFollowing
                      ? 'bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500'
                      : 'bg-amber-500 hover:bg-amber-600 text-gray-900 focus:ring-amber-500 hover:shadow-lg hover:shadow-amber-500/20'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing
                    </span>
                  ) : isFollowing ? (
                    'Following'
                  ) : (
                    'Follow'
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex flex-wrap gap-6 mt-6 text-sm">
            <div className="text-center">
              <div className="text-xl font-semibold text-white">{stats.followers}</div>
              <div className="text-gray-400">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-white">{stats.following}</div>
              <div className="text-gray-400">Following</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold text-white">{stats.posts}</div>
              <div className="text-gray-400">Posts</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* About Section */}
      <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <h2 className="text-lg font-semibold mb-2">About</h2>
        <p className="text-gray-300 text-sm">
          {bio ? bio : `Member of the London Bridge Club networking community.`}
        </p>
        
        {/* Social and website links */}
        <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-wrap gap-4">
          {linkedin_url && (
            <a 
              href={linkedin_url}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              LinkedIn Profile
            </a>
          )}
          
          {website_url && (
            <a 
              href={website_url}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Website
            </a>
          )}
          
          {username && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              @{username}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 