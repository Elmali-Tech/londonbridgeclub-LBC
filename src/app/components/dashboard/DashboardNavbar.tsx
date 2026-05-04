'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useMessaging } from '@/hooks/useMessaging';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardNavbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // Get unread message count
  const { unreadCount, chats, loading: messagesLoading } = useMessaging();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node)) {
        setShowMessages(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      // Mobile menu is handled by backdrop click, no need for click outside
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      router.push('/');
    }
  };

  // Search function with debounce
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }

      setSearchLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const response = await fetch(`/api/search/users?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data.success) {
          setSearchResults(data.users || []);
          setShowSearchDropdown(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleUserClick = (userId: number) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    router.push(`/dashboard/users/${userId}`);
  };

  const navItems = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Members',
      href: '/dashboard/members',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Partners',
      href: '/dashboard/partners',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      name: 'Events',
      href: '/dashboard/events',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Opportunities',
      href: '/dashboard/opportunities',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 3v4M8 3v4" />
          <path d="M2 13h20" />
        </svg>
      ),
    },
    {
      name: 'Benefits',
      href: '/dashboard/benefits',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7" />
          <rect width="20" height="7" x="2" y="5" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 3V5M8 3V5" />
        </svg>
      ),
    },
  ];

  const getUserInitials = () => {
    if (!user?.full_name) return '?';
    return user.full_name.split(' ').map(name => name[0]).join('');
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Side - Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0">
              <Image
                src="/lbllogo.png"
                alt="London Bridge Club"
                width={48}
                height={48}
                className="h-12 w-auto"
              />
            </Link>
          </div>

          {/* Center - Mobile Search Input */}
          <div className="flex-1 max-w-xs mx-3 md:hidden">
            <form onSubmit={handleSearch}>
              <div className="relative" ref={searchRef}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                />
                
                {/* Mobile Search Dropdown */}
                <AnimatePresence>
                  {showSearchDropdown && searchQuery.trim().length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                    >
                      {searchLoading ? (
                        <div className="p-3 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
                          <p className="mt-1 text-xs">Searching...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="py-1">
                          {searchResults.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => handleUserClick(user.id)}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-xs">
                                {user.profile_image_key ? (
                                  <Image 
                                    src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                                    alt={user.full_name}
                                    width={32}
                                    height={32}
                                    className="object-cover w-full h-full rounded-full"
                                  />
                                ) : (
                                  user.full_name.split(' ').map((n: string) => n[0]).join('')
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate text-sm">{user.full_name}</p>
                                {user.headline && (
                                  <p className="text-xs text-gray-500 truncate">{user.headline}</p>
                                )}
                                {user.matchedTags && user.matchedTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {user.matchedTags.slice(0, 2).map((tag: string, index: number) => (
                                      <span key={index} className="inline-block bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                                        {tag}
                                      </span>
                                    ))}
                                    {user.matchedTags.length > 2 && (
                                      <span className="text-xs text-gray-400">+{user.matchedTags.length - 2}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="p-2 border-t border-gray-100">
                            <button
                              onClick={handleSearch}
                              className="w-full text-left text-xs text-amber-600 hover:text-amber-700 font-medium"
                            >
                              View all results for "{searchQuery}"
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 text-center text-gray-500">
                          <p className="text-xs">No users found</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </div>

          {/* Center - Search Bar (Desktop) */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch}>
              <div className="relative" ref={searchRef}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members, tags, events..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 hover:bg-gray-100"
                />
                
                {/* Search Dropdown */}
                <AnimatePresence>
                  {showSearchDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto"
                    >
                      {searchLoading ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
                          <p className="mt-2 text-sm">Searching...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="py-2">
                          {searchResults.map((user) => (
                            <div
                              key={user.id}
                              onClick={() => handleUserClick(user.id)}
                              className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                                {user.profile_image_key ? (
                                  <Image 
                                    src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                                    alt={user.full_name}
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full rounded-full"
                                  />
                                ) : (
                                  user.full_name.split(' ').map((n: string) => n[0]).join('')
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                                {user.headline && (
                                  <p className="text-sm text-gray-500 truncate">{user.headline}</p>
                                )}
                                {user.matchedTags && user.matchedTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {user.matchedTags.slice(0, 2).map((tag: string, index: number) => (
                                      <span key={index} className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                                        {tag}
                                      </span>
                                    ))}
                                    {user.matchedTags.length > 2 && (
                                      <span className="text-xs text-gray-400">+{user.matchedTags.length - 2} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="p-3 border-t border-gray-100">
                            <button
                              onClick={handleSearch}
                              className="w-full text-left text-sm text-amber-600 hover:text-amber-700 font-medium"
                            >
                              View all results for "{searchQuery}"
                            </button>
                          </div>
                        </div>
                      ) : searchQuery.trim().length >= 2 ? (
                        <div className="p-4 text-center text-gray-500">
                          <p className="text-sm">No users found</p>
                        </div>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </div>

          {/* Center - Navigation Items */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center py-3 px-4 text-[13px] font-semibold transition-all duration-200 rounded-lg hover:bg-gray-50 ${
                    isActive
                      ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="mb-1">
                    {item.icon}
                  </div>
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right Side - Search (Mobile), Messages, Profile, Hamburger */}
          <div className="flex items-center space-x-2">

            {/* Messages - Hidden on mobile */}
            <div className="hidden md:block relative" ref={messagesRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMessages(!showMessages)}
                className="flex flex-col items-center py-2 px-3 text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 rounded-lg relative"
              >
                <div className="relative">
                  <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h4l4 4 4-4h4a2 2 0 002-2V4a2 2 0 00-2-2z" />
                  </svg>
                  {/* Message Badge */}
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none shadow-md border-2 border-white"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </div>
                <span className="hidden sm:block">Messages</span>
              </motion.button>

              {/* Messages Dropdown */}
              {showMessages && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">Messages</h3>
                    <Link href="/dashboard/chat" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                      See all
                    </Link>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {messagesLoading ? (
                      <div className="px-4 py-6 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto"></div>
                        <p className="mt-2 text-sm">Loading messages...</p>
                      </div>
                    ) : chats.length > 0 ? (
                      chats.slice(0, 3).map((chat) => {
                        const otherParticipant = chat.type === 'direct' 
                          ? chat.participants?.find(p => p.user_id !== user?.id)
                          : null;
                        const timeAgo = chat.last_message_at ? 
                          new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        
                        const displayName = chat.type === 'group' 
                          ? chat.name || 'Group Chat'
                          : otherParticipant?.user?.full_name || 'Unknown User';
                        
                        const displayInitial = chat.type === 'group'
                          ? chat.name?.[0]?.toUpperCase() || 'G'
                          : otherParticipant?.user?.full_name?.[0]?.toUpperCase() || '?';
                        
                        return (
                          <Link
                            key={chat.id}
                            href={`/dashboard/chat/${chat.id}`}
                            className="block px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 border-transparent hover:border-amber-400 transition-all"
                            onClick={() => setShowMessages(false)}
                          >
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold">
                                  {displayInitial}
                                </div>
                              </div>
                              <div className="ml-3 flex-1">
                                <div className="flex justify-between">
                                  <p className="text-sm font-medium text-gray-900">
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-gray-500">{timeAgo}</p>
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  {chat.last_message_preview || 'No messages yet'}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })
                    ) : (
                      <div className="px-4 py-6 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start a conversation with other members!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu - Hidden on mobile */}
            <div className="hidden md:block relative" ref={profileMenuRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-gray-200">
                  {user?.profile_image_key ? (
                    <Image
                      src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                      alt={user.full_name || 'User'}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                      {getUserInitials()}
                    </div>
                  )}
                </div>
                <span className="text-[13px] font-semibold text-gray-600 hidden sm:block">Me</span>
                <motion.svg 
                  animate={{ rotate: showProfileMenu ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-4 h-4 text-gray-400 hidden sm:block" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </motion.button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden">
                        {user?.profile_image_key ? (
                          <Image
                            src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                            alt={user.full_name || 'User'}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-lg">
                            {getUserInitials()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user?.full_name}</p>
                        <p className="text-sm text-gray-600">{user?.headline || user?.email}</p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/profile"
                      className="mt-3 inline-block text-amber-600 hover:text-amber-700 text-sm font-medium border border-amber-600 rounded-md px-4 py-1 hover:bg-amber-50 transition-all"
                    >
                      View Profile
                    </Link>
                  </div>
                  
                  <div className="py-1">
                    {(user?.role === 'admin' || user?.is_admin) && (
                      <Link
                        href="/admin"
                        className="flex items-center px-4 py-2 text-sm text-amber-600 hover:bg-gray-100 transition-colors font-medium"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings & Privacy
                    </Link>
                    <Link
                      href="/membership"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Upgrade to Premium
                    </Link>
                    <Link
                      href="/help"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Help Center
                    </Link>
                  </div>
                  
                  <div className="border-t border-gray-200 py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger Menu Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <motion.div
                animate={{ rotate: showMobileMenu ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.div>
            </motion.button>
          </div>
        </div>
      </div>


      {/* Mobile Full Screen Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 lg:hidden bg-black/10 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />
            
            {/* Mobile Menu Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ 
                type: 'spring',
                damping: 25,
                stiffness: 200
              }}
              className="fixed left-0 top-0 h-full w-3/4 bg-white shadow-2xl z-50 lg:hidden"
              ref={mobileMenuRef}
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/lbllogo.png"
                      alt="London Bridge Club"
                      width={40}
                      height={40}
                      className="h-10 w-auto"
                    />
                    <span className="font-semibold text-gray-900">Menu</span>
                  </div>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Navigation Items */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-2">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href || 
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setShowMobileMenu(false)}
                          className={`flex items-center gap-4 p-4 rounded-xl text-base font-medium transition-all ${
                            isActive
                              ? 'text-amber-600 bg-amber-50 border border-amber-200'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {item.icon}
                          </div>
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                    
                    {/* Messages Link */}
                    <Link
                      href="/dashboard/chat"
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-4 p-4 rounded-xl text-base font-medium transition-all ${
                        pathname.startsWith('/dashboard/chat')
                          ? 'text-amber-600 bg-amber-50 border border-amber-200'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0 relative">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {/* Unread Badge */}
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <span>Messages</span>
                    </Link>
                  </div>
                </div>
                
                {/* Profile Section - Minimal */}
                <div className="border-t border-gray-200 p-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      {user?.profile_image_key ? (
                        <Image
                          src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${user.profile_image_key}`}
                          alt={user.full_name || 'User'}
                          width={32}
                          height={32}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-sm">
                          {getUserInitials()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{user?.full_name}</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 p-2 rounded-lg text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 p-2 rounded-lg text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    {(user?.role === 'admin' || user?.is_admin) && (
                      <Link
                        href="/admin"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 p-2 rounded-lg text-sm text-amber-600 hover:text-amber-700 hover:bg-gray-50 transition-colors font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setShowMobileMenu(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-3 p-2 rounded-lg text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors w-full text-left"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </nav>
  );
} 