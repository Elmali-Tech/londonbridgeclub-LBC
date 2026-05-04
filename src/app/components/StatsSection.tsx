'use client';

import React, { useState, useEffect } from 'react';
import CountUp from 'react-countup';

export default function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('stats-section');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return (
    <section id="stats-section" className="py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Cities */}
          <div className="text-center">
            <div className="text-8xl text-gray-200 font-light mb-2">
              {isVisible && <CountUp start={0} end={6} duration={2} />}
            </div>
            <h4 className="text-lg font-semibold uppercase tracking-wide mb-1 text-gray-800">CITIES</h4>
          </div>
          
          {/* Individual Members */}
          <div className="text-center">
            <div className="text-8xl text-gray-200 font-light mb-2">
              {isVisible && <CountUp start={0} end={77} duration={2} />}
            </div>
            <h4 className="text-lg font-semibold uppercase tracking-wide mb-1 text-gray-800">INDIVIDUAL MEMBERS</h4>
          </div>
          
          {/* Corporate Members */}
          <div className="text-center">
            <div className="text-8xl text-gray-200 font-light mb-2">
              {isVisible && <CountUp start={0} end={19} duration={2} />}
            </div>
            <h4 className="text-lg font-semibold uppercase tracking-wide mb-1 text-gray-800">CORPORATE MEMBERS</h4>
          </div>
          
          {/* Turnover */}
          <div className="text-center">
            <div className="text-8xl text-gray-200 font-light mb-2">
              {isVisible && (
                <span>
                  <CountUp start={0} end={85} duration={2} />M$
                </span>
              )}
            </div>
            <h4 className="text-lg font-semibold uppercase tracking-wide mb-1 text-gray-800">TURNOVER</h4>
          </div>
        </div>
      </div>
    </section>
  );
} 