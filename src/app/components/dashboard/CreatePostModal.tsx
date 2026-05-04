'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { User } from '@/types/database';
import { toast } from 'react-hot-toast';

interface CreatePostModalProps {
  user: User | null;
  onClose: () => void;
  onPostCreated?: () => void;
}

export default function CreatePostModal({ user, onClose, onPostCreated }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'connections' | 'private'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Filter for images and videos only
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (validFiles.length !== files.length) {
      toast.error('Only image and video files are allowed');
    }

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle post creation
  const handleCreatePost = async () => {
    if (!user) {
      toast.error('Please log in to create a post');
      return;
    }

    if (!content.trim() && selectedFiles.length === 0) {
      toast.error('Please add some content or media');
      return;
    }

    try {
      setIsPosting(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Session not found. Please log in again.');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('visibility', visibility);

      // Add files to FormData
      selectedFiles.forEach((file, index) => {
        formData.append(`media_${index}`, file);
      });

      // Send request to API
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create post');
      }

      toast.success('Post created successfully!');
      onClose();
      
      // Refresh the page or call callback
      if (onPostCreated) {
        onPostCreated();
      } else {
        window.location.reload();
      }

    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  // Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black">Create Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-12 h-12 rounded-full overflow-hidden">
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
            <div>
              <p className="font-semibold text-black">{user?.full_name}</p>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="text-sm text-gray-600 border-none bg-transparent p-0 focus:ring-0"
              >
                <option value="public">Public</option>
                <option value="connections">Connections only</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* Text Area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
            rows={4}
          />

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media Upload Button */}
          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
              disabled={selectedFiles.length >= 5}
            >
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">Add photos/videos</span>
              {selectedFiles.length > 0 && (
                <span className="text-xs text-gray-500">({selectedFiles.length}/5)</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isPosting}
          >
            Cancel
          </button>
          <button
            onClick={handleCreatePost}
            disabled={isPosting || (!content.trim() && selectedFiles.length === 0)}
            className="px-6 py-2 bg-amber-600 text-white rounded-md font-medium hover:bg-amber-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
} 