"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, ChevronLeft } from "lucide-react";
import DashboardContainer from "@/app/components/dashboard/DashboardContainer";
import ProfileTab from "./tabs/ProfileTab";
import SecurityTab from "./tabs/SecurityTab";
import NotificationsTab from "./tabs/NotificationsTab";
import SubscriptionTab from "./tabs/SubscriptionTab";

export default function SettingsPage() {
  const { user } = useAuth();
  // Abonelik aktif değilse otomatik olarak Subscription tab'ını aç
  const [activeTab, setActiveTab] = useState("profile");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [checkedSubscription, setCheckedSubscription] = useState(false);

  React.useEffect(() => {
    if (user && !checkedSubscription) {
      const isActive = user.subscription_status === "active";
      if (!isActive) {
        setActiveTab("subscription");
      }
      setCheckedSubscription(true);
    }
  }, [user, checkedSubscription]);

  // Settings tabs
  const settingsTabs = [
    {
      id: "profile",
      name: "Profile Info",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      id: "security",
      name: "Security",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
    {
      id: "notifications",
      name: "Notifications",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17l2.586-2.586a2 2 0 012.828 0L12.828 17H4.828z"
          />
        </svg>
      ),
    },
    {
      id: "subscription",
      name: "Subscription",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
    },
  ];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab />;
      case "security":
        return <SecurityTab />;
      case "notifications":
        return <NotificationsTab />;
      case "subscription":
        return <SubscriptionTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <DashboardContainer
      user={user}
      showLeftSidebar={false}
      showRightSidebar={false}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Sidebar Mobile */}
          {!isMobileMenuOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden fixed left-0 top-20 z-30 bg-white border border-gray-200 shadow-lg p-2 rounded-r-lg transition-transform duration-300 translate-x-0"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {isMobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          <div
            className={`
              fixed md:relative top-20 md:top-auto left-0 z-40 md:z-auto h-[calc(100vh-5rem)] md:h-auto
              transform transition-transform duration-300 ease-in-out md:transform-none
              flex-shrink-0 w-64 md:w-auto
              ${
                isMobileMenuOpen
                  ? "translate-x-0"
                  : "-translate-x-full md:translate-x-0"
              }
            `}
          >
            {/* Menu Box */}
            <div className="bg-white w-64  rounded-r-lg md:rounded-lg border-r md:border border-gray-200 shadow-sm p-4 overflow-y-auto md:overflow-visible sticky md:top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 md:block hidden">
                Settings
              </h2>
              <div className="flex items-center justify-between mb-4 md:hidden">
                <h2 className="text-lg font-semibold text-gray-900">
                  Settings
                </h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <nav className="space-y-1">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {tab.icon}
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 pt-4 md:pt-0">
            <div className="space-y-6">
              {/* Page Header */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                    {settingsTabs.find((tab) => tab.id === activeTab)?.icon}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {settingsTabs.find((tab) => tab.id === activeTab)?.name}
                    </h1>
                    <p className="text-gray-600">
                      {activeTab === "profile" &&
                        "Manage your profile information and preferences"}
                      {activeTab === "security" &&
                        "Secure your account with password and security settings"}
                      {activeTab === "notifications" &&
                        "Control how and when you receive notifications"}
                      {activeTab === "subscription" &&
                        "Manage your subscription and billing information"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
}
