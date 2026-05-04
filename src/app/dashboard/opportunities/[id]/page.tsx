"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { getS3PublicUrl } from "@/lib/awsConfig";
import { useAuth } from "@/context/AuthContext";
import DashboardContainer from "@/app/components/dashboard/DashboardContainer";
import {
  MdArrowBack,
  MdBusiness,
  MdCategory,
  MdAttachMoney,
  MdCalendarToday,
} from "react-icons/md";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";

interface Opportunity {
  id: number;
  title: string;
  company: string;
  service_detail: string;
  category: string;
  estimated_budget: string;
  description: string;
  image_key: string | null;
  is_active: boolean;
  created_at: string;
}

export default function OpportunityDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchOpportunity();
    }
  }, [id]);

  const fetchOpportunity = async () => {
    try {
      const response = await fetch("/api/admin/opportunities");
      const data = await response.json();
      if (data.success) {
        const foundOpportunity = data.opportunities.find(
          (opp: Opportunity) => opp.id === parseInt(id),
        );
        if (foundOpportunity) {
          setOpportunity(foundOpportunity);

          // Fetch the user's specific interest status
          try {
            const token =
              localStorage.getItem("authToken") || Cookies.get("authToken");
            const interestResponse = await fetch(
              `/api/opportunities/${id}/interest`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );
            if (interestResponse.ok) {
              const interestData = await interestResponse.json();
              if (interestData.success) {
                setIsInterested(interestData.isInterested);
              }
            }
          } catch (e) {
            console.error("Failed to fetch interest status", e);
          }
        } else {
          setError("Opportunity not found");
        }
      } else {
        setError("Failed to fetch opportunity");
      }
    } catch (err) {
      setError("An error occurred while fetching opportunity");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterest = async () => {
    if (isInterested) return; // Prevent double submission

    setIsSubmitting(true);
    try {
      const token =
        localStorage.getItem("authToken") || Cookies.get("authToken");
      const response = await fetch(`/api/opportunities/${id}/interest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsInterested(true);
        toast.success(
          "Talebiniz başarıyla alındı. Sizinle iletişime geçeceğiz!",
        );
      } else if (data.message === "Already interested") {
        setIsInterested(true);
        toast.success("Daha önceden ilginizi belirtmişsiniz.");
      } else {
        toast.error(data.error || "Bir hata oluştu.");
      }
    } catch (error) {
      toast.error("Bir ağ hatası oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardContainer
      user={user}
      showRightSidebar={false}
      maxWidth="full"
      centerContent={false}
    >
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          href="/dashboard/opportunities"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-amber-600 mb-4 transition-colors"
        >
          <MdArrowBack className="text-xl" />
          <span className="text-sm font-medium">Back to Opportunities</span>
        </Link>

        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : error || !opportunity ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-20 text-center">
            <svg
              className="w-16 h-16 mx-auto text-red-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Opportunity not found
            </h3>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
            {/* Image Header */}
            <div className="relative h-80 w-full">
              <Image
                src={
                  opportunity.image_key
                    ? getS3PublicUrl(opportunity.image_key)
                    : "/images/placeholder.jpg"
                }
                alt={opportunity.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className="text-white text-4xl font-bold mb-3">
                  {opportunity.title}
                </h1>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm">
                    <MdBusiness className="text-base" />
                    {opportunity.company}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/90 backdrop-blur-sm text-black rounded-full text-sm font-medium">
                    <MdCategory className="text-base" />
                    {opportunity.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MdAttachMoney className="text-amber-600 text-xl" />
                    <h3 className="text-sm font-semibold text-gray-700">
                      Estimated Budget
                    </h3>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {opportunity.estimated_budget}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MdBusiness className="text-blue-600 text-xl" />
                    <h3 className="text-sm font-semibold text-gray-700">
                      Service Detail
                    </h3>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {opportunity.service_detail}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MdCalendarToday className="text-purple-600 text-xl" />
                    <h3 className="text-sm font-semibold text-gray-700">
                      Published Date
                    </h3>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(opportunity.created_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Description
                </h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 text-base leading-relaxed whitespace-pre-line">
                    {opportunity.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <button
                  onClick={handleInterest}
                  disabled={isSubmitting || isInterested}
                  className={`w-full md:w-auto px-8 py-3 font-semibold rounded-lg shadow-lg transition-all duration-300 transform flex items-center justify-center gap-2
                    ${
                      isInterested
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white cursor-default shadow-emerald-500/20"
                        : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none"
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      İşleniyor...
                    </>
                  ) : isInterested ? (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Interested
                    </>
                  ) : (
                    "I'm Interested"
                  )}
                </button>
                <p className="text-gray-500 text-sm mt-4">
                  {isInterested
                    ? "You have successfully expressed your interest! We will be in touch with you shortly."
                    : "If you're interested in this opportunity, click the button above to submit your request."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardContainer>
  );
}
