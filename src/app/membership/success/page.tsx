'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Payment session not found');
      setIsLoading(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch('/api/subscription/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) throw new Error('Payment verification failed');

        const data = await response.json();

        if (user) {
          await supabase
            .from('users')
            .update({ subscription_status: 'active', stripe_customer_id: data.customer })
            .eq('id', user.id);

          if (data.subscription) {
            const endDate = data.subscriptionDetails?.current_period_end
              ? new Date(data.subscriptionDetails.current_period_end * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            const { data: existing } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('user_id', user.id)
              .single();

            const subscriptionPayload = {
              stripe_subscription_id: data.subscription,
              stripe_customer_id: data.customer,
              plan_id: data.planId ?? null,
              billing_cycle: data.billingCycle ?? 'monthly',
              status: data.subscriptionDetails?.status ?? 'active',
              current_period_end: endDate,
              entry_fee_paid: data.entryFeePaid ?? 0,
              updated_at: new Date().toISOString(),
            };

            if (existing) {
              await supabase.from('subscriptions').update(subscriptionPayload).eq('id', existing.id);
            } else {
              await supabase.from('subscriptions').insert({ ...subscriptionPayload, user_id: user.id });
            }
          }
        }

        setTimeout(() => {
          router.push(user ? '/dashboard' : '/login?redirect=dashboard');
        }, 3000);

      } catch (err) {
        console.error('Payment verification error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto" />
          <p className="mt-4 text-gray-300">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => router.push('/membership')}
            className="bg-amber-500 hover:bg-amber-600 text-black font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Back to Membership
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
        <p className="text-gray-300">
          Welcome to London Bridge Club. Redirecting to {user ? 'dashboard' : 'login'}...
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
      <Footer />
    </>
  );
}
