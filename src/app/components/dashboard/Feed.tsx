'use client';

import React, { useState, useEffect } from 'react';
import PostCard, { Post } from './PostCard';
import Link from 'next/link';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Yorum eklendiğinde sayacı güncelle
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

  // Post silindiğinde feed'den kaldır
  const handlePostDeleted = (postId: number) => {
    setPosts(posts.filter(post => post.id !== postId));
  };

  // Feed verisini yükle
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        }

        const response = await fetch('/api/posts/feed', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Feed bilgileri alınırken bir hata oluştu');
        }

        setPosts(data.posts);
        setMessage(data.message || '');
      } catch (err) {
        console.error('Feed yüklenirken hata:', err);
        setError(err instanceof Error ? err.message : 'Feed yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-2"></div>
          <p className="text-gray-400">Paylaşımlar yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
          <div className="bg-red-100 border border-red-300 text-red-600 p-4 rounded-lg">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm underline hover:text-red-300"
            >
              Yeniden dene
            </button>
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-300 p-8 text-center">
          <div className="bg-gray-100 border border-gray-200 p-6 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-1M9 14l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz gönderi yok</h3>
            <p className="text-gray-600 mb-4">{message || 'İlk gönderinizi paylaşarak başlayın!'}</p>
            {message && message.includes('takip') && (
              <Link 
                href="/dashboard/members" 
                className="inline-block px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Üyeleri Keşfet
              </Link>
            )}
          </div>
        </div>
      ) : (
        posts.map(post => (
          <PostCard 
            key={post.id}
            post={post}
            onCommentAdded={handleCommentAdded}
            onDelete={handlePostDeleted}
          />
        ))
      )}
    </div>
  );
}