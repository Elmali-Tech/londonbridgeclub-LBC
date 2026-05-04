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
    <DashboardContainer user={user}>
      {/* Birthday Banner */}
      <BirthdayBanner />

      {/* Create Post Card */}
      <CreatePostCard user={user} />

        {/* Feed Component */}
        <Feed />
    </DashboardContainer>
  );
}
