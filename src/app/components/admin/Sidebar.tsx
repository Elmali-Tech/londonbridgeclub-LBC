"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// --- Icon components (ChevronLeft / ChevronRight) ---
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// --- Original Icon components ---
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CustomerPoolIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <rect x="15" y="14" width="7" height="7" rx="1" />
  </svg>
);

const SubscriptionsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const PartnersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const BenefitsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 18.26l-6.18 3.25L8 14.14 2 9.27l10.91-1.01L12 2z" />
  </svg>
);

const OpportunitiesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 3v4M8 3v4" />
    <path d="M2 13h20" />
  </svg>
);

const EventsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const TrackingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M2 12h20M5.07 19.07l13.86-13.86M19.07 19.07L5.07 5.07" />
  </svg>
);

const KPIDashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

const DocumentationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
    <path d="M8 7h6" />
    <path d="M8 11h8" />
    <path d="M8 15h6" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PostsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const TokenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 opacity-75 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

interface SidebarProps {
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, toggleCollapse }: SidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigation = [
    {
      title: "Overview",
      items: [
        {
          name: "Dashboard",
          href: "/admin",
          icon: DashboardIcon,
          roles: ["admin", "opportunity_manager"],
        },
        {
          name: "KPI Dashboard",
          href: "/admin/kpi-dashboard",
          icon: KPIDashboardIcon,
          roles: ["admin", "opportunity_manager", "sales_member", "viewer"],
        },
      ]
    },
    {
      title: "Sales & CRM",
      items: [
        {
          name: "Customer Pool",
          href: "/admin/customer-pool",
          icon: CustomerPoolIcon,
          roles: ["admin", "opportunity_manager"],
        },
        {
          name: "Process Tracking",
          href: "/admin/tracking",
          icon: TrackingIcon,
          roles: ["admin", "opportunity_manager", "sales_member"],
        },
        {
          name: "Opportunities",
          href: "/admin/opportunities",
          icon: OpportunitiesIcon,
          roles: ["admin", "opportunity_manager"],
        },
        {
          name: "Sales Process",
          href: "/admin/documentation",
          icon: DocumentationIcon,
          roles: ["admin", "opportunity_manager", "sales_member", "viewer"],
        },
      ]
    },
    {
      title: "Content & Community",
      items: [
        {
          name: "Posts",
          href: "/admin/posts",
          icon: PostsIcon,
          roles: ["admin", "opportunity_manager"],
        },
        {
          name: "Events",
          href: "/admin/events",
          icon: EventsIcon,
          roles: ["admin"],
        },
        {
          name: "Benefits",
          href: "/admin/benefits",
          icon: BenefitsIcon,
          roles: ["admin"],
        },
        {
          name: "Partners",
          href: "/admin/partners",
          icon: PartnersIcon,
          roles: ["admin", "opportunity_manager"],
        },
      ]
    },
    {
      title: "System Admin",
      items: [
        {
          name: "Users",
          href: "/admin/users",
          icon: UsersIcon,
          roles: ["admin"],
        },
        {
          name: "Subscriptions",
          href: "/admin/subscriptions",
          icon: SubscriptionsIcon,
          roles: ["admin"],
        },
        {
          name: "Register Tokens",
          href: "/admin/register-tokens",
          icon: TokenIcon,
          roles: ["admin"],
        },
        {
          name: "Settings",
          href: "/admin/settings",
          icon: SettingsIcon,
          roles: ["admin"],
        },
      ]
    }
  ];

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");

  const filteredNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(userRole)
      ),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      router.push("/");
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const scrollbarHideClasses =
    "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]";

  if (!mounted) return null;

  return (
    <>
      {/* --- Mobile View --- */}

      {/* Mobile Top Navbar */}
      <div className="fixed top-0 left-0 z-40 w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 md:hidden shadow-sm">
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Management
          </span>
          <button
            onClick={toggleMobileMenu}
            className="p-2 -mr-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
          >
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      <div
        className={`fixed inset-0 z-30 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col pt-16 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* User Info */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
            Logged in as
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {user?.full_name || user?.email}
          </div>
        </div>

        {/* Navigation Categories */}
        <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-6 ${scrollbarHideClasses}`}>
          {filteredNavigation.map((group, groupIdx) => (
            <div key={groupIdx}>
              <h3 className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      title={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white"
                      }`}
                    >
                      <item.icon />
                      <span className="ml-3 font-semibold">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Sticky Bottom Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 space-y-2">
          <Link
            href="/"
            title="Home"
            className="w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-all duration-200"
          >
            <HomeIcon />
            <span className="ml-3">Home</span>
          </Link>
          <button
            onClick={handleLogout}
            title="Log out"
            className="w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-all duration-200"
          >
            <LogoutIcon />
            <span className="ml-3">Log out</span>
          </button>
        </div>
      </div>

      {/* --- Desktop View --- */}

      <div className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:bg-white md:border-r md:border-gray-100 dark:md:bg-gray-900 dark:md:border-gray-800 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out ${isCollapsed ? 'md:w-20' : 'md:w-72'}`}>
        
        {/* Header */}
        <div className="flex items-center flex-shrink-0 px-6 h-20 border-b border-gray-100 dark:border-gray-800 relative z-10 bg-white dark:bg-gray-900">
          <Link href="/admin" className={`flex items-center gap-3 w-full group ${isCollapsed ? 'justify-center' : ''}`} title="Management">
            <div className={`w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:shadow transition-all duration-200`}>
              L
            </div>
            {!isCollapsed && (
              <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">
                Management
              </h1>
            )}
          </Link>
          {toggleCollapse && (
            <button 
              onClick={toggleCollapse} 
              className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow flex items-center justify-center text-gray-500 hover:text-amber-600 transition-all ${isCollapsed ? '-right-3' : 'right-4 opacity-0 group-hover:opacity-100'}`}
              style={!isCollapsed ? { opacity: 1 } : {}} // keep it always visible for now
            >
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          )}
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex-shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Logged in as
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user?.full_name || user?.email}
            </div>
          </div>
        )}

        {/* Navigation Categories */}
        <div className={`flex-1 overflow-y-auto py-6 space-y-8 ${scrollbarHideClasses} ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {filteredNavigation.map((group, groupIdx) => (
            <div key={groupIdx}>
              {!isCollapsed ? (
                <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 truncate">
                  {group.title}
                </h3>
              ) : (
                <div className="px-4 mb-3 flex justify-center">
                  <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                </div>
              )}
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={item.name}
                      className={`group flex items-center py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isCollapsed ? 'justify-center px-0' : 'px-3'} ${
                        isActive
                          ? "bg-amber-50 text-amber-700 shadow-sm shadow-amber-100/50 dark:bg-amber-900/20 dark:text-amber-400 dark:shadow-none"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/40 dark:hover:text-white"
                      }`}
                    >
                      <item.icon />
                      {!isCollapsed && (
                        <span className="ml-3 font-semibold truncate">{item.name}</span>
                      )}
                      {isActive && !isCollapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-500" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Sticky Bottom Actions */}
        <div className={`p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 space-y-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <Link
            href="/"
            title="Home"
            className={`w-full flex items-center py-3 text-sm font-bold rounded-xl text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-all duration-200 group ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
          >
            <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
              <HomeIcon />
            </div>
            {!isCollapsed && <span className="ml-3 truncate">Home</span>}
          </Link>
          <button
            onClick={handleLogout}
            title="Log out"
            className={`w-full flex items-center py-3 text-sm font-bold rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200 group ${isCollapsed ? 'justify-center px-0' : 'px-4'}`}
          >
            <div className="text-red-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
              <LogoutIcon />
            </div>
            {!isCollapsed && <span className="ml-3 truncate">Log out</span>}
          </button>
        </div>
      </div>
    </>
  );
}
