"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  SubscriptionStatus,
  updateSubscriptionStatus,
} from "@/lib/subscriptionUtils";
import Feed from "@/app/components/dashboard/Feed";
import CreatePostCard from "@/app/components/dashboard/CreatePostCard";
import DashboardContainer from "@/app/components/dashboard/DashboardContainer";
import BirthdayBanner from "@/app/components/dashboard/BirthdayBanner";
import BusinessPulse from "@/app/components/dashboard/business/BusinessPulse";

export default function Dashboard() {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("loading");

  // Fetch subscription status
  useEffect(() => {
    if (user) {
      updateSubscriptionStatus(user, setSubscriptionStatus);
    }
  }, [user]);

  return (
    <DashboardContainer
      user={user}
      showLeftSidebar={false}
      showRightSidebar={false}
      maxWidth="7xl"
    >
      <BusinessPulse />

      <BirthdayBanner />

      <CreatePostCard user={user} />

      <Feed />
    </DashboardContainer>
  );
}
