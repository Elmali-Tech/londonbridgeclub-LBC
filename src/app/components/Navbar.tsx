'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  currentPage?: 'login' | 'register' | 'default';
  showAuth?: boolean;
}

export default function Navbar({ currentPage = 'default', showAuth = true }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const getActionButton = () => {
    if (!showAuth) return null;

    if (user) {
      return (
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard" 
            className="text-black hover:text-gray-600 transition-colors text-sm font-medium"
          >
            Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="bg-gray-200 text-black px-4 py-2 text-sm font-medium hover:bg-gray-300 transition-colors rounded"
          >
            Logout
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case 'login':
        return null;
      case 'register':
        return (
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-black hover:text-gray-600 transition-colors text-sm font-medium"
            >
              Login
            </Link>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-4">
            <Link 
              href="/register" 
              className="text-black hover:text-gray-600 transition-colors text-sm font-medium"
            >
              Register
            </Link>
            <Link 
              href="/login" 
              className="bg-orange-300 text-black px-6 py-2 text-sm font-medium hover:bg-orange-400 transition-colors rounded"
            >
              Login
            </Link>
          </div>
        );
    }
  };

  const navigationLinks = [
    { href: '/about', label: 'ABOUT' },
    { href: '/membership', label: 'MEMBERSHIP' },
    { href: '/contact', label: 'CONTACT' },
  ];

  return (
    <>
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <Link href="/" className="flex items-center">
                  <Image
                    src="/lbllogo.png" 
                    alt="LBC Logo"
                    width={80} 
                    height={40}
                    className="h-10 w-auto hover:opacity-80 transition-opacity"
                  />
                </Link>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8 text-black text-sm font-medium">
                {navigationLinks.map((link) => (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className="hover:text-gray-600 transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-300 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              
              {/* Desktop Auth Buttons */}
              <div className="hidden md:block">
                {getActionButton()}
              </div>
              
              {/* Mobile Menu Button */}
              <button
                className="mobile-menu-button md:hidden p-2 rounded-md text-black hover:bg-gray-100 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="mobile-menu md:hidden border-t border-gray-200 bg-white">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-3 py-2 text-black hover:bg-gray-100 transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {/* Mobile Phone Numbers */}
                <div className="px-3 py-2 space-y-2">
                  <div className="flex items-center space-x-2 text-black">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                    <span className="text-sm font-medium">+90 505 404 4488</span>
                  </div>
                  <div className="flex items-center space-x-2 text-black">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                    <span className="text-sm font-medium">+44 744 415 0564</span>
                  </div>
                </div>
                
                {/* Mobile Auth Buttons */}
                {showAuth && (
                  <div className="px-3 py-2 space-y-2">
                    {user ? (
                      <>
                        <Link
                          href="/dashboard"
                          className="block w-full text-center px-4 py-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="block w-full text-center px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300 transition-colors"
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        className="block w-full text-center px-4 py-2 border border-orange-300 text-black rounded hover:bg-gray-50 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Login
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 