"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, UserRole } from "@/types/database";
import AdminContainer from "@/app/components/admin/AdminContainer";
import { toast } from "react-hot-toast";
import Image from "next/image";
import {
  HiOutlineSearch,
  HiOutlineUserGroup,
  HiOutlineShieldCheck,
  HiOutlineMail,
  HiOutlineCheckCircle,
  HiOutlineTrash,
} from "react-icons/hi";
import {
  FiUsers,
  FiShield,
  FiCheckCircle,
  FiGrid,
  FiList,
  FiUser,
  FiMail,
  FiCalendar,
  FiTrash2,
} from "react-icons/fi";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch user directory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.full_name && user.full_name.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower))
    );
  });

  const updateRole = async (userId: number, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      setUsers(
        users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      toast.success(`Access level escalated to ${newRole}`);
    } catch (err) {
      toast.error("Failed to update user capabilities");
    }
  };
  
  const approveUser = async (userId: number) => {
    try {
      const response = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error);
      
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, is_approved: true } : u)),
      );
      toast.success("User approved and notified successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to approve user");
    }
  };

  const deleteUser = async (userId: number) => {
    try {
      setIsDeleting(userId);
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) throw error;

      setUsers(users.filter((u) => u.id !== userId));
      toast.success("User permanently removed");
    } catch (err) {
      toast.error("Failed to disconnect user");
    } finally {
      setIsDeleting(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
      opportunity_manager: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800",
      sales_member: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
      viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700",
    };
    return styles[role as keyof typeof styles] || styles.viewer;
  };

  return (
    <AdminContainer>
      <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Access Management</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
              Oversee platform security, membership access, and administrative privileges.
            </p>
          </div>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:border-rose-200 dark:hover:border-rose-800/50 transition-colors">
            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                Network Participants
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {users.length}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:border-rose-200 dark:hover:border-rose-800/50 transition-colors">
            <div className="p-4 bg-rose-50 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
              <FiShield size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                Root Supervisors
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {users.filter((u) => u.is_admin).length}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:border-rose-200 dark:hover:border-rose-800/50 transition-colors">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-gray-600 dark:text-gray-400">
              <FiCheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                Regulator Index
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                100%
              </h3>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:max-w-md shrink-0">
            <input
              type="text"
              placeholder="Search registry by identifier or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors placeholder:text-gray-400"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white dark:bg-gray-700 text-rose-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiGrid /> Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "list" ? "bg-white dark:bg-gray-700 text-rose-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiList /> List
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 py-24 text-center">
             <FiUser className="mx-auto h-12 w-12 text-gray-400 mb-4" />
             <h3 className="text-lg font-bold text-gray-900 dark:text-white">Directory empty.</h3>
             <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">No system access matrices match your search parameters.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((user) => (
              <div key={user.id} className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800/50 transition-all duration-300 overflow-hidden flex flex-col items-center text-center">
                <div className="w-full bg-gray-50 dark:bg-gray-800/50 pt-8 pb-6 flex flex-col items-center border-b border-gray-100 dark:border-gray-800 relative">
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex items-center justify-center relative mb-4">
                    {user.profile_image_key ? (
                      <img 
                        src={`${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com`}/${user.profile_image_key}`}
                        alt={user.full_name || "Profile Avatar"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.classList.add('fallback-triggered');
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-purple-500/10 dark:from-rose-600/20 dark:to-purple-600/20 flex flex-col items-center justify-center">
                        <FiUser className="w-10 h-10 text-rose-400/80 dark:text-rose-500/80" />
                        <span className="text-[10px] font-black uppercase text-rose-800/50 dark:text-rose-400/50 mt-1">{user.full_name?.charAt(0) || "U"}</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 dark:text-white px-4 leading-tight group-hover:text-rose-600 transition-colors">{user.full_name || "Unregistered Identifier"}</h3>
                  <span className={`mt-3 px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm ${getRoleBadge(user.role || "viewer")}`}>
                    {user.role || "viewer"}
                  </span>
                </div>

                <div className="w-full p-6 flex flex-col gap-4 bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <FiMail className="w-4 h-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <FiCalendar className="w-4 h-4" />
                    <span>Joined: {formatDate(user.created_at)}</span>
                  </div>
                  
                  <div className="mt-4 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between w-full">
                    <select
                      value={user.role || "viewer"}
                      onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
                      className="text-xs font-bold leading-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-rose-500 outline-none text-gray-700 dark:text-gray-300"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="sales_member">Sales Member</option>
                      <option value="opportunity_manager">Opp Manager</option>
                      <option value="admin">Admin</option>
                    </select>

                    {isDeleting === user.id ? (
                      <div className="flex items-center gap-1">
                         <button onClick={() => setIsDeleting(null)} className="p-1 px-2 text-[10px] font-bold bg-gray-100 dark:bg-gray-800 rounded">Cancel</button>
                         <button onClick={() => deleteUser(user.id)} className="p-1 px-2 text-[10px] font-bold bg-red-600 text-white rounded">Sure?</button>
                      </div>
                    ) : (
                      <button onClick={() => setIsDeleting(user.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Entity</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Authorization Node</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex-shrink-0 border border-gray-200 dark:border-gray-700">
                            {user.profile_image_key ? (
                              <img
                                src={`${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt"}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1"}.amazonaws.com`}/${user.profile_image_key}`}
                                alt={user.full_name || "Profile Avatar"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black text-rose-400 dark:text-rose-500/80 bg-rose-500/10">
                                {user.full_name?.charAt(0) || "U"}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white text-base">
                              {user.full_name || "System Record"}
                            </span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <FiMail className="w-3 h-3" /> {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${getRoleBadge(user.role || "viewer")}`}>
                          {user.role || "viewer"}
                        </span>
                        {!user.is_approved && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Pending Approval
                          </span>
                        )}
                        {user.is_approved && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Approved
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <select
                            value={user.role || "viewer"}
                            onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
                            className="text-xs font-bold leading-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-rose-500 outline-none text-gray-700 dark:text-gray-300"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="sales_member">Sales Member</option>
                            <option value="opportunity_manager">Opp Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                          {!user.is_approved && (
                            <button
                              onClick={() => approveUser(user.id)}
                              className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
                              title="Approve User"
                            >
                              <HiOutlineCheckCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <HiOutlineTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminContainer>
  );
}
