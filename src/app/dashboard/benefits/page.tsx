"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import DashboardContainer from "@/app/components/dashboard/DashboardContainer";
import { getS3PublicUrl } from "@/lib/awsConfig";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";

interface Benefit {
  id: number;
  title: string;
  description: string;
  category: string;
  partner_name: string | null;
  partner_website: string | null;
  discount_percentage: number | null;
  discount_code: string | null;
  valid_until: string | null;
  terms_conditions: string | null;
  is_active: boolean;
  image_key: string | null;
  created_at: string;
}

export default function BenefitsPage() {
  const { user } = useAuth();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetchBenefits();
  }, []);

  const fetchBenefits = async () => {
    try {
      // Get token from cookie or localStorage
      const token =
        Cookies.get("authToken") || localStorage.getItem("authToken");
      if (!token) {
        setError("You must be logged in to view benefits.");
        setIsLoading(false);
        return;
      }
      const response = await fetch("/api/benefits", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setBenefits(data.benefits);
      } else {
        setError("Failed to fetch benefits");
      }
    } catch (err) {
      setError("An error occurred while fetching benefits");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async (
    id: number,
    code: string,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
        } catch (err) {
          console.error("Fallback copy failed", err);
          toast.error("Failed to copy code");
          textArea.remove();
          return;
        }
        textArea.remove();
      }

      setCopiedId(id);
      toast.success("Code copied", {
        duration: 3000,
        position: "top-right",
      });

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
      toast.error("Failed to copy code");
    }
  };

  return (
    <DashboardContainer user={user} showRightSidebar={false}>
      {/* Header */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Member Benefits</h1>
            <p className="text-gray-600 mt-1">
              Exclusive discounts and offers from our partners
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Display */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading benefits...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
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
              Error loading benefits
            </h3>
            <p className="text-gray-600">{error}</p>
          </div>
        ) : benefits.length === 0 ? (
          <div className="text-center py-20">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No benefits found
            </h3>
            <p className="text-gray-600">No active benefits at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit) => (
              <div
                key={benefit.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-amber-200"
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={
                      benefit.image_key
                        ? getS3PublicUrl(benefit.image_key)
                        : "/images/placeholder.jpg"
                    }
                    alt={benefit.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    {benefit.discount_percentage && (
                      <div className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
                        {benefit.discount_percentage}% OFF
                      </div>
                    )}
                    <h3 className="text-white text-xl font-bold line-clamp-2">
                      {benefit.title}
                    </h3>
                    {benefit.partner_name && (
                      <p className="text-gray-200 text-sm flex items-center mt-1">
                        <svg
                          className="h-4 w-4 mr-1 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span className="truncate">{benefit.partner_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {benefit.description}
                  </p>

                  <div className="flex items-center justify-between">
                    {benefit.valid_until && (
                      <div className="flex items-center text-gray-500 text-sm">
                        <svg
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Valid until{" "}
                        {new Date(benefit.valid_until).toLocaleDateString()}
                      </div>
                    )}
                    {benefit.discount_code && (
                      <button
                        onClick={(e) =>
                          handleCopyCode(benefit.id, benefit.discount_code!, e)
                        }
                        className={`py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                          copiedId === benefit.id
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-amber-600 hover:bg-amber-700 text-white"
                        }`}
                      >
                        {copiedId === benefit.id ? (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            Copy Code
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {benefit.terms_conditions && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-gray-500 text-xs">
                        <span className="font-medium">Terms & Conditions:</span>{" "}
                        {benefit.terms_conditions}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardContainer>
  );
}
