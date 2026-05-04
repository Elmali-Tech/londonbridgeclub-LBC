'use client';

import React, { useState } from 'react';
import { HiX, HiUpload, HiTrash } from 'react-icons/hi';
import ImageUpload from './ImageUpload';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'profile' | 'banner';
  currentImageKey?: string;
  onImageUploaded: (key: string) => void;
  onImageRemoved: () => void;
}

export default function ImageEditModal({
  isOpen,
  onClose,
  type,
  currentImageKey,
  onImageUploaded,
  onImageRemoved,
}: ImageEditModalProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  if (!isOpen) return null;

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onImageRemoved();
      onClose();
    } catch (error) {
      console.error('Error removing image:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleImageUploaded = (key: string) => {
    onImageUploaded(key);
    onClose();
  };

  const title = type === 'profile' ? 'Profile Photo' : 'Cover Photo';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl max-w-2xl w-full min-h-[600px] flex flex-col max-h-[9vh] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100/80 rounded-full transition-colors"
          >
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Current Image Preview */}
          {currentImageKey && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2 font-medium">Current {type === 'profile' ? 'photo' : 'cover'}:</p>
              <div className={`${type === 'profile' ? 'w-32 h-32 mx-auto rounded-full' : 'w-full aspect-video rounded-lg'} overflow-hidden border-4 border-white shadow-md bg-gray-50`}>
                <img
                  src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${currentImageKey}`}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-4">
            {/* Upload New Image */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 hover:border-amber-400 hover:bg-amber-50/30 transition-all group">
              <div className="text-center">
                <div className="bg-amber-100/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <HiUpload className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-4">
                  {currentImageKey ? 'Upload new image' : 'Select an image to upload'}
                </p>
                <ImageUpload
                  type={type}
                  currentImageKey={currentImageKey}
                  onImageUploaded={handleImageUploaded}
                />
              </div>
            </div>

            {/* Remove Image */}
            {currentImageKey && (
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <HiTrash className="w-5 h-5" />
                {isRemoving ? 'Removing...' : 'Remove Image'}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/80 backdrop-blur-sm border-t border-gray-200/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200/80 text-gray-700 rounded-lg hover:bg-gray-300/80 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

