import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/animations';

const steps = [
  {
    step: '01',
    title: 'Connect Your Line',
    description:
      'Forward your business number or get a new one. Works with any carrier.',
  },
  {
    step: '02',
    title: 'Configure Your Script',
    description:
      'Tell Receptrix about your business in plain English. Customize responses in minutes.',
  },
  {
    step: '03',
    title: 'Go Live & Grow',
    description:
      'Activate and let Receptrix handle every call. Review analytics and optimize.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-6 bg-[#080808]">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="text-center mb-20"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-500/70 font-medium mb-4">
            Quick Setup
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
            How Receptrix Works
          </h2>
          <p className="text-white/40 text-lg">Setup takes under 10 minutes</p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.06]"
        >
          {steps.map((s) => (
            <motion.div
              key={s.step}
              variants={fadeUp}
              className="relative flex flex-col p-10 bg-[#080808] group hover:bg-[#0d0d0d] transition-colors duration-300"
            >
              {/* Step number */}
              <span className="text-[4rem] font-extrabold font-display text-white/[0.04] leading-none mb-6 select-none">
                {s.step}
              </span>

              <h3 className="font-semibold text-white text-lg mb-3 tracking-tight">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.description}</p>

              {/* Bottom orange line on hover */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
