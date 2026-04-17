import { ReactLenis } from 'lenis/react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/landing/Hero';
import StatsBar from '@/components/landing/StatsBar';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import DemoPreview from '@/components/landing/DemoPreview';
import Testimonials from '@/components/landing/Testimonials';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import CTABanner from '@/components/landing/CTABanner';
import StickyScroll from '@/components/ui/sticky-scroll';

export default function LandingPage() {
  return (
    <ReactLenis root>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main>
          <Hero />
          <StatsBar />
          <Features />
          <HowItWorks />
          <DemoPreview />
          <StickyScroll />
          <Testimonials />
          <Pricing />
          <FAQ />
          <CTABanner />
        </main>
        <Footer />
      </div>
    </ReactLenis>
  );
}
