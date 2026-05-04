'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import type { Subscription, MembershipPlan } from '@/types/database';

interface SubscriptionWithPlan extends Subscription {
  membership_plans?: MembershipPlan;
}

const PLAN_COLORS: Record<string, string> = {
  bronze:   'bg-amber-50 text-amber-800 border-amber-300',
  silver:   'bg-gray-50 text-gray-700 border-gray-300',
  gold:     'bg-yellow-50 text-yellow-800 border-yellow-300',
  platinum: 'bg-blue-50 text-blue-800 border-blue-300',
  emerald:  'bg-green-50 text-green-800 border-green-300',
  diamond:  'bg-purple-50 text-purple-800 border-purple-300',
};

export default function SubscriptionTab() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetchSubscription() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('subscriptions')
          .select('*, membership_plans(*)')
          .eq('user_id', user!.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setSubscription(data ?? null);
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSubscription();
  }, [user]);

  const openPortal = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) { toast.error('Not authenticated'); return; }
    if (!user?.stripe_customer_id) {
      toast.error('No billing account found. Contact support.');
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Could not open billing portal');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancel = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    setCancelLoading(true);
    try {
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Membership will be cancelled at end of billing period. You retain full access until then.');
        // Status "active" kalır ama UI'da iptal bilgisi göster
        setSubscription(prev => prev ? { ...prev, cancel_at_period_end: true } as any : null);
        setShowCancelModal(false);
      } else {
        toast.error(data.error || 'Failed to cancel membership');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (d: string | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getPlanName = () => {
    if (subscription?.membership_plans?.name) return subscription.membership_plans.name;
    if (subscription?.plan_type) return subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1);
    return 'Unknown';
  };

  const getPlanSlug = () => subscription?.membership_plans?.slug || subscription?.plan_type || '';

  const getPlanPrice = () => {
    if (!subscription?.membership_plans) return null;
    return subscription.billing_cycle === 'yearly'
      ? subscription.membership_plans.yearly_price
      : subscription.membership_plans.monthly_price;
  };

  const statusInfo: Record<string, { label: string; cls: string }> = {
    active:     { label: 'Active',    cls: 'bg-green-100 text-green-800' },
    trialing:   { label: 'Trial',     cls: 'bg-blue-100 text-blue-800' },
    past_due:   { label: 'Past Due',  cls: 'bg-amber-100 text-amber-800' },
    canceled:   { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
    incomplete: { label: 'Pending',   cls: 'bg-gray-100 text-gray-700' },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Subscription Management</h2>
        </div>

        {subscription ? (
          <div className="space-y-5">
            {/* Current Plan Card */}
            <div className="rounded-xl border-2 border-gray-200 p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{getPlanName()} Membership</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${
                      PLAN_COLORS[getPlanSlug()] || 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {getPlanSlug()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    {subscription.status && statusInfo[subscription.status] && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo[subscription.status].cls}`}>
                        {statusInfo[subscription.status].label}
                      </span>
                    )}
                    {getPlanPrice() && (
                      <span className="text-sm font-bold text-gray-700">
                        £{getPlanPrice()?.toLocaleString()}/{subscription.billing_cycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded-lg">
                      {subscription.billing_cycle || 'monthly'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide block">Started</span>
                      <span className="font-medium text-gray-900">{formatDate(subscription.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide block">
                        {subscription.status === 'canceled' ? 'Ends' : 'Renews'}
                      </span>
                      <span className="font-medium text-gray-900">{formatDate(subscription.current_period_end)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Change Plan */}
              <Link
                href="/membership"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-black text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors text-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Change Plan
              </Link>

              {/* Manage Billing */}
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              >
                {portalLoading ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
                Manage Billing
              </button>

              {/* Cancel */}
              {subscription.status === 'active' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-medium text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Membership
                </button>
              )}
            </div>

            {/* Help text */}
            <p className="text-xs text-gray-400">
              Use &quot;Manage Billing&quot; to update your payment method, view invoices or download receipts.
              &quot;Change Plan&quot; takes you to the membership page where you can switch to a different tier.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Membership</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm">
              Join London Bridge Club to access exclusive events, networking opportunities, and premium features.
            </p>
            <Link
              href="/membership"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 inline-block"
            >
              Explore Membership Plans
            </Link>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Cancel Membership?</h3>
            </div>

            <p className="text-gray-600 text-sm mb-2">
              Your <strong>{getPlanName()}</strong> membership will be cancelled.
            </p>
            <p className="text-gray-600 text-sm mb-6">
              You&apos;ll retain full access until <strong>{formatDate(subscription?.current_period_end)}</strong> and won&apos;t be charged again.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-medium text-sm transition-colors"
              >
                Keep Membership
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {cancelLoading
                  ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
