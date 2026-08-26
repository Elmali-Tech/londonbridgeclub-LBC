'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';
import Cookies from 'js-cookie';

interface Resource {
  id: number;
  title: string;
  content: string | null;
  category: string | null;
  is_pinned: boolean;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  templates:   'bg-blue-100 text-blue-800 border-blue-200',
  guides:      'bg-green-100 text-green-800 border-green-200',
  courses:     'bg-purple-100 text-purple-800 border-purple-200',
  tools:       'bg-orange-100 text-orange-800 border-orange-200',
  webinars:    'bg-pink-100 text-pink-800 border-pink-200',
  checklists:  'bg-indigo-100 text-indigo-800 border-indigo-200',
  news:        'bg-amber-100 text-amber-800 border-amber-200',
  update:      'bg-teal-100 text-teal-800 border-teal-200',
};

function categoryColor(cat: string | null) {
  return CATEGORY_COLORS[cat?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

function excerpt(html: string | null, max = 160): string {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken') || Cookies.get('authToken') || '';
    fetch('/api/resources', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setResources(d.resources); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const categories = Array.from(new Set(resources.map((r) => r.category).filter(Boolean))) as string[];

  const filtered = resources.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || r.title.toLowerCase().includes(q) || excerpt(r.content).toLowerCase().includes(q);
    const matchesCat = !categoryFilter || r.category?.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCat;
  });

  return (
    <DashboardContainer user={user}>
      {/* Header */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Resource Library</h1>
            <p className="text-gray-600 mt-1">Access valuable business resources, guides, and materials from LBC</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-sm flex justify-between text-sm">
          <span className="text-gray-600">
            Showing <span className="text-black font-medium">{filtered.length}</span> resource{filtered.length !== 1 ? 's' : ''}
            {searchQuery && <> matching &quot;{searchQuery}&quot;</>}
          </span>
          <span className="text-gray-600">
            Total: <span className="text-black font-medium">{resources.length}</span> available
          </span>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto" />
            <p className="mt-4 text-gray-600">Loading resources…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600">{searchQuery ? 'No resources match your search.' : 'No resources have been published yet.'}</p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-sm text-sm font-medium transition-colors">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((resource) => (
              <div key={resource.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-amber-200 relative flex flex-col">
                {resource.is_pinned && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                    Pinned
                  </div>
                )}

                <div className="flex items-start gap-3 mb-4">
                  {/* Generic document icon */}
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-black mb-1 line-clamp-2">{resource.title}</h3>
                    {resource.category && (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryColor(resource.category)}`}>
                        {resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">{excerpt(resource.content)}</p>

                <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                  <span>{new Date(resource.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardContainer>
  );
}
