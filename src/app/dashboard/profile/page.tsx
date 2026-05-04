'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SubscriptionStatus, updateSubscriptionStatus } from '@/lib/subscriptionUtils';
import ImageUpload from '@/app/components/profile/ImageUpload';
import ImageEditModal from '@/app/components/profile/ImageEditModal';
import PostCard, { Post as PostType } from '@/app/components/dashboard/PostCard';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';
import CreatePostModal from '@/app/components/dashboard/CreatePostModal';
import { X, Plus, CheckCircle, ChevronDown } from 'lucide-react';
import { HiPencil } from 'react-icons/hi';

// Interface for user connection data
interface ConnectionUser {
  id: number;
  full_name: string;
  headline?: string;
  profile_image_key?: string;
  isFollowing?: boolean;
}

// Interface for user tags
interface UserTags {
  job_title: string[];
  goals: string[];
  interests: string[];
}

// Interface for profile progress
interface ProfileProgress {
  percentage: number;
  completed: number;
  total: number;
  isComplete: boolean;
  missingFields: string[];
  profileFields: {
    full_name: boolean;
    headline: boolean;
    bio: boolean;
    location: boolean;
    industry: boolean;
    profile_image: boolean;
    banner_image: boolean;
    linkedin_url: boolean;
    website_url: boolean;
    username: boolean;
  };
  hasTags: {
    job_title: boolean;
    goals: boolean;
    interests: boolean;
  };
}

