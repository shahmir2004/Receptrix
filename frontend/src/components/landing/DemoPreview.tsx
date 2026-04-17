import { motion } from 'framer-motion';
import { Calendar, PhoneIncoming, CheckCircle } from 'lucide-react';
import { fadeUp } from '@/lib/animations';
import AudioWaveform from './AudioWaveform';
import ShimmerButton from './ShimmerButton';

export default function DemoPreview() {
  return (
    <section id="demo" className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-500/70 font-medium mb-4">
            Live Demo
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            See Receptrix in Action
          </h2>
          <p className="text-white/40 text-lg">
            A natural voice your customers will love
          </p>
        </motion.div>

        {/* Phone UI mockup */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="relative mx-auto max-w-md"
        >
          {/* Glow */}
          <div className="absolute -inset-8 -z-10 bg-gradient-to-b from-indigo-500/[0.07] via-indigo-500/[0.04] to-transparent rounded-[2.5rem] blur-3xl" />

          <div
            className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/[0.08]
                        shadow-[0_40px_80px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.05] bg-white/[0.02]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-sm font-medium text-white/70">
                Receptrix AI &middot; Active
              </span>
              <span className="ml-auto text-xs text-white/25 font-mono">00:12</span>
            </div>

            {/* Waveform */}
            <AudioWaveform />

            {/* Transcript */}
            <div className="px-5 pb-3">
              <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                <p className="text-sm text-white/70 leading-relaxed">
                  &ldquo;Hi! You&rsquo;ve reached Downtown Dental. I can help you book an
                  appointment, answer questions, or connect you with our team. How can I help
                  today?&rdquo;
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-white/[0.05]">
              {[
                { icon: Calendar, label: 'Book Appt' },
                { icon: PhoneIncoming, label: 'Callback' },
                { icon: CheckCircle, label: 'Resolve' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-white/[0.04] border border-white/[0.07]
                             text-xs text-white/50 hover:text-white/80
                             hover:bg-white/[0.07] hover:border-white/[0.12]
                             transition-all duration-200 cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="text-center mt-14"
        >
          <ShimmerButton to="/signup" size="lg">
            Start Free Trial
          </ShimmerButton>
        </motion.div>
      </div>
    </section>
  );
}
