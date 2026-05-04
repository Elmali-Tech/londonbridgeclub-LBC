"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import type { MembershipPlan, PlanFeatureValue, EntryFeeSettings } from "@/types/database";

const getStripe = () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

interface PlanWithFeatures extends MembershipPlan {
  plan_feature_values: (PlanFeatureValue & {
    plan_features: { id: number; key: string; label: string; value_type: string; sort_order: number };
  })[];
}

export default function MembershipPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [entrySettings, setEntrySettings] = useState<EntryFeeSettings | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [plansLoading, setPlansLoading] = useState(true);
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"individual" | "corporate">("individual");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    if (!authLoading && user?.status) {
      setSelectedCategory(user.status === "corporate" ? "corporate" : "individual");
    }
  }, [user, authLoading]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [plansRes, feeRes] = await Promise.all([
          fetch("/api/plans"),
          fetch("/api/entry-fee-settings").catch(() => null),
        ]);

        const plansData = await plansRes.json();
        setPlans(plansData);

        if (feeRes?.ok) {
          const feeData = await feeRes.json();
          setEntrySettings(feeData);
          if (typeof feeData.active_member_count === "number") {
            setMemberCount(feeData.active_member_count);
          }
        }
      } catch (err) {
        console.error("Failed to fetch plans:", err);
      } finally {
        setPlansLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubscribe = async (plan: PlanWithFeatures) => {
    if (!user) {
      router.push("/login");
      return;
    }

    const priceId =
      billingCycle === "yearly" ? plan.stripe_yearly_price_id : plan.stripe_monthly_price_id;

    if (!priceId) {
      alert("This plan is not yet available for purchase. Please contact us.");
      return;
    }

    try {
      setLoadingPlanId(plan.id);

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, billingCycle, userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to process request");
        return;
      }

      // Plan upgrade yapıldıysa → Stripe checkout'a gerek yok
      if (data.upgraded) {
        alert(`✅ ${data.message}! Redirecting to dashboard...`);
        router.push("/dashboard");
        return;
      }

      // Yeni abonelik → Stripe Checkout'a yönlendir
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Stripe yüklenemediğinde
        const stripe = await getStripe();
        console.log("Stripe instance:", stripe);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const availableCategories: Array<"individual" | "corporate"> =
    !user || authLoading
      ? ["individual", "corporate"]
      : [user.status === "corporate" ? "corporate" : "individual"];

  const filteredPlans = plans.filter((p) => p.category === selectedCategory);

  const getPrice = (plan: PlanWithFeatures) =>
    billingCycle === "yearly" ? plan.yearly_price : plan.monthly_price;

  const getMonthlySaving = (plan: PlanWithFeatures) => {
    const monthly = plan.monthly_price * 12;
    const yearly = plan.yearly_price;
    return Math.round(monthly - yearly);
  };

  const getEntryFee = (plan: PlanWithFeatures) => {
    if (!entrySettings?.is_active) return 0;
    return memberCount < entrySettings.threshold ? plan.entry_fee_early : plan.entry_fee_standard;
  };

  const sortedFeatures = (plan: PlanWithFeatures) =>
    [...plan.plan_feature_values].sort(
      (a, b) => (a.plan_features?.sort_order ?? 0) - (b.plan_features?.sort_order ?? 0)
    );

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-medium mb-4 text-gray-900">Membership Plans</h1>
            <p className="text-gray-600 text-base max-w-2xl mx-auto mb-6">
              Join London Bridge Club and connect with London&apos;s elite professionals.
            </p>

            {user && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-xl mx-auto mb-6">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-amber-600 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-amber-800">Membership Required</h3>
                    <p className="text-amber-700 text-xs mt-0.5">
                      Select a membership plan below to access the dashboard and all club features.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Category + Billing toggles */}
            <div className="flex flex-col items-center gap-4">
              {availableCategories.length > 1 && (
                <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                  {(["individual", "corporate"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-6 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                        selectedCategory === cat
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-500 hover:text-black"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                    billingCycle === "monthly"
                      ? "bg-white text-black shadow-sm"
                      : "text-gray-500 hover:text-black"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-6 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                    billingCycle === "yearly"
                      ? "bg-white text-black shadow-sm"
                      : "text-gray-500 hover:text-black"
                  }`}
                >
                  Annual
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    Save up to <strong>1 month</strong>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {plansLoading || authLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-6" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="h-4 bg-gray-200 rounded" />
                      ))}
                    </div>
                    <div className="h-12 bg-gray-200 rounded mt-6" />
                  </div>
                ))}
              </div>
            ) : filteredPlans.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No plans available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => {
                  const price = getPrice(plan);
                  const saving = getMonthlySaving(plan);
                  const entryFee = getEntryFee(plan);
                  const isLoading = loadingPlanId === plan.id;
                  const hasStripeId =
                    billingCycle === "yearly"
                      ? !!plan.stripe_yearly_price_id
                      : !!plan.stripe_monthly_price_id;

                  return (
                    <div
                      key={plan.id}
                      className={`relative bg-white rounded-xl border-2 transition-all flex flex-col ${
                        plan.highlighted
                          ? "border-black shadow-lg scale-[1.02]"
                          : "border-gray-200 hover:border-gray-400 hover:shadow-md"
                      }`}
                    >
                      {plan.highlighted && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <span className="bg-black text-white px-4 py-1 text-xs font-semibold rounded-full tracking-wide uppercase">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                        {plan.description && <p className="text-xs text-gray-500 mb-3">{plan.description}</p>}
                        <div className="flex items-end gap-1 mb-1">
                          <span className="text-3xl font-bold text-gray-900">£{price.toLocaleString()}</span>
                          <span className="text-gray-500 text-sm mb-1">
                            {" "}
                            / <strong>{billingCycle === "yearly" ? "1 year" : "1 month"}</strong>
                          </span>
                        </div>
                        {billingCycle === "yearly" && saving > 0 && (
                          <p className="text-green-600 text-xs font-medium">Save £{saving.toLocaleString()} vs monthly</p>
                        )}
                        {billingCycle === "monthly" && (
                          <p className="text-gray-400 text-xs">or £{plan.yearly_price.toLocaleString()}/year</p>
                        )}
                        {entryFee > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2 py-1 rounded">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            +£{entryFee.toLocaleString()} one-time entry fee
                          </div>
                        )}
                      </div>

                      <div className="p-6 flex-1">
                        <ul className="space-y-2.5">
                          {sortedFeatures(plan).map((fv) => {
                            const feature = fv.plan_features;
                            if (!feature) return null;
                            return (
                              <li key={fv.feature_id} className="flex items-start gap-2.5">
                                {fv.is_included ? (
                                  <svg
                                    className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 01-1.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                                <span className={`text-sm ${fv.is_included ? "text-gray-700" : "text-gray-400"}`}>
                                  {feature.value_type === "text" && fv.is_included && fv.text_value
                                    ? `${feature.label}: ${fv.text_value}`
                                    : feature.label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="p-6 pt-0">
                        <button
                          onClick={() => handleSubscribe(plan)}
                          disabled={isLoading}
                          className={`w-full py-3 px-6 text-sm font-semibold rounded-lg transition-colors ${
                            plan.highlighted
                              ? "bg-black text-white hover:bg-gray-800"
                              : "bg-white text-black border-2 border-black hover:bg-black hover:text-white"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isLoading
                            ? "Processing..."
                            : !hasStripeId
                              ? "Coming Soon"
                              : user
                                ? "Subscribe Now"
                                : "Login to Subscribe"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-medium mb-4">Membership Benefits</h2>
            <p className="text-gray-300 text-base max-w-2xl mx-auto">
              Unlock exclusive opportunities and connect with like-minded professionals
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                title: "Exclusive Networking",
                desc: "Connect with industry leaders and professionals across multiple sectors",
                icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
              },
              {
                title: "Business Growth",
                desc: "Access opportunities to expand your business globally through our network",
                icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6",
              },
              {
                title: "Premium Services",
                desc: "VIP transfers, lounge access, fast track and concierge services",
                icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
              },
            ].map((b) => (
              <div key={b.title} className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-light mb-4">{b.title}</h3>
                <p className="text-gray-300">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
