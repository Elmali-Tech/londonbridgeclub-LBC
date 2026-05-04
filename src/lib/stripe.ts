import Stripe from 'stripe';

// Stripe instance oluştur
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Stripe Price ID'den fiyat bilgisi çekmek için yardımcı fonksiyon
export async function syncPriceFromStripe(priceId: string): Promise<{ amount: number; currency: string; interval: string | null } | null> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    return {
      amount: (price.unit_amount ?? 0) / 100, // pence → pound
      currency: price.currency,
      interval: price.recurring?.interval ?? null,
    };
  } catch (err) {
    console.error(`Failed to fetch Stripe price ${priceId}:`, err);
    return null;
  }
}

// Müşteri portalı oturumu oluşturmak için yardımcı fonksiyon
export async function createPortalSession(stripeCustomerId: string) {
  // Base URL belirleme (production vs development)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
  });

  return session.url;
}

// Abonelik bilgilerini almak için yardımcı fonksiyon
export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

// Müşteri bilgilerini almak için yardımcı fonksiyon
export async function getCustomer(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);
  return customer;
} 