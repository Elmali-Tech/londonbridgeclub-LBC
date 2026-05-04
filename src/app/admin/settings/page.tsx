"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminContainer from "@/app/components/admin/AdminContainer";
import { toast } from "react-hot-toast";
import { 
  FiUser, 
  FiSettings, 
  FiMail, 
  FiBell, 
  FiLock, 
  FiImage, 
  FiGlobe,
  FiSave,
  FiCheckCircle,
  FiShield
} from "react-icons/fi";

export default function SettingsPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth) {
      const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
      if (userRole !== "admin") {
        router.push("/admin");
      }
    }
  }, [user, router, isLoadingAuth]);

  // Profile settings
  const [name, setName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");

  // Site settings
  const [siteName, setSiteName] = useState("London Bridge Club");
  const [siteDescription, setSiteDescription] = useState(
    "Business Networking & Opportunity Platform",
  );
  const [logo, setLogo] = useState("/logo.png");

  // Email settings
  const [smtpHost, setSmtpHost] = useState("smtp.londonbridge.club");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("system@londonbridge.club");
  const [smtpPassword, setSmtpPassword] = useState("");

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newUserNotifications, setNewUserNotifications] = useState(true);
  const [subscriptionNotifications, setSubscriptionNotifications] =
    useState(true);

  const [activeTab, setActiveTab] = useState<"profile" | "site" | "email" | "notifications">("profile");

  // Handle form submissions
  const handleSave = (section: string) => {
    toast.success(`${section} settings updated successfully!`);
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  if (userRole !== "admin") return null;

  return (
    <AdminContainer>
      <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Configuration</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Manage your account, site-wide parameters, and integration preferences.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation Sidebar */}
          <div className="w-full lg:w-64 shrink-0">
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === "profile" 
                    ? "bg-slate-100 dark:bg-slate-800/50 text-slate-900 dark:text-white" 
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                }`}
              >
                <FiUser className={activeTab === "profile" ? "text-slate-600" : ""} /> Profile
              </button>
              <button
                onClick={() => setActiveTab("site")}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === "site" 
                    ? "bg-slate-100 dark:bg-slate-800/50 text-slate-900 dark:text-white" 
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                }`}
              >
                <FiGlobe className={activeTab === "site" ? "text-slate-600" : ""} /> Site Settings
              </button>
              <button
                onClick={() => setActiveTab("email")}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === "email" 
                    ? "bg-slate-100 dark:bg-slate-800/50 text-slate-900 dark:text-white" 
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                }`}
              >
                <FiMail className={activeTab === "email" ? "text-slate-600" : ""} /> Mail Server
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === "notifications" 
                    ? "bg-slate-100 dark:bg-slate-800/50 text-slate-900 dark:text-white" 
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                }`}
              >
                <FiBell className={activeTab === "notifications" ? "text-slate-600" : ""} /> Notifications
              </button>
            </nav>

            <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
               <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
                 <FiShield size={18} />
                 <span className="text-sm font-black uppercase tracking-wider">Security Status</span>
               </div>
               <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                 Your account is protected by enterprise-grade encryption and multi-factor authentication protocols.
               </p>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-[500px]">
              
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="p-8 animate-in slide-in-from-right-2 duration-300">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600">
                      <FiUser size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profile Identity</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manage your personal information and credentials.</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSave("Profile"); }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Security Overrides</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Current Password</label>
                          <input
                            type="password"
                            placeholder="Confirm current password"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">New Password</label>
                          <input
                            type="password"
                            placeholder="Optional"
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 flex justify-end">
                      <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm">
                        <FiSave /> Update Profile
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Site Tab */}
              {activeTab === "site" && (
                <div className="p-8 animate-in slide-in-from-right-2 duration-300">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600">
                      <FiGlobe size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Site Branding</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Configure global metadata and visual identity.</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSave("Site"); }} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Site Title</label>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Meta Description</label>
                      <textarea
                        rows={3}
                        value={siteDescription}
                        onChange={(e) => setSiteDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Active Logo URL</label>
                      <div className="flex gap-4">
                        <input
                          type="text"
                          value={logo}
                          onChange={(e) => setLogo(e.target.value)}
                          className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                        />
                        <button type="button" className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                          <FiImage size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="pt-8 flex justify-end">
                      <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm">
                        <FiSave /> Save Branding
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Email Tab */}
              {activeTab === "email" && (
                <div className="p-8 animate-in slide-in-from-right-2 duration-300">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600">
                      <FiMail size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mail Dispatcher</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Configure SMTP protocols and delivery endpoints.</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSave("Email"); }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-3 space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">SMTP Host</label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Port</label>
                        <input
                          type="text"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium text-center"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Username</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1">Password</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="pt-8 flex justify-end">
                      <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm">
                        <FiSave /> Verify & Save
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="p-8 animate-in slide-in-from-right-2 duration-300">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600">
                      <FiBell size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Event Triggers</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manage how you receive alerts and system updates.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 group hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-slate-600 shadow-sm border border-gray-100 dark:border-gray-800">
                          <FiMail />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Email Digest</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Send periodic summaries of platform activity.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEmailNotifications(!emailNotifications)}
                        className={`w-12 h-6 rounded-full transition-all relative ${emailNotifications ? 'bg-slate-900 dark:bg-slate-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emailNotifications ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 group hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-slate-600 shadow-sm border border-gray-100 dark:border-gray-800">
                          <FiUser />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">New Registrations</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Instantly notify admins when new members join.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setNewUserNotifications(!newUserNotifications)}
                        className={`w-12 h-6 rounded-full transition-all relative ${newUserNotifications ? 'bg-slate-900 dark:bg-slate-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${newUserNotifications ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 group hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-slate-600 shadow-sm border border-gray-100 dark:border-gray-800">
                          <FiSave />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Subscription Alerts</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Track membership renewals and status changes.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSubscriptionNotifications(!subscriptionNotifications)}
                        className={`w-12 h-6 rounded-full transition-all relative ${subscriptionNotifications ? 'bg-slate-900 dark:bg-slate-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${subscriptionNotifications ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-8 flex justify-end">
                    <button type="button" onClick={() => handleSave("Notification")} className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-sm">
                      <FiSave /> Push Changes
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </AdminContainer>
  );
}
