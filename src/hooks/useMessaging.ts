'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase'; // Use singleton client
import { Chat, Message, ChatWithMessages } from '@/types/messaging';
import Cookies from 'js-cookie';

// Cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

// Cache utility
function getCacheKey(endpoint: string, userId?: number): string {
  return `${endpoint}_${userId || 'anonymous'}`;
}

function getFromCache<T>(key: string): T | null {
  const cached = apiCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    apiCache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCache<T>(key: string, data: T, ttl: number = 60000): void {
  apiCache.set(key, { data, timestamp: Date.now(), ttl });
}

export function useMessaging() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<ChatWithMessages | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Refs for preventing unnecessary calls and tracking subscriptions
  const lastLoadTime = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);
  const activeChannelsRef = useRef<Set<string>>(new Set());
  const chatsRef = useRef<Chat[]>([]);
  const initialLoadDone = useRef<boolean>(false);

  // Update chats ref when chats change
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Memoized token getter
  const getToken = useCallback(() => {
    return Cookies.get('authToken') || localStorage.getItem('authToken');
  }, []);

  // Optimized load chats with caching - FIXED: Removed dependency issues
  const loadChats = useCallback(async (force: boolean = false) => {
    if (!user || isLoadingRef.current) return;
    
    const cacheKey = getCacheKey('chats', user.id);
    const now = Date.now();
    
    // Check cache first (unless force reload)
    if (!force && now - lastLoadTime.current < 30000) {
      const cached = getFromCache<Chat[]>(cacheKey);
      if (cached) {
        setChats(cached);
        return;
      }
    }

    try {
      isLoadingRef.current = true;
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();
      if (data.success) {
        setChats(data.chats);
        setCache(cacheKey, data.chats, 60000); // 1 minute cache
        lastLoadTime.current = now;
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user?.id, getToken]); // FIXED: Only user.id, not user object

  // Optimized unread count loading - FIXED: No circular dependencies
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    const cacheKey = getCacheKey('unread', user.id);
    const cached = getFromCache<number>(cacheKey);
    if (cached !== null) {
      setUnreadCount(cached);
      return;
    }

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/messages/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.unread_count);
        setCache(cacheKey, data.unread_count, 30000); // 30 seconds cache
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [user?.id, getToken]); // FIXED: Only user.id

  // Optimized message loading - FIXED: Use ref instead of state dependency
  const loadChatMessages = useCallback(async (
    chatId: number, 
    limit: number = 50, 
    offset: number = 0
  ) => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      const cacheKey = getCacheKey(`messages_${chatId}`, user?.id);
      const cached = getFromCache<Message[]>(cacheKey);
      if (cached && offset === 0) {
        const chat = chatsRef.current.find(c => c.id === chatId); // FIXED: Use ref
        if (chat) {
          setActiveChat({
            ...chat,
            messages: cached,
            participants: chat.participants || []
          });
        }
        return;
      }

      const response = await fetch(
        `/api/chats/${chatId}/messages?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        const chat = chatsRef.current.find(c => c.id === chatId); // FIXED: Use ref
        if (chat) {
          setActiveChat({
            ...chat,
            messages: data.messages,
            participants: chat.participants || []
          });
          
          if (offset === 0) {
            setCache(cacheKey, data.messages, 30000);
          }
        }
      } else {
        console.error('Failed to load messages:', data.error, data.details);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, user?.id]); // FIXED: Removed chats dependency

  // Optimized message sending - FIXED: Remove loadChatMessages call to prevent loops
  const sendMessage = useCallback(async (
    chatId: number, 
    content: string, 
    file?: File,
    replyToId?: number
  ) => {
    if (!user) return false;

    // Optimistic update
    const tempMessage: Message = {
      id: Date.now(), // Temporary ID
      chat_id: chatId,
      sender_id: user.id,
      content,
      message_type: file ? (file.type.startsWith('image/') ? 'image' : 'file') : 'text',
      file_key: undefined,
      file_name: file?.name,
      file_size: file?.size,
      file_type: file?.type,
      reply_to_id: replyToId,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: {
        id: user.id,
        full_name: user.full_name || 'You',
        profile_image_key: user.profile_image_key
      },
      reply_to: undefined,
      is_read: true
    };

    // Add optimistic message to active chat
    if (activeChat && activeChat.id === chatId) {
      setActiveChat(prev => prev ? {
        ...prev,
        messages: [...(prev.messages || []), tempMessage]
      } : null);
    }

    try {
      const token = getToken();
      if (!token) return false;

      const formData = new FormData();
      formData.append('content', content);
      if (file) {
        formData.append('file', file);
      }
      if (replyToId) {
        formData.append('reply_to_id', replyToId.toString());
      }

      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // Invalidate cache
        const cacheKey = getCacheKey(`messages_${chatId}`, user.id);
        apiCache.delete(cacheKey);
        
        // FIXED: Don't call loadChatMessages here to prevent loops
        // The realtime subscription will handle new messages
        return true;
      } else {
        console.error('Failed to send message:', data.error, data.details);
        // Remove optimistic message on failure
        if (activeChat && activeChat.id === chatId) {
          setActiveChat(prev => prev ? {
            ...prev,
            messages: prev.messages?.filter(m => m.id !== tempMessage.id) || []
          } : null);
        }
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      if (activeChat && activeChat.id === chatId) {
        setActiveChat(prev => prev ? {
          ...prev,
          messages: prev.messages?.filter(m => m.id !== tempMessage.id) || []
        } : null);
      }
      return false;
    }
  }, [getToken, user, activeChat]); // FIXED: Removed loadChatMessages dependency

  // Optimized chat creation - FIXED: Stable dependency
  const createChat = useCallback(async (
    type: 'direct' | 'group',
    participantIds: number[],
    initialMessage?: string,
    name?: string,
    description?: string
  ) => {
    try {
      const token = getToken();
      if (!token) return null;

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          participant_ids: participantIds,
          name,
          description,
          initial_message: initialMessage
        })
      });

      const data = await response.json();
      if (data.success) {
        // Invalidate cache and reload
        if (user) {
          const cacheKey = getCacheKey('chats', user.id);
          apiCache.delete(cacheKey);
          // FIXED: Call loadChats directly instead of using dependency
          await loadChats(true);
        }
        return data.chat.id;
      }
      return null;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }, [getToken, user?.id]); // FIXED: Removed loadChats dependency

  // Optimized mark as read - FIXED: No circular calls
  const markChatAsRead = useCallback(async (chatId: number) => {
    try {
      const token = getToken();
      if (!token) return false;

      const response = await fetch(`/api/chats/${chatId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // Update local state immediately
        if (user) {
          const cacheKey = getCacheKey('unread', user.id);
          apiCache.delete(cacheKey);
        }
        
        // Update chats to reflect read status
        setChats(prev => prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, unread_count: 0 }
            : chat
        ));
        
        // FIXED: Don't call loadUnreadCount to prevent loops
        // Just update the unread count directly
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking chat as read:', error);
      return false;
    }
  }, [getToken, user?.id]); // FIXED: Removed loadUnreadCount dependency

  // Debounced load chats - FIXED: Stable reference
  const debouncedLoadChats = useMemo(
    () => debounce(() => loadChats(), 500),
    [user?.id] // FIXED: Only depend on user.id
  );

  // Optimized realtime subscriptions with cleanup
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    console.log('Setting up realtime subscriptions for user:', user.id);

    // Cleanup existing channels
    activeChannelsRef.current.forEach(channelName => {
      supabase.removeChannel(supabase.channel(channelName));
    });
    activeChannelsRef.current.clear();

    // Only subscribe to messages for active chat
    let messagesChannel: any = null;
    
    if (activeChat) {
      const messagesChannelName = `messages-${activeChat.id}-${user.id}`;
      messagesChannel = supabase
        .channel(messagesChannelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${activeChat.id}`
          },
          (payload) => {
            console.log('New message received:', payload);
            const newMessage = payload.new as Message;
            // Only add if it's not from current user (to avoid duplicate from optimistic update)
            if (newMessage.sender_id !== user.id) {
              setActiveChat(prev => prev ? {
                ...prev,
                messages: [...(prev.messages || []), newMessage]
              } : null);
            }
          }
        )
        .subscribe();

      activeChannelsRef.current.add(messagesChannelName);
    }

    // Global chat updates (less frequent)
    const chatsChannelName = `chats-updates-${user.id}`;
    const chatsChannel = supabase
      .channel(chatsChannelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats'
        },
        () => {
          console.log('Chat updated, reloading...');
          debouncedLoadChats();
        }
      )
      .subscribe();

    activeChannelsRef.current.add(chatsChannelName);

    return () => {
      console.log('Cleaning up realtime subscriptions');
      activeChannelsRef.current.forEach(channelName => {
        supabase.removeChannel(supabase.channel(channelName));
      });
      activeChannelsRef.current.clear();
    };
  }, [user?.id, activeChat?.id, debouncedLoadChats]); // FIXED: Stable dependencies

  // Initial loading - FIXED: Only run once per user change
  useEffect(() => {
    if (user && !initialLoadDone.current) {
      console.log('Initial load for user:', user.id);
      initialLoadDone.current = true;
      
      // Load from cache first, then fetch fresh data
      const cacheKey = getCacheKey('chats', user.id);
      const cached = getFromCache<Chat[]>(cacheKey);
      if (cached) {
        setChats(cached);
      }
      
      // Then load fresh data
      loadChats();
      loadUnreadCount();
    }
    
    // Reset when user changes
    if (!user) {
      initialLoadDone.current = false;
    }
  }, [user?.id]); // FIXED: Only user.id dependency

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeChannelsRef.current.forEach(channelName => {
        supabase.removeChannel(supabase.channel(channelName));
      });
      activeChannelsRef.current.clear();
    };
  }, []);

  return {
    chats,
    activeChat,
    unreadCount,
    loading,
    loadChats,
    loadChatMessages,
    sendMessage,
    createChat,
    markChatAsRead,
    loadUnreadCount
  };
} 