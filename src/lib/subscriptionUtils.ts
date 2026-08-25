import { User } from '@/types/database';

export type SubscriptionStatus = 'active' | 'inactive' | 'loading';

/**
 * Kullanıcının abonelik durumunu Supabase'den alır
 * @param userId Kullanıcı ID'si
 * @returns Abonelik durumu: 'active', 'inactive' veya hata durumunda 'inactive'
 */
export const fetchSubscriptionStatus = async (userId: number): Promise<SubscriptionStatus> => {
  if (!userId) return 'inactive';
  
  try {
    const response = await fetch('/api/subscription/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch subscription status');
    const data = await response.json();
    return data.status === 'active' ? 'active' : 'inactive';
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
    const response = await fetch('/api/subscription/status', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return data.subscription ?? null;
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
    const response = await fetch('/api/subscription/status', { cache: 'no-store' });
    if (!response.ok) return false;
    const data = await response.json();
    return data.hasAnySubscription === true;
  } catch (error) {
    console.error('Failed to check subscription existence:', error);
    return false;
  }
};
