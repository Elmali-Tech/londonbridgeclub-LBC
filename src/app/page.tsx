'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PublicPartnersSection from './components/PublicPartnersSection';

const heroSlides = [
  {
    image: '/slider/london-evening.jpg',
    city: 'London',
    title: 'London Bridge Club',
    subtitle: 'A Private Business Club Between London And Istanbul.',
    description:
      'Membership-led access to workspaces, introductions, partner privileges and private rooms for people building across two markets.',
    position: 'center center',
  },
  {
    image: '/locations/ıstanbul.jpg',
    city: 'Istanbul',
    title: 'London Bridge Club',
    subtitle: 'A Refined Bridge For International Business.',
    description:
      'Host discreet meetings, deepen trusted relationships and move between London and Istanbul with a single club standard.',
    position: 'center center',
  },
  {
    image: '/locations/london.jpg',
    city: 'City Access',
    title: 'London Bridge Club',
    subtitle: 'Built For Members Who Value Access, Pace And Discretion.',
    description:
      'A quieter way to work, meet and create opportunity with a curated professional circle.',
    position: 'center center',
  },
];

const locations = [
  {
    city: 'London',
    country: 'United Kingdom',
    image: '/locations/london.jpg',
    alt: 'London skyline near Tower Bridge',
    address: ['86-90 Paul Street', 'London, EC2A 4NE'],
    description:
      'A City-side base for focused work, private meetings and member introductions in one of the world’s most active business capitals.',
    details: ['City Access', 'Business Lounge', 'Member Meetings'],
  },
  {
    city: 'Istanbul',
    country: 'Türkiye',
    image: '/locations/ıstanbul.jpg',
    alt: 'Istanbul waterfront at sunset',
    address: ['Balmumcu, Bestekar Sevki Sok.No.11', '34349, Besiktas, Istanbul'],
    description:
      'A Bosphorus-facing network point for founders, executives and corporate teams operating between Europe, Türkiye and the region.',
    details: ['Bosphorus Network', 'Corporate Hosting', 'Private Access'],
  },
];

const membershipOptions = [
  {
    title: 'Individual Membership',
    text:
      'For founders, executives, consultants and investors who need a credible room, a sharper network and a business base that travels with them.',
    inclusions: ['Member Lounge Access', 'Curated Introductions', 'Partner Privileges'],
  },
  {
    title: 'Corporate Membership',
    text:
      'For teams that need flexible access, private hosting and a polished extension of their office across London and Istanbul.',
    inclusions: ['Team Access Options', 'Private Meeting Support', 'Client Hosting'],
  },
];

