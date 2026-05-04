'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

// Counter hook for animated numbers
const useCounter = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration, isVisible]);

  const triggerAnimation = () => setIsVisible(true);

  return { count, triggerAnimation };
};

// Counter component
const Counter = ({ end, suffix = '' }: { end: number; suffix?: string }) => {
  const { count, triggerAnimation } = useCounter(end);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered) {
          triggerAnimation();
          setHasTriggered(true);
        }
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`counter-${end}-${suffix}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [triggerAnimation, hasTriggered, end, suffix]);

  return (
    <div id={`counter-${end}-${suffix}`} className="text-4xl md:text-5xl font-light text-black mb-4">
      {count}{suffix}
    </div>
  );
};

export default function AboutPage() {
  // Sayfa yüklendiğinde yukarı kaydırma
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h1 className="text-5xl md:text-6xl font-light mb-8 text-black italic leading-tight">
              About London Bridge Club
            </h1>
            <p className="text-gray-900 text-xl max-w-3xl mx-auto font-light leading-relaxed">
              Building global connections and creating opportunities through innovative networking
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <Image
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                  alt="Business People Collaborating" 
                  width={600}
                  height={500}
                  className="w-full h-96 object-cover rounded-lg"
                />
              </div>
              <div>
                <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
                  Our Story
                </h2>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  With our extensive years of experience, we embarked on a journey to realize our dream. We envisioned establishing a club that would facilitate the buying and selling of all kinds of services and products, adhering to universally accepted international norms and principles.
                </p>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  To bring this dream to life, we founded our company in London in 2023. As our first goal, we prepared a manifesto to transform this platform into a Blockchain-based structure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-light mb-6">
              Our Mission
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              Through the London Bridge Club platform, we hope that all businesses looking to expand from local to global and those seeking to reach new customers will want to become our members.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              For individuals in the corporate world with strong networks, this platform will offer an opportunity to generate passive income. With the transparent and fair Blockchain platform, both our individual and corporate members will be able to track all transactions transparently.
            </p>
          </div>
        </div>
      </section>

      {/* Future Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
                Our Future
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                For now, we will start accepting corporate and individual membership applications in September through a Web 2-based structure. In 2025, we aim to provide our members with a high-quality and transparent network and workflow through a Web 3-based platform.
              </p>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                We have designed various packages and experiences for the individuals and institutions who join our club. Soon, we plan to enrich these experiences further and aim to open London Bridge Club offices in six countries and six metropolises.
              </p>
            </div>
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1497366412874-3415097a27e7?q=80&w=2069&auto=format&fit=crop"
                alt="Future Vision"
                width={600}
                height={500}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
              Growing Together
            </h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Building connections and creating value across the globe
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <Counter end={50} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Cities</h4>
              <p className="text-gray-600 text-sm">Global Presence</p>
            </div>
            
            <div className="text-center">
              <Counter end={60} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Individual Members</h4>
              <p className="text-gray-600 text-sm">Professional Network</p>
            </div>
            
            <div className="text-center">
              <Counter end={35} />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Corporate Members</h4>
              <p className="text-gray-600 text-sm">Business Partners</p>
            </div>
            
            <div className="text-center">
              <Counter end={15} suffix="M" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Volume</h4>
              <p className="text-gray-600 text-sm">Transaction Value</p>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
              Our Locations
            </h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              Connect with us in London and Istanbul, bridging Europe and the Middle East
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* London Office */}
            <div className="text-center">
              <h3 className="text-xl font-light mb-4 underline italic text-black leading-tight">London Office</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                London, United Kingdom
              </p>
            </div>

            {/* Istanbul Office */}
            <div className="text-center">
              <h3 className="text-xl font-light mb-4 underline italic text-black leading-tight">Istanbul Office</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                London Bridge Club Istanbul<br />
                Balmumcu, Bestekar Sevki Sok.No.11<br />
                34349, Besiktas, Istanbul
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light mb-6 text-gray-900">
              Our Partners
            </h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              We've built lasting partnerships with respected companies around the globe
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 items-center max-w-6xl mx-auto">
            {[
              { src: "/logos/dogus-grubu.png", alt: "Doğuş Grubu" },
              { src: "/logos/dou_verimlilik_ve_merkezi_satn_alma_hizmetleri_ticaret_a_d_serve_logo.jpeg", alt: "DOU Verimlilik" },
              { src: "/logos/koczerisinizinyaninda_logo.jpeg", alt: "Koç Holding" },
              { src: "/logos/marga.jpeg", alt: "Marga" },
              { src: "/logos/mars-neo-bank.webp", alt: "Mars Neo Bank" },
              { src: "/logos/orion.jpeg", alt: "Orion" },
            ].map((logo) => (
              <div key={logo.alt} className="flex items-center justify-center p-4 border border-gray-100 bg-gray-50/30 rounded-xl h-24 hover:border-amber-200 hover:bg-white hover:shadow-md transition-all duration-300 group">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={140}
                  height={70}
                  className="max-w-[85%] max-h-[70%] object-contain opacity-60 group-hover:opacity-100 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-light mb-6">
              Ready to Join?
            </h2>
            
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              If you want to gain global reach and earn income through your network, London Bridge Club is the place for you.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              As the London Bridge Club team, we eagerly look forward to seeing you among us.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                href="/membership"
                className="inline-block bg-black text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-gray-800 transition-colors uppercase"
              >
                VIEW MEMBERSHIPS
              </Link>
              <Link
                href="/contact"
                className="inline-block border border-gray-300 text-gray-700 px-8 py-3 text-sm font-medium tracking-wide hover:border-gray-400 hover:bg-gray-50 transition-colors uppercase"
              >
                LEARN MORE
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
} 