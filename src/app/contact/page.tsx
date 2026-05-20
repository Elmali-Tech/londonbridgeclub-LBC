import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const offices = [
  {
    city: 'London',
    country: 'United Kingdom',
    image: '/locations/london.jpg',
    address: ['London Bridge Club LTD', '86-90 Paul Street', 'London, EC2A 4NE'],
    focus: 'Membership enquiries, partner introductions and London-side business hosting.',
  },
  {
    city: 'Istanbul',
    country: 'Türkiye',
    image: '/locations/ıstanbul.jpg',
    address: ['London Bridge Club Istanbul', 'Balmumcu, Bestekar Sevki Sok.No.11', '34349, Besiktas, Istanbul'],
    focus: 'Corporate hosting, regional introductions and Istanbul-side member support.',
  },
];

const contactItems = [
  {
    label: 'Email',
    value: 'info@londonbridge.club',
    href: 'mailto:info@londonbridge.club',
  },
  {
    label: 'Türkiye',
    value: '+90 505 404 4488',
    href: 'tel:+905054044488',
  },
  {
    label: 'United Kingdom',
    value: '+44 744 415 0564',
    href: 'tel:+447444150564',
  },
];

const quickLinks = [
  {
    title: 'Membership',
    text: 'Review individual and corporate access options.',
    href: '/membership',
  },
  {
    title: 'About the club',
    text: 'Understand the story, purpose and two-city model.',
    href: '/about',
  },
  {
    title: 'Member sign in',
    text: 'Access the member dashboard if you already have an account.',
    href: '/login',
  },
];

export default function Contact() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#080806] text-white">
        <Navbar variant="transparent" />
        <div className="absolute inset-0">
          <Image
            src="/slider/istanbul2.jpg"
            alt="Istanbul skyline at sunset"
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-44"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080806] via-[#080806]/84 to-[#080806]/24" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#080806] to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 py-24 md:py-32">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,760px)_minmax(300px,420px)] lg:items-end">
            <div>
              <h1 className="font-serif text-5xl font-normal leading-none md:text-7xl">Contact London Bridge Club</h1>
              <p className="mt-7 max-w-2xl text-xl leading-8 text-[#f7f1e8] md:text-2xl">
                Speak with the club team about membership, visits and partner opportunities.
              </p>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                For a private club, the contact experience should feel direct and considered. Choose the route that fits your enquiry and we will guide the next step.
              </p>
            </div>

            <div className="rounded-md border border-white/12 bg-white/[0.04] p-6 backdrop-blur">
              <h2 className="font-serif text-3xl font-normal">Direct details</h2>
              <div className="mt-6 space-y-4">
                {contactItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="block border-t border-white/12 pt-4 transition-colors hover:text-[#f0d27b]"
                  >
                    <span className="block text-xs uppercase tracking-[0.18em] text-white/42">{item.label}</span>
                    <span className="mt-1 block text-base text-white">{item.value}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 text-[#11100e] md:py-28">
        <div className="container mx-auto px-4">
          <div className="mb-12 max-w-3xl">
            <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">
              Two offices, one member experience.
            </h2>
            <p className="mt-6 text-lg leading-8 text-[#5d5a54]">
              London and Istanbul are treated as connected points in the same private business journey: enquire, visit, host and build with the right level of discretion.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {offices.map((office) => (
              <article key={office.city} className="overflow-hidden rounded-md border border-[#11100e]/12">
                <div className="relative aspect-[16/10]">
                  <Image
                    src={office.image}
                    alt={`${office.city} office`}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-7 md:p-8">
                  <div className="flex items-end justify-between gap-4 border-b border-[#11100e]/12 pb-4">
                    <h3 className="font-serif text-4xl font-normal">{office.city}</h3>
                    <p className="text-sm text-[#9b7a2d]">{office.country}</p>
                  </div>
                  <p className="mt-5 text-base leading-7 text-[#5d5a54]">{office.focus}</p>
                  <div className="mt-6 text-sm leading-6 text-[#6c665d]">
                    {office.address.map((line) => (
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
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1fr]">
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-6xl">Where should we begin?</h2>
              <p className="mt-6 text-lg leading-8 text-[#5e574b]">
                A clear route creates a better first conversation. Choose the most relevant path and keep the enquiry focused.
              </p>
            </div>

            <div className="space-y-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className="group block rounded-md border border-[#11100e]/12 bg-white/70 p-7 transition-colors hover:border-[#9b7a2d]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-3xl font-normal">{link.title}</h3>
                      <p className="mt-3 text-base leading-7 text-[#5e574b]">{link.text}</p>
                    </div>
                    <span className="mt-2 text-[#9b7a2d] transition-transform group-hover:translate-x-1" aria-hidden="true">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#080806] py-20 text-white md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 border-y border-white/12 py-12 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-serif text-4xl font-normal leading-tight md:text-5xl">
                Ready to start the conversation?
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/66">
                Email the club team or apply directly for membership. We will route the enquiry to the right city and membership path.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:info@londonbridge.club"
                className="inline-flex h-12 items-center justify-center rounded bg-[#d8b861] px-7 text-sm font-semibold text-black transition-colors hover:bg-[#f0d27b]"
              >
                Email the club
              </a>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded border border-white/25 px-7 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
              >
                Apply for membership
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
