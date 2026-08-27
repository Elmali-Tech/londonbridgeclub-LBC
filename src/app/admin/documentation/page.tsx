"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";
import {
  FiArrowRight, FiCheckCircle, FiTarget, FiFileText, FiBriefcase,
  FiShield, FiServer, FiDatabase, FiLayout, FiCpu, FiUser, FiSettings,
  FiZap, FiAward, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiBook,
  FiChevronRight, FiSearch, FiEye, FiEyeOff,
} from "react-icons/fi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocArticle {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  category: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

type EditForm = { title: string; content: string; category: string; sort_order: number; is_published: boolean };

const EMPTY_FORM: EditForm = { title: "", content: "", category: "General", sort_order: 0, is_published: true };

// ─── Static System Docs data (existing hardcoded content) ─────────────────────

const STAGES = [
  { id: "lead",        title: "Lead",         icon: FiTarget,   color: "text-blue-500",    bg: "bg-blue-500/10",    desc: "Initial contact or interest identified." },
  { id: "qualified",   title: "Qualified",    icon: FiZap,      color: "text-amber-500",   bg: "bg-amber-500/10",   desc: "Specific requirements and deal size defined." },
  { id: "proposal",    title: "Proposal",     icon: FiFileText, color: "text-indigo-500",  bg: "bg-indigo-500/10",  desc: "Scope of work and pricing sent to client." },
  { id: "negotiation", title: "Negotiation",  icon: FiSettings, color: "text-purple-500",  bg: "bg-purple-500/10",  desc: "Finalizing terms and deal adjustments." },
  { id: "won",         title: "Project Won",  icon: FiAward,    color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Project kickoff and execution phase." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authToken() {
  return localStorage.getItem("authToken") || Cookies.get("authToken") || "";
}

function authHeaders() {
  return { Authorization: `Bearer ${authToken()}`, "Content-Type": "application/json" };
}

function groupByCategory(articles: DocArticle[]) {
  const map = new Map<string, DocArticle[]>();
  for (const a of articles) {
    const list = map.get(a.category) ?? [];
    list.push(a);
    map.set(a.category, list);
  }
  return map;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentationPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  // Top-level tab: "articles" (CMS) vs "system" (hardcoded)
  const [mainTab, setMainTab] = useState<"articles" | "system">("articles");
  // System docs sub-tab
  const [systemTab, setSystemTab] = useState<"process" | "architecture">("process");

  // CMS state
  const [articles, setArticles] = useState<DocArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [selected, setSelected] = useState<DocArticle | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Auth guard
  useEffect(() => {
    if (!isLoadingAuth) {
      const role = user?.role || (user?.is_admin ? "admin" : "viewer");
      if (role !== "admin") router.push("/admin");
    }
  }, [user, isLoadingAuth, router]);

  const fetchArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch("/api/admin/docs", { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setArticles(data.articles);
    } catch {
      toast.error("Failed to load articles");
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  // ── CMS handlers ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSelected(null);
    setIsEditing(false);
    setIsCreating(true);
  };

  const openEdit = (article: DocArticle) => {
    setForm({ title: article.title, content: article.content ?? "", category: article.category, sort_order: article.sort_order, is_published: article.is_published });
    setSelected(article);
    setIsCreating(false);
    setIsEditing(true);
  };

  const cancelEdit = () => { setIsEditing(false); setIsCreating(false); };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const url  = isCreating ? "/api/admin/docs" : `/api/admin/docs/${selected!.id}`;
      const method = isCreating ? "POST" : "PUT";
      const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(isCreating ? "Article created" : "Article saved");
      await fetchArticles();
      setSelected(data.article);
      setIsEditing(false);
      setIsCreating(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (article: DocArticle) => {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    setDeleting(article.id);
    try {
      const res  = await fetch(`/api/admin/docs/${article.id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Article deleted");
      if (selected?.id === article.id) { setSelected(null); setIsEditing(false); setIsCreating(false); }
      await fetchArticles();
    } catch {
      toast.error("Failed to delete article");
    } finally {
      setDeleting(null);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredArticles = articles.filter(
    (a) => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = groupByCategory(filteredArticles);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>;
  }

  return (
    <div className="min-h-screen bg-transparent text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-amber-500 font-bold tracking-widest text-xs uppercase">
              <span className="w-8 h-[2px] bg-amber-500" /> Operational Standards
            </div>
            <h1 className="text-4xl font-black tracking-tight dark:text-white">
              Documentation <span className="text-amber-500 italic">Hub</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-lg">
              Create and manage internal knowledge articles, or review system architecture.
            </p>
          </div>

          <div className="flex bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <button
              onClick={() => setMainTab("articles")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mainTab === "articles" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
            >
              <FiBook className="inline mr-1.5 -mt-0.5" /> Articles
            </button>
            <button
              onClick={() => setMainTab("system")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mainTab === "system" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
            >
              System Docs
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            ARTICLES TAB — CMS
        ════════════════════════════════════════════════════════════ */}
        {mainTab === "articles" && (
          <div className="flex gap-6 min-h-[70vh]">

            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 space-y-3">
              <button
                onClick={openCreate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                <FiPlus /> New Article
              </button>

              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles…"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {loadingArticles ? (
                  <div className="py-8 flex justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" /></div>
                ) : grouped.size === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    {search ? "No articles match." : "No articles yet. Create one!"}
                  </div>
                ) : (
                  Array.from(grouped.entries()).map(([cat, catArticles]) => (
                    <div key={cat}>
                      <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                        {cat}
                      </div>
                      {catArticles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => { setSelected(article); setIsEditing(false); setIsCreating(false); }}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 ${selected?.id === article.id ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300"}`}
                        >
                          <FiChevronRight className={`w-3 h-3 flex-shrink-0 ${selected?.id === article.id ? "text-amber-500" : "text-gray-300"}`} />
                          <span className="flex-1 truncate font-medium text-xs">{article.title}</span>
                          {!article.is_published && <FiEyeOff className="w-3 h-3 text-gray-300 flex-shrink-0" title="Draft" />}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>

              <div className="text-xs text-center text-gray-400">
                {articles.length} article{articles.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Main content panel */}
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

              {/* Create / Edit form */}
              {(isCreating || isEditing) ? (
                <div className="h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h2 className="font-black text-gray-900 dark:text-white">{isCreating ? "New Article" : "Edit Article"}</h2>
                    <div className="flex gap-2">
                      <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <FiX /> Cancel
                      </button>
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-xl transition-colors disabled:opacity-50">
                        <FiSave /> {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Title *</label>
                        <input
                          value={form.title}
                          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                          placeholder="Article title…"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</label>
                        <input
                          value={form.category}
                          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                          placeholder="e.g. Onboarding"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Sort Order</label>
                        <input
                          type="number"
                          value={form.sort_order}
                          onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Visibility</label>
                        <div className="flex items-center gap-3 h-[50px]">
                          <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, is_published: !p.is_published }))}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${form.is_published ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"}`}
                          >
                            {form.is_published ? <><FiEye /> Published</> : <><FiEyeOff /> Draft</>}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Content</label>
                      <textarea
                        value={form.content}
                        onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                        placeholder="Write article content here…"
                        rows={18}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono text-sm leading-relaxed resize-none"
                      />
                      <p className="text-xs text-gray-400">Plain text. Use blank lines for paragraph breaks.</p>
                    </div>
                  </div>
                </div>

              ) : selected ? (
                /* Article viewer */
                <div className="h-full flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          {selected.category}
                        </span>
                        {!selected.is_published && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FiEyeOff className="w-2.5 h-2.5" /> Draft
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-black text-gray-900 dark:text-white truncate">{selected.title}</h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Updated {new Date(selected.updated_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <FiEdit2 /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selected)}
                        disabled={deleting === selected.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <FiTrash2 /> {deleting === selected.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-8 overflow-y-auto">
                    {selected.content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {selected.content.split(/\n\n+/).map((para, i) => (
                          <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">{para.trim()}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-sm">This article has no content yet. Click Edit to add some.</p>
                    )}
                  </div>
                </div>

              ) : (
                /* Empty state */
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-20">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 text-3xl">
                    <FiBook />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Select an article</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pick an article from the sidebar, or create a new one.</p>
                  </div>
                  <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold rounded-xl transition-colors">
                    <FiPlus /> New Article
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            SYSTEM DOCS TAB — hardcoded (unchanged)
        ════════════════════════════════════════════════════════════ */}
        {mainTab === "system" && (
          <div className="space-y-12">
            <div className="flex justify-center">
              <div className="flex bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <button
                  onClick={() => setSystemTab("process")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${systemTab === "process" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
                >
                  Sales Lifecycle
                </button>
                <button
                  onClick={() => setSystemTab("architecture")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${systemTab === "architecture" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
                >
                  System Architecture
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {systemTab === "process" ? (
                <motion.div key="process" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                  <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
                      <div className="hidden md:block absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500 opacity-20 -translate-y-1/2" />
                      {STAGES.map((stage, idx) => (
                        <React.Fragment key={stage.id}>
                          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} className="relative z-10 flex flex-col items-center text-center space-y-4 group max-w-[150px]">
                            <div className={`w-16 h-16 rounded-2xl ${stage.bg} flex items-center justify-center ${stage.color} text-2xl border border-white/10 shadow-lg group-hover:scale-110 transition-transform`}>
                              <stage.icon />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-black uppercase tracking-widest dark:text-white">{stage.title}</h4>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{stage.desc}</p>
                            </div>
                          </motion.div>
                          {idx < STAGES.length - 1 && <div className="md:hidden text-gray-300 dark:text-gray-800"><FiArrowRight className="rotate-90 md:rotate-0" /></div>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <h3 className="text-2xl font-black tracking-tight dark:text-white flex items-center gap-3"><FiBriefcase className="text-amber-500" /> Lifecycle Phases</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { num: "01", name: "Lead Discovery",       goal: "Qualify interest & fit",         role: "Business Dev" },
                          { num: "02", name: "Qualification Analysis", goal: "Define scope & value",          role: "Account Manager" },
                          { num: "03", name: "Proposal Generation",  goal: "Present structured solution",    role: "Pre-sales Team" },
                          { num: "04", name: "Closing / Ops",        goal: "Convert to active project",      role: "Ops Manager" },
                        ].map((phase) => (
                          <div key={phase.num} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm group hover:border-amber-500/30 transition-colors">
                            <div className="flex items-start justify-between">
                              <span className="text-3xl font-black text-amber-500/20 group-hover:text-amber-500/40 transition-colors">{phase.num}</span>
                              <FiCheckCircle className="text-gray-200 dark:text-gray-800 text-xl" />
                            </div>
                            <h5 className="text-lg font-black dark:text-white mt-2">{phase.name}</h5>
                            <div className="mt-4 space-y-1">
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Primary Goal</p>
                              <p className="text-sm text-gray-700 dark:text-gray-400 font-bold">{phase.goal}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Responsible</span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">{phase.role}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-2xl font-black tracking-tight dark:text-white flex items-center gap-3"><FiShield className="text-amber-500" /> System Access</h3>
                      <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                        {[
                          { role: "Management", access: "KPI Access & Strategy",  color: "text-purple-500", bg: "bg-purple-500/10" },
                          { role: "Admin",      access: "Full System Controls",   color: "text-rose-500",   bg: "bg-rose-500/10" },
                          { role: "Executive",  access: "Pipeline & Operations",  color: "text-blue-500",   bg: "bg-blue-500/10" },
                        ].map((item) => (
                          <div key={item.role} className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${item.bg} ${item.color}`}><FiUser /></div>
                            <div>
                              <p className="text-sm font-black dark:text-white">{item.role}</p>
                              <p className="text-xs text-gray-500 font-medium">{item.access}</p>
                            </div>
                          </div>
                        ))}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                          <p className="text-[10px] text-center font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Security enforced via Supabase Post-level RLS policies.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="architecture" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                  <div className="bg-white dark:bg-gray-900 p-12 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="max-w-4xl mx-auto space-y-12">
                      <div className="text-center space-y-2">
                        <h3 className="text-3xl font-black dark:text-white tracking-tighter uppercase">Systems <span className="text-amber-500">Architecture</span></h3>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Technical stack and distributed resource orchestration.</p>
                      </div>
                      <div className="relative pt-12">
                        <div className="flex flex-col md:flex-row items-stretch justify-between gap-8 h-full">
                          <div className="flex flex-col items-center justify-center p-6 bg-amber-500 rounded-2xl text-black shadow-sm shadow-amber-500/20 min-w-[140px]">
                            <FiUser className="text-4xl mb-4" />
                            <span className="font-black uppercase tracking-widest text-[10px]">Administrators</span>
                          </div>
                          <div className="flex items-center justify-center md:flex-1">
                            <div className="w-[2px] h-12 md:h-[2px] md:w-full bg-gradient-to-r from-amber-500 to-indigo-500 opacity-30" />
                          </div>
                          <div className="flex flex-col items-center justify-center p-8 bg-gray-900 dark:bg-gray-800 border border-gray-800 dark:border-gray-700 rounded-2xl text-white shadow-sm relative min-w-[200px]">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest">NEXT.JS 15+</div>
                            <FiLayout className="text-4xl mb-4 text-indigo-500" />
                            <span className="font-black uppercase tracking-widest text-[10px] mb-2 text-center">App Router & API Layer</span>
                            <div className="flex gap-2">
                              <span className="px-2 py-0.5 bg-gray-800 rounded text-[8px] font-bold text-gray-400 italic">Typescript</span>
                              <span className="px-2 py-0.5 bg-gray-800 rounded text-[8px] font-bold text-gray-400 italic">SSR</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center md:flex-1">
                            <div className="w-[2px] h-12 md:h-[2px] md:w-full bg-gradient-to-r from-indigo-500 to-emerald-500 opacity-30" />
                          </div>
                          <div className="flex flex-col gap-4 min-w-[160px]">
                            <div className="p-5 bg-white dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                              <FiDatabase className="text-emerald-500 text-2xl" />
                              <div className="flex flex-col"><span className="font-black dark:text-white uppercase tracking-widest text-[9px]">PostgreSQL</span><span className="text-[8px] text-gray-500">Supabase RLS</span></div>
                            </div>
                            <div className="p-5 bg-white dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                              <FiServer className="text-blue-500 text-2xl" />
                              <div className="flex flex-col"><span className="font-black dark:text-white uppercase tracking-widest text-[9px]">AWS S3</span><span className="text-[8px] text-gray-500">Static Assets</span></div>
                            </div>
                            <div className="p-5 bg-white dark:bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                              <FiCheckCircle className="text-rose-500 text-2xl" />
                              <div className="flex flex-col"><span className="font-black dark:text-white uppercase tracking-widest text-[9px]">Stripe</span><span className="text-[8px] text-gray-500">Payments</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { icon: FiCpu,    title: "Next.js 15 API Routers", desc: "Handles server-side logic and authorized deal management." },
                      { icon: FiShield, title: "Auth Flow",               desc: "Role-based access control leveraging Supabase Auth tokens." },
                      { icon: FiZap,    title: "Real-time Sync",          desc: "Optimistic UI updates for the tracking table and dashboards." },
                    ].map((comp, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-xl text-amber-500"><comp.icon /></div>
                        <h5 className="font-black uppercase tracking-[0.15em] text-xs dark:text-white">{comp.title}</h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{comp.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 text-center flex flex-col items-center space-y-4">
          <div className="w-1 h-16 bg-gradient-to-b from-amber-500/20 to-transparent" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 opacity-50">
            London Bridge Club Operations & Technical Guidelines v1.0
          </p>
        </div>

      </div>
    </div>
  );
}
