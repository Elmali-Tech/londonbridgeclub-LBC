"use client";
import React, { useState, useEffect } from "react";
import { User } from "@/types/database";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  SubscriptionStatus,
  fetchSubscriptionStatus,
} from "@/lib/subscriptionUtils";
import DashboardContainer from "@/app/components/dashboard/DashboardContainer";
import { toast } from "react-hot-toast";
import { FiPlus } from "react-icons/fi";

// Extended User interface for follow status
interface UserWithFollowStatus extends User {
  isFollowing?: boolean;
}

export default function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<UserWithFollowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatusTab, setActiveStatusTab] = useState<
    "personal" | "corporate"
  >("personal");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("loading");

  // Handle follow user
  const handleFollow = async (userId: number) => {
    if (!user) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Please log in again");
        return;
      }

      const response = await fetch("/api/connections", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ followingId: userId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to follow user");
      }

      // Update the members state to reflect the follow
      setMembers((prevMembers) =>
        prevMembers.map((member) =>
          member.id === userId ? { ...member, isFollowing: true } : member
        )
      );

      toast.success("Successfully followed user!");
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
    }
  };

  // Fetch user subscription status
  useEffect(() => {
    const fetchUserSubscriptionStatus = async () => {
      if (!user) return;

      try {
        const status = await fetchSubscriptionStatus(user.id);
        setSubscriptionStatus(status);
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
        setSubscriptionStatus("inactive");
      }
    };

    fetchUserSubscriptionStatus();
  }, [user]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const token = localStorage.getItem("authToken");
        if (!token) {
          setError("Please log in again");
          return;
        }

        // Fetch all members with follow status
        const response = await fetch("/api/suggested-users?all=true", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log("👥 Members API response:", data);

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch members");
        }

        // Set members with follow status
        console.log(
          "✅ Setting members:",
          data.users?.length || 0,
          "users found"
        );
        setMembers(data.users || []);
      } catch (err) {
        console.error("Failed to load member list:", err);
        setError("An error occurred while loading the member list.");
      } finally {
        setLoading(false);
      }
    };

    if (user && subscriptionStatus === "active") {
      fetchMembers();
    } else if (subscriptionStatus !== "loading") {
      // Stop showing loading when we know subscription status
      setLoading(false);
    }
  }, [user, subscriptionStatus]);

  // Show warning if subscription is not active
  if (subscriptionStatus === "inactive") {
    return (
      <DashboardContainer user={user}>
        <div className="bg-gray-900 p-8 rounded-sm border border-gray-800 shadow-lg">
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-amber-500 mx-auto mb-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-12V4m0 0v2m0-2h2m-2 0H9m12 9a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold mb-4">Restricted Access</h2>
            <p className="text-gray-300 mb-6">
              You need an active membership to view the member list. Click the
              button below to explore membership plans.
            </p>
            <Link
              href="/membership"
              className="bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white px-6 py-3 rounded-sm text-sm shadow-md inline-block transition-all"
            >
              Explore Membership Plans
            </Link>
          </div>
        </div>
      </DashboardContainer>
    );
  }

  if (loading) {
    return (
      <DashboardContainer user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      </DashboardContainer>
    );
  }

  if (error) {
    return (
      <DashboardContainer user={user}>
        <div className="bg-red-900/30 border border-red-700 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-red-300 mb-2">Hata</h3>
          <p className="text-gray-300">{error}</p>
        </div>
      </DashboardContainer>
    );
  }

  // Filter members by selected status tab and search query
  const filteredMembers = members
    .filter((member) => {
      console.log(
        "🔍 Filtering member:",
        member.full_name,
        "status:",
        member.status,
        "activeTab:",
        activeStatusTab
      );
      return member.status === activeStatusTab;
    })
    .filter((member) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      return (
        member.full_name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );
    });

  console.log("📊 Filter results:", {
    totalMembers: members.length,
    filteredMembers: filteredMembers.length,
    activeStatusTab,
    searchQuery,
  });

  // Get user initials from full_name
  const getUserInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <DashboardContainer user={user}>
      {/* Header */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Club Members</h1>
            <p className="text-gray-600 mt-1">
              Connect with fellow London Bridge Club members
            </p>
          </div>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("card")}
                className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                  viewMode === "card"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                aria-label="Card view"
              >
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
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
                aria-label="List view"
              >
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveStatusTab("personal")}
            className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
              activeStatusTab === "personal"
                ? "bg-gray-100 text-amber-600 border-b-2 border-amber-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-black"
            }`}
          >
            Individual Members
          </button>
          <button
            onClick={() => setActiveStatusTab("corporate")}
            className={`flex-1 px-4 py-3 text-center font-medium transition-colors ${
              activeStatusTab === "corporate"
                ? "bg-gray-100 text-amber-600 border-b-2 border-amber-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-black"
            }`}
          >
            Corporate Members
          </button>
        </div>

        {/* Stats */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between">
          <div className="text-sm">
            <span className="text-gray-600">Showing: </span>
            <span className="text-black font-medium">
              {filteredMembers.length}
            </span>
            <span className="text-gray-600"> {activeStatusTab} members</span>
            {searchQuery && (
              <span className="text-gray-600">
                {" "}
                matching &quot;{searchQuery}&quot;
              </span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Total: </span>
            <span className="text-black font-medium">{members.length}</span>
            <span className="text-gray-600"> members</span>
          </div>
        </div>
      </div>

      {/* Members Display */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-8">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No members found
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? `No ${activeStatusTab} members match your search criteria.`
                : `No ${activeStatusTab} members found.`}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-sm text-sm font-medium transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
          {viewMode === "card" ? (
            /* Card View - LinkedIn Style */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from(new Map(filteredMembers.map(m => [m.id, m])).values()).map((member) => (
                <div
                  key={member.id}
                  className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 relative flex flex-col"
                >
                  {/* Cover Photo Placeholder */}
                  <div className="h-24 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 relative">
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        member.status === "corporate"
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-white text-amber-600 shadow-md"
                      }`}>
                        {member.status === "corporate" ? "Corporate" : "Individual"}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="px-6 pb-6 pt-12 text-center relative flex-1 flex flex-col">
                    {/* Profile Picture - Positioned to overlap cover */}
                    <Link 
                      href={`/dashboard/users/${member.id}`}
                      className="absolute -top-12 left-1/2 transform -translate-x-1/2 group-hover:scale-105 transition-transform duration-300"
                    >
                      <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                        {member.profile_image_key ? (
                          <img
                            src={`https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com/${member.profile_image_key}`}
                            alt={member.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-2xl uppercase">
                            {getUserInitials(member.full_name)}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* User Info */}
                    <div className="flex-1">
                      <Link href={`/dashboard/users/${member.id}`} className="inline-block">
                        <h3 className="text-lg font-black text-gray-900 hover:text-amber-600 transition-colors leading-tight">
                          {member.full_name}
                        </h3>
                      </Link>
                      <p className="text-xs font-bold text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
                        {member.headline || "London Bridge Club Member"}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">
                        {member.location || "London, United Kingdom"}
                      </p>
                    </div>

                    {/* Follow Button */}
                    <div className="mt-6">
                      <button
                        onClick={() => handleFollow(member.id)}
                        disabled={member.isFollowing}
                        className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                          member.isFollowing
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 active:scale-95"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {member.isFollowing ? (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Following
                            </>
                          ) : (
                            <>
                              <FiPlus className="w-4 h-4" />
                              Follow
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Industry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold overflow-hidden flex-shrink-0">
                            {member.profile_image_key ? (
                              <img
                                src={`https://${
                                  process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME ||
                                  "londonbridgeprojt"
                                }.s3.${
                                  process.env.NEXT_PUBLIC_AWS_REGION ||
                                  "eu-west-1"
                                }.amazonaws.com/${member.profile_image_key}`}
                                alt={member.full_name}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              getUserInitials(member.full_name)
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.email}
                            </div>
                            {member.headline && (
                              <div className="text-xs text-gray-400 truncate max-w-xs">
                                {member.headline}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            member.status === "corporate"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {member.status === "corporate"
                            ? "Corporate"
                            : "Individual"}
                        </span>
                        {member.subscription_status === "active" && (
                          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Premium
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.location || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.industry || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(member.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button className="px-3 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 transition-colors">
                            Connect
                          </button>
                          <button className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors">
                            Message
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardContainer>
  );
}
