import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ShimmerButton from './ShimmerButton';
import Marquee from './Marquee';
import { GLSLHills } from '@/components/ui/glsl-hills';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const companies = [
  'Green Valley Dental',
  'Williams Auto',
  'MindfulCare',
  'FitLife Gym',
  'FastFix Plumbing',
  'Elite Real Estate',
  'Sunrise Salon',
  'Metro Clinic',
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* ── GLSL Hills background ──────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <GLSLHills width="100%" height="100%" cameraZ={125} planeSize={256} speed={0.5} />
        {/* Dark overlay so text stays legible */}
        <div className="absolute inset-0 bg-black/50" />
        {/* Bottom fade into page */}
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black to-transparent" />
        {/* Top fade */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      </div>

      {/* ── Hero content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5
                     bg-indigo-500/10 border border-indigo-500/20
                     text-sm text-indigo-400 font-medium mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
          Now available — start free today
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="font-display text-[clamp(2.8rem,8vw,6rem)] font-extrabold leading-[1.02] tracking-[-0.03em]"
        >
          <span className="text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)]">
            Your AI Receptionist
          </span>
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-violet-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-none">
            Available 24/7
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22, ease }}
          className="text-[clamp(1rem,2.2vw,1.25rem)] text-white/60 max-w-2xl leading-relaxed mt-6
                     drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]"
        >
          Receptrix answers every call, books appointments, qualifies leads, and handles FAQs —
          with a natural AI voice your customers will love.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.36, ease }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-10"
        >
          <ShimmerButton to="/signup" size="lg">
            Get Started Free
          </ShimmerButton>
          <Link
            to="/signin"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg
                       text-white/70 hover:text-white
                       border border-white/10 hover:border-white/25
                       bg-white/[0.04] hover:bg-white/[0.08]
                       transition-all duration-200 font-medium
                       backdrop-blur-sm cursor-pointer"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Trusted by */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.52, ease }}
          className="mt-24 w-full"
        >
          <p className="text-xs text-white/25 uppercase tracking-widest mb-6">
            Trusted by forward-thinking businesses
          </p>
          <Marquee speed={40}>
            {companies.map((name) => (
              <span
                key={name}
                className="text-white/20 text-sm font-medium whitespace-nowrap px-5"
              >
                {name}
              </span>
            ))}
          </Marquee>
        </motion.div>
      </div>
    </section>
  );
}
