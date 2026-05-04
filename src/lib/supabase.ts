import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase URL ve API anahtarını environment variable'lardan al
// Bunları daha sonra .env.local dosyasına ekleyeceğiz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton instances
let clientInstance: SupabaseClient | null = null;
let serverClientInstance: SupabaseClient | null = null;

// Browser tarafında kullanılacak client (singleton)
export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Server-side rendering sırasında yeni instance oluştur
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  
  // Browser'da singleton pattern kullan
  if (!clientInstance) {
    clientInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  
  return clientInstance;
})();

// Server tarafında kullanılacak client oluşturucu fonksiyon (singleton)
export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    // Browser'da normal client'ı döndür
    return supabase;
  }
  
  // Server-side için singleton
  if (!serverClientInstance) {
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
    serverClientInstance = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  
  return serverClientInstance;
}

// Connection durumunu kontrol etme fonksiyonu
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
};

// Realtime connection'ı manuel olarak başlatma
export const initializeRealtime = () => {
  if (typeof window !== 'undefined' && supabase.realtime) {
    supabase.realtime.connect();
  }
};

// Cleanup function
export const cleanupSupabase = () => {
  if (clientInstance) {
    clientInstance.realtime.disconnect();
  }
}; 