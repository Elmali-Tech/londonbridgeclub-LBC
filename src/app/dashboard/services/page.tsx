'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';
import Link from 'next/link';

interface PlanFeatureValue {
  id?: number;
  plan_id: number;
  feature_id: number;
  is_included: boolean;
  text_value?: string | null;
  plan_features?: { label: string } | null;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
  category: 'individual' | 'corporate';
  description?: string | null;
  monthly_price: number;
  yearly_price: number;
  highlighted: boolean;
  plan_feature_values?: PlanFeatureValue[];
}

const CATEGORY_COLORS: Record<string, string> = {
  individual: 'bg-blue-100 text-blue-800 border-blue-200',
  corporate:  'bg-purple-100 text-purple-800 border-purple-200',
};

function formatPrice(p: number) {
  return p === 0 ? 'Free' : `£${p.toLocaleString()}`;
}

export default function ServicesPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = plans.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q);
    const matchesCat = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <DashboardContainer user={user}>
      {/* Header */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Membership Plans</h1>
            <p className="text-gray-600 mt-1">Explore LBC membership tiers and upgrade your benefits</p>
          </div>
          <Link
            href="/membership"
            className="px-4 py-2 bg-amber-600 text-white rounded-sm text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            View Full Pricing
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">All Types</option>
            <option value="individual">Individual</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>

        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-sm flex justify-between text-sm">
          <span className="text-gray-600">
            Showing <span className="text-black font-medium">{filtered.length}</span> plan{filtered.length !== 1 ? 's' : ''}
            {searchQuery && <> matching &quot;{searchQuery}&quot;</>}
          </span>
          <span className="text-gray-600">
            Total: <span className="text-black font-medium">{plans.length}</span> plans available
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto" />
            <p className="mt-4 text-gray-600">Loading plans…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No plans found</h3>
            <p className="text-gray-600">{searchQuery ? 'No plans match your search.' : 'No membership plans are available at the moment.'}</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-sm text-sm font-medium transition-colors">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((plan) => {
              const includedFeatures = (plan.plan_feature_values ?? [])
                .filter((fv) => fv.is_included && fv.plan_features?.label)
                .slice(0, 5);

              return (
                <div
                  key={plan.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-amber-200 relative flex flex-col"
                >
                  {plan.highlighted && (
                    <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                      Popular
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-black mb-2">{plan.name}</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${CATEGORY_COLORS[plan.category] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                      {plan.category.charAt(0).toUpperCase() + plan.category.slice(1)}
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{plan.description}</p>
                  )}

                  <div className="mb-4">
                    <p className="text-lg font-bold text-amber-600">
                      {formatPrice(plan.monthly_price)}<span className="text-sm font-normal text-gray-500">/month</span>
                    </p>
                    {plan.yearly_price > 0 && (
                      <p className="text-sm text-gray-500">{formatPrice(plan.yearly_price)}/year</p>
                    )}
                  </div>

                  {includedFeatures.length > 0 && (
                    <div className="mb-6 flex-1">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Includes:</h4>
                      <ul className="space-y-1">
                        {includedFeatures.map((fv) => (
                          <li key={fv.id ?? fv.feature_id} className="text-sm text-gray-600 flex items-center gap-2">
                            <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {fv.text_value ?? fv.plan_features!.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    <Link
                      href="/membership"
                      className="block w-full text-center px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors font-medium"
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardContainer>
  );
}
