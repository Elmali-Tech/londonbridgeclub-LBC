"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import DashboardNavbar from "@/app/components/dashboard/DashboardNavbar";
import { fetchAccountAccess } from "@/lib/subscriptionUtils";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [access, setAccess] = useState<{
    userId: number;
    hasDashboardAccess: boolean;
    hasAnySubscription: boolean;
  } | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const isSettingsPage = pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/");

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      if (isLoading) return;
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const result = await fetchAccountAccess();
        if (cancelled) return;
        setAccess({ userId: user.id, ...result });
        setAccessError(null);
        if (!result.hasDashboardAccess) {
          if (!result.hasAnySubscription) router.replace("/membership");
          else if (!isSettingsPage) router.replace("/dashboard/settings");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error checking account access:", error);
        setAccess(null);
        setAccessError("Unable to check account access. Please try again.");
      }
    };

    void checkAccess();
    return () => { cancelled = true; };
  }, [isLoading, user, router, isSettingsPage, retry]);

  if (accessError && user && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4">
        <p role="alert" className="text-gray-700">{accessError}</p>
        <button className="rounded bg-amber-600 px-4 py-2 text-white" onClick={() => {
          setAccessError(null);
          setRetry((value) => value + 1);
        }}>Try again</button>
      </div>
    );
  }

  if (isLoading || !user || access?.userId !== user.id ||
    (!access.hasDashboardAccess && !(access.hasAnySubscription && isSettingsPage))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? "Loading user..." : "Checking account access..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardNavbar />
      <main className="min-h-[calc(100vh-4rem)]">
        {/* Abonelik süresi dolmuş/iptal olmuş kullanıcılar için uyarı banner */}
        {!access.hasDashboardAccess && access.hasAnySubscription && isSettingsPage && (
          <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Your subscription is inactive.</span>{" "}
                  Renew to access all dashboard features.
                </p>
              </div>
              <Link
                href="/membership"
                className="flex-shrink-0 bg-amber-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
              >
                View Plans
              </Link>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}