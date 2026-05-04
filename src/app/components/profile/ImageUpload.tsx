'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { getS3PublicUrl } from '@/lib/awsConfig';

interface ImageUploadProps {
  type: 'profile' | 'banner';
  currentImageKey?: string;
  onImageUploaded: (key: string) => void;
  className?: string;
}

export default function ImageUpload({ 
  type, 
  currentImageKey, 
  onImageUploaded,
  className = '' 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine image URL if key exists
  const imageUrl = currentImageKey ? getS3PublicUrl(currentImageKey) : '';
  
  // Get file type based on upload type
  const getFileType = () => {
    return type === 'profile' ? 'PROFILE_IMAGE' : 'BANNER_IMAGE';
  };

  // Handle file selection (only creates a preview, doesn't upload yet)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear any previous errors
    setError(null);
    
    // Check file type
    const fileType = file.type;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(fileType)) {
      setError('Sadece JPEG, PNG veya WEBP formatında resimler yükleyebilirsiniz.');
      return;
    }
    
    // Check file size
    const maxSize = type === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for profile, 10MB for banner
    if (file.size > maxSize) {
      const sizeMB = Math.round(maxSize / (1024 * 1024));
      setError(`Resim boyutu ${sizeMB}MB'dan küçük olmalıdır.`);
      return;
    }
    
    // Create a preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
    setShowModal(true);
    
    // Reset progress if there was a previous upload
    setProgress(0);
  };

  // Upload the file to S3
  const handleSaveImage = async () => {
    if (!selectedFile) return;

    try {
      setError(null);
      setIsUploading(true);
      setProgress(10);

      // Get the auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileType', getFileType());

      // Upload to S3 via our API
      const response = await fetch('/api/upload/s3', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      setProgress(75);

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Resim yüklenirken bir hata oluştu');
      }

      setProgress(100);
      
      // Clear preview and selected file
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setShowModal(false);
      
      // Call the callback with the new image key
      onImageUploaded(result.key);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Resim yüklenirken bir hata oluştu');
      console.error('Image upload error:', error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Cancel image selection
  const handleCancelSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setError(null);
    setShowModal(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file dialog
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const uploadText = type === 'profile' ? 'Profil Fotoğrafı Yükle' : 'Kapak Resmi Yükle';
  const updateText = type === 'profile' ? 'Profil Fotoğrafını Değiştir' : 'Kapak Resmini Değiştir';

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Current Image Display */}
        {imageUrl && (
          <div className={`image-preview ${type === 'banner' ? 'w-full h-full' : 'w-24 h-24 sm:w-32 sm:h-32 rounded-full'}`}>
            <Image 
              src={imageUrl} 
              alt={type === 'profile' ? 'Profil fotoğrafı' : 'Kapak resmi'} 
              fill
              className={`object-cover ${type === 'banner' ? 'w-full h-full' : 'w-full h-full rounded-full'}`}
            />
          </div>
        )}
        
        {/* Profile Image Overlay */}
        {type === 'profile' && (
          <div 
            className="absolute inset-0 rounded-full transition-opacity duration-300 opacity-0 hover:opacity-100 bg-black/40 flex items-center justify-center cursor-pointer"
            onClick={triggerFileInput}
          >
            <div className="flex flex-col items-center gap-1 p-1 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium">Değiştir</span>
            </div>
          </div>
        )}
        
        {/* Banner Image Upload Button */}
        {type === 'banner' && (
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-3 rounded-full z-30 shadow-lg transition-all duration-200"
            title={imageUrl ? updateText : uploadText}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
        
        {/* Profile Image Edit Button (mobile) */}
        {type === 'profile' && (
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="absolute bottom-0 right-0 bg-amber-500 text-black p-2 rounded-full z-50 shadow-lg hover:bg-amber-400 border-2 border-white sm:hidden"
            title={imageUrl ? updateText : uploadText}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
        
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
      </div>

      {/* Image Upload Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUploading) {
              handleCancelSelection();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] min-h-[500px] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {type === 'profile' ? 'Profil Fotoğrafı' : 'Kapak Resmi'} Önizleme
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Resmi onaylamadan önce önizleyebilirsiniz
              </p>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {/* Image Preview */}
              {previewUrl && (
                <div className="mb-6">
                  <div className={`relative mx-auto ${type === 'profile' ? 'w-48 h-48 rounded-full' : 'w-full aspect-video'} overflow-hidden border-4 border-white shadow-md rounded-lg`}>
                    <Image 
                      src={previewUrl} 
                      alt="Önizleme" 
                      fill
                      className={`object-cover ${type === 'profile' ? 'rounded-full' : ''}`}
                    />
                  </div>
                </div>
              )}


              {/* Upload Progress */}
              {isUploading && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Yükleniyor...</span>
                    <span className="font-medium text-gray-900">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-700 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancelSelection}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveImage}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-700 border border-transparent rounded-lg hover:from-amber-600 hover:to-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all font-semibold"
                >
                  {isUploading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Yükleniyor...
                    </div>
                  ) : (
                    'Kaydet'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 