'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type PublicPartner = {
  id: number;
  name: string;
  websiteUrl: string | null;
  logoUrl?: string;
};

type PublicPartnersSectionProps = {
  variant?: 'marquee' | 'grid';
  title?: string;
  description?: string;
};

function PartnerLogo({ partner, variant }: { partner: PublicPartner; variant: 'marquee' | 'grid' }) {
  const [imageSrc, setImageSrc] = useState(partner.logoUrl || '');

  useEffect(() => {
    setImageSrc(partner.logoUrl || '');
  }, [partner.logoUrl]);

  const fallback = (
    <div
      className={
        variant === 'marquee'
          ? 'flex h-24 w-64 shrink-0 items-center justify-center rounded-md border border-[#11100e]/10 bg-white p-5 text-center shadow-sm'
          : 'flex h-24 w-full items-center justify-center rounded-md border border-[#11100e]/10 bg-white p-5 text-center shadow-sm'
      }
    >
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#5e574b]">
        {partner.name}
      </span>
    </div>
  );

  const logo = (
    <div
      className={
        variant === 'marquee'
          ? 'flex h-24 w-64 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#11100e]/10 bg-white p-5 shadow-sm transition duration-300 hover:border-[#d8b861]/60'
          : 'flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-[#11100e]/10 bg-white p-5 shadow-sm transition duration-300 hover:border-[#d8b861]/60'
      }
    >
      <Image
        src={imageSrc}
        alt={partner.name}
        width={192}
        height={56}
        className="h-14 w-44 object-contain opacity-90 transition duration-300 hover:opacity-100"
        onError={() => {
          setImageSrc('');
        }}
      />
    </div>
  );

  const content = imageSrc ? logo : fallback;

  if (!partner.websiteUrl) return content;

  return (
    <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={partner.name}>
      {content}
    </a>
  );
}

export default function PublicPartnersSection({
  variant = 'marquee',
  title = 'Our Partners',
  description,
}: PublicPartnersSectionProps) {
  const [partners, setPartners] = useState<PublicPartner[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchPartners = async () => {
      try {
        const response = await fetch('/api/partners', { cache: 'no-store' });
        const payload = await response.json();

        if (isMounted && response.ok && payload.success) {
          setPartners(payload.partners || []);
        }
      } catch (error) {
        console.error('Error fetching public partners:', error);
      }
    };

    fetchPartners();

    return () => {
      isMounted = false;
    };
  }, []);

  if (partners.length === 0) return null;

  if (variant === 'grid') {
    return (
      <section className="bg-[#f7f1e8] py-20 text-[#11100e] md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h2 className="max-w-2xl font-serif text-4xl font-normal leading-tight md:text-5xl">
              {title}
            </h2>
            {description && <p className="max-w-md text-sm leading-6 text-[#5e574b]">{description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {partners.map((partner) => (
              <PartnerLogo key={partner.id} partner={partner} variant="grid" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden border-b border-[#201d17]/10 bg-white py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h2 className="mb-10 text-center font-serif text-4xl font-normal text-[#11100e] md:text-5xl">
          {title}
        </h2>
      </div>

      <div className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white via-white/90 to-transparent md:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white via-white/90 to-transparent md:w-40" />
        <div className="partner-marquee-track flex w-max items-center gap-8 md:gap-12">
          {[...partners, ...partners].map((partner, index) => (
            <PartnerLogo key={`${partner.id}-${index}`} partner={partner} variant="marquee" />
          ))}
        </div>
      </div>
    </section>
  );
}
