import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase URL ve API anahtarını environment variable'lardan al
// Bunları daha sonra .env.local dosyasına ekleyeceğiz
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getServerServiceKey(): string {
  const serviceKey =
    process.env.LBC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY on the server');
  }
  return serviceKey;
}

// Singleton instances
let clientInstance: SupabaseClient | null = null;
let serverClientInstance: SupabaseClient | null = null;

function getServerClient(): SupabaseClient {
  if (!serverClientInstance) {
    serverClientInstance = createSupabaseClient(supabaseUrl, getServerServiceKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return serverClientInstance;
}

function createLazyServerClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, property) {
      const client = getServerClient();
      const value = Reflect.get(client, property);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
}

// Browser tarafında kullanılacak client (singleton)
export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Resolve the private key only when a request actually uses the client, not
    // while Next.js imports route modules during an environment-free build.
    return createLazyServerClient();
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
  
  return createLazyServerClient();
}

// Connection durumunu kontrol etme fonksiyonu
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      return response.status !== 500;
    }

    const { error } = await supabase.from('users').select('id').limit(1);
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
