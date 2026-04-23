import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/animations';
import PricingCard from './PricingCard';

const tiers = [
  {
    name: 'Free Trial',
    price: '3 Days',
    description: 'Try every Pro feature — no credit card required',
    features: [
      'AI calling',
      'Dashboard',
      'Analytics',
      '500 calls/month',
      '3 phone numbers',
      'Advanced booking + calendar sync',
      'CRM integrations (HubSpot, Salesforce)',
      'Custom voice & script',
      'Priority support',
    ],
    ctaLabel: 'Start Free Trial',
    ctaTo: '/signup',
  },
  {
    name: 'Pro',
    price: '$199.99',
    period: 'month',
    description: 'For growing businesses that need more',
    popular: true,
    features: [
      'AI calling',
      'Dashboard',
      'Analytics',
      '500 calls/month',
      '3 phone numbers',
      'Advanced booking + calendar sync',
      'CRM integrations (HubSpot, Salesforce)',
      'Custom voice & script',
      'Priority support',
    ],
    ctaLabel: 'Get Pro',
    ctaTo: '/signup',
  },
];


export default function Pricing() {
  return (
    <section id="pricing" className="py-28 px-6">
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
            Pricing
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Simple pricing.{' '}
            <span className="text-white/30">No surprises.</span>
          </h2>
          <p className="text-white/40 text-lg">Start free, scale when ready.</p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start"
        >
          {tiers.map((tier) => (
            <motion.div key={tier.name} variants={fadeUp}>
              <PricingCard {...tier} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
