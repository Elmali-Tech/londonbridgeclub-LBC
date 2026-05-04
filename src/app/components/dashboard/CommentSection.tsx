'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';

// Tip tanımları
interface User {
  id: number;
  full_name: string;
  headline?: string;
  profile_image_key?: string;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  likes_count: number;
  isLiked?: boolean;
  user?: User;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: number;
  onCommentAdded?: () => void;
}

export default function CommentSection({ postId, onCommentAdded }: CommentSectionProps) {
  const { user } = useAuth(); // Get current user from Auth context
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);

  // Yorumları yükleme fonksiyonu
  const fetchComments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Yorumlar alınırken bir hata oluştu');
      }

      setComments(data.comments || []);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading comments');
    } finally {
      setLoading(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    fetchComments();
  }, [postId]);

  // Yeni yorum ekle
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error('Yorum içeriği boş olamaz');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: newComment,
          reply_to: replyTo
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Yorum eklenirken bir hata oluştu');
      }

      // Yeni yorumu ekle ve kullanıcı bilgilerini de ekle
      // Eğer veri yoksa, response'dan dönen comment'i kullanalım
      const newCommentWithUser = {
        ...data.comment,
        user: {
          id: parseInt(data.comment.user_id),
          full_name: 'Siz' // Geçici olarak kullanıcı adı yerine 'Siz' gösterelim
        }
      };

      // Yorumları zaman sırasına göre güncelleyelim
      setComments(prev => [...prev, newCommentWithUser].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      
      // Form alanını temizle
      setNewComment('');
      
      // Cevaplama modunu kapat
      if (replyTo) {
        setReplyTo(null);
      }
      
      // Ana bileşene bildirim
      if (onCommentAdded) {
        onCommentAdded();
      }
      
      toast.success('Comment added successfully');

      // Reload comments after adding (to get correct user information)
      fetchComments();
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error(err instanceof Error ? err.message : 'An error occurred while adding your comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Yorumu beğen/beğenme
  const handleLikeComment = async (commentId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Önce UI'ı güncelle (Optimistic Update)
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            const newIsLiked = !comment.isLiked;
            return {
              ...comment,
              isLiked: newIsLiked,
              likes_count: newIsLiked 
                ? (comment.likes_count || 0) + 1 
                : Math.max(0, (comment.likes_count || 0) - 1)
            };
          }
          return comment;
        })
      );

      // Send API request
      const method = comments.find(c => c.id === commentId)?.isLiked ? 'DELETE' : 'POST';
      
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        // If API returns error, revert changes
        setComments(prevComments => 
          prevComments.map(comment => {
            if (comment.id === commentId) {
              const originalIsLiked = !comment.isLiked;
              return {
                ...comment,
                isLiked: originalIsLiked,
                likes_count: originalIsLiked 
                  ? (comment.likes_count || 0) + 1 
                  : Math.max(0, (comment.likes_count || 0) - 1)
              };
            }
            return comment;
          })
        );
        throw new Error(data.error || 'Like operation failed');
      }
    } catch (error) {
      console.error('Error during like operation:', error);
      toast.error('An error occurred while liking this comment');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} saniye önce`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} dakika önce`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    } else if (diffInSeconds < 604800) {
      return `${Math.floor(diffInSeconds / 86400)} gün önce`;
    } else {
      return new Intl.DateTimeFormat('tr-TR', { 
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(commentDate);
    }
  };

  // Get user initials from full_name
  const getUserInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('');
  };

  // Current user avatar render
  const getCurrentUserAvatar = () => {
    // Profile image exists - show it
    if (user?.profile_image_key) {
      return (
        <div className="h-full w-full relative">
          <Image
            src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
            alt={user.full_name || 'User'}
            fill
            className="object-cover"
          />
        </div>
      );
    }
    
    // No profile image - show initials
    const initials = getUserInitials(user?.full_name);
    return (
      <div className="h-full w-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold">
        {initials}
      </div>
    );
  };

  // Comment user avatar render
  const getUserAvatar = (comment: Comment) => {
    // Profile image exists - show it
    if (comment.user?.profile_image_key) {
      return (
        <div className="h-full w-full relative">
          <Image
            src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${comment.user.profile_image_key}`}
            alt={comment.user.full_name}
            fill
            className="object-cover"
          />
        </div>
      );
    }
    
    // No profile image - show initials
    const initials = getUserInitials(comment.user?.full_name);
    return (
      <div className="h-full w-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
        {initials}
      </div>
    );
  };

  return (
    <div className="mt-4 border-t border-gray-200 bg-white p-4">
      {/* Comment Form */}
      <form onSubmit={handleAddComment} className="relative mb-6">
        {replyTo && (
          <div className="absolute -top-6 left-0 right-0 bg-gray-100 py-1 px-3 rounded-t-lg text-xs text-gray-600 flex justify-between items-center">
            <span>
              Replying to: {comments.find(c => c.id === replyTo)?.user?.full_name}
            </span>
            <button 
              type="button" 
              onClick={() => setReplyTo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="flex items-start gap-3">
          <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 mt-1">
            {/* Show current user's avatar */}
            {getCurrentUserAvatar()}
          </div>
          
          <div className="flex-1">
            <div className="relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="absolute bottom-3 right-3 bg-blue-600 text-white p-2 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-all shadow-lg"
              >
                {submitting ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-gray-600 text-sm">Yorumlar yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
            <p>{error}</p>
          </div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-700 font-medium mb-1">Henüz yorum yapılmamış</p>
            <p className="text-gray-500 text-sm">İlk yorumu sen yap!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <div className="bg-white rounded-xl p-4 border border-gray-200 group shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
                    {getUserAvatar(comment)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">{comment.user?.full_name}</h4>
                      <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed mb-3">{comment.content}</p>
                  
                    {/* Comment Actions */}
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => handleLikeComment(comment.id)}
                        className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                          comment.isLiked 
                            ? 'text-red-500 hover:text-red-600' 
                            : 'text-gray-500 hover:text-red-500'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        <span>{comment.likes_count || 0}</span>
                      </button>
                      <button 
                        onClick={() => setReplyTo(comment.id)}
                        className="text-xs text-gray-500 hover:text-blue-600 transition-colors font-medium"
                      >
                        Yanıtla
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-10 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
                          {reply.user?.profile_image_key ? (
                            <Image
                              src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${reply.user.profile_image_key}`}
                              alt={reply.user.full_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {getUserInitials(reply.user?.full_name)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-semibold text-gray-900">{reply.user?.full_name}</h4>
                            <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed mb-3">{reply.content}</p>
                          
                          <div className="flex items-center gap-6">
                            <button 
                              onClick={() => handleLikeComment(reply.id)}
                              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                                reply.isLiked 
                                  ? 'text-red-500 hover:text-red-600' 
                                  : 'text-gray-500 hover:text-red-500'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                              <span>{reply.likes_count || 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Reply Input */}
              {replyTo === comment.id && (
                <div className="ml-10">
                  <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <div className="flex gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm">
                        {getCurrentUserAvatar()}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a reply..."
                          className="w-full p-3 text-sm bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={() => {
                              setReplyTo(null);
                              setNewComment('');
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
                          >
                            İptal
                          </button>
                          <button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Yanıtla
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 