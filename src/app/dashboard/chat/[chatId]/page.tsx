'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useMessaging } from '@/hooks/useMessaging';
import { Message } from '@/types/messaging';
import Image from 'next/image';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';
import { toast } from 'react-hot-toast';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = parseInt(params?.chatId as string);
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track if we've already marked this chat as read and loaded to prevent infinite loops
  const markedAsReadRef = useRef<Set<number>>(new Set());
  const loadedRef = useRef<Set<number>>(new Set());
  const mountedRef = useRef<boolean>(true);
  
  const { 
    chats, 
    activeChat,
    loadChatMessages, 
    sendMessage: sendMessageHook, 
    markChatAsRead 
  } = useMessaging();

  // Get current chat
  const currentChat = chats.find(c => c.id === chatId);
  const otherParticipant = currentChat?.type === 'direct' 
    ? currentChat.participants?.find(p => p.user_id !== user?.id)
    : null;

  // Set mounted ref
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load chat and messages - COMPLETELY FIXED to prevent any loops
  useEffect(() => {
    if (!user || !chatId || !mountedRef.current) {
      return;
    }

    // Wait for chats to be loaded
    if (chats.length === 0) {
      return;
    }

    // Check if chat exists
    if (!currentChat) {
      toast.error('Chat not found');
      router.push('/dashboard/chat');
      setLoading(false);
      return;
    }

    // Only load once per chatId
    if (loadedRef.current.has(chatId)) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        loadedRef.current.add(chatId);
        
        console.log('Loading messages for chat:', chatId);
        
        // Load messages
        await loadChatMessages(chatId);
        
        // Mark as read only once per chatId
        if (!markedAsReadRef.current.has(chatId)) {
          markedAsReadRef.current.add(chatId);
          await markChatAsRead(chatId);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        toast.error('Failed to load chat');
        router.push('/dashboard/chat');
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [chatId, chats.length, user?.id, currentChat?.id]); // FIXED: Minimal stable dependencies

  // Reset loaded/read state when chatId changes
  useEffect(() => {
    // Clear previous chat from loaded set when switching chats
    Array.from(loadedRef.current).forEach(id => {
      if (id !== chatId) {
        loadedRef.current.delete(id);
      }
    });
    
    // Don't clear markedAsReadRef - we want to remember read status
    if (!loadedRef.current.has(chatId)) {
      setLoading(true);
    }
  }, [chatId]);

  // FIXED: Load messages from activeChat instead of chats array
  useEffect(() => {
    console.log('ActiveChat changed:', activeChat);
    if (activeChat && activeChat.id === chatId) {
      console.log('Setting messages from activeChat:', activeChat.messages?.length || 0);
      setMessages(activeChat.messages || []);
    } else if (activeChat && activeChat.id !== chatId) {
      // Clear messages if activeChat is for a different chat
      setMessages([]);
    }
  }, [activeChat, chatId]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !attachmentFile) return;
    if (!user || !chatId) return;

    try {
      setSending(true);
      
      const success = await sendMessageHook(
        chatId,
        newMessage.trim(),
        attachmentFile || undefined,
        replyToMessage?.id
      );

      if (success) {
        setNewMessage('');
        setAttachmentFile(null);
        setReplyToMessage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Don't reload messages here - realtime will handle it
        // This prevents the infinite loop
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setAttachmentFile(file);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReply = (message: Message) => {
    setReplyToMessage(message);
  };

  const cancelReply = () => {
    setReplyToMessage(null);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageContent = (content: string) => {
    // Simple URL detection and conversion to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">$1</a>');
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Show loading while messages are being loaded
  if (loading || (chats.length > 0 && currentChat && !activeChat && !loadedRef.current.has(chatId))) {
    return (
      <DashboardContainer user={user}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          </div>
        </div>
      </DashboardContainer>
    );
  }

  if (!currentChat) {
    return (
      <DashboardContainer user={user}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Chat not found</h2>
              <p className="text-gray-600 mb-4">This chat may have been deleted or you don&apos;t have access to it.</p>
              <button
                onClick={() => router.push('/dashboard/chat')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
              >
                Back to Messages
              </button>
            </div>
          </div>
        </div>
      </DashboardContainer>
    );
  }

  const displayName = currentChat.type === 'group' 
    ? currentChat.name || 'Group Chat'
    : otherParticipant?.user?.full_name || 'Unknown User';

  return (
    <DashboardContainer user={user}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden flex flex-col h-[calc(100vh-180px)]">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/dashboard/chat')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-r from-amber-400 to-amber-600">
                  {currentChat.type === 'group' ? (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                      {(currentChat.name || 'Group')?.[0]?.toUpperCase() || 'G'}
                    </div>
                  ) : otherParticipant?.user?.profile_image_key ? (
                    <Image
                      src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${otherParticipant.user.profile_image_key}`}
                      alt={displayName}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                      {getUserInitials(displayName)}
                    </div>
                  )}
                </div>

                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{displayName}</h1>
                  {currentChat.type === 'direct' && otherParticipant?.user?.headline && (
                    <p className="text-sm text-gray-600">{otherParticipant.user.headline}</p>
                  )}
                  {currentChat.type === 'group' && (
                    <p className="text-sm text-gray-600">
                      {currentChat.participants?.length || 0} members
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-600">Start the conversation by sending your first message.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-2 max-w-xs lg:max-w-md xl:max-w-lg ${message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* Avatar for other users */}
                    {message.sender_id !== user?.id && (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-r from-amber-400 to-amber-600 flex-shrink-0">
                        {message.sender?.profile_image_key ? (
                          <Image
                            src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${message.sender.profile_image_key}`}
                            alt={message.sender?.full_name || 'User'}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                            {getUserInitials(message.sender?.full_name || 'U')}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col space-y-1">
                      {/* Reply reference */}
                      {message.reply_to && (
                        <div className="text-xs text-gray-500 px-3 py-1 bg-gray-50 rounded-lg border-l-2 border-gray-300">
                          <span className="font-medium">{message.reply_to.sender?.full_name}:</span>
                          <span className="ml-1">{message.reply_to.content.substring(0, 50)}...</span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`relative px-4 py-2 rounded-lg ${
                          message.sender_id === user?.id
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {/* File attachment */}
                        {message.file_key && (
                          <div className="mb-2">
                            {message.message_type === 'image' ? (
                              <Image
                                src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeproject'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${message.file_key}`}
                                alt={message.file_name || 'Image'}
                                width={200}
                                height={200}
                                className="rounded-lg object-cover max-w-full h-auto"
                              />
                            ) : (
                              <div className="flex items-center space-x-2 p-2 bg-white bg-opacity-20 rounded-lg">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm">{message.file_name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message content */}
                        {message.content && (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formatMessageContent(message.content)
                            }}
                          />
                        )}

                        {/* Message actions */}
                        <div className="absolute top-0 right-0 transform translate-x-full -translate-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleReply(message)}
                            className="p-1 bg-white shadow-md rounded-full text-gray-600 hover:text-gray-900"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Message metadata */}
                      <div className={`text-xs text-gray-500 ${message.sender_id === user?.id ? 'text-right' : 'text-left'}`}>
                        {message.sender_id !== user?.id && (
                          <span className="font-medium mr-2">{message.sender?.full_name}</span>
                        )}
                        <span>{formatTime(message.created_at)}</span>
                        {message.is_edited && (
                          <span className="ml-2 italic">edited</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply bar */}
          {replyToMessage && (
            <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Replying to <span className="font-medium">{replyToMessage.sender?.full_name}</span>
                  </span>
                </div>
                <button
                  onClick={cancelReply}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-sm text-gray-700 mt-1 truncate">
                {replyToMessage.content}
              </div>
            </div>
          )}

          {/* Message input */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            {/* File attachment preview */}
            {attachmentFile && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm text-gray-700">{attachmentFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(attachmentFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={removeAttachment}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
              </div>

              <div className="flex items-center space-x-2">
                {/* File upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !attachmentFile) || sending}
                  className="p-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
} 