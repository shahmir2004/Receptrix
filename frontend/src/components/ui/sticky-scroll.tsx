'use client';
import { forwardRef } from 'react';
import { GradientCard } from '@/components/ui/gradient-card';

// ── Left column: Industries Receptrix serves ─────────────────────────────────
const industryCards = [
  {
    gradient: 'cyan'   as const,
    badgeText: 'Healthcare',
    badgeColor: '#22d3ee',
    title: 'Medical Clinics',
    description: 'Handle patient inquiries, triage calls, and book appointments around the clock.',
    ctaText: 'See how it works',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'slate'  as const,
    badgeText: 'Legal',
    badgeColor: '#94a3b8',
    title: 'Law Firms',
    description: 'Screen new client inquiries and route calls to the right attorney instantly.',
    ctaText: 'See how it works',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'rose'   as const,
    badgeText: 'Beauty & Wellness',
    badgeColor: '#fb7185',
    title: 'Salons & Spas',
    description: 'Fill your appointment book automatically while you focus on your clients.',
    ctaText: 'See how it works',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'green'  as const,
    badgeText: 'Trades',
    badgeColor: '#34d399',
    title: 'HVAC & Plumbing',
    description: 'Capture every service call, dispatch leads, and schedule jobs without interruption.',
    ctaText: 'See how it works',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'indigo' as const,
    badgeText: 'Real Estate',
    badgeColor: '#818cf8',
    title: 'Real Estate',
    description: 'Qualify buyer leads and schedule property showings on the spot — 24/7.',
    ctaText: 'See how it works',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=320&auto=format&fit=crop',
  },
];

// ── Middle column: Core product features (sticky) ────────────────────────────
const featureCards = [
  {
    gradient: 'indigo' as const,
    badgeText: 'Core Feature',
    badgeColor: '#6366f1',
    title: 'AI Voice Reception',
    description: 'Your AI receptionist answers every call in under a second, speaks naturally, and never puts callers on hold.',
    ctaText: 'Try a demo call',
    ctaHref: '#demo',
    imageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'purple' as const,
    badgeText: 'Scheduling',
    badgeColor: '#a78bfa',
    title: 'Smart Scheduling',
    description: 'Automatically checks your calendar and books appointments, sends confirmations, and fires reminders.',
    ctaText: 'See scheduling',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'cyan'   as const,
    badgeText: 'Intelligence',
    badgeColor: '#22d3ee',
    title: 'Auto Call Summaries',
    description: 'Every call is transcribed and summarized with intent, action items, and caller details — saved instantly.',
    ctaText: 'See an example',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=320&auto=format&fit=crop',
  },
];

// ── Right column: Business outcomes ──────────────────────────────────────────
const outcomeCards = [
  {
    gradient: 'orange' as const,
    badgeText: 'Availability',
    badgeColor: '#fb923c',
    title: '100% Answer Rate',
    description: 'Every call answered, every time — no voicemail, no missed opportunity.',
    ctaText: 'Start free trial',
    ctaHref: '#pricing',
    imageUrl: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'slate'  as const,
    badgeText: 'Always On',
    badgeColor: '#94a3b8',
    title: '24 / 7 Coverage',
    description: 'No holidays, no sick days. Receptrix works nights and weekends without extra pay.',
    ctaText: 'Start free trial',
    ctaHref: '#pricing',
    imageUrl: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'green'  as const,
    badgeText: 'Growth',
    badgeColor: '#34d399',
    title: '3× More Bookings',
    description: 'Businesses using Receptrix book three times more appointments than with voicemail alone.',
    ctaText: 'See case studies',
    ctaHref: '#testimonials',
    imageUrl: 'https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'purple' as const,
    badgeText: 'Speed',
    badgeColor: '#a78bfa',
    title: 'Sub-second Response',
    description: 'Callers hear a live voice in under 1 second. No awkward silence, no robot delays.',
    ctaText: 'See how',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1502101872923-d48509bff386?w=320&auto=format&fit=crop',
  },
  {
    gradient: 'indigo' as const,
    badgeText: 'Global',
    badgeColor: '#6366f1',
    title: '15+ Languages',
    description: 'Serve every caller in their native language. English, Spanish, French, and more.',
    ctaText: 'See all languages',
    ctaHref: '#features',
    imageUrl: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=320&auto=format&fit=crop',
  },
];

const StickyScroll = forwardRef<HTMLElement>((_props, ref) => {
  return (
    <section className='text-white w-full bg-black' ref={ref}>
      {/* Intro heading */}
      <div className='w-full bg-black grid place-content-center h-screen relative overflow-hidden'>
        <div className='absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]' />
        <h2 className='2xl:text-7xl text-4xl sm:text-5xl px-6 sm:px-8 font-semibold text-center tracking-tight leading-[120%] relative z-10'>
          Works for Every
          <br />
          Kind of Business
          <br />
          <span className='text-slate-400 text-xl sm:text-3xl font-normal mt-2 block'>Scroll to explore →</span>
        </h2>
      </div>

      {/* 3-column sticky scroll grid (stacks on mobile) */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 px-4 pb-4'>

        {/* Left — industries */}
        <div className='grid gap-4 lg:col-span-4'>
          {industryCards.map((card) => (
            <div key={card.title} className='h-96'>
              <GradientCard {...card} />
            </div>
          ))}
        </div>

        {/* Middle — features (sticky on lg+, inline grid on mobile) */}
        <div className='grid grid-rows-3 gap-4 lg:col-span-4 lg:sticky lg:top-0 lg:h-screen min-h-[72rem] lg:min-h-0'>
          {featureCards.map((card) => (
            <GradientCard key={card.title} {...card} />
          ))}
        </div>

        {/* Right — outcomes */}
        <div className='grid gap-4 lg:col-span-4'>
          {outcomeCards.map((card) => (
            <div key={card.title} className='h-96'>
              <GradientCard {...card} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
});

StickyScroll.displayName = 'StickyScroll';

export default StickyScroll;
