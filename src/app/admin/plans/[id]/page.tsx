'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiSave, FiPlus, FiRefreshCw } from 'react-icons/fi';
import type { MembershipPlan, PlanFeature, PlanFeatureValue } from '@/types/database';

interface FeatureRow {
  feature: PlanFeature;
  is_included: boolean;
  text_value: string;
}

export default function AdminPlanEditPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  const isNew = planId === 'new';

  const [plan, setPlan] = useState<Partial<MembershipPlan>>({
    name: '', category: 'individual', description: '',
    monthly_price: 0, yearly_price: 0,
    stripe_monthly_price_id: '', stripe_yearly_price_id: '',
    entry_fee_early: 0, entry_fee_standard: 0,
    highlighted: false, sort_order: 0, is_active: true,
  });
  const [featureRows, setFeatureRows] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [syncingPrices, setSyncingPrices] = useState(false);

  const isAdmin = user?.is_admin || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push('/admin');
  }, [user, authLoading, isAdmin, router]);

  const getToken = () => localStorage.getItem('authToken') || '';

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const featuresRes = await fetch('/api/admin/features', { headers });
      const featuresData: PlanFeature[] = featuresRes.ok ? await featuresRes.json() : [];

      if (!isNew) {
        const planRes = await fetch(`/api/admin/plans/${planId}`, { headers });
        if (!planRes.ok) { toast.error('Plan not found'); router.push('/admin/plans'); return; }

        const planData: MembershipPlan & { plan_feature_values: (PlanFeatureValue & { plan_features: PlanFeature })[] } =
          await planRes.json();

        setPlan(planData);

        const valueMap = new Map<number, PlanFeatureValue>();
        (planData.plan_feature_values ?? []).forEach(fv => valueMap.set(fv.feature_id, fv));

        setFeatureRows(
          featuresData
            .filter(f => f.is_active)
            .map(f => {
              const val = valueMap.get(f.id);
              return {
                feature: f,
                is_included: val?.is_included ?? false,
                text_value: val?.text_value ?? '',
              };
            })
        );
      } else {
        setFeatureRows(
          featuresData
            .filter(f => f.is_active)
            .map(f => ({ feature: f, is_included: false, text_value: '' }))
        );
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isNew, planId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateFeatureRow = (featureId: number, field: 'is_included' | 'text_value', value: boolean | string) => {
    setFeatureRows(prev => prev.map(r =>
      r.feature.id === featureId ? { ...r, [field]: value } : r
    ));
  };

  // Slug'ı name'den otomatik üret (yeni plan için)
  const handleNameChange = (name: string) => {
    setPlan(p => ({
      ...p,
      name,
      ...(isNew ? { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '') as MembershipPlan['slug'] } : {}),
    }));
  };

  // Stripe'dan fiyat bilgisini çek
  const handleSyncPrices = async () => {
    if (!plan.stripe_monthly_price_id && !plan.stripe_yearly_price_id) {
      toast.error('No Stripe Price IDs to sync');
      return;
    }

    setSyncingPrices(true);
    try {
      // Planı önce kaydet (Stripe Price ID'leriyle), backend otomatik sync yapacak
      const token = getToken();
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          stripe_monthly_price_id: plan.stripe_monthly_price_id || null,
          stripe_yearly_price_id: plan.stripe_yearly_price_id || null,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPlan(p => ({
          ...p,
          monthly_price: updated.monthly_price,
          yearly_price: updated.yearly_price,
          stripe_monthly_price_id: updated.stripe_monthly_price_id,
          stripe_yearly_price_id: updated.stripe_yearly_price_id,
        }));
        toast.success('Prices synced from Stripe!');
      } else {
        toast.error('Failed to sync prices');
      }
    } catch {
      toast.error('An error occurred while syncing');
    } finally {
      setSyncingPrices(false);
    }
  };

  const handleSave = async () => {
    if (!plan.name || !plan.slug || !plan.category) {
      toast.error('Name, slug and category are required');
      return;
    }

    setSaving(true);
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    try {
      let savedPlanId: number;

      if (isNew) {
        const res = await fetch('/api/admin/plans', {
          method: 'POST',
          headers,
          body: JSON.stringify(plan),
        });
        if (!res.ok) { toast.error((await res.json()).error || 'Failed to create plan'); return; }
        const created = await res.json();
        savedPlanId = created.id;
      } else {
        const res = await fetch(`/api/admin/plans/${planId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(plan),
        });
        if (!res.ok) { toast.error((await res.json()).error || 'Failed to save plan'); return; }
        const updated = await res.json();
        setPlan(p => ({ ...p, monthly_price: updated.monthly_price, yearly_price: updated.yearly_price }));
        savedPlanId = parseInt(planId);
      }

      // Feature değerlerini kaydet
      const featureRes = await fetch(`/api/admin/plan-features/${savedPlanId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          values: featureRows.map(r => ({
            feature_id: r.feature.id,
            is_included: r.is_included,
            text_value: r.text_value || null,
          })),
        }),
      });

      if (!featureRes.ok) {
        toast.error('Plan saved but failed to save feature values');
      } else {
        toast.success(isNew ? 'Plan created!' : 'Plan saved!');
        if (isNew) router.push('/admin/plans');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/plans" className="text-gray-400 hover:text-black transition-colors p-1 rounded-lg hover:bg-gray-100">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black">
            {isNew ? 'Create New Plan' : `Edit: ${plan.name}`}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Plan'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-5">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Plan Name *</label>
              <input
                type="text"
                value={plan.name || ''}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Gold"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug *</label>
              <input
                type="text"
                value={plan.slug || ''}
                onChange={e => setPlan(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') as MembershipPlan['slug'] }))}
                placeholder="e.g. gold"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-400 mt-1">Used in URLs and system references</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={plan.category || 'individual'}
                onChange={e => setPlan(p => ({ ...p, category: e.target.value as 'individual' | 'corporate' }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Order</label>
              <input
                type="number"
                value={plan.sort_order ?? 0}
                onChange={e => setPlan(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-xs text-gray-400 mt-1">Lower numbers appear first</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={plan.description || ''}
                onChange={e => setPlan(p => ({ ...p, description: e.target.value }))}
                placeholder="Short description shown on membership page (optional)"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={plan.highlighted ?? false}
                  onChange={e => setPlan(p => ({ ...p, highlighted: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 accent-black"
                />
                <span className="text-sm font-medium">Mark as &quot;Most Popular&quot;</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={plan.is_active ?? true}
                  onChange={e => setPlan(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 accent-black"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stripe & Pricing */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold">Pricing & Stripe</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Enter the Stripe Price IDs and prices will be automatically synced
              </p>
            </div>
            {!isNew && (
              <button
                onClick={handleSyncPrices}
                disabled={syncingPrices}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${syncingPrices ? 'animate-spin' : ''}`} />
                {syncingPrices ? 'Syncing...' : 'Sync from Stripe'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Monthly
                {plan.stripe_monthly_price_id && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Connected</span>
                )}
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stripe Price ID</label>
                <input
                  type="text"
                  value={plan.stripe_monthly_price_id || ''}
                  onChange={e => setPlan(p => ({ ...p, stripe_monthly_price_id: e.target.value || null }))}
                  placeholder="price_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price (auto-synced from Stripe)</label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-gray-900">£{(plan.monthly_price ?? 0).toLocaleString()}</span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
              </div>
            </div>

            {/* Yearly */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Yearly
                {plan.stripe_yearly_price_id && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Connected</span>
                )}
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stripe Price ID</label>
                <input
                  type="text"
                  value={plan.stripe_yearly_price_id || ''}
                  onChange={e => setPlan(p => ({ ...p, stripe_yearly_price_id: e.target.value || null }))}
                  placeholder="price_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price (auto-synced from Stripe)</label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-gray-900">£{(plan.yearly_price ?? 0).toLocaleString()}</span>
                  <span className="text-sm text-gray-500">/year</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Prices are automatically fetched from Stripe when you save. You can also click &quot;Sync from Stripe&quot; to update manually.
          </p>
        </div>

        {/* Entry Fees */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-1">Entry Fees</h2>
          <p className="text-sm text-gray-500 mb-5">
            One-time fee charged to new members. These only apply when the entry fee system is active (configure in plan list page).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Early Bird Fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={plan.entry_fee_early ?? 0}
                  onChange={e => setPlan(p => ({ ...p, entry_fee_early: parseFloat(e.target.value) || 0 }))}
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Charged to early members</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Standard Fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={plan.entry_fee_standard ?? 0}
                  onChange={e => setPlan(p => ({ ...p, entry_fee_standard: parseFloat(e.target.value) || 0 }))}
                  className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Charged after threshold</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold">Plan Features</h2>
              <p className="text-sm text-gray-500">What&apos;s included in this plan</p>
            </div>
            <Link
              href="/admin/features"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FiPlus className="w-3 h-3" />
              Manage Features
            </Link>
          </div>

          {featureRows.length === 0 ? (
            <p className="text-gray-400 text-sm">No features defined yet. <Link href="/admin/features" className="underline">Add features</Link></p>
          ) : (
            <div className="space-y-2">
              {featureRows.map(row => (
                <div
                  key={row.feature.id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                    row.is_included ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <button
                    onClick={() => updateFeatureRow(row.feature.id, 'is_included', !row.is_included)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      row.is_included
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {row.is_included && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm font-medium flex-1 ${row.is_included ? 'text-gray-900' : 'text-gray-400'}`}>
                    {row.feature.label}
                  </span>
                  {row.feature.value_type === 'text' && row.is_included && (
                    <input
                      type="text"
                      value={row.text_value}
                      onChange={e => updateFeatureRow(row.feature.id, 'text_value', e.target.value)}
                      placeholder="e.g. 3 days/week"
                      className="w-40 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Save */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Plan'}
        </button>
      </div>
    </div>
  );
}
