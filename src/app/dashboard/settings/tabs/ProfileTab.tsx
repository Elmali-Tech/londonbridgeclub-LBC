'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import ImageEditModal from '@/app/components/profile/ImageEditModal';
import { toast } from 'react-hot-toast';
import { HiPencil } from 'react-icons/hi';

// Define user data interface
interface UserProfileData {
  id: number;
  email: string;
  full_name: string;
  username?: string;
  headline?: string;
  bio?: string;
  location?: string;
  industry?: string;
  linkedin_url?: string;
  website_url?: string;
  date_of_birth?: string;
  status: 'personal' | 'corporate';
  profile_image_key?: string;
  banner_image_key?: string;
  subscription_status?: string;
}

export default function ProfileTab() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfileData>>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (userError) throw userError;
        
        setProfileData(userData as UserProfileData);
        setFormData(userData as UserProfileData);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    
    fetchUserData();
  }, [user]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle profile image upload
  const handleProfileImageUploaded = async (key: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_image_key: key })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfileData(prev => prev ? { ...prev, profile_image_key: key } : null);
      setFormData(prev => ({
        ...prev,
        profile_image_key: key
      }));
      
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Failed to update profile image:', error);
      toast.error('Failed to update profile photo');
    }
  };

  // Handle profile image removal
  const handleProfileImageRemoved = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_image_key: null })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfileData(prev => prev ? { ...prev, profile_image_key: undefined } : null);
      setFormData(prev => ({
        ...prev,
        profile_image_key: undefined
      }));
      
      toast.success('Profile photo removed successfully');
    } catch (error) {
      console.error('Failed to remove profile image:', error);
      toast.error('Failed to remove profile photo');
    }
  };
  
  // Handle banner image upload
  const handleBannerImageUploaded = async (key: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ banner_image_key: key })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfileData(prev => prev ? { ...prev, banner_image_key: key } : null);
      setFormData(prev => ({
        ...prev,
        banner_image_key: key
      }));
      
      toast.success('Cover photo updated successfully');
    } catch (error) {
      console.error('Failed to update banner image:', error);
      toast.error('Failed to update cover photo');
    }
  };

  // Handle banner image removal
  const handleBannerImageRemoved = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ banner_image_key: null })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfileData(prev => prev ? { ...prev, banner_image_key: undefined } : null);
      setFormData(prev => ({
        ...prev,
        banner_image_key: undefined
      }));
      
      toast.success('Cover photo removed successfully');
    } catch (error) {
      console.error('Failed to remove banner image:', error);
      toast.error('Failed to remove cover photo');
    }
  };

  // Save user profile changes
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          headline: formData.headline,
          bio: formData.bio,
          location: formData.location,
          industry: formData.industry,
          linkedin_url: formData.linkedin_url,
          website_url: formData.website_url,
          date_of_birth: formData.date_of_birth
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfileData(prev => ({
        ...prev!,
        ...formData
      }));
      
      toast.success('Profile information updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile information');
    } finally {
      setSaving(false);
    }
  };

  // Get user initials for fallback
  const getUserInitials = () => {
    if (!profileData?.full_name) return 'U';
    return profileData.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Modals */}
      <ImageEditModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        type="profile"
        currentImageKey={profileData?.profile_image_key}
        onImageUploaded={handleProfileImageUploaded}
        onImageRemoved={handleProfileImageRemoved}
      />
      
      <ImageEditModal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        type="banner"
        currentImageKey={profileData?.banner_image_key}
        onImageUploaded={handleBannerImageUploaded}
        onImageRemoved={handleBannerImageRemoved}
      />

      {/* Profile Images Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Banner Image */}
        <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-r from-amber-100 to-amber-200 group">
          {profileData?.banner_image_key ? (
            <img 
              src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${profileData.banner_image_key}`}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-amber-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-amber-600 font-medium">No banner image</p>
              </div>
            </div>
          )}
          
          {/* Banner Edit Button */}
          <button
            onClick={() => setShowBannerModal(true)}
            className="absolute top-4 right-4 p-2.5 bg-white/90 hover:bg-white rounded-full shadow-lg backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 z-10"
            title="Edit cover photo"
          >
            <HiPencil className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        
        {/* Profile Picture - Overlapping Banner */}
        <div className="relative px-6 pb-6">
          <div className="flex items-end justify-between -mt-16">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-r from-amber-400 to-amber-600">
                {profileData?.profile_image_key ? (
                  <img
                    src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${profileData.profile_image_key}`}
                    alt={profileData.full_name || 'Profile'}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-black font-bold text-3xl">
                    {getUserInitials()}
                  </div>
                )}
              </div>
              
              {/* Profile Picture Edit Button */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="absolute top-0 right-0 p-2 bg-white hover:bg-gray-50 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10 border border-gray-200"
                title="Edit profile photo"
              >
                <HiPencil className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile Information */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
        </div>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Individual Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input 
                  type="text"
                  name="full_name" 
                  value={formData.full_name || ''}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input 
                  type="text"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleInputChange}
                  placeholder="Choose a username"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-500 bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Contact support to change your email address</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Professional Headline</label>
                <input 
                  type="text"
                  name="headline"
                  value={formData.headline || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., Software Engineer @ Acme Inc."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input 
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., London, UK"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <input 
                  type="text"
                  name="industry"
                  value={formData.industry || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., Software Development"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                  <span className="text-xs text-gray-500 ml-2">(Optional)</span>
                </label>
                <input 
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : ''}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-500 mt-1">Your birthday will be celebrated on the dashboard</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn URL</label>
                <input 
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url || ''}
                  onChange={handleInputChange}
                  placeholder="https://www.linkedin.com/in/username"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input 
                  type="url"
                  name="website_url"
                  value={formData.website_url || ''}
                  onChange={handleInputChange}
                  placeholder="https://www.example.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">About</label>
                <textarea 
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Membership Type</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-3 ${formData.status === 'corporate' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                  <span className="text-gray-900 font-medium">
                    {formData.status === 'corporate' ? 'Corporate Member' : 'Individual Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <button 
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </div>
              ) : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
