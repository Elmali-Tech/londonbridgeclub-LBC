'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { HiShieldCheck, HiEye, HiCog, HiArrowLeft } from 'react-icons/hi';

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <HiArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
            <p className="text-gray-600">Learn about how we use cookies on London Bridge Club</p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* Introduction */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">What are Cookies?</h2>
              <p className="text-gray-700 leading-relaxed">
                Cookies are small text files that are stored on your device when you visit our website. 
                They help us provide you with a better experience by remembering your preferences and 
                understanding how you use our site.
              </p>
            </div>

            {/* Cookie Types */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Types of Cookies We Use</h2>
              
              <div className="space-y-6">
                {/* Essential Cookies */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-100 rounded-full flex-shrink-0">
                      <HiShieldCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Essential Cookies</h3>
                      <p className="text-gray-700 mb-3">
                        These cookies are necessary for the website to function properly. They enable basic 
                        functions like page navigation, access to secure areas, and authentication.
                      </p>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">What we use them for:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• User authentication and login sessions</li>
                          <li>• Security features and fraud prevention</li>
                          <li>• Remembering your login status</li>
                          <li>• Basic site functionality</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-full flex-shrink-0">
                      <HiEye className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Cookies</h3>
                      <p className="text-gray-700 mb-3">
                        These cookies help us understand how visitors interact with our website by collecting 
                        and reporting information anonymously.
                      </p>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">What we use them for:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Understanding user behavior and preferences</li>
                          <li>• Improving website performance and user experience</li>
                          <li>• Analyzing which features are most popular</li>
                          <li>• Measuring the effectiveness of our content</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preference Cookies */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-full flex-shrink-0">
                      <HiCog className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Preference Cookies</h3>
                      <p className="text-gray-700 mb-3">
                        These cookies remember your choices and preferences to provide you with a 
                        personalized experience on our website.
                      </p>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">What we use them for:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Remembering your language preferences</li>
                          <li>• Storing your display settings</li>
                          <li>• Personalizing content recommendations</li>
                          <li>• Remembering your cookie preferences</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Managing Cookies */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Managing Your Cookie Preferences</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="font-semibold text-amber-800 mb-3">Browser Settings</h3>
                <p className="text-amber-700 mb-4">
                  You can control and delete cookies through your browser settings. Most browsers allow you to:
                </p>
                <ul className="text-amber-700 space-y-2">
                  <li>• View which cookies are stored on your device</li>
                  <li>• Delete cookies individually or all at once</li>
                  <li>• Block cookies from specific websites</li>
                  <li>• Set your browser to ask for permission before storing cookies</li>
                </ul>
                <p className="text-amber-700 mt-4 text-sm">
                  <strong>Note:</strong> Disabling essential cookies may affect the functionality of our website.
                </p>
              </div>
            </div>

            {/* Third Party */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may use third-party services that set their own cookies. These include:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="text-gray-600 space-y-2">
                  <li>• <strong>Google Analytics:</strong> For website analytics and performance monitoring</li>
                  <li>• <strong>Authentication Services:</strong> For secure user login and session management</li>
                  <li>• <strong>Content Delivery Networks:</strong> For faster website loading</li>
                </ul>
              </div>
            </div>

            {/* Updates */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Updates to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices 
                or for other operational, legal, or regulatory reasons. We will notify you of any 
                significant changes by posting the updated policy on our website.
              </p>
            </div>

            {/* Contact */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about our use of cookies, please contact us at{' '}
                <a href="mailto:privacy@londonbridgeclub.com" className="text-blue-600 hover:text-blue-700 underline">
                  privacy@londonbridgeclub.com
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