export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <section className="relative h-[86svh] min-h-[560px] max-h-[860px] overflow-hidden bg-[#080806] text-white">
        <div className="absolute top-0 left-0 right-0 z-30">
          <Navbar variant="transparent" />
        </div>

        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.city}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                index === activeSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={slide.image}
                alt={`${slide.city} London Bridge Club`}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: slide.position }}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-[#080806]/45" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080806]/90 via-[#080806]/42 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#080806] to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto flex h-full items-end px-4 pb-10 md:pb-14">
          <div className="grid w-full items-end gap-8 lg:grid-cols-[minmax(0,760px)_minmax(280px,360px)]">
            <div className="max-w-3xl">
              <h1 className="font-serif text-5xl font-normal leading-none text-white md:text-7xl lg:text-8xl">
                {heroSlides[activeSlide].title}
              </h1>
              <p className="mt-6 max-w-2xl text-xl font-light leading-relaxed text-[#f7f1e8] md:text-2xl">
                {heroSlides[activeSlide].subtitle}
              </p>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/76 md:text-lg">
                {heroSlides[activeSlide].description}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded bg-[#d8b861] px-7 text-sm font-semibold text-black transition-colors hover:bg-[#f0d27b]"
                >
                  Apply for membership
                </Link>
                <Link
                  href="/membership"
                  className="inline-flex h-12 items-center justify-center rounded border border-white/30 px-7 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
                >
                  View membership
                </Link>
              </div>
            </div>

            <div className="hidden border-l border-white/18 pl-6 lg:block">
              <p className="text-sm leading-6 text-white/68">
                Private work, introductions and hospitality-minded business access across two cities.
              </p>
              <div className="mt-7 space-y-3">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.city}
                    onClick={() => setActiveSlide(index)}
                    className={`flex w-full items-center justify-between border-b py-3 text-left text-sm transition-colors ${
                      index === activeSlide
                        ? 'border-[#d8b861] text-[#f0d27b]'
                        : 'border-white/12 text-white/70 hover:border-white/35 hover:text-white'
                    }`}
                  >
                    <span>{slide.city}</span>
                    <span aria-hidden="true">0{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicPartnersSection variant="marquee" />

      <section className="bg-white py-20 text-[#11100e] md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.55fr)] lg:items-end">
            <div>
              <h2 className="max-w-4xl font-serif text-4xl font-normal leading-tight md:text-6xl">
                A Private Business Address With Club-Level Access.
              </h2>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-[#5d5a54]">
                London Bridge Club combines professional workspace, curated introductions and hospitality standards for members who need more than a desk or a networking event.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-0 border-y border-[#11100e]/12 text-center lg:grid-cols-1 lg:text-left">
              {['London Base', 'Istanbul Base', 'Individual & Corporate'].map((item) => (
                <div key={item} className="border-[#11100e]/12 py-5 lg:border-b lg:last:border-b-0">
                  <p className="text-sm font-semibold text-[#11100e]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080806] py-20 text-white md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="font-serif text-4xl font-normal md:text-6xl">Two Cities, One Standard.</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                Designed for members who move between markets and expect the same level of discretion, comfort and business readiness.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-12 w-fit items-center justify-center rounded border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              Arrange a visit
            </Link>
          </div>

          <div className="space-y-10">
            {locations.map((location, index) => (
              <article
                key={location.city}
                className={`grid gap-8 border-t border-white/12 pt-10 lg:grid-cols-2 lg:gap-12 ${
                  index % 2 === 1 ? 'lg:[&>div:first-child]:order-2' : ''
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-white/5">
                  <Image
                    src={location.image}
                    alt={location.alt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-end justify-between gap-6 border-b border-white/12 pb-5">
                      <h3 className="font-serif text-4xl font-normal md:text-5xl">{location.city}</h3>
                      <p className="text-sm text-[#d8b861]">{location.country}</p>
                    </div>
                    <p className="mt-7 text-lg leading-8 text-white/72">{location.description}</p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      {location.details.map((detail) => (
                        <div key={detail} className="border-t border-white/14 pt-3 text-sm text-white/72">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 text-sm leading-6 text-white/56">
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

      <section className="bg-[#f7f1e8] py-20 text-[#11100e] md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
                Membership By Application.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#5e574b]">
                The tone is intentional: private access, useful introductions and a business environment that feels considered from the first meeting.
              </p>
              <Link
                href="/membership"
                className="mt-8 inline-flex h-12 items-center justify-center rounded bg-[#11100e] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#2c2923]"
              >
                Explore membership
              </Link>
            </div>

            <div className="space-y-4">
              {membershipOptions.map((option) => (
                <article key={option.title} className="rounded-md border border-[#11100e]/12 bg-white/70 p-7 md:p-9">
                  <h3 className="font-serif text-3xl font-normal">{option.title}</h3>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#5e574b]">{option.text}</p>
                  <div className="mt-7 grid gap-3 border-t border-[#11100e]/10 pt-6 sm:grid-cols-3">
                    {option.inclusions.map((item) => (
                      <p key={item} className="text-sm text-[#11100e]">
                        {item}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-[#11100e] md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-md">
              <Image
                src="/slider/classic-london.jpg"
                alt="London business district with classic red bus"
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
                A Sharper Home For Your Business.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#5d5a54]">
                From flexible access to private meeting support, London Bridge Club gives members a polished place to work, host and build trust without the noise of a conventional coworking floor.
              </p>
              <div className="mt-9 grid gap-4 border-y border-[#11100e]/12 py-6 sm:grid-cols-3">
                {['Private Rooms', 'Business Lounge', 'Partner Access'].map((item) => (
                  <p key={item} className="text-sm font-semibold text-[#11100e]">
                    {item}
                  </p>
                ))}
              </div>
              <Link
                href="/about"
                className="mt-8 inline-flex h-12 items-center justify-center rounded border border-[#11100e] px-7 text-sm font-semibold text-[#11100e] transition-colors hover:bg-[#11100e] hover:text-white"
              >
                Discover the club
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080806] py-20 text-white md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 border-y border-white/12 py-12 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-5xl">
                Step Into A More Private Business Circle.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/66">
                Apply for individual or corporate access and let the club team guide the right membership path.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded bg-[#d8b861] px-7 text-sm font-semibold text-black transition-colors hover:bg-[#f0d27b]"
            >
              Apply for membership
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
