import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/animations';
import ShimmerButton from './ShimmerButton';

export default function CTABanner() {
  return (
    <section className="relative py-32 overflow-hidden bg-[#080808]">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_60%,rgba(99,102,241,0.09),transparent)]" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top border line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      <motion.div
        variants={fadeUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
        className="relative mx-auto max-w-2xl px-6 text-center"
      >
        <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-5">
          Ready to never miss a call again?
        </h2>
        <p className="text-white/40 text-lg mb-10">
          Start your free trial — no card required
        </p>
        <ShimmerButton to="/signup" size="lg">
          Get Started Free
        </ShimmerButton>
        <p className="text-white/20 text-xs mt-6 tracking-wide">
          30-day free trial &middot; Cancel anytime &middot; No setup fees
        </p>
      </motion.div>
    </section>
  );
}
