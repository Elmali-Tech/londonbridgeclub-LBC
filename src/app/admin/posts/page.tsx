"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminContainer from "@/app/components/admin/AdminContainer";
import PostCard from "@/app/components/dashboard/PostCard";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { FiPlus, FiTrash2, FiMessageCircle, FiEdit3 } from "react-icons/fi";

interface Post {
  id: number;
  content: string;
  created_at: string;
  is_pinned: boolean;
  author: {
    id: number;
    full_name: string;
    headline: string;
    profile_image_key: string | null;
  };
  isLiked: boolean;
}

export default function AdminPostsPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager";

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) {
      router.push("/admin");
    }
  }, [hasAccess, isLoadingAuth, router, user]);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      const token = Cookies.get("authToken") || localStorage.getItem("authToken");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/api/admin/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch posts");
      }

      setPosts(data.posts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setSubmitting(true);
    try {
      const token = Cookies.get("authToken") || localStorage.getItem("authToken");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newPostContent,
          isPinned,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create post");
      }

      setPosts([data.post, ...posts]);
      setNewPostContent("");
      setIsPinned(false);
      setIsCreateModalOpen(false);
      toast.success("Post created successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    try {
      const token = Cookies.get("authToken") || localStorage.getItem("authToken");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete post");
      }

      setPosts(posts.filter((post) => post.id !== postId));
      toast.success("Post deleted successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }
  if (!hasAccess) return null;

  return (
    <AdminContainer>
      <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Announcements
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
              Broadcast messages and pinned items to the community network.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm transition-colors"
          >
            <FiPlus className="w-5 h-5" /> New Broadcast
          </button>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-12 rounded-2xl text-center shadow-sm">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Failed to load posts</h3>
            <p className="mb-6 text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={fetchPosts}
              className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-bold text-sm"
            >
              Try Again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 p-24 rounded-2xl text-center flex flex-col items-center">
            <FiMessageCircle className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No announcements transmitted</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6 text-sm font-medium">
              Share updates, milestones, or important messages directly to user dashboards.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Draft Message
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="relative group animate-in fade-in zoom-in-95 duration-500">
                {post.is_pinned && (
                  <div className="absolute -top-3 left-6 z-20 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm flex items-center gap-1.5 border-2 border-white dark:border-gray-950">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11.013 1.427a1 1 0 00-1.026 0l-7 4A1 1 0 003 6.3V14a2 2 0 002 2h4v1.586l-2.293 2.293a1 1 0 001.414 1.414L10 19.414l1.879 1.879a1 1 0 001.414-1.414L11 17.586V16h4a2 2 0 002-2V6.3a1 1 0 00-.987-.873l-7-4z" />
                    </svg>
                    Pinned Post
                  </div>
                )}
                
                <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2.5 bg-white dark:bg-gray-800 text-red-500 hover:text-white hover:bg-red-500 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors"
                    title="Delete post"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border ${post.is_pinned ? 'border-amber-500 dark:border-amber-600/50' : 'border-gray-100 dark:border-gray-800'} overflow-hidden transition-shadow pointer-events-none`}>
                  <div className="pointer-events-auto">
                    <PostCard
                      post={post as any}
                      onCommentAdded={() => fetchPosts()}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Post Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm">
            <div 
              className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="p-6 sm:p-8 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <FiEdit3 className="text-amber-600" /> New Broadcast
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">
                    Compose a public announcement for the timeline.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="w-full min-h-[160px] p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-colors resize-none text-gray-900 dark:text-white text-base leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    placeholder="Type your message to the network here..."
                  />
                </div>

                <div
                  onClick={() => setIsPinned(!isPinned)}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-colors cursor-pointer select-none ${
                    isPinned
                      ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50"
                      : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl flex items-center justify-center transition-colors ${isPinned ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500" : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 shadow-sm border border-gray-100 dark:border-gray-700"}`}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11.013 1.427a1 1 0 00-1.026 0l-7 4A1 1 0 003 6.3V14a2 2 0 002 2h4v1.586l-2.293 2.293a1 1 0 001.414 1.414L10 19.414l1.879 1.879a1 1 0 001.414-1.414L11 17.586V16h4a2 2 0 002-2V6.3a1 1 0 00-.987-.873l-7-4z" />
                      </svg>
                    </div>
                    <div>
                      <span className={`block text-sm font-bold ${isPinned ? "text-amber-700 dark:text-amber-500" : "text-gray-700 dark:text-gray-300"}`}>
                        Pin to Global Timeline
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Keeps this announcement at the top of feeds forever.
                      </span>
                    </div>
                  </div>
                  
                  {/* Custom Toggle Switch */}
                  <div className={`w-12 h-7 rounded-full p-1 transition-colors relative flex items-center ${isPinned ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isPinned ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </div>
              </div>

              <div className="p-6 sm:px-8 sm:py-6 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || submitting}
                  className="px-8 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : "Publish Post"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminContainer>
  );
}
