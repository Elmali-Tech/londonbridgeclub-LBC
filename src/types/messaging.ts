// New Messaging System Types

export interface Chat {
  id: number;
  type: 'direct' | 'group';
  name?: string; // Grup sohbetleri için
  description?: string;
  avatar_key?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_preview?: string;
  is_active: boolean;
  participants?: ChatParticipant[];
  unread_count?: number;
  other_participant?: {
    id: number;
    full_name: string;
    headline?: string;
    profile_image_key?: string;
  };
}

export interface ChatParticipant {
  id: number;
  chat_id: number;
  user_id: number;
  role: 'admin' | 'member';
  joined_at: string;
  last_seen_at: string;
  is_active: boolean;
  user?: {
    id: number;
    full_name: string;
    headline?: string;
    profile_image_key?: string;
  };
}

export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  
  // Dosya ekleri
  file_key?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  
  // Yanıtlama
  reply_to_id?: number;
  
  // Mesaj durumu
  is_edited: boolean;
  is_deleted: boolean;
  
  created_at: string;
  updated_at: string;
  
  // İlişkiler
  sender?: {
    id: number;
    full_name: string;
    profile_image_key?: string;
  };
  reply_to?: Message;
  is_read?: boolean;
}

export interface MessageRead {
  id: number;
  message_id: number;
  user_id: number;
  read_at: string;
}

// API Request Types
export interface SendMessageRequest {
  chat_id: number;
  content: string;
  message_type?: 'text' | 'image' | 'file';
  file?: File;
  reply_to_id?: number;
}

export interface CreateChatRequest {
  type: 'direct' | 'group';
  participant_ids: number[];
  name?: string; // Grup için
  description?: string; // Grup için
  initial_message?: string;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
  participants: ChatParticipant[];
} 