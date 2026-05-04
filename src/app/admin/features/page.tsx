'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import type { PlanFeature } from '@/types/database';

export default function AdminFeaturesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlanFeature>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ key: '', label: '', description: '', value_type: 'boolean' as 'boolean' | 'text', sort_order: 0 });

  const isAdmin = user?.is_admin || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push('/admin');
  }, [user, authLoading, isAdmin, router]);

  const getToken = () => localStorage.getItem('authToken') || '';

  const fetchFeatures = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/admin/features', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setFeatures(await res.json());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  const startEdit = (feature: PlanFeature) => {
    setEditingId(feature.id);
    setEditForm({ label: feature.label, description: feature.description, value_type: feature.value_type, sort_order: feature.sort_order });
  };

  const saveEdit = async (id: number) => {
    const res = await fetch(`/api/admin/features/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, ...editForm } as PlanFeature : f));
      toast.success('Feature updated');
    } else {
      toast.error('Failed to update feature');
    }
    setEditingId(null);
  };

  const deleteFeature = async (id: number, name: string) => {
    if (!confirm(`Deactivate feature "${name}"? It will be hidden from all plans.`)) return;
    const res = await fetch(`/api/admin/features/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, is_active: false } : f));
      toast.success('Feature deactivated');
    } else {
      toast.error('Failed to deactivate feature');
    }
  };

  const createFeature = async () => {
    if (!newForm.key || !newForm.label) {
      toast.error('Key and label are required');
      return;
    }
    const res = await fetch('/api/admin/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(newForm),
    });
    if (res.ok) {
      const created = await res.json();
      setFeatures(prev => [...prev, created]);
      setNewForm({ key: '', label: '', description: '', value_type: 'boolean', sort_order: 0 });
      setShowNewForm(false);
      toast.success('Feature created and added to all plans');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to create feature');
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
    <div className="max-w-4xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/plans" className="text-gray-400 hover:text-black transition-colors">
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black">Plan Features</h1>
            <p className="text-gray-500 text-sm">Define features available across all membership plans</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          New Feature
        </button>
      </div>

      {/* New Feature Form */}
      {showNewForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-black p-6 mb-6">
          <h3 className="font-bold mb-4">Add New Feature</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Key * <span className="text-gray-400 font-normal">(unique, no spaces)</span></label>
              <input
                type="text"
                value={newForm.key}
                onChange={e => setNewForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="e.g. vip_transfer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Label *</label>
              <input
                type="text"
                value={newForm.label}
                onChange={e => setNewForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. VIP Vehicle Transfer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select
                value={newForm.value_type}
                onChange={e => setNewForm(f => ({ ...f, value_type: e.target.value as 'boolean' | 'text' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="boolean">Boolean (yes / no)</option>
                <option value="text">Text (e.g. &quot;3 days/week&quot;)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sort Order</label>
              <input
                type="number"
                value={newForm.sort_order}
                onChange={e => setNewForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={newForm.description}
                onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={createFeature}
              className="px-5 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Create Feature
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Features Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-semibold text-gray-500 w-8">#</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Key</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Label</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 w-16">Order</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 w-16">Active</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {features.map(feature => (
              <tr key={feature.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${!feature.is_active ? 'opacity-40' : ''}`}>
                <td className="px-4 py-3 text-gray-400">{feature.sort_order}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{feature.key}</code>
                </td>
                <td className="px-4 py-3">
                  {editingId === feature.id ? (
                    <input
                      type="text"
                      value={editForm.label || ''}
                      onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-black dark:bg-gray-700 dark:border-gray-600"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium">{feature.label}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === feature.id ? (
                    <select
                      value={editForm.value_type || 'boolean'}
                      onChange={e => setEditForm(f => ({ ...f, value_type: e.target.value as 'boolean' | 'text' }))}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="boolean">boolean</option>
                      <option value="text">text</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      feature.value_type === 'text'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {feature.value_type}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {editingId === feature.id ? (
                    <input
                      type="number"
                      value={editForm.sort_order ?? 0}
                      onChange={e => setEditForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none dark:bg-gray-700 dark:border-gray-600"
                    />
                  ) : feature.sort_order}
                </td>
                <td className="px-4 py-3">
                  {feature.is_active
                    ? <span className="text-green-500">✓</span>
                    : <span className="text-gray-400">✗</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    {editingId === feature.id ? (
                      <>
                        <button onClick={() => saveEdit(feature.id)} className="text-green-600 hover:text-green-800 transition-colors">
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <FiX className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(feature)} className="text-gray-400 hover:text-black transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        {feature.is_active && (
                          <button onClick={() => deleteFeature(feature.id, feature.label)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {features.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No features defined yet.</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-2 text-black underline text-sm"
            >
              Add the first feature
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
