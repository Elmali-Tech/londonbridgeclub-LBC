"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/app/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess =
    userRole === "admin" ||
    userRole === "opportunity_manager" ||
    userRole === "sales_member";

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  React.useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState) {
      setIsSidebarCollapsed(savedState === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  // Redirect users who don't have admin console access
  React.useEffect(() => {
    if (!isLoading && !hasAccess && user) {
      console.log("Admin console yetkisi yok, ana sayfaya yönlendiriliyor");
      router.push("/");
    }
  }, [user, router, isLoading, hasAccess]);

  // Loading state or unauthorized access
  if (isLoading || (user && !hasAccess)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Yükleniyor...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isSidebarCollapsed} toggleCollapse={toggleSidebar} />
      <div className={`flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "md:pl-20" : "md:pl-72"}`}>
        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
