'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import PublicPartnersSection from '@/app/components/PublicPartnersSection';

const principles = [
  {
    title: 'Curated Access',
    text: 'A smaller, more deliberate member environment built around useful introductions and trusted business relationships.',
  },
  {
    title: 'Two-Market Fluency',
    text: 'London and Istanbul are treated as one business corridor, with a shared standard for meetings, hosting and member support.',
  },
  {
    title: 'Transparent Growth',
    text: 'The long-term platform vision is to give members a clearer way to follow opportunities, services and commercial outcomes.',
  },
];

const locations = [
  {
    city: 'London',
    country: 'United Kingdom',
    address: ['86-90 Paul Street', 'London, EC2A 4NE'],
    image: '/locations/london.jpg',
  },
  {
    city: 'Istanbul',
    country: 'Türkiye',
    address: ['Balmumcu, Bestekar Sevki Sok.No.11', '34349, Besiktas, Istanbul'],
    image: '/locations/ıstanbul.jpg',
  },
];

const useCounter = (end: number, duration: number = 1600) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [end, duration, isVisible]);

  return { count, setIsVisible };
};

const Counter = ({ end, suffix = '' }: { end: number; suffix?: string }) => {
  const { count, setIsVisible } = useCounter(end);
  const [hasTriggered, setHasTriggered] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered) {
          setIsVisible(true);
          setHasTriggered(true);
        }
      },
      { threshold: 0.4 }
    );

    const element = counterRef.current;
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [hasTriggered, setIsVisible]);

  return (
    <div ref={counterRef} className="font-serif text-5xl font-normal leading-none text-[#11100e] md:text-6xl">
      {count}
      {suffix}
    </div>
  );
};

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <section className="relative overflow-hidden bg-[#080806] text-white">
        <Navbar variant="transparent" />
        <div className="absolute inset-0">
          <Image
            src="/slider/london-evening.jpg"
            alt="London skyline at evening"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-42"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080806] via-[#080806]/82 to-[#080806]/18" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#080806] to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl">
            <h1 className="font-serif text-5xl font-normal leading-none md:text-7xl">
              About London Bridge Club
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-[#f7f1e8] md:text-2xl">
              A private business club shaped around trusted access between London and Istanbul.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
              We are building a more considered environment for members who want to meet, host, trade and grow through a network that feels selective, useful and international.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-[#11100e] md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1fr] lg:items-center">
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
                Built As A Bridge For Serious Business Relationships.
              </h2>
              <p className="mt-7 text-lg leading-8 text-[#5d5a54]">
                London Bridge Club was founded in London in 2023 with a practical ambition: create a membership platform where individual and corporate members can discover opportunities, introduce trusted counterparties and build value across markets.
              </p>
              <p className="mt-5 text-lg leading-8 text-[#5d5a54]">
                The club begins with a Web2 membership experience and is designed to evolve into a transparent, workflow-led platform for transactions, services and member collaboration.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-md">
              <Image
                src="/slider/classic-london.jpg"
                alt="Classic London business district"
                fill
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f1e8] py-20 text-[#11100e] md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1fr]">
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">What Guides The Club.</h2>
              <p className="mt-6 text-lg leading-8 text-[#5e574b]">
                Premium private clubs do not rely on noise. The stronger signal is a clear point of view, a controlled member journey and spaces that support trust.
              </p>
            </div>
            <div className="space-y-4">
              {principles.map((principle) => (
                <article key={principle.title} className="rounded-md border border-[#11100e]/12 bg-white/70 p-7 md:p-8">
                  <h3 className="font-serif text-3xl font-normal">{principle.title}</h3>
                  <p className="mt-4 text-base leading-7 text-[#5e574b]">{principle.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-[#11100e] md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-12 max-w-3xl">
            <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">Growing With Focus.</h2>
            <p className="mt-6 text-lg leading-8 text-[#5d5a54]">
              The current footprint is intentionally concentrated: prove the value of the London-Istanbul corridor first, then expand with the same discipline.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { value: <Counter end={2} />, label: 'Countries', note: 'London and Istanbul corridor' },
              { value: <Counter end={11} />, label: 'Individual Members', note: 'Professional network' },
              { value: <Counter end={22} />, label: 'Corporate Members', note: 'Business partners' },
              { value: <Counter end={30} suffix="M$" />, label: 'Annual Volume', note: 'Transaction value' },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-[#11100e]/12 p-6">
                {item.value}
                <h3 className="mt-5 text-base font-semibold">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6c665d]">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#080806] py-20 text-white md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="font-serif text-4xl font-normal md:text-6xl">Our Bases.</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                Each location supports the same purpose: a polished address for trusted meetings, hosting and business development.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-12 w-fit items-center justify-center rounded border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              Contact the club
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {locations.map((location) => (
              <article key={location.city} className="overflow-hidden rounded-md border border-white/12 bg-white/[0.03]">
                <div className="relative aspect-[16/9]">
                  <Image
                    src={location.image}
                    alt={`${location.city} location`}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-7">
                  <div className="flex items-end justify-between gap-4 border-b border-white/12 pb-4">
                    <h3 className="font-serif text-4xl font-normal">{location.city}</h3>
                    <p className="text-sm text-[#d8b861]">{location.country}</p>
                  </div>
                  <div className="mt-5 text-sm leading-6 text-white/62">
                    {location.address.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicPartnersSection
        variant="marquee"
        title="Our Partners"
      />

      <section className="bg-[#080806] py-20 text-white md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 border-y border-white/12 py-12 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-5xl">Ready To Join The Circle?</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/66">
                Explore membership or speak with the club team about the right individual or corporate path.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/membership"
                className="inline-flex h-12 items-center justify-center rounded bg-[#d8b861] px-7 text-sm font-semibold text-black transition-colors hover:bg-[#f0d27b]"
              >
                View membership
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded border border-white/25 px-7 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
