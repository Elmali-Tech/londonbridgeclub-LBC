import { User } from '@/types/database';
import { supabase } from './supabase';

export type SubscriptionStatus = 'active' | 'inactive' | 'loading';

/**
 * Kullanıcının abonelik durumunu Supabase'den alır
 * @param userId Kullanıcı ID'si
 * @returns Abonelik durumu: 'active', 'inactive' veya hata durumunda 'inactive'
 */
export const fetchSubscriptionStatus = async (userId: number): Promise<SubscriptionStatus> => {
  if (!userId) return 'inactive';
  
  try {
    // Kullanıcının mevcut durumunu veritabanından al
    const { data, error } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    // Veritabanındaki subscription_status değerini kullan
    return data?.subscription_status === 'active' ? 'active' : 'inactive';
  } catch (error) {
    console.error('Failed to fetch subscription status:', error);
    return 'inactive'; // Hata durumunda default olarak inactive dön
  }
};

/**
 * Kullanıcının abonelik detaylarını Supabase'den alır
 * @param userId Kullanıcı ID'si
 * @returns Abonelik detayları veya null
 */
export const fetchSubscriptionDetails = async (userId: number) => {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error('Failed to fetch subscription details:', error);
      return null;
    }
    
    // Eğer hiç subscription yoksa null dön
    if (!data || data.length === 0) {
      return null;
    }
    
    // İlk (en yeni) subscription'ı dön
    return data[0];
  } catch (error) {
    console.error('Failed to fetch subscription details:', error);
    return null;
  }
};

/**
 * Subscription durumunu React Context için hook olarak kullanalımak için yardımcı fonksiyon
 * @param user Kullanıcı objesi
 * @param setSubscriptionStatus State setter fonksiyonu
 */
export const updateSubscriptionStatus = async (
  user: User | null, 
  setSubscriptionStatus: (status: SubscriptionStatus) => void
): Promise<void> => {
  if (!user) {
    setSubscriptionStatus('inactive');
    return;
  }
  
  try {
    const status = await fetchSubscriptionStatus(user.id);
    setSubscriptionStatus(status);
  } catch (error) {
    console.error('Failed to update subscription status:', error);
    setSubscriptionStatus('inactive');
  }
};

/**
 * Kullanıcının herhangi bir abonelik kaydı var mı kontrol eder (status farketmez).
 * İlk defa kayıt olan kullanıcıları (hiç kayıt yok → /membership)
 * aboneliği dolan/iptal olanlardan (kayıt var → /dashboard/settings) ayırt etmek için kullanılır.
 */
export const hasAnySubscription = async (userId: number): Promise<boolean> => {
  if (!userId) return false;

  try {
    const { count, error } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to check subscription existence:', error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (error) {
    console.error('Failed to check subscription existence:', error);
    return false;
  }
}; 