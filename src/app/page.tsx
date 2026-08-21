'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  BrainCircuit,
  BadgeDollarSign,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  ConciergeBell,
  Crown,
  Factory,
  Fuel,
  Gem,
  Globe2,
  GraduationCap,
  Handshake,
  HeartPulse,
  Home as HomeIcon,
  Landmark,
  Megaphone,
  Music,
  Network,
  Plane,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Trophy,
  Truck,
  Utensils,
  Users,
} from 'lucide-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PublicPartnersSection from './components/PublicPartnersSection';

const heroSlides = [
  {
    image: '/slider/london-evening.jpg',
    city: 'London',
    headline: 'Connecting UK & Turkish Business Ecosystems',
    subtitle: 'Where business, investment and trusted networks meet.',
    description:
      'London Bridge Club is a private business network connecting entrepreneurs, investors, executives and suppliers between the UK and Turkiye.',
    position: 'center center',
  },
  {
    image: '/locations/ıstanbul.jpg',
    city: 'Istanbul',
    headline: 'A Private Bridge For Trade, Capital And Opportunity',
    subtitle: 'From trusted introductions to real deal flow.',
    description:
      'Members use LBC to find suppliers, open customer conversations, meet investors and move qualified opportunities across two markets.',
    position: 'center center',
  },
  {
    image: '/locations/london.jpg',
    city: 'Deal Flow',
    headline: 'Not Another Feed. A Business Generation Network.',
    subtitle: 'Membership, referral and commission infrastructure in one club model.',
    description:
      'The platform is designed around member value: qualified leads, partner offers, supplier matching, investor access and measurable business outcomes.',
    position: 'center center',
  },
];

const supplierCategories = [
  { name: 'E-Commerce & Retail', icon: ShoppingCart, text: 'Marketplaces, D2C brands, retail technology and omni-channel commerce.' },
  { name: 'Education & Human Resources', icon: GraduationCap, text: 'Corporate training, online education, executive coaching and HR services.' },
  { name: 'Energy & Fuel', icon: Fuel, text: 'Electricity supply, renewables, solar, wind, ESG, fuel and EV charging.' },
  { name: 'Finance & FinTech', icon: BadgeDollarSign, text: 'Banking, payment systems, accounting, tax, crypto, leasing and factoring.' },
  { name: 'Food, Grocery & FMCG', icon: Utensils, text: 'Grocery, food production, horeca, catering, restaurants and cafes.' },
  { name: 'Healthcare & Medical Tourism', icon: HeartPulse, text: 'Hospitals, clinics, aesthetics, dental health, wellness and psychology.' },
  { name: 'Insurance', icon: ShieldCheck, text: 'Risk, protection and business coverage partners.' },
  { name: 'Investment & Entrepreneurship', icon: CircleDollarSign, text: 'Startups, angel investment, VC, private equity and family offices.' },
  { name: 'Legal & Consulting', icon: Scale, text: 'Commercial law, company formation, visas, GDPR and intellectual property.' },
  { name: 'Logistics & Supply Chain', icon: Truck, text: 'Road, sea, air, rail, customs, warehousing and fulfillment services.' },
  { name: 'London Bridge Club Ecosystem', icon: Network, text: 'Members, marketplace, advisory board, investors circle, academy and rewards.' },
  { name: 'Luxury Lifestyle & Concierge', icon: ConciergeBell, text: 'Private jets, yacht rentals, premium vehicles and VIP organizations.' },
  { name: 'Manufacturing & Industry', icon: Factory, text: 'Automotive, textile, packaging, machinery, chemicals and defence industry.' },
  { name: 'Marketing & Advertising', icon: Megaphone, text: 'Digital marketing, SEO, CRM, loyalty programmes and influencer marketing.' },
  { name: 'Media, Entertainment & Music', icon: Music, text: 'TV, radio, podcasts, content production, PR, music platforms and ticketing.' },
  { name: 'Public, NGO & International Relations', icon: Globe2, text: 'Chambers of commerce, embassies, NGOs, foundations and institutions.' },
  { name: 'Real Estate & Construction', icon: HomeIcon, text: 'Residential, commercial property, offices, architecture and facility management.' },
  { name: 'Sports Industry', icon: Trophy, text: 'Sports clubs, federations, e-sports, fitness and sponsorship opportunities.' },
  { name: 'Technology & AI', icon: BrainCircuit, text: 'Software, SaaS, AI, data analytics, cybersecurity, cloud, mobile and IoT.' },
  { name: 'Travel & Tourism', icon: Plane, text: 'Travel agencies, corporate travel, hotels, airlines and VIP travel.' },
];

const membershipTiers = [
  {
    name: 'Bronze',
    audience: 'Entry access',
    text: 'For members entering the LBC network and building their first trusted connections.',
    inclusions: ['Member directory', 'Selected benefits', 'Community access'],
  },
  {
    name: 'Silver',
    audience: 'Growing network',
    text: 'For professionals who want stronger visibility and more frequent introductions.',
    inclusions: ['Profile visibility', 'Partner offers', 'Event access'],
  },
  {
    name: 'Gold',
    audience: 'Business development',
    text: 'For founders, consultants and executives actively seeking leads and partners.',
    inclusions: ['Lead submission', 'Business matching', 'Premium benefits'],
  },
  {
    name: 'Platinum',
    audience: 'Corporate growth',
    text: 'For companies using LBC as a UK-Turkiye business development channel.',
    inclusions: ['Corporate profile', 'Supplier access', 'Client hosting'],
  },
  {
    name: 'Emerald',
    audience: 'Investor circle',
    text: 'For investors and senior members who want early access to curated opportunities.',
    inclusions: ['Deal previews', 'Investor rooms', 'Advisory access'],
  },
  {
    name: 'Diamond',
    audience: 'Strategic access',
    text: 'For strategic partners, senior sponsors and high-trust business development.',
    inclusions: ['Priority matching', 'Board access', 'Strategic visibility'],
  },
];

const dealFlowSteps = [
  {
    title: 'Lead Generation',
    text: 'Members and partners create qualified leads tied to customers, referrers and responsible people.',
  },
  {
    title: 'Supplier Matching',
    text: 'The ecosystem connects demand with verified partners across key commercial categories.',
  },
  {
    title: 'Investor Matching',
    text: 'Investor Circle members see curated opportunities and early-stage deal flow.',
  },
  {
    title: 'Commission Tracking',
    text: 'Partner commission rates and LBC commission logic make the business model measurable.',
  },
];

const trustItems = [
  { title: 'Founder-Led Governance', text: 'Clear ownership, member approval and a private club standard.' },
  { title: 'Advisory Board Layer', text: 'A dedicated trust surface for senior advisors and sector experts.' },
  { title: 'Strategic Partners', text: 'Partner companies, benefits and supplier categories visible to members.' },
  { title: 'Verified Member Companies', text: 'Corporate profiles, industries and business needs enrich the network.' },
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
    details: ['City Access', 'Investor Meetings', 'Business Lounge'],
  },
  {
    city: 'Istanbul',
    country: 'Turkiye',
    image: '/locations/ıstanbul.jpg',
    alt: 'Istanbul waterfront at sunset',
    address: ['Balmumcu, Bestekar Sevki Sok.No.11', '34349, Besiktas, Istanbul'],
    description:
      'A Bosphorus-facing network point for founders, executives and corporate teams operating between Europe, Turkiye and the region.',
    details: ['Bosphorus Network', 'Supplier Access', 'Private Hosting'],
  },
];

type LandingMetrics = {
  members: number;
  activeMembers: number;
  partnerCompanies: number;
  customers: number;
  partners: number;
  activeOpportunities: number;
  opportunityVolume: number;
  yearlyOpportunityVolume: number;
  yearlyWonVolume: number;
  commissionPartners: number;
  currency: string;
  fxRateDate: string;
  year: number;
};

const formatNumber = (value?: number) =>
  new Intl.NumberFormat('en-GB', {
    notation: value && value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: value && value >= 10000 ? 1 : 0,
  }).format(value || 0);

const formatGBPVolume = (value?: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    notation: value && value >= 1000000 ? 'compact' : 'standard',
    maximumFractionDigits: value && value >= 1000000 ? 1 : 0,
  }).format(value || 0);

export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [metrics, setMetrics] = useState<LandingMetrics | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/landing/metrics', { cache: 'no-store' });
        const payload = await response.json();
        if (isMounted && response.ok && payload.success) {
          setMetrics(payload.metrics);
        }
      } catch (error) {
        console.error('Failed to load landing metrics:', error);
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  const metricCards = useMemo(
    () => [
      { label: 'Active Members', value: formatNumber(metrics?.activeMembers ?? metrics?.members), icon: Users },
      { label: 'Partner Companies', value: formatNumber(metrics?.partnerCompanies ?? metrics?.partners), icon: Handshake },
      { label: 'Customers', value: formatNumber(metrics?.customers), icon: Building2 },
      { label: `${metrics?.year || new Date().getFullYear()} Volume`, value: formatGBPVolume(metrics?.yearlyOpportunityVolume ?? metrics?.opportunityVolume), icon: CircleDollarSign },
      { label: 'Won Volume', value: formatGBPVolume(metrics?.yearlyWonVolume), icon: BriefcaseBusiness },
    ],
    [metrics],
  );

  return (
    <>
      <section className="relative flex h-[84svh] min-h-[620px] max-h-[820px] flex-col overflow-hidden bg-[#070706] text-white">
        <div className="relative z-30 shrink-0">
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
          <div className="absolute inset-0 bg-[#070706]/44" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070706]/92 via-[#070706]/55 to-[#070706]/10" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#070706] to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto flex flex-1 items-center px-4 py-8 lg:items-end lg:pb-12 lg:pt-8">
          <div className="grid w-full items-end gap-8 lg:grid-cols-[minmax(0,820px)_minmax(280px,360px)]">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 border-l-2 border-[#d8b861] pl-3 text-xs font-black uppercase tracking-[0.22em] text-[#f0d27b]">
                London Bridge Club
              </div>
              <h1 className="font-serif text-4xl font-normal leading-[0.95] text-white sm:text-5xl md:text-6xl 2xl:text-7xl">
                {heroSlides[activeSlide].headline}
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-light leading-relaxed text-[#f7f1e8] md:text-2xl">
                {heroSlides[activeSlide].subtitle}
              </p>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/76 md:text-lg">
                {heroSlides[activeSlide].description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-sm bg-[#d8b861] px-7 text-sm font-semibold text-black transition-colors hover:bg-[#f0d27b]"
                >
                  Apply for membership
                </Link>
                <Link
                  href="#deal-flow"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-white/30 px-7 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
                >
                  See deal flow model
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="hidden border-l border-white/18 pl-6 lg:block">
              <p className="text-sm leading-6 text-white/68">
                Membership, supplier matching, investor access and commission-led business generation across two markets.
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

      <section className="border-b border-[#201d17]/10 bg-white py-6 text-[#11100e]">
        <div className="container mx-auto grid grid-cols-2 gap-3 px-4 md:grid-cols-3 lg:grid-cols-5">
          {metricCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="border-l border-[#11100e]/12 pl-4">
              <div className="mb-2 flex items-center gap-2 text-[#8d6a17]">
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</span>
              </div>
              <div className="text-2xl font-black text-[#11100e] md:text-3xl">
                {metrics ? value : '...'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <PublicPartnersSection
        variant="marquee"
        title="Strategic Partners & Member Companies"
      />

      <section className="bg-[#f7f1e8] py-20 text-[#11100e] md:py-28" id="business-model">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1fr] lg:items-end">
            <div>
              <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#8d6a17]">
                The LBC Model
              </div>
              <h2 className="max-w-4xl font-serif text-4xl font-normal leading-tight md:text-6xl">
                A private network built to create trade, referrals and measurable opportunity.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Membership Revenue', text: 'Bronze to Diamond access paths for individuals, companies and investors.' },
                { title: 'Partner Commission', text: 'Supplier deals can carry partner-specific commission rates.' },
                { title: 'Business Matchmaking', text: 'Member needs, offers and sectors become introduction signals.' },
                { title: 'Investor Club', text: 'Curated opportunity flow for capital, advisory and strategic growth.' },
              ].map((item) => (
                <article key={item.title} className="rounded-sm border border-[#11100e]/12 bg-white p-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#11100e]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5e574b]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080806] py-20 text-white md:py-28" id="membership-tiers">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#d8b861]">
                Membership Packages
              </div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
                Six membership levels for different levels of access.
              </h2>
            </div>
            <Link
              href="/membership#plans"
              className="inline-flex h-12 w-fit items-center justify-center rounded-sm bg-[#d8b861] px-6 text-sm font-semibold text-black transition-colors hover:bg-[#f0d27b]"
            >
              View full plans
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {membershipTiers.map((tier, index) => (
              <article
                key={tier.name}
                className="rounded-sm border border-white/12 bg-white/[0.045] p-6 transition hover:border-[#d8b861]/50 hover:bg-white/[0.075]"
              >
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-3xl font-normal text-white">{tier.name}</h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#d8b861]">{tier.audience}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-white/10 text-[#d8b861]">
                    {index >= 4 ? <Gem className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
                  </div>
                </div>
                <p className="text-sm leading-6 text-white/68">{tier.text}</p>
                <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
                  {tier.inclusions.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-white/78">
                      <BadgeCheck className="h-4 w-4 text-[#d8b861]" />
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-[#11100e] md:py-28" id="ecosystem">
        <div className="container mx-auto px-4">
          <div className="mb-12 grid gap-8 lg:grid-cols-[0.85fr_1fr] lg:items-end">
            <div>
              <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#8d6a17]">
                Supplier Ecosystem
              </div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
                Commercial categories that can turn membership into revenue.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-[#5d5a54]">
              LBC is not positioned as a generic social feed. The supplier layer maps 20 product and service categories into real commercial channels, from technology and finance to tourism, manufacturing and the LBC ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {supplierCategories.map(({ name, icon: Icon, text }) => (
              <article key={name} className="rounded-sm border border-[#11100e]/12 bg-[#f8faf9] p-6">
                <Icon className="h-6 w-6 text-[#8d6a17]" />
                <h3 className="mt-5 text-lg font-black text-[#11100e]">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5d5a54]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#eef7f6] py-20 text-[#11100e] md:py-28" id="deal-flow">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1fr] lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-[#11100e]">
              <Image
                src="/slider/classic-london.jpg"
                alt="London business district with classic red bus"
                fill
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080806]/78 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d8b861]">Business Matchmaking</p>
                <h2 className="mt-2 font-serif text-3xl font-normal md:text-5xl">
                  From member signal to qualified deal.
                </h2>
              </div>
            </div>

            <div>
              <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#00706d]">
                Matchmaking Engine
              </div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
                LBC should tell members who they should meet and why.
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {dealFlowSteps.map((step, index) => (
                  <article key={step.title} className="rounded-sm border border-[#00706d]/15 bg-white p-6">
                    <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-sm bg-[#00706d] text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#11100e]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#5d5a54]">{step.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080806] py-20 text-white md:py-28" id="investors">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center">
            <div>
              <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#d8b861]">
                Investor Circle
              </div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
                A private lane for capital, advisory and early access opportunities.
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
                Investor Circle gives qualified members a clearer reason to participate: startup deal flow, UK-Turkiye investment bridges, advisory board access and curated introductions.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex h-12 items-center justify-center rounded-sm border border-[#d8b861] px-7 text-sm font-semibold text-[#f0d27b] transition-colors hover:bg-[#d8b861] hover:text-black"
              >
                Apply for investor access
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Early Access Opportunities', icon: Landmark },
                { title: 'Startup Deal Flow', icon: Factory },
                { title: 'UK-Turkiye Investment Bridge', icon: Network },
                { title: 'Advisory Board Access', icon: Handshake },
              ].map(({ title, icon: Icon }) => (
                <div key={title} className="rounded-sm border border-white/12 bg-white/[0.045] p-6">
                  <Icon className="h-6 w-6 text-[#d8b861]" />
                  <p className="mt-5 text-sm font-black uppercase tracking-[0.14em] text-white">{title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-[#11100e] md:py-28" id="trust">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#8d6a17]">
                Trust Layer
              </div>
              <h2 className="max-w-4xl font-serif text-4xl font-normal leading-tight md:text-6xl">
                People buy trust before they buy access.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-7 text-[#5d5a54]">
              The public site now makes the trust architecture explicit. Founder team, advisory board, strategic partners and testimonials can be expanded as approved assets are added.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <article key={item.title} className="rounded-sm border border-[#11100e]/12 bg-[#f7f1e8] p-6">
                <ShieldCheck className="h-6 w-6 text-[#8d6a17]" />
                <h3 className="mt-5 text-base font-black text-[#11100e]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5d5a54]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f7f1e8] py-20 text-[#11100e] md:py-28" id="locations">
        <div className="container mx-auto px-4">
          <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#8d6a17]">
                Two Cities
              </div>
              <h2 className="font-serif text-4xl font-normal md:text-6xl">One business corridor.</h2>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-12 w-fit items-center justify-center rounded-sm border border-[#11100e] px-6 text-sm font-semibold text-[#11100e] transition-colors hover:bg-[#11100e] hover:text-white"
            >
              Arrange a meeting
            </Link>
          </div>

          <div className="space-y-10">
            {locations.map((location, index) => (
              <article
                key={location.city}
                className={`grid gap-8 border-t border-[#11100e]/12 pt-10 lg:grid-cols-2 lg:gap-12 ${
                  index % 2 === 1 ? 'lg:[&>div:first-child]:order-2' : ''
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-white/5">
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
                    <div className="flex items-end justify-between gap-6 border-b border-[#11100e]/12 pb-5">
                      <h3 className="font-serif text-4xl font-normal md:text-5xl">{location.city}</h3>
                      <p className="text-sm text-[#8d6a17]">{location.country}</p>
                    </div>
                    <p className="mt-7 text-lg leading-8 text-[#5d5a54]">{location.description}</p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      {location.details.map((detail) => (
                        <div key={detail} className="border-t border-[#11100e]/14 pt-3 text-sm text-[#11100e]">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 text-sm leading-6 text-[#5d5a54]">
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

      <section className="bg-[#080806] py-20 text-white md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 border-y border-white/12 py-12 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-5xl">
                Step into the UK-Turkiye business corridor.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/66">
                Apply for individual, corporate or investor access and let the club team guide the right membership path.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-sm bg-[#d8b861] px-7 text-sm font-semibold text-black transition-colors hover:bg-[#f0d27b]"
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
