import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/animations';
import TestimonialCard from './TestimonialCard';

const testimonials = [
  {
    quote:
      'We went from missing 30% of calls to missing zero. Receptrix paid for itself in the first week.',
    name: 'Sarah Chen',
    role: 'Office Manager',
    company: 'Green Valley Dental',
  },
  {
    quote:
      "Our customers can't even tell it's AI. The natural voice is absolutely impressive.",
    name: 'Marcus Williams',
    role: 'Owner',
    company: 'Williams Auto Repair',
  },
  {
    quote:
      "Setup was 8 minutes. Our call volume doubled and we didn't hire anyone new.",
    name: 'Priya Sharma',
    role: 'Practice Manager',
    company: 'MindfulCare Therapy',
  },
  {
    quote:
      'The appointment booking integration alone saves us 3 hours per day.',
    name: "James O'Brien",
    role: 'Director',
    company: 'FitLife Gym Chain',
  },
  {
    quote:
      "We're a 24/7 emergency plumbing service. Receptrix handles everything overnight.",
    name: 'Kira Novak',
    role: 'COO',
    company: 'FastFix Plumbing',
  },
  {
    quote:
      "The analytics dashboard showed we were losing leads after hours. Now that's solved.",
    name: 'David Torres',
    role: 'Founder',
    company: 'Elite Real Estate',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-28 px-6 bg-[#080808]">
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
            Customer Stories
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Loved by businesses{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-indigo-500 bg-clip-text text-transparent">
              everywhere
            </span>
          </h2>
          <p className="text-white/40 text-lg">
            See what our customers have to say
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={fadeUp}>
              <TestimonialCard {...t} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
