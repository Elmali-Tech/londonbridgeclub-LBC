"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Mail, CheckCircle2 } from "lucide-react";

type SubmitResult = { ok: true } | { ok: false; error?: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (email: string) => Promise<SubmitResult>;
};

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onSubmit,
}: Props) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset local state when modal closes/opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setEmail("");
      setError(null);
      setSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // click outside to close
  const onBackdropClick = (e: React.MouseEvent) => {
    const target = e.target as Node | null;
    if (contentRef.current && target && !contentRef.current.contains(target)) {
      onClose();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter an email address");
      return;
    }

    if (!onSubmit) {
      setError("No handler configured");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(email);
      setSuccess(true);
    } catch (err) {
      console.error("ForgotPasswordModal submit error", err);

      setSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      onMouseDown={onBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="forgot-password-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div
          ref={contentRef}
          className="bg-white rounded-lg shadow-xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                  <Mail className="w-5 h-5 text-black" />
                </div>
                <h3
                  id="forgot-password-title"
                  className="text-xl font-light text-black"
                >
                  Forgot Password
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If success, show confirmation panel */}
            {success ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-black mb-2">
                  Check Your Email
                </h4>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  If an account exists for this email address, a password reset
                  link has been sent. Please check your email.
                </p>

                <button
                  onClick={onClose}
                  className="w-full bg-black text-white px-6 py-3 text-sm font-medium tracking-wide hover:bg-gray-900 transition-colors uppercase"
                >
                  OK
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Enter your email address and we'll send you a password reset link.
                  </p>
                  <label
                    htmlFor="forgot-email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    ref={inputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900 placeholder-gray-400"
                    placeholder="example@email.com"
                    aria-invalid={!!error}
                    disabled={isSubmitting}
                  />

                  {error && (
                    <div
                      role="alert"
                      className="mt-3 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded"
                    >
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 text-sm font-medium bg-transparent border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 text-sm font-medium tracking-wide bg-black text-white rounded-sm hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          ></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