// Sample data for users
const sampleUsers = [
  {
    id: '1',
    name: 'Emma Thompson',
    role: 'UX Designer',
    imageUrl: 'https://randomuser.me/api/portraits/women/21.jpg',
    isFollowing: false,
  },
  {
    id: '2',
    name: 'Michael Johnson',
    role: 'Software Developer',
    imageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    isFollowing: true,
  },
  {
    id: '3',
    name: 'Sarah Williams',
    role: 'Product Manager',
    imageUrl: 'https://randomuser.me/api/portraits/women/45.jpg',
    isFollowing: false,
  },
  {
    id: '4',
    name: 'David Lee',
    role: 'Data Scientist',
    imageUrl: 'https://randomuser.me/api/portraits/men/57.jpg',
    isFollowing: false,
  },
  {
    id: '5',
    name: 'Olivia Parker',
    role: 'Marketing Specialist',
    imageUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
    isFollowing: true,
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUserData } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  const [users, setUsers] = useState(sampleUsers);
  const [isUpdating, setIsUpdating] = useState(false);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userStats, setUserStats] = useState({
    followers: 0,
    following: 0,
    posts: 0
  });
  
  // State for managing connection modals
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<ConnectionUser[]>([]);
  const [following, setFollowing] = useState<ConnectionUser[]>([]); 
  const [loadingConnections, setLoadingConnections] = useState(false);
  
  // State for create post modal
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  
  // State for image edit modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);

  // State for user tags
  const [userTags, setUserTags] = useState<UserTags>({
    job_title: [],
    goals: [],
    interests: []
  });
  const [loadingTags, setLoadingTags] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [activeTagType, setActiveTagType] = useState<'job_title' | 'goals' | 'interests'>('job_title');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  // State for profile progress
  const [profileProgress, setProfileProgress] = useState<ProfileProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token || !user) {
      router.push('/login');
    }
  }, [user, router]);
  
  // Kullanıcının paylaşımlarını getir
  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        }

        const response = await fetch(`/api/posts/user/${user.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Paylaşımlar alınırken bir hata oluştu');
        }

        // API yanıtından post verilerini çıkart
        const fetchedPosts = data.posts as unknown as (Omit<PostType, 'isLiked'> & { is_liked: boolean })[];
        
        // Format post verilerini UI için uyarla ve author bilgisini ekle
        setPosts(fetchedPosts.map(post => ({
          ...post,
          isLiked: post.is_liked || false,
          // Her post için kullanıcı verilerini ekleyelim
          author: {
            id: user.id,
            full_name: user.full_name || '',
            headline: user.headline || '',
            profile_image_key: user.profile_image_key
          }
        })));

        // Update stats with post count
        setUserStats(prev => ({
          ...prev,
          posts: fetchedPosts.length
        }));

      } catch (err) {
        console.error('Paylaşımlar yüklenirken hata:', err);
        setError(err instanceof Error ? err.message : 'Paylaşımlar yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [user]);

  // Fetch subscription status and user stats
  useEffect(() => {
    if (user) {
      updateSubscriptionStatus(user, setSubscriptionStatus);
      
      // Fetch user stats (followers, following) from API
      const fetchUserStats = async () => {
        try {
          const token = localStorage.getItem('authToken');
          if (!token) return;
          
          const response = await fetch(`/api/users/${user.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          const data = await response.json();
          
          if (data.success && data.user.stats) {
            setUserStats(prev => ({
              ...prev,
              followers: data.user.stats.followers || 0,
              following: data.user.stats.following || 0
            }));
          }
        } catch (error) {
          console.error('Error fetching user stats:', error);
        }
      };
      
      fetchUserStats();
    }
  }, [user]);

  // Fetch user tags
  useEffect(() => {
    const fetchUserTags = async () => {
      if (!user) return;
      
      try {
        setLoadingTags(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        }

        const response = await fetch('/api/user-tags', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Taglar alınırken bir hata oluştu');
        }

        setUserTags(data.tags);

      } catch (err) {
        console.error('Error loading tags:', err);
        toast.error(err instanceof Error ? err.message : 'Error loading tags');
      } finally {
        setLoadingTags(false);
      }
    };

    fetchUserTags();
  }, [user]);

  // Fetch profile progress
  useEffect(() => {
    const fetchProfileProgress = async () => {
      if (!user) return;
      
      try {
        setLoadingProgress(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        }

        const response = await fetch('/api/profile/progress', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Profil ilerlemesi alınırken bir hata oluştu');
        }

        setProfileProgress(data.progress);

      } catch (err) {
        console.error('Error loading profile progress:', err);
        toast.error(err instanceof Error ? err.message : 'Error loading profile progress');
      } finally {
        setLoadingProgress(false);
      }
    };

    fetchProfileProgress();
  }, [user]);

  // Get user initials from full_name
  const getUserInitials = () => {
    if (!user?.full_name) return '';
    return user.full_name.split(' ').map(name => name[0]).join('');
  };

  // Handle post deletion
  const handlePostDeleted = (postId: number) => {
    setPosts(posts.filter(post => post.id !== postId));
  };

  // Handle post like
  const handleLike = async (postId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // UI'ı hemen güncelle (optimistic update)
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes_count: post.isLiked ? post.likes_count - 1 : post.likes_count + 1,
            isLiked: !post.isLiked
          };
        }
        return post;
      }));

      // API'a beğeni isteği gönder
      const method = posts.find(p => p.id === postId)?.isLiked ? 'DELETE' : 'POST';
      
      const response = await fetch(`/api/posts/${postId}/like`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        // Hata durumunda eski duruma geri dön
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes_count: post.isLiked ? post.likes_count + 1 : post.likes_count - 1,
              isLiked: !post.isLiked
            };
          }
          return post;
        }));
        throw new Error(data.error || 'Beğeni işlemi başarısız oldu');
      }

    } catch (err) {
      console.error('Beğeni işlemi sırasında hata:', err);
    }
  };

  // Handle follow action
  const handleFollow = (userId: string) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, isFollowing: !user.isFollowing } : user
      )
    );
  };

  // Handle message action
  const handleMessage = (userId: string) => {
    // In a real app, this would open a chat window or redirect to a message page
    alert(`Opening chat with user ${userId}`);
  };

  // Handle profile image upload
  const handleProfileImageUploaded = async (key: string) => {
    if (!user) return;
    setIsUpdating(true);
    
    try {
      // Get the auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Create form data
      const formData = new FormData();
      formData.append('profile_image_key', key);
      
      // Update profile
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Profil güncellenirken bir hata oluştu');
      }
      
      if (result.user) {
        // Update local user data
        updateUserData(result.user);
      }
      
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Error updating profile image:', error);
      toast.error('Failed to update profile photo');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle profile image removal
  const handleProfileImageRemoved = async () => {
    if (!user) return;
    setIsUpdating(true);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      const formData = new FormData();
      formData.append('profile_image_key', '');
      
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove profile photo');
      }
      
      if (result.user) {
        updateUserData(result.user);
      }
      
      toast.success('Profile photo removed successfully');
    } catch (error) {
      console.error('Error removing profile image:', error);
      toast.error('Failed to remove profile photo');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle banner image upload
  const handleBannerImageUploaded = async (key: string) => {
    if (!user) return;
    setIsUpdating(true);
    
    try {
      // Get the auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Create form data
      const formData = new FormData();
      formData.append('banner_image_key', key);
      
      // Update profile
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Profil güncellenirken bir hata oluştu');
      }
      
      if (result.user) {
        // Update local user data
        updateUserData(result.user);
      }
      
      toast.success('Cover photo updated successfully');
    } catch (error) {
      console.error('Error updating banner image:', error);
      toast.error('Failed to update cover photo');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle banner image removal
  const handleBannerImageRemoved = async () => {
    if (!user) return;
    setIsUpdating(true);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      const formData = new FormData();
      formData.append('banner_image_key', '');
      
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove cover photo');
      }
      
      if (result.user) {
        updateUserData(result.user);
      }
      
      toast.success('Cover photo removed successfully');
    } catch (error) {
      console.error('Error removing banner image:', error);
      toast.error('Failed to remove cover photo');
    } finally {
      setIsUpdating(false);
    }
  };

  // When uploading images, show loading indicator if needed
  useEffect(() => {
    // Add any UI updates based on isUpdating state if needed
    // For example, you could show a global loading indicator
  }, [isUpdating]);

  // Profil sayfasında yorum eklendiğinde sayacı güncelle
  const handleCommentAdded = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments_count: post.comments_count + 1
        };
      }
      return post;
    }));
  };

  // Fetch followers list
  const fetchFollowers = async () => {
    if (!user) return;
    
    try {
      setLoadingConnections(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      const response = await fetch(`/api/users/${user.id}/followers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error fetching followers');
      }

      setFollowers(data.followers || []);
    } catch (err) {
      console.error('Error loading followers:', err);
      toast.error('Could not load followers');
    } finally {
      setLoadingConnections(false);
    }
  };

  // Fetch following list
  const fetchFollowing = async () => {
    if (!user) return;
    
    try {
      setLoadingConnections(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      const response = await fetch(`/api/users/${user.id}/following`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error fetching following');
      }

      setFollowing(data.following || []);
    } catch (err) {
      console.error('Error loading following:', err);
      toast.error('Could not load following list');
    } finally {
      setLoadingConnections(false);
    }
  };

  // Handle connection management
  const handleFollowConnection = async (userId: number) => {
    try {
      console.log('Following user with ID:', userId);
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Session not found');

      // Mevcut çalışan API endpoint'i kullan
      const endpoint = `/api/connections`;
      console.log('Follow API endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ followingId: userId })
      });

      console.log('Follow response status:', response.status);
      const data = await response.json();
      console.log('Follow response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to follow user');
      }

      // Update followers list if we're looking at followers
      if (showFollowersModal) {
        setFollowers(prev => prev.map(user => 
          user.id === userId ? { ...user, isFollowing: true } : user
        ));
      }

      // Update following list if we're looking at following
      if (showFollowingModal) {
        setFollowing(prev => prev.map(user => 
          user.id === userId ? { ...user, isFollowing: true } : user
        ));
      }

      toast.success(`Now following user`);
    } catch (error) {
      console.error('Follow error:', error);
      toast.error('Could not follow user');
    }
  };

  const handleUnfollowConnection = async (userId: number) => {
    try {
      console.log('Unfollowing user with ID:', userId);
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Session not found');

      // Mevcut çalışan API endpoint'i kullan
      const endpoint = `/api/connections?followingId=${userId}`;
      console.log('Unfollow API endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Unfollow response status:', response.status);
      const data = await response.json();
      console.log('Unfollow response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to unfollow user');
      }

      // Update followers list if we're looking at followers
      if (showFollowersModal) {
        setFollowers(prev => prev.map(user => 
          user.id === userId ? { ...user, isFollowing: false } : user
        ));
      }

      // Update following list if we're looking at following
      if (showFollowingModal) {
        setFollowing(prev => prev.map(user => 
          user.id === userId ? { ...user, isFollowing: false } : user
        ));
      }

      toast.success(`Unfollowed user`);
    } catch (error) {
      console.error('Unfollow error:', error);
      toast.error('Could not unfollow user');
    }
  };

  // Open the followers modal and load data
  const openFollowersModal = () => {
    setShowFollowersModal(true);
    fetchFollowers();
  };

  // Open the following modal and load data
  const openFollowingModal = () => {
    setShowFollowingModal(true);
    fetchFollowing();
  };

  // Open create post modal
  const openCreatePostModal = () => {
    setShowCreatePostModal(true);
  };

  // Close create post modal
  const closeCreatePostModal = () => {
    setShowCreatePostModal(false);
  };

  // Handle post created callback
  const handlePostCreated = () => {
    // Refresh posts after creating new one
    window.location.reload();
  };

  // Handle adding new tag
  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag_type: activeTagType,
          tag_value: newTagInput.trim()
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Tag eklenirken bir hata oluştu');
      }

      // Update local state
      setUserTags(prev => ({
        ...prev,
        [activeTagType]: [...prev[activeTagType], newTagInput.trim()]
      }));

      setNewTagInput('');
      setShowTagInput(false);
      toast.success('Tag added successfully');

      // Refresh profile progress
      const progressResponse = await fetch('/api/profile/progress', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const progressData = await progressResponse.json();
      if (progressData.success) {
        setProfileProgress(progressData.progress);
      }

    } catch (err) {
      console.error('Error adding tag:', err);
      toast.error(err instanceof Error ? err.message : 'Error adding tag');
    }
  };

  // Handle removing tag
  const handleRemoveTag = async (tagType: keyof UserTags, tagValue: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Update local state immediately (optimistic update)
      setUserTags(prev => ({
        ...prev,
        [tagType]: prev[tagType].filter(tag => tag !== tagValue)
      }));

      // Delete tag from database
      const response = await fetch(`/api/user-tags?tag_type=${tagType}&tag_value=${encodeURIComponent(tagValue)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!data.success) {
        // Revert optimistic update on error
        setUserTags(prev => ({
          ...prev,
          [tagType]: [...prev[tagType], tagValue]
        }));
        throw new Error(data.error || 'Error deleting tag');
      }

      toast.success('Tag deleted successfully');

      // Refresh profile progress
      const progressResponse = await fetch('/api/profile/progress', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const progressData = await progressResponse.json();
      if (progressData.success) {
        setProfileProgress(progressData.progress);
      }

    } catch (err) {
      console.error('Error deleting tag:', err);
      toast.error(err instanceof Error ? err.message : 'Error deleting tag');
    }
  };

  // Get tag type display name
  const getTagTypeDisplayName = (type: keyof UserTags) => {
    const names = {
      job_title: 'Job Title',
      goals: 'Goals',
      interests: 'Interests'
    };
    return names[type];
  };

  // Get tag placeholder with examples
  const getTagPlaceholder = (type: keyof UserTags) => {
    const placeholders = {
      job_title: 'e.g. CTO, COO, Frontend Developer, Product Manager...',
      goals: 'e.g. Learn React, Start a business, Get promoted...',
      interests: 'e.g. Technology, Travel, Photography, Music...'
    };
    return placeholders[type];
  };

  if (!user) {
  return (
      <DashboardContainer user={null}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      </DashboardContainer>
    );
  }

  if (loading) {
    return (
      <DashboardContainer user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer user={user} showLeftSidebar={true} showRightSidebar={true}>
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Modals */}
        <ImageEditModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          type="profile"
          currentImageKey={user?.profile_image_key}
          onImageUploaded={handleProfileImageUploaded}
          onImageRemoved={handleProfileImageRemoved}
        />
        
        <ImageEditModal
          isOpen={showBannerModal}
          onClose={() => setShowBannerModal(false)}
          type="banner"
          currentImageKey={user?.banner_image_key}
          onImageUploaded={handleBannerImageUploaded}
          onImageRemoved={handleBannerImageRemoved}
        />

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative group/header">
          {/* Banner Section */}
          <div className="relative h-48 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600">
            {user.banner_image_key ? (
              <Image
                src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.banner_image_key}`}
                alt="Profile Banner"
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            )}
            
            {/* Banner Edit Button */}
            <button
              onClick={() => setShowBannerModal(true)}
              className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all opacity-0 group-hover/header:opacity-100 backdrop-blur-sm"
              title="Edit cover photo"
            >
              <HiPencil className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Profile Content */}
          <div className="px-6 pb-6 pt-1">
            <div className="flex flex-col md:flex-row md:items-end justify-between -mt-20 mb-6 gap-6">
              <div className="relative group/avatar">
                <div className="w-40 h-40 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white relative">
                  {user.profile_image_key ? (
                    <Image
                      src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                      alt={user.full_name || 'Profile'}
                      width={160}
                      height={160}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-black text-5xl uppercase">
                      {getUserInitials()}
                    </div>
                  )}
                  
                  {/* Avatar Edit Overlay */}
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                  >
                    <HiPencil className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pb-2">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 px-8 py-2.5 bg-amber-500 text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                  <HiPencil className="w-4 h-4" />
                  Edit Profile
                </Link>
                <button
                  onClick={openCreatePostModal}
                  className="flex items-center gap-2 px-8 py-2.5 border-2 border-amber-500 text-amber-600 rounded-full text-sm font-black uppercase tracking-widest hover:bg-amber-50 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create Post
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black text-gray-900">{user.full_name}</h1>
                  {profileProgress?.isComplete && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
                <p className="text-lg font-bold text-gray-600 mb-2 leading-tight">
                  {user.headline || "Add a headline to your profile"}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {user.location || "Location not set"}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 hidden md:block" />
                  <button onClick={openFollowersModal} className="text-amber-600 hover:underline">
                    {userStats.followers} Connections
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                {user.industry && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-black text-gray-700 uppercase tracking-tight">{user.industry}</span>
                  </div>
                )}
                {user.status && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-amber-600">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black text-amber-600 uppercase tracking-tight">
                      {user.status === 'corporate' ? 'Corporate Entity' : 'Individual Partner'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Progress Bar - Strategic Position */}
        {profileProgress && !profileProgress.isComplete && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Level Up Your Profile</h3>
                <p className="text-sm font-bold text-amber-700">Complete these steps to unlock full networking features</p>
              </div>
              <div className="text-2xl font-black text-amber-600">{profileProgress.percentage}%</div>
            </div>
            <div className="w-full bg-amber-200/50 rounded-full h-3 mb-6">
              <div 
                className="bg-gradient-to-r from-amber-500 to-amber-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${profileProgress.percentage}%` }}
              ></div>
            </div>
            <div className="flex flex-wrap gap-3">
              {profileProgress.missingFields.slice(0, 4).map((field, i) => (
                <Link 
                  key={i} 
                  href="/dashboard/settings"
                  className="px-4 py-1.5 bg-white text-amber-700 rounded-full text-xs font-black uppercase border border-amber-200 hover:bg-amber-50 transition-colors shadow-sm"
                >
                  + Add {field.replace('_', ' ')}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (About & Activity) */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">About</h2>
                <Link href="/dashboard/settings" className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <HiPencil className="w-4 h-4 text-gray-400 hover:text-amber-600" />
                </Link>
              </div>
              <p className="text-gray-600 leading-relaxed font-medium">
                {user.bio || "Share a brief summary of your professional background and expertise."}
              </p>
            </div>

            {/* Tags Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Professional Insights</h2>
                <button 
                  onClick={() => setShowTagsDropdown(!showTagsDropdown)}
                  className="text-xs font-black text-amber-600 uppercase tracking-widest hover:underline"
                >
                  Manage Tags
                </button>
              </div>

              {/* Tag Management Dropdown (Inline for better UX) */}
              {showTagsDropdown && (
                <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                  <div className="flex gap-2 mb-6">
                    {(['job_title', 'goals', 'interests'] as const).map((tagType) => (
                      <button
                        key={tagType}
                        onClick={() => setActiveTagType(tagType)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                          activeTagType === tagType
                            ? 'bg-amber-600 text-white shadow-lg'
                            : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {getTagTypeDisplayName(tagType)}
                      </button>
                    ))}
                  </div>

                  {showTagInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder={getTagPlaceholder(activeTagType)}
                        className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                        autoFocus
                      />
                      <button onClick={handleAddTag} className="px-6 py-2 bg-amber-600 text-white rounded-lg text-sm font-black uppercase">Add</button>
                      <button onClick={() => setShowTagInput(false)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-black uppercase">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-black uppercase text-xs hover:border-amber-400 hover:text-amber-600 transition-all"
                    >
                      + Add New {getTagTypeDisplayName(activeTagType)}
                    </button>
                  )}
                </div>
              )}
              
              <div className="space-y-6">
                {/* Roles */}
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Roles & Positions</h3>
                  <div className="flex flex-wrap gap-2">
                    {userTags.job_title.length > 0 ? userTags.job_title.map((tag, i) => (
                      <span key={i} className="group flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-black uppercase border border-blue-100">
                        {tag}
                        <button onClick={() => handleRemoveTag('job_title', tag)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )) : <p className="text-xs font-bold text-gray-300 italic">No roles added</p>}
                  </div>
                </div>
                
                {/* Goals */}
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Core Objectives</h3>
                  <div className="flex flex-wrap gap-2">
                    {userTags.goals.length > 0 ? userTags.goals.map((tag, i) => (
                      <span key={i} className="group flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-black uppercase border border-green-100">
                        {tag}
                        <button onClick={() => handleRemoveTag('goals', tag)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )) : <p className="text-xs font-bold text-gray-300 italic">No goals added</p>}
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Areas of Interest</h3>
                  <div className="flex flex-wrap gap-2">
                    {userTags.interests.length > 0 ? userTags.interests.map((tag, i) => (
                      <span key={i} className="group flex items-center gap-2 px-4 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-black uppercase border border-purple-100">
                        {tag}
                        <button onClick={() => handleRemoveTag('interests', tag)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )) : <p className="text-xs font-bold text-gray-300 italic">No interests added</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">My Activity</h2>
                <button onClick={openCreatePostModal} className="text-xs font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-amber-100 transition-colors">
                  New Post
                </button>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-4">You haven't posted anything yet</p>
                  <button onClick={openCreatePostModal} className="px-6 py-2 bg-amber-500 text-white rounded-lg text-xs font-black uppercase tracking-widest">Create First Post</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={() => handleLike(post.id)}
                      onDelete={() => handlePostDeleted(post.id)}
                      onCommentAdded={() => handleCommentAdded(post.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-6">
            {/* Connection Insights Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Professional Network</h2>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={openFollowersModal} className="p-4 bg-gray-50 rounded-xl hover:bg-amber-50 transition-colors text-center group">
                  <div className="text-2xl font-black text-gray-900 group-hover:text-amber-600">{userStats.followers}</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Followers</div>
                </button>
                <button onClick={openFollowingModal} className="p-4 bg-gray-50 rounded-xl hover:bg-amber-50 transition-colors text-center group">
                  <div className="text-2xl font-black text-gray-900 group-hover:text-amber-600">{userStats.following}</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Following</div>
                </button>
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Contact Info</h2>
                <Link href="/dashboard/settings" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <HiPencil className="w-4 h-4 text-gray-400 hover:text-amber-600" />
                </Link>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <span className="text-xs font-bold text-gray-600 truncate">{user.email}</span>
                </div>
                {user.linkedin_url && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </div>
                    <span className="text-xs font-bold text-gray-600">LinkedIn Connected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connection Modals */}
        {showFollowersModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black">Followers</h3>
                <button 
                  onClick={() => setShowFollowersModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {loadingConnections ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                  </div>
                ) : followers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No followers yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followers.map((follower) => (
                      <div key={follower.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold">
                            {follower.profile_image_key ? (
                              <Image 
                                src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${follower.profile_image_key}`}
                                alt={follower.full_name}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full rounded-full"
                              />
                            ) : (
                              follower.full_name.split(' ').map(n => n[0]).join('')
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-black">{follower.full_name}</p>
                            {follower.headline && (
                              <p className="text-sm text-gray-600">{follower.headline}</p>
                            )}
                          </div>
                        </div>
                          <button 
                          onClick={() => handleFollowConnection(follower.id)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              follower.isFollowing 
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-black text-white hover:bg-gray-800'
                            }`}
                          >
                            {follower.isFollowing ? 'Following' : 'Follow'}
                          </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showFollowingModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black">Following</h3>
                <button 
                  onClick={() => setShowFollowingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {loadingConnections ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
                  </div>
                ) : following.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Not following anyone yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {following.map((followedUser) => (
                      <div key={followedUser.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold">
                            {followedUser.profile_image_key ? (
                              <Image 
                                src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${followedUser.profile_image_key}`}
                                alt={followedUser.full_name}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full rounded-full"
                              />
                            ) : (
                              followedUser.full_name.split(' ').map(n => n[0]).join('')
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-black">{followedUser.full_name}</p>
                            {followedUser.headline && (
                              <p className="text-sm text-gray-600">{followedUser.headline}</p>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnfollowConnection(followedUser.id)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md text-sm font-medium transition-colors"
                        >
                          Unfollow
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Post Modal */}
        {showCreatePostModal && (
          <CreatePostModal 
            user={user} 
            onClose={closeCreatePostModal}
            onPostCreated={handlePostCreated}
          />
        )}
      </div>
    </DashboardContainer>
  );
} 