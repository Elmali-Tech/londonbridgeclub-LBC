"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatsCard from "@/app/components/admin/StatsCard";
import Card from "@/app/components/admin/Card";
import DataTable from "@/app/components/admin/DataTable";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { User, CustomerOpportunity, Meeting, Task } from "@/types/database";

// Modern Icon Set
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SubscriptionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const TargetIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const ClipboardCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);

const CoinsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
    <path d="M7 6h1v4" />
  </svg>
);

const PercentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const CalendarClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="18" cy="18" r="4" />
    <path d="M18 16.5V18l1 1" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default function AdminDashboardPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    usersCount: 0,
    activeSubscriptions: 0,
    totalOpportunities: 0,
    wonOpportunities: 0,
    isLoading: true
  });
  
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentOpportunities, setRecentOpportunities] = useState<CustomerOpportunity[]>([]);
  const [summary, setSummary] = useState({
    activeProjects: 0,
    pendingApprovals: 0,
    pipelineValue: 0,
    winRatePercent: 0,
    upcomingMeetings: [] as Meeting[],
    overdueTasks: { count: 0, items: [] as Task[] },
    totalRevenue: 0,
    totalCommission: 0,
    kpiAchievementRate: 0,
  });

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin" || userRole === "opportunity_manager";

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) {
      router.push("/admin/kpi-dashboard");
    }
  }, [hasAccess, isLoadingAuth, router, user]);

  useEffect(() => {
    if (!hasAccess) return;

    const fetchDashboardData = async () => {
      try {
        const [
          { count: usersCount },
          { count: subsCount },
          { count: oppsCount },
          { count: wonCount },
          { data: usersData },
          { data: oppsData },
        ] = await Promise.all([
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("customer_opportunities").select("*", { count: "exact", head: true }),
          supabase.from("customer_opportunities").select("*", { count: "exact", head: true }).eq("status", "Won"),
          supabase.from("users").select("*").order("created_at", { ascending: false }).limit(6),
          supabase.from("customer_opportunities").select("*").order("created_at", { ascending: false }).limit(5),
        ]);

        setStats({
          usersCount: usersCount || 0,
          activeSubscriptions: subsCount || 0,
          totalOpportunities: oppsCount || 0,
          wonOpportunities: wonCount || 0,
          isLoading: false
        });
        
        setRecentUsers(usersData || []);
        setRecentOpportunities(oppsData || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchDashboardData();
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;

    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch("/api/admin/dashboard/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          setSummary({
            activeProjects: data.activeProjects,
            pendingApprovals: data.pendingApprovals,
            pipelineValue: data.pipelineValue,
            winRatePercent: data.winRatePercent,
            upcomingMeetings: data.upcomingMeetings,
            overdueTasks: data.overdueTasks,
            totalRevenue: data.totalRevenue ?? 0,
            totalCommission: data.totalCommission ?? 0,
            kpiAchievementRate: data.kpiAchievementRate ?? 0,
          });
        }
      } catch (error) {
        console.error("Error fetching dashboard summary:", error);
      }
    };

    fetchSummary();
  }, [hasAccess]);

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `£${(value / 1_000).toFixed(0)}K`;
    return `£${value}`;
  };

  if (isLoadingAuth || stats.isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!hasAccess) return null;

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hrs ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return Math.floor(seconds) + " secs ago";
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const columns = [
    {
      header: "Name",
      accessor: (user: User) => <span className="font-bold text-gray-900 dark:text-gray-100">{user.full_name || "Unknown"}</span>,
    },
    {
      header: "Email",
      accessor: (user: User) => user.email,
    },
    {
      header: "Status",
      accessor: (user: User) => (
        <span
          className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${
            user.subscription_status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {user.subscription_status || "Free"}
        </span>
      ),
    },
    {
      header: "Joined",
      accessor: (user: User) => <span className="text-gray-500 font-medium">{formatDate(user.created_at)}</span>,
    },
  ];

  // Synthesize recent activities timeline
  const recentActivities = [
    ...recentUsers.slice(0, 3).map(u => ({
      id: `u-${u.id}`,
      type: "user",
      message: `New user registration: ${u.full_name || u.email}`,
      title: "New User",
      date: new Date(u.created_at),
      icon: <UsersIcon />,
      color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    })),
    ...recentOpportunities.slice(0, 3).map(o => ({
      id: `o-${o.id}`,
      type: "opportunity",
      message: `${o.company_name} - ${o.opportunity_title}`,
      title: o.status === "Won" ? "CRM Deal Won" : "New CRM Lead",
      date: new Date(o.created_at),
      icon: o.status === "Won" ? <TrophyIcon /> : <TargetIcon />,
      color: o.status === 'Won' ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Overview Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            Welcome back, <span className="text-gray-900 dark:text-white font-bold">{user?.full_name || user?.email}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/users/new" className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            Add User
          </Link>
          <Link href="/admin/customer-pool" className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm shadow-amber-600/20">
            <PlusIcon />
            <span className="ml-2">New CRM Lead</span>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats.usersCount}
          icon={<UsersIcon />}
          color="indigo"
        />
        <StatsCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          icon={<SubscriptionIcon />}
          color="green"
        />
        <StatsCard
          title="CRM Pipeline"
          value={stats.totalOpportunities}
          icon={<TargetIcon />}
          color="blue"
        />
        <StatsCard
          title="Won CRM Deals"
          value={stats.wonOpportunities}
          icon={<TrophyIcon />}
          color="amber"
          change={{ value: "Success", neutral: true }}
        />
      </div>

      {/* Management stats: Projects, Approvals, Pipeline, KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Active Projects"
          value={summary.activeProjects}
          icon={<BriefcaseIcon />}
          color="blue"
        />
        <StatsCard
          title="Pending Approvals"
          value={summary.pendingApprovals}
          icon={<ClipboardCheckIcon />}
          color="amber"
        />
        <StatsCard
          title="Pipeline Value (GBP)"
          value={formatCurrency(summary.pipelineValue)}
          icon={<CoinsIcon />}
          color="green"
        />
        <StatsCard
          title="Win Rate"
          value={`${summary.winRatePercent}%`}
          icon={<PercentIcon />}
          color="indigo"
        />
      </div>

      {/* Financial & KPI stats: Revenue, Commission, KPI Achievement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Project Revenue"
          value={formatCurrency(summary.totalRevenue)}
          icon={<CoinsIcon />}
          color="green"
        />
        <StatsCard
          title="Total Commission"
          value={formatCurrency(summary.totalCommission)}
          icon={<PercentIcon />}
          color="amber"
        />
        <StatsCard
          title="Project Completion Rate"
          value={`${summary.kpiAchievementRate}%`}
          icon={<TargetIcon />}
          color="indigo"
        />
      </div>

      {/* Upcoming Meetings + Overdue Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card
          title="Upcoming Meetings"
          action={
            <Link href="/admin/meetings" className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {summary.upcomingMeetings.length > 0 ? summary.upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <CalendarClockIcon />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{meeting.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{meeting.meeting_date}{meeting.meeting_time ? ` at ${meeting.meeting_time}` : ""}</p>
                </div>
              </div>
            )) : (
              <div className="py-6 text-center">
                <p className="text-gray-500 text-sm font-medium">No upcoming meetings.</p>
              </div>
            )}
          </div>
        </Card>

        <Card
          title="Overdue Tasks"
          action={
            <Link href="/admin/tasks" className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">
              View all ({summary.overdueTasks.count})
            </Link>
          }
        >
          <div className="space-y-3">
            {summary.overdueTasks.items.length > 0 ? summary.overdueTasks.items.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                  <AlertTriangleIcon />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{task.title}</p>
                  <p className="text-sm text-red-600 dark:text-red-400 font-semibold">Due {task.due_date}</p>
                </div>
              </div>
            )) : (
              <div className="py-6 text-center">
                <p className="text-gray-500 text-sm font-medium">No overdue tasks. 🎉</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Recent Users */}
        <div className="lg:col-span-2">
          <Card 
            title="Recent Users" 
            className="h-full"
            action={
              <Link href="/admin/users" className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">
                View all
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <DataTable
                columns={columns}
                data={recentUsers}
                keyExtractor={(item) => item.id.toString()}
                isLoading={false} // Loading handled at page level
                emptyMessage="No users found"
              />
            </div>
          </Card>
        </div>

        {/* Recent Activity Timeline */}
        <div>
          <Card title="Activity Timeline" className="h-full">
            <div className="space-y-6 pt-2">
              {recentActivities.map((activity, idx) => (
                <div key={activity.id} className="relative flex items-start gap-4">
                  {idx !== recentActivities.length - 1 && (
                    <div className="absolute left-5 top-10 bottom-[-24px] w-0.5 bg-gray-100 dark:bg-gray-800"></div>
                  )}
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {activity.message}
                    </p>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1">
                      {timeAgo(activity.date.toISOString())}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No recent activity.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Additional content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent CRM Pipeline */}
        <Card 
          title="Recent CRM Pipeline"
          action={
            <Link href="/admin/customer-pool" className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors">
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {recentOpportunities.length > 0 ? recentOpportunities.map((opp) => (
              <div key={opp.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/40 border border-transparent dark:border-gray-800/60 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200 group">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {opp.company_name}
                  </p>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                    <span>{opp.opportunity_title}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    <span>{timeAgo(opp.created_at)}</span>
                  </p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  opp.status === "Won" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : opp.status === "Lost" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                }`}>
                  {opp.status || "Active"}
                </span>
              </div>
            )) : (
              <div className="py-6 text-center">
                <p className="text-gray-500 text-sm font-medium">No opportunities created yet.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/admin/register-tokens"
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                <UsersIcon />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">
                Add User
              </p>
            </Link>
            <Link
              href="/admin/customer-pool"
              className="p-5 bg-gray-50 dark:bg-gray-800/40 border border-transparent dark:border-gray-800/60 rounded-2xl text-center hover:bg-white hover:shadow-sm dark:hover:bg-gray-800 transition-all duration-200 group"
            >
               <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                <TargetIcon />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">
                CRM Pipeline
              </p>
            </Link>
            <Link
              href="/admin/subscriptions"
              className="p-5 bg-gray-50 dark:bg-gray-800/40 border border-transparent dark:border-gray-800/60 rounded-2xl text-center hover:bg-white hover:shadow-sm dark:hover:bg-gray-800 transition-all duration-200 group"
            >
               <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform">
                <SubscriptionIcon />
              </div>
              <p className="font-bold text-gray-900 dark:text-white">
                Subscriptions
              </p>
            </Link>
            <Link
              href="/admin/settings"
              className="p-5 bg-gray-50 dark:bg-gray-800/40 border border-transparent dark:border-gray-800/60 rounded-2xl text-center hover:bg-white hover:shadow-sm dark:hover:bg-gray-800 transition-all duration-200 group"
            >
               <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <p className="font-bold text-gray-900 dark:text-white">
                Settings
              </p>
            </Link>
            <Link
              href="/admin/kpi-dashboard"
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="font-medium text-gray-900 dark:text-white">
                Reports
              </p>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
