import { motion } from 'framer-motion';
import { Phone, Calendar, MessageSquare, Shield, BarChart3, Plug } from 'lucide-react';
import { stagger, fadeUp } from '@/lib/animations';
import FeatureCard from './FeatureCard';

const features = [
  {
    icon: Phone,
    title: 'Never Miss a Call',
    description:
      'Receptrix picks up every call instantly, 24/7/365. No hold music, no missed leads.',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description:
      'Books, reschedules, and cancels appointments directly into your calendar.',
  },
  {
    icon: MessageSquare,
    title: 'Natural Conversations',
    description:
      'Trained on your business — answers FAQs, handles objections, and qualifies leads.',
  },
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    description:
      'End-to-end encryption, HIPAA-ready infrastructure, and role-based access controls.',
  },
  {
    icon: BarChart3,
    title: 'Call Analytics',
    description:
      'Full transcripts, sentiment analysis, and performance reports for every call.',
  },
  {
    icon: Plug,
    title: 'Seamless Integrations',
    description:
      'Connects with Calendly, HubSpot, Salesforce, and your existing phone system.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Section label + header */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-500/70 font-medium mb-4">
            Platform Features
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-indigo-500 bg-clip-text text-transparent">
              never miss a call
            </span>
          </h2>
          <p className="text-white/40 text-lg max-w-2xl mx-auto">
            Powerful features that work together to handle your calls, book appointments, and grow
            your business.
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          <FeatureCard
            icon={features[0].icon}
            title={features[0].title}
            description={features[0].description}
            className="lg:row-span-2"
          />
          <FeatureCard icon={features[1].icon} title={features[1].title} description={features[1].description} />
          <FeatureCard icon={features[2].icon} title={features[2].title} description={features[2].description} />
          <FeatureCard icon={features[3].icon} title={features[3].title} description={features[3].description} className="lg:col-span-2" />
          <FeatureCard icon={features[4].icon} title={features[4].title} description={features[4].description} />
          <FeatureCard icon={features[5].icon} title={features[5].title} description={features[5].description} />
        </motion.div>
      </div>
    </section>
  );
}
