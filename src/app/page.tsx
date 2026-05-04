'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CountUp from 'react-countup';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: '/slider/london-evening.jpg',
      title: 'Watch London Work While the City Lights Shine',
      subtitle: 'Scenic views, smart offices, effortless productivity'
    },
    {
      image: '/slider/classic-london.jpg',
      title: 'Work Meets Heritage',
      subtitle: 'Timeless energy in the heart of the capital',
    },
    {
      image: '/locations/ıstanbul.jpg',
      title: 'Bridge Two Continents of Business',
      subtitle: 'Where Europe meets Asia in perfect harmony'
    },
    {
      image: '/slider/istanbul2.jpg',
      title: 'Experience Istanbul Innovation',
      subtitle: 'Modern workspace with historical inspiration'
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const statsSection = document.getElementById('stats-section');
      if (statsSection) {
        const rect = statsSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom >= 0;
        if (isInView) {
          setIsVisible(true);
          window.removeEventListener('scroll', handleScroll);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000); // 8 saniyede bir geçiş

    return () => clearInterval(timer);
  }, [slides.length]);



  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };



  return (
    <>
      {/* Hero Section - Slider */}
      <section className="relative h-screen overflow-hidden">
        {/* Slider Container */}
        <div className="relative w-full h-full">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={slide.image}
                  alt={`LBC Slide ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Navigation Bar - Fixed Overlay */}
        <div className="absolute top-0 left-0 right-0 z-30">
          <Navbar />
        </div>

        {/* Slider Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-50 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slider Dots */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-white scale-110 shadow-lg'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
        
        {/* Hero Content */}
        <div className="absolute inset-0 z-40 flex items-end pb-16 pointer-events-none">
          <div className="container mx-auto px-4 pointer-events-auto">
            <div className="max-w-4xl">
              <h1 className="text-white text-xl md:text-2xl font-light mb-6 italic leading-tight transition-all duration-1000 drop-shadow-lg">
                {slides[currentSlide].title}
              </h1>
              <p className="text-white text-lg mb-8 font-light transition-all duration-1000 drop-shadow-lg">
                {slides[currentSlide].subtitle}
              </p>
              <Link
                href="/login"
                className="inline-block bg-white text-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-100 transition-colors uppercase shadow-lg"
              >
                LOGIN
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-medium mb-4 text-gray-900">
              Our Locations
            </h2>
            <p className="text-gray-600 text-base max-w-2xl mx-auto">
              Professional spaces designed for modern business needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* London */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
              <div className="relative">
                <Image
                  src="/locations/london.jpg"
                  alt="London Location"
                  width={600}
                  height={280}
                  className="w-full h-[250px] object-cover rounded-lg"
                  priority
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-black text-white px-3 py-1 text-xs font-medium rounded-full">
                    HEADQUARTER
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">London</h3>
                  <span className="text-sm text-gray-500 font-medium">United Kingdom</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>City Center • Business Lounge</span>
                </div>
                <div className="flex items-start text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p>86-90 Paul Street</p>
                    <p>London-United Kingdom</p>
                    <p>EC2A 4NE</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Istanbul */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
              <div className="relative">
                <Image
                  src="/locations/ıstanbul.jpg"
                  alt="Istanbul Location"
                  width={600}
                  height={280}
                  priority 
                  className="w-full h-[250px] object-cover rounded-md"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-amber-600 text-white px-3 py-1 text-xs font-medium rounded-full">
                    BRANCH
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Istanbul</h3>
                  <span className="text-sm text-gray-500 font-medium">Türkiye</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Bosphorus View • Modern Workspace</span>
                </div>
                <div className="flex items-start text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p>London Bridge Club Istanbul</p>
                    <p>Balmumcu, Bestekar Sevki Sok.No.11</p>
                    <p>34349, Besiktas, Istanbul</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Section */}
      <section className="py-20 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-light mb-6 text-white">
                Indivudual & Corporate Membership
              </h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                Whether you're a freelancer, start-up, or part of a corporate team that wants to access any of our locations regularly, we have flexible membership options to suit your working style and budget. Starting from £100 per month.
              </p>
              <Link
                href="/membership"
                className="inline-block bg-white text-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-100 transition-colors uppercase"
              >
                VIEW MEMBERSHIPS
              </Link>
            </div>
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=2069&auto=format&fit=crop"
                alt="Club Interior"
                width={600}
                height={500}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Business Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1497366412874-3415097a27e7?q=80&w=2069&auto=format&fit=crop"
                alt="Business Space"
                width={600}
                height={500}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
                A home for your business
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                From 3 months and licenses to 20 desk suites, we have a range of services all year long that include and caters for a comprehensive range of options to grow your business and that's more than just the best facilities.
              </p>
              <Link
                href="/about"
                className="inline-block bg-black text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
              >
                BUSINESS SUITES
              </Link>
            </div>
          </div>
        </div>
      </section>



      <Footer />
    </>
  );
}
