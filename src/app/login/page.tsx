"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";
import CookieConsentModal from "@/app/components/CookieConsentModal";
import { fetchSubscriptionStatus } from "@/lib/subscriptionUtils";
import ForgotPasswordModal from "../components/ForgotPasswordModal";

export default function Login() {
  const router = useRouter();
  const { login, isLoading, error, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleForgotOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsForgotOpen(true);
  };

  const handleForgotSubmit = async (email: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Forgot password failed", data);
        return { ok: false, error: data.error || "Unknown" };
      }

      return { ok: true };
    } catch (err) {
      console.error(err);
      return { ok: false, error: "Network error" };
    }
  };

  // Show cookie modal on first visit
  useEffect(() => {
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      setShowCookieModal(true);
    }
  }, []);

  // Check subscription status after successful login
  useEffect(() => {
    const checkSubscriptionAndRedirect = async () => {
      if (loginSuccess && user?.id) {
        if (!user.is_approved && user.role !== 'admin') {
          setFormError("Your account is currently pending approval. You will receive an email once it's approved.");
          setLoginSuccess(false);
          return;
        }
        
        try {
          const subscriptionStatus = await fetchSubscriptionStatus(user.id);

          if (subscriptionStatus === "active") {
            router.push("/dashboard"); // User has subscription, go to dashboard
          } else {
            router.push("/membership"); // User needs to select a subscription plan
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
          router.push("/membership"); // Fallback to membership page
        }
        setLoginSuccess(false); // Reset flag
      }
    };

    checkSubscriptionAndRedirect();
  }, [loginSuccess, user, router]);

  // Cookie consent handlers
  const handleAcceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowCookieModal(false);
  };

  const handleDeclineCookies = () => {
    localStorage.setItem("cookieConsent", "declined");
    setShowCookieModal(false);
  };

  const handleCloseCookieModal = () => {
    setShowCookieModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError("Please fill in all fields");
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        setLoginSuccess(true); // Trigger subscription check in useEffect
      }
    } catch (err) {
      // Use a more generic error message or display the specific error from useAuth if available
      setFormError("An error occurred during login");
      console.error(err);
    }
  };

  return (
    <>
      <Navbar currentPage="login" />

      {/* Cookie Consent Modal */}
      <CookieConsentModal
        isOpen={showCookieModal}
        onAccept={handleAcceptCookies}
        onDecline={handleDeclineCookies}
        onClose={handleCloseCookieModal}
      />

      {/* Main Content */}
      <div className="min-h-screen bg-white flex items-center justify-center py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-light mb-6 italic leading-tight text-black">
                Member Login
              </h1>
              <p className="text-gray-600 text-lg font-light">
                Access your exclusive membership account
              </p>
            </div>

            {(formError || error) && (
              <div className="p-4 mb-6 bg-red-50 text-red-600 rounded text-sm border border-red-200">
                {formError || error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Remember me
                  </label>
                </div>
                {/* Forgot Password button */}
                <div className="text-sm">
                  <button
                    onClick={handleForgotOpen}
                    className="font-medium text-black hover:text-gray-600 transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white text-black border border-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition-colors uppercase"
                >
                  {isLoading ? "Processing..." : "Login"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link href="/register" className="font-medium text-black hover:underline">
                    Apply for Membership
                  </Link>
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* Features Section - White background */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6">
              Why London Bridge Club?
            </h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              Join an exclusive network of professionals and unlock
              unprecedented opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-light mb-4">Instant Access</h3>
              <p className="text-gray-300">
                Get immediate access to our exclusive network upon login
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-light mb-4">Secure & Private</h3>
              <p className="text-gray-300">
                Your data is protected with the highest security standards
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-light mb-4">Elite Network</h3>
              <p className="text-gray-300">
                Connect with verified professionals across industries
              </p>
            </div>
          </div>
        </div>
        <ForgotPasswordModal
          isOpen={isForgotOpen}
          onClose={() => setIsForgotOpen(false)}
          onSubmit={handleForgotSubmit}
        />
      </section>
    </>
  );
}
