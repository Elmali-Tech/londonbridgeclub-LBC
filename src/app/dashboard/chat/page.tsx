'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useMessaging } from '@/hooks/useMessaging';
import Image from 'next/image';
import Link from 'next/link';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';

// Memoized chat item component
const ChatItem = React.memo(({ 
  chat, 
  user, 
  formatTime, 
  getUserInitials 
}: { 
  chat: any; 
  user: any; 
  formatTime: (dateString: string) => string;
  getUserInitials: (name: string) => string;
}) => {
  const otherParticipant = chat.type === 'direct' 
    ? chat.participants?.find((p: any) => p.user_id !== user?.id)
    : null;
  const displayName = chat.type === 'group' 
    ? chat.name || 'Group Chat'
    : otherParticipant?.user?.full_name || 'Unknown User';
  const lastMessageTime = chat.last_message_at ? formatTime(chat.last_message_at) : '';

  // Memoize S3 URL to prevent recalculation
  const profileImageUrl = useMemo(() => {
    if (chat.type === 'group' || !otherParticipant?.user?.profile_image_key) {
      return null;
    }
    return `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${otherParticipant.user.profile_image_key}`;
  }, [chat.type, otherParticipant?.user?.profile_image_key]);

  return (
    <Link
      href={`/dashboard/chat/${chat.id}`}
      className="flex items-center p-4 hover:bg-gray-50 transition-colors"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mr-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-amber-400 to-amber-600">
          {chat.type === 'group' ? (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {(chat.name || 'Group')?.[0]?.toUpperCase() || 'G'}
            </div>
          ) : profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={displayName}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {getUserInitials(displayName)}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </h3>
          <div className="flex items-center space-x-2">
            {lastMessageTime && (
              <span className="text-xs text-gray-500">{lastMessageTime}</span>
            )}
            {chat.unread_count && chat.unread_count > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-[20px] text-center">
                {chat.unread_count > 99 ? '99+' : chat.unread_count}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 truncate flex-1">
            {chat.last_message_preview || 'No messages yet'}
          </p>
          {chat.type === 'direct' && otherParticipant?.user?.headline && (
            <span className="text-xs text-gray-400 ml-2 truncate max-w-[120px]">
              {otherParticipant.user.headline}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0 ml-2">
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
});

ChatItem.displayName = 'ChatItem';

// Loading component
const LoadingSpinner = React.memo(() => (
  <DashboardContainer user={null}>
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </div>
    </div>
  </DashboardContainer>
));

LoadingSpinner.displayName = 'LoadingSpinner';

// Empty state component
const EmptyState = React.memo(() => (
  <div className="text-center py-12">
    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No chats yet</h3>
    <p className="text-gray-600 mb-6">Start a conversation by visiting a member's profile and clicking "Message"</p>
    <Link
      href="/dashboard/members"
      className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
    >
      Browse Members
    </Link>
  </div>
));

EmptyState.displayName = 'EmptyState';

export default function ChatListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { chats, loading, unreadCount } = useMessaging();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoized utility functions
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }, []);

  const getUserInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  // Memoized filtered chats
  const filteredChats = useMemo(() => {
    if (!debouncedSearchQuery) return chats;
    
    return chats.filter(chat => {
      if (chat.type === 'group') {
        return chat.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      } else {
        const otherParticipant = chat.participants?.find((p: any) => p.user_id !== user?.id);
        return otherParticipant?.user?.full_name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      }
    });
  }, [chats, debouncedSearchQuery, user?.id]);

  // Memoized unread count display
  const unreadDisplay = useMemo(() => {
    if (unreadCount === 0) return 'All caught up!';
    return `You have ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`;
  }, [unreadCount]);

  // Input change handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <DashboardContainer user={user}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-600 mt-1">{unreadDisplay}</p>
            </div>
            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm font-medium px-3 py-1 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search chats..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
          {filteredChats.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredChats.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  user={user}
                  formatTime={formatTime}
                  getUserInitials={getUserInitials}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
