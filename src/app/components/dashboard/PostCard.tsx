'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CommentSection from './CommentSection';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Type definitions for Post and media
interface PostMedia {
  id: number;
  post_id: number;
  media_type: 'image' | 'video' | 'document';
  s3_bucket_name: string;
  s3_key: string;
  media_original_name?: string;
  media_size?: number;
  media_content_type?: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  visibility: 'public' | 'connections' | 'private';
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  isLiked: boolean;
  author?: {
    full_name: string;
    headline?: string;
    profile_image_key?: string;
    id: number;
  };
  media?: PostMedia[];
}

interface PostCardProps {
  post: Post;
  onCommentAdded: (postId: number) => void;
  onLike?: (postId: number) => Promise<void>;
  onDelete?: (postId: number) => void;
}

export default function PostCard({ post, onCommentAdded, onLike, onDelete }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    } else if (diffInSeconds < 604800) {
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }).format(postDate);
    }
  };

  // Check if current user is post author
  const isPostAuthor = () => {
    if (!user) return false;
    return user.id === post.user_id;
  };

  // Create user avatar
  const getUserAvatar = () => {
    // Show profile image if exists
    if (post.author?.profile_image_key) {
      return (
        <Image
          src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${post.author.profile_image_key}`}
          alt={post.author.full_name}
          fill
          className="object-cover"
        />
      );
    }
    
    // Show initials if no profile image
    const initials = post.author?.full_name?.split(' ').map(n => n[0]).join('') || '?';
    return (
      <div className="h-full w-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold">
        {initials}
      </div>
    );
  };

  // Toggle comments show/hide
  const toggleComments = () => {
    setShowComments(!showComments);
  };

  // Handle like action
  const handleLike = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Session not found. Please login again.');
      }

      // Update UI immediately (optimistic update)
      const newIsLiked = !isLiked;
      const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;
      
      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);

      // If onLike prop exists, call it
      if (onLike) {
        onLike(post.id);
        return; // Main component will handle the like operation
      }

      // Send like request to API
      const method = isLiked ? 'DELETE' : 'POST';
      
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        // Revert to previous state on error
        setIsLiked(isLiked);
        setLikesCount(likesCount);
        throw new Error(data.error || 'Like operation failed');
      }

    } catch (err) {
      console.error('Error during like operation:', err);
    }
  };

  // Handle post deletion
  const handleDelete = async () => {
    if (!isPostAuthor()) return;
    if (isDeleting) return; // Prevent multiple clicks
    
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Session not found. Please login again.');
      }
      
      // Send delete request to API
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Post deletion failed');
      }

      // Show success notification
      toast.success('Post successfully deleted');

      // If onDelete prop exists, call it
      if (onDelete) {
        onDelete(post.id);
      } else {
        // Refresh the page if no delete handler provided
        router.refresh();
      }

    } catch (err) {
      console.error('Error during post deletion:', err);
      toast.error('Error deleting post: ' + 
        (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsDeleting(false);
      setShowDropdown(false);
    }
  };

  // Gallery navigation functions
  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setShowGallery(true);
    // Prevent scrolling when gallery is open
    document.body.style.overflow = 'hidden';
  };
  
  const closeGallery = () => {
    setShowGallery(false);
    document.body.style.overflow = '';
  };
  
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.media) return;
    
    const imageMediaItems = post.media.filter(m => m.media_type === 'image');
    setCurrentImageIndex((prevIndex) => 
      prevIndex === imageMediaItems.length - 1 ? 0 : prevIndex + 1
    );
  };
  
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.media) return;
    
    const imageMediaItems = post.media.filter(m => m.media_type === 'image');
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? imageMediaItems.length - 1 : prevIndex - 1
    );
  };

  // Handle keyboard navigation in gallery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showGallery) return;
      
      if (e.key === 'Escape') {
        closeGallery();
      } else if (e.key === 'ArrowRight' && post.media) {
        const imageMediaItems = post.media.filter(m => m.media_type === 'image');
        setCurrentImageIndex((prevIndex) => 
          prevIndex === imageMediaItems.length - 1 ? 0 : prevIndex + 1
        );
      } else if (e.key === 'ArrowLeft' && post.media) {
        const imageMediaItems = post.media.filter(m => m.media_type === 'image');
        setCurrentImageIndex((prevIndex) => 
          prevIndex === 0 ? imageMediaItems.length - 1 : prevIndex - 1
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showGallery, post.media, currentImageIndex]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle click outside gallery to close it (except on navigation buttons)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      if (galleryRef.current && 
          !galleryRef.current.contains(target) && 
          !target.closest('.gallery-nav-btn')) {
        closeGallery();
      }
    };

    if (showGallery) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGallery]);

  // Filter only image media items and get current image
  const imageMediaItems = post.media?.filter(m => m.media_type === 'image') || [];
  const currentMedia = imageMediaItems[currentImageIndex];

  return (
    <div className="bg-white border border-gray-300 rounded-xl overflow-hidden backdrop-blur-sm transition-all duration-300">
      {/* Post Header */}
      <div className="flex items-center gap-3 p-4">
          <Link 
          href={isPostAuthor() ? '/dashboard/profile' : `/dashboard/users/${post.author?.id}`} 
          className="flex items-center gap-3 group"
        >
          <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-100 dark:ring-gray-800">
            {getUserAvatar()}
          </div>
              <div>
            <h3 className="font-bold text-black hover:text-amber-900 transition-colors text-sm">
              {post.author?.full_name || 'Unknown User'}
            </h3>
                {post.author?.headline && (
              <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">{post.author.headline}</p>
                )}
            <p className="text-gray-400 text-[10px]">{formatDate(post.created_at)}</p>
              </div>
        </Link>
        
        <div className="ml-auto flex items-center gap-2">
          {/* Options Menu - Only for post author */}
          {isPostAuthor() && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              
                {showDropdown && (
                <div className="absolute right-0 top-10 w-40 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in duration-200">
                        <button
                          onClick={handleDelete}
                          disabled={isDeleting}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                    {isDeleting ? 'Deleting...' : 'Delete Announcement'}
                        </button>
                  </div>
                )}
            </div>
          )}
          </div>
        </div>
        
        {/* Post Content */}
      <div className="px-4">
        {post.content && (
          <div className="mb-4">
            <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
              {post.content}
            </p>
        </div>
        )}
      </div>
      
      {/* Post Media */}
      {post.media && post.media.length > 0 && (
        <div className="mb-3">
          {post.media.length === 1 ? (
            <div 
              className="relative w-full cursor-pointer group"
              onClick={() => openGallery(0)}
            >
              <div className="relative w-full h-auto">
                {post.media[0] && (
                  <Image
                    src={`https://${post.media[0].s3_bucket_name}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${post.media[0].s3_key}`}
                    alt="Post media"
                    width={600}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {post.media.slice(0, 4).map((media, index) => (
                <div 
                  key={media.id}
                  className="relative cursor-pointer"
                  onClick={() => openGallery(index)}
                >
                  <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={`https://${media.s3_bucket_name}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${media.s3_key}`}
                      alt={`Post media ${index + 1}`}
                    fill
                      className="object-cover"
                    />
                    {index === 3 && post.media && post.media.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xl font-semibold">+{post.media.length - 4}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
                </div>
              )}
            </div>
      )}
      
      {/* Post Stats */}
      <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center ring-2 ring-white border border-amber-600 shadow-sm">
              <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <span className="text-gray-600">{likesCount} members liked this</span>
        </div>
        <span className="bg-gray-100 px-2 py-0.5 rounded-md">{post.comments_count} comments</span>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center border-t border-gray-100 px-4 bg-white">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-4 hover:bg-white transition-all duration-300 group ${
            isLiked ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'
          }`}
        >
          <svg className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isLiked ? 'fill-amber-500' : 'fill-none'}`} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span className="text-xs font-black uppercase tracking-widest">Like</span>
        </button>
        
        <button
          onClick={toggleComments}
          className="flex-1 flex items-center justify-center gap-2 py-4 text-gray-500 hover:bg-white hover:text-amber-500 transition-all duration-300 group"
        >
          <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-black uppercase tracking-widest">Comment</span>
        </button>
        
        <button
          className="flex-1 flex items-center justify-center gap-2 py-4 text-gray-500 hover:bg-white hover:text-amber-500 transition-all duration-300 group"
        >
          <svg className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          <span className="text-xs font-black uppercase tracking-widest">Share</span>
        </button>
      </div>
      
      {/* Comments Section */}
      {showComments && (
        <div className="pt-4 px-4 pb-4">
          <CommentSection 
            postId={post.id} 
            onCommentAdded={() => onCommentAdded(post.id)}
          />
        </div>
      )}
      
      {/* Image Gallery Modal */}
      {showGallery && post.media && post.media.length > 0 && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-center p-4" ref={galleryRef}>
          <div className="relative max-w-4xl max-h-full">
            <button 
              onClick={closeGallery}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {post.media && post.media.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button 
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            {post.media && post.media[currentImageIndex] && (
              <Image
                src={`https://${post.media[currentImageIndex].s3_bucket_name}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${post.media[currentImageIndex].s3_key}`}
                alt={`Post media ${currentImageIndex + 1}`}
                width={800}
                height={600}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
            
            {post.media && post.media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-sm">
                {currentImageIndex + 1} / {post.media.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 