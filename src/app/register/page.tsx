'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import CookieConsentModal from '@/app/components/CookieConsentModal';

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isLoading, error } = useAuth();
  
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  // Check token from URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      verifyToken(tokenFromUrl);
    } else {
      setTokenError('Geçerli bir kayıt linki bulunamadı. Lütfen admin tarafından gönderilen linki kullanın.');
      setTokenValid(false);
      setIsCheckingToken(false);
    }
  }, [searchParams]);

  const verifyToken = async (tokenValue: string) => {
    try {
      setIsCheckingToken(true);
      const response = await fetch('/api/register/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenValue }),
      });

      const result = await response.json();

      if (response.ok && result.valid) {
        setTokenValid(true);
        setTokenEmail(result.email);
        setEmail(result.email);
        setTokenError(null);
      } else {
        setTokenValid(false);
        setTokenError(result.error || 'Geçersiz veya kullanılmış token');
      }
    } catch (err) {
      setTokenValid(false);
      setTokenError('Token doğrulanırken hata oluştu');
    } finally {
      setIsCheckingToken(false);
    }
  };

  // Show cookie modal on first visit
  useEffect(() => {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setShowCookieModal(true);
    }
  }, []);

  // Cookie consent handlers
  const handleAcceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowCookieModal(false);
  };

  const handleDeclineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowCookieModal(false);
  };

  const handleCloseCookieModal = () => {
    setShowCookieModal(false);
  };
  
  // Basic Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [showCookieModal, setShowCookieModal] = useState(false);
  
  // Professional Info
  const [profession, setProfession] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  
  // Additional Info
  const [interests, setInterests] = useState('');
  const [networkConnections, setNetworkConnections] = useState('');
  const [isLBCMember, setIsLBCMember] = useState(false);
  const [associationMembership, setAssociationMembership] = useState('');
  
  // Corporate Specific
  const [employeeCount, setEmployeeCount] = useState('');
  
  const [terms, setTerms] = useState(false);
  const [status, setStatus] = useState<'personal' | 'corporate'>('personal');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!firstName || !lastName || !email || !phone || !address || !birthDate || 
        !profession || !position || !companyName || !employeeCount || !password || !confirmPassword) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (!terms) {
      setFormError('Please accept the terms and conditions');
      return;
    }

    // Token kontrolü - OPSIYONEL
    if (token && !tokenValid) {
      setFormError('Geçersiz kayıt token\'ı. Lütfen size gönderilen linki kontrol edin veya doğrudan başvuru yapın.');
      // Token geçersizse bile devam etmesine izin verebiliriz veya engelleyebiliriz.
      // Şimdilik hata verip duralım ama token yoksa (token=null) geçişe izin verelim.
      return;
    }

    // Email kontrolü - token'daki email ile form'daki email eşleşmeli
    if (email !== tokenEmail) {
      setFormError('Bu kayıt linki başka bir email adresi için oluşturulmuş');
      return;
    }

    try {
      const fullName = `${firstName} ${lastName}`;
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          status,
          token,
          // Profile fields
          linkedinUrl: linkedinUrl || undefined,
          phone,
          address,
          birthDate,
          profession,
          companyName,
          position,
          employeeCount,
          website: website || undefined,
          interests: interests || undefined,
          networkConnections: networkConnections || undefined,
          associationMembership: associationMembership || undefined,
          isLBCMember,
        }),
      });
      const result = await response.json();
      
      if (result.user) {
        if (result.token) {
          // Otomatik login — token'ı kaydet
          localStorage.setItem("authToken", result.token);
          document.cookie = `authToken=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
          router.push("/membership");
        }
        setIsSubmitted(true);
        window.scrollTo(0, 0);
      } else {
        setFormError(result.error || "Registration failed");
      }
    } catch (err) {
      setFormError("An error occurred during registration");
      console.error(err);
    }
  };

  return (
    <>
      <Navbar currentPage="register" />

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
                Join Our Network
              </h1>
              <p className="text-gray-600 text-lg font-light">
                Create your exclusive membership account
              </p>
            </div>


            {(formError || error) && !isSubmitted && (
              <div className="p-4 mb-6 bg-red-50 text-red-600 rounded text-sm border border-red-200">
                {formError || error}
              </div>
            )}

            {isSubmitted && (
              <div className="text-center py-12 px-6 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-medium text-gray-900 mb-4">Application Sent</h2>
                <p className="text-gray-600 mb-8">
                  Thank you for your interest in joining the London Bridge Club. 
                  Your membership application has been <strong>sent for approval</strong>.
                </p>
                <div className="p-4 bg-white rounded border border-gray-200 text-sm text-gray-500 mb-8">
                  Status: <span className="text-amber-600 font-semibold uppercase">Pending Approval</span>
                </div>
                <p className="text-sm text-gray-500 mb-8">
                  Once your application is reviewed by our team, you will receive an email with instructions on how to complete your membership.
                </p>
                <Link
                  href="/"
                  className="inline-block bg-black text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
                >
                  Return to Home
                </Link>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit} style={{ display: (tokenValid && !isSubmitted) ? 'block' : 'none' }}>
              {/* Account Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membership Type
                  </label>
                <div className="grid grid-cols-2 gap-4">
                    <div
                    className={`cursor-pointer flex flex-col items-center justify-center p-4 border ${
                        status === 'personal'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } rounded-sm transition-all`}
                      onClick={() => setStatus('personal')}
                    >
                    <svg className="w-6 h-6 mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    <span className="text-sm font-medium text-gray-900">Individual Member</span>
                    </div>
                    <div
                    className={`cursor-pointer flex flex-col items-center justify-center p-4 border ${
                        status === 'corporate'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } rounded-sm transition-all`}
                      onClick={() => setStatus('corporate')}
                    >
                    <svg className="w-6 h-6 mb-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    <span className="text-sm font-medium text-gray-900">Corporate Member</span>
                    </div>
                  </div>
                </div>

              {/* Basic Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="Your first name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="Your last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!!tokenEmail}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="email@example.com"
                    />
                    {tokenEmail && (
                      <p className="mt-1 text-xs text-gray-500">
                        Bu email token ile eşleşiyor
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="+90 500 000 00 00"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                    placeholder="Enter your full address"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                  />
                </div>
              </div>

              {/* Professional Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-2">
                      Profession *
                    </label>
                    <input
                      id="profession"
                      name="profession"
                      type="text"
                      required
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="Your profession"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                      Position *
                    </label>
                    <input
                      id="position"
                      name="position"
                      type="text"
                      required
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="Your position"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="Your company name"
                    />
                  </div>

                  <div>
                    <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700 mb-2">
                      Employee Count *
                    </label>
                    <select
                      id="employeeCount"
                      name="employeeCount"
                      required
                      value={employeeCount}
                      onChange={(e) => setEmployeeCount(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                    >
                      <option value="">Select</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-500">201-500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      id="website"
                      name="website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      LinkedIn Profile
                    </label>
                    <input
                      id="linkedinUrl"
                      name="linkedinUrl"
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-2">
                    Interests
                  </label>
                  <textarea
                    id="interests"
                    name="interests"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                    placeholder="List your interests separated by commas"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="networkConnections" className="block text-sm font-medium text-gray-700 mb-2">
                    Network Connections (Company Selection)
                  </label>
                  <textarea
                    id="networkConnections"
                    name="networkConnections"
                    value={networkConnections}
                    onChange={(e) => setNetworkConnections(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                    placeholder="List companies you have connections with"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="associationMembership" className="block text-sm font-medium text-gray-700 mb-2">
                    Association Membership
                  </label>
                  <input
                    id="associationMembership"
                    name="associationMembership"
                    type="text"
                    value={associationMembership}
                    onChange={(e) => setAssociationMembership(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                    placeholder="Associations you are member of"
                  />
                </div>

                <div className="mt-4 flex items-center">
                  <input
                    id="isLBCMember"
                    name="isLBCMember"
                    type="checkbox"
                    checked={isLBCMember}
                    onChange={(e) => setIsLBCMember(e.target.checked)}
                    className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <label htmlFor="isLBCMember" className="ml-2 block text-sm text-gray-700">
                    LBC Member
                  </label>
                </div>
              </div>

              {/* Password Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="Create a secure password"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-gray-900"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded mt-0.5"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                  I agree to the <span className="text-black hover:text-gray-600 transition-colors cursor-pointer font-medium">Terms and Conditions</span>
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white text-black border border-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition-colors uppercase"
                >
                  {isLoading ? 'Processing...' : 'Create Membership'}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already a member?{' '}
                  <Link href="/login" className="font-medium text-black hover:text-gray-600 transition-colors">
                    Sign in to your account
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Benefits Section - Gray background */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
              Join the Elite Network
            </h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Become part of London's most exclusive professional community
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900">Fast Registration</h3>
              </div>
              <p className="text-gray-600 mb-6">Quick and secure signup process to get you connected immediately</p>
              
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900">Revenue Opportunities</h3>
              </div>
              <p className="text-gray-600">Leverage your network to create sustainable income streams</p>
            </div>

            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900">Global Connections</h3>
              </div>
              <p className="text-gray-600 mb-6">Access an international network of verified professionals</p>
              
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900">Business Growth</h3>
              </div>
              <p className="text-gray-600">Scale your business through strategic partnerships</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action - Black background */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-light mb-6">
              Ready to Transform Your Network?
            </h2>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Join thousands of professionals who are already leveraging their connections for global success.
            </p>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Your exclusive membership awaits. Start building your future today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/about"
                className="inline-block bg-white text-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-100 transition-colors uppercase"
              >
                Learn More
              </Link>
              <Link
                href="/membership"
                className="inline-block bg-transparent text-white border border-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-white hover:text-black transition-colors uppercase"
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}