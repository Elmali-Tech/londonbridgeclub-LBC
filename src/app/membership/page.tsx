"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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

const benefits = [
  {
    title: "Curated Introductions",
    desc: "A controlled network for member-to-member business opportunities.",
  },
  {
    title: "Private Hosting",
    desc: "A polished club setting for client meetings, team sessions and discreet conversations.",
  },
  {
    title: "Partner Privileges",
    desc: "Access to selected services and brand relationships that support business travel and hosting.",
  },
];

const journey = [
  "Choose Individual Or Corporate Access",
  "Create Your Member Account",
  "Complete Checkout Or Speak With The Club Team",
  "Move Into The Private Dashboard And Member Network",
];

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

  const isApprovedForPayment = !user || user.is_approved || user.role === "admin";

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

    if (!isApprovedForPayment) {
      alert("Your application is currently pending approval. You will receive an email when payment is available.");
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

      if (data.upgraded) {
        alert(`${data.message}! Redirecting to dashboard...`);
        router.push("/dashboard");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
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
      <section className="relative overflow-hidden bg-[#080806] text-white">
        <Navbar variant="transparent" />
        <div className="absolute inset-0">
          <Image
            src="/slider/classic-london.jpg"
            alt="London at sunset"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-42"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080806] via-[#080806]/84 to-[#080806]/18" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#080806] to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-24 md:py-32">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,780px)_minmax(300px,410px)] lg:items-end">
            <div>
              <h1 className="font-serif text-5xl font-normal leading-none md:text-7xl">
                Membership By Application.
              </h1>
              <p className="mt-7 max-w-2xl text-xl leading-8 text-[#f7f1e8] md:text-2xl">
                Individual and corporate access for people building serious business relationships between London and Istanbul.
              </p>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                Plans unlock the member dashboard, private network features and selected club privileges. Choose the membership path that matches how you work and host.
              </p>
            </div>

            <div className="rounded-md border border-white/12 bg-white/[0.04] p-6 backdrop-blur">
              <h2 className="font-serif text-3xl font-normal">Application Path</h2>
              <div className="mt-6 space-y-4">
                {journey.map((step, index) => (
                  <div key={step} className="flex gap-4 border-t border-white/12 pt-4">
                    <span className="text-sm text-[#d8b861]">0{index + 1}</span>
                    <p className="text-sm leading-6 text-white/72">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f1e8] py-14 text-[#11100e]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-serif text-4xl font-normal">Select Your Plan.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5e574b]">
                The pricing controls are intentionally quiet so the plans remain easy to compare.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {availableCategories.length > 1 && (
                <div className="inline-flex rounded-md border border-[#11100e]/12 bg-white/70 p-1">
                  {(["individual", "corporate"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`h-10 rounded px-5 text-sm font-semibold capitalize transition-colors ${
                        selectedCategory === cat
                          ? "bg-[#11100e] text-white"
                          : "text-[#5e574b] hover:text-[#11100e]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="inline-flex rounded-md border border-[#11100e]/12 bg-white/70 p-1">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`h-10 rounded px-5 text-sm font-semibold transition-colors ${
                    billingCycle === "monthly"
                      ? "bg-[#11100e] text-white"
                      : "text-[#5e574b] hover:text-[#11100e]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`h-10 rounded px-5 text-sm font-semibold transition-colors ${
                    billingCycle === "yearly"
                      ? "bg-[#11100e] text-white"
                      : "text-[#5e574b] hover:text-[#11100e]"
                  }`}
                >
                  Annual (12 months)
                </button>
              </div>
            </div>
          </div>

          {user && !isApprovedForPayment && (
            <div className="mt-8 rounded-md border border-[#d8b861]/45 bg-white/75 p-5">
              <h3 className="text-sm font-semibold text-[#11100e]">Application Pending Approval</h3>
              <p className="mt-2 text-sm leading-6 text-[#5e574b]">
                Your application has been sent for approval. Once approved, you will receive an email with a payment link.
              </p>
            </div>
          )}

          {user && isApprovedForPayment && (
            <div className="mt-8 rounded-md border border-[#d8b861]/45 bg-white/75 p-5">
              <h3 className="text-sm font-semibold text-[#11100e]">Membership Required</h3>
              <p className="mt-2 text-sm leading-6 text-[#5e574b]">
                Select a membership plan below to access the dashboard and all club features.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white pb-20 pt-12 text-[#11100e] md:pb-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            {plansLoading || authLoading ? (
              <div className="grid gap-5 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-md border border-[#11100e]/12 p-7">
                    <div className="h-5 w-1/3 animate-pulse rounded bg-[#11100e]/10" />
                    <div className="mt-6 h-10 w-1/2 animate-pulse rounded bg-[#11100e]/10" />
                    <div className="mt-8 space-y-3">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="h-4 animate-pulse rounded bg-[#11100e]/10" />
                      ))}
                    </div>
                    <div className="mt-8 h-12 animate-pulse rounded bg-[#11100e]/10" />
                  </div>
                ))}
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="rounded-md border border-[#11100e]/12 p-10 text-center text-[#5e574b]">
                No plans available.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
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
                    <article
                      key={plan.id}
                      className={`relative flex flex-col rounded-md border p-7 transition-colors ${
                        plan.highlighted
                          ? "border-[#9b7a2d] bg-[#080806] text-white"
                          : "border-[#11100e]/12 bg-white hover:border-[#9b7a2d]"
                      }`}
                    >
                      {plan.highlighted && (
                        <div className="mb-5 w-fit rounded border border-[#d8b861]/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f0d27b]">
                          Most popular
                        </div>
                      )}

                      <div className="border-b pb-6" style={{ borderColor: plan.highlighted ? "rgba(255,255,255,0.14)" : "rgba(17,16,14,0.12)" }}>
                        <h3 className="font-serif text-3xl font-normal">{plan.name}</h3>
                        {plan.description && (
                          <p className={`mt-3 text-sm leading-6 ${plan.highlighted ? "text-white/62" : "text-[#6c665d]"}`}>
                            {plan.description}
                          </p>
                        )}
                        <div className="mt-7 flex items-end gap-2">
                          <span className="font-serif text-5xl font-normal">£{price.toLocaleString()}</span>
                          <span className={`pb-2 text-sm ${plan.highlighted ? "text-white/54" : "text-[#6c665d]"}`}>
                            / {billingCycle === "yearly" ? "year" : "month"}
                          </span>
                        </div>
                        {billingCycle === "yearly" && saving > 0 && (
                          <p className={`mt-3 text-xs font-semibold ${plan.highlighted ? "text-[#f0d27b]" : "text-[#6b551f]"}`}>
                            Save £{saving.toLocaleString()} vs monthly
                          </p>
                        )}
                        {billingCycle === "yearly" && (
                          <p className={`mt-3 text-xs ${plan.highlighted ? "text-white/46" : "text-[#7b746b]"}`}>
                            Billed once per year for 12 months of access
                          </p>
                        )}
                        {billingCycle === "monthly" && (
                          <p className={`mt-3 text-xs ${plan.highlighted ? "text-white/46" : "text-[#7b746b]"}`}>
                            or £{plan.yearly_price.toLocaleString()}/year
                          </p>
                        )}
                        {entryFee > 0 && (
                          <p className={`mt-4 rounded border px-3 py-2 text-xs ${plan.highlighted ? "border-white/14 text-white/62" : "border-[#11100e]/12 text-[#6c665d]"}`}>
                            +£{entryFee.toLocaleString()} one-time entry fee
                          </p>
                        )}
                      </div>

                      <div className="flex-1 py-6">
                        <ul className="space-y-3">
                          {sortedFeatures(plan).map((fv) => {
                            const feature = fv.plan_features;
                            if (!feature) return null;
                            return (
                              <li key={fv.feature_id} className="flex items-start gap-3">
                                <span
                                  className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                                    fv.is_included
                                      ? plan.highlighted
                                        ? "bg-[#d8b861]"
                                        : "bg-[#9b7a2d]"
                                      : "bg-[#11100e]/20"
                                  }`}
                                />
                                <span
                                  className={`text-sm leading-6 ${
                                    fv.is_included
                                      ? plan.highlighted
                                        ? "text-white/76"
                                        : "text-[#3c3934]"
                                      : plan.highlighted
                                        ? "text-white/28"
                                        : "text-[#aaa29a]"
                                  }`}
                                >
                                  {feature.value_type === "text" && fv.is_included && fv.text_value
                                    ? `${feature.label}: ${fv.text_value}`
                                    : feature.label}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={isLoading || !!user && !isApprovedForPayment || !hasStripeId}
                        className={`mt-auto h-12 rounded px-6 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                          plan.highlighted
                            ? "bg-[#d8b861] text-black hover:bg-[#f0d27b]"
                            : "border border-[#11100e] text-[#11100e] hover:bg-[#11100e] hover:text-white"
                        }`}
                      >
                        {isLoading
                          ? "Processing..."
                          : !hasStripeId
                            ? "Coming soon"
                            : user && !isApprovedForPayment
                              ? "Pending approval"
                            : user
                              ? "Subscribe now"
                              : "Login to subscribe"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#080806] py-20 text-white md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-12 max-w-3xl">
            <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">What Membership Unlocks.</h2>
            <p className="mt-6 text-lg leading-8 text-white/66">
              The value is not a long list of perks. It is access to the right people, rooms and business context.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-md border border-white/12 bg-white/[0.03] p-7">
                <h3 className="font-serif text-3xl font-normal">{benefit.title}</h3>
                <p className="mt-4 text-sm leading-6 text-white/62">{benefit.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f1e8] py-20 text-[#11100e] md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 border-y border-[#11100e]/12 py-12 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-5xl">
                Not Sure Which Path Fits?
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5e574b]">
                Speak with the club team before selecting a plan, especially for corporate access and private hosting needs.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded bg-[#11100e] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#2c2923]"
            >
              Contact the club
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
