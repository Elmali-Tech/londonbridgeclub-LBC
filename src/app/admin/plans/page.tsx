'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiEdit2, FiToggleLeft, FiToggleRight, FiPlus, FiSettings, FiRefreshCw } from 'react-icons/fi';
import type { MembershipPlan, EntryFeeSettings } from '@/types/database';

export default function AdminPlansPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [entrySettings, setEntrySettings] = useState<EntryFeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFee, setSavingFee] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feeForm, setFeeForm] = useState({ is_active: false, threshold: 50 });

  const isAdmin = user?.is_admin || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/admin');
    }
  }, [user, authLoading, isAdmin, router]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem('authToken') || '';
      const headers = { Authorization: `Bearer ${token}` };

      const [plansRes, feeRes] = await Promise.all([
        fetch('/api/admin/plans', { headers }),
        fetch('/api/admin/entry-fee-settings', { headers }),
      ]);

      if (plansRes.ok) setPlans(await plansRes.json());
      if (feeRes.ok) {
        const fee = await feeRes.json();
        setEntrySettings(fee);
        setFeeForm({ is_active: fee.is_active, threshold: fee.threshold });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePlanActive = async (plan: MembershipPlan) => {
    const token = localStorage.getItem('authToken') || '';
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !plan.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, ...updated } : p));
      toast.success(`${plan.name} ${!plan.is_active ? 'activated' : 'deactivated'}`);
    } else {
      toast.error('Failed to update plan');
    }
  };

  const saveEntryFeeSettings = async () => {
    setSavingFee(true);
    const token = localStorage.getItem('authToken') || '';
    const res = await fetch('/api/admin/entry-fee-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(feeForm),
    });
    if (res.ok) {
      const data = await res.json();
      setEntrySettings(data);
      toast.success('Entry fee settings saved');
    } else {
      toast.error('Failed to save settings');
    }
    setSavingFee(false);
  };

  const syncPricesFromStripe = async () => {
    setSyncing(true);
    const token = localStorage.getItem('authToken') || '';
    try {
      const res = await fetch('/api/admin/plans/sync-prices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Prices synced from Stripe');
        fetchData();
      } else {
        toast.error('Failed to sync prices');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setSyncing(false);
    }
  };

  const individualPlans = plans.filter(p => p.category === 'individual');
  const corporatePlans = plans.filter(p => p.category === 'corporate');

  const planColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    bronze:   { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-800',  badge: 'bg-amber-100 text-amber-700 border-amber-300' },
    silver:   { bg: 'bg-gray-50',   border: 'border-gray-200',  text: 'text-gray-700',   badge: 'bg-gray-100 text-gray-600 border-gray-300' },
    gold:     { bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    platinum: { bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-800',   badge: 'bg-blue-100 text-blue-700 border-blue-300' },
    emerald:  { bg: 'bg-emerald-50',border: 'border-emerald-200',text:'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    diamond:  { bg: 'bg-purple-50', border: 'border-purple-200',text: 'text-purple-800', badge: 'bg-purple-100 text-purple-700 border-purple-300' },
  };

  const PlanCard = ({ plan }: { plan: MembershipPlan }) => {
    const colors = planColors[plan.slug] || planColors.bronze;
    const hasStripe = !!plan.stripe_monthly_price_id || !!plan.stripe_yearly_price_id;

    return (
      <div
        className={`relative bg-white rounded-2xl border-2 ${plan.is_active ? colors.border : 'border-gray-200 opacity-50'} p-6 transition-all hover:shadow-md flex flex-col gap-4`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              {plan.highlighted && (
                <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Popular
                </span>
              )}
            </div>
            {plan.description && (
              <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => togglePlanActive(plan)}
              title={plan.is_active ? 'Deactivate plan' : 'Activate plan'}
              className={`transition-colors p-1 rounded-lg hover:bg-gray-100 ${plan.is_active ? 'text-green-500' : 'text-gray-400'}`}
            >
              {plan.is_active ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
            </button>
            <Link
              href={`/admin/plans/${plan.id}`}
              className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
              <FiEdit2 className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`${colors.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 font-medium mb-1">Monthly</p>
            <p className="text-2xl font-black text-gray-900">£{plan.monthly_price.toLocaleString()}</p>
          </div>
          <div className={`${colors.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 font-medium mb-1">Yearly</p>
            <p className="text-2xl font-black text-gray-900">£{plan.yearly_price.toLocaleString()}</p>
          </div>
        </div>

        {/* Entry Fees */}
        {feeForm.is_active && (plan.entry_fee_early > 0 || plan.entry_fee_standard > 0) && (
          <div className="flex gap-3 text-sm">
            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-500 text-xs">Early entry</span>
              <span className="block font-bold text-gray-800">£{plan.entry_fee_early.toLocaleString()}</span>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-gray-500 text-xs">Standard entry</span>
              <span className="block font-bold text-gray-800">£{plan.entry_fee_standard.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Stripe Status */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {hasStripe ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Stripe connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              Stripe price IDs not set
            </span>
          )}
        </div>
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Membership Plans</h1>
          <p className="text-gray-500 mt-1">Manage plans, pricing and entry fees</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={syncPricesFromStripe}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Prices from Stripe'}
          </button>
          <Link
            href="/admin/features"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
          >
            <FiSettings className="w-4 h-4" />
            Features
          </Link>
          <Link
            href="/admin/plans/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl text-sm font-medium transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            New Plan
          </Link>
        </div>
      </div>

      {/* Entry Fee Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Entry Fee</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              One-time fee charged when a new member subscribes
            </p>
          </div>
          <button
            onClick={() => setFeeForm(f => ({ ...f, is_active: !f.is_active }))}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              feeForm.is_active ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              feeForm.is_active ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {feeForm.is_active && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Early bird threshold
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  First <strong>{feeForm.threshold}</strong> members pay the &quot;Early entry fee&quot;. After that, the &quot;Standard entry fee&quot; applies.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={feeForm.threshold}
                    onChange={e => setFeeForm(f => ({ ...f, threshold: parseInt(e.target.value) || 50 }))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-sm text-gray-500">members</span>
                </div>
              </div>
              <button
                onClick={saveEntryFeeSettings}
                disabled={savingFee}
                className="px-5 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {savingFee ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              You can set the entry fee amounts per plan on each plan&apos;s edit page.
            </p>
          </div>
        )}
      </div>

      {/* Individual Plans */}
      {individualPlans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full" />
            Individual Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {individualPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* Corporate Plans */}
      {corporatePlans.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-500 rounded-full" />
            Corporate Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {corporatePlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
