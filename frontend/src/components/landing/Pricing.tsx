import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/lib/animations';
import PricingCard from './PricingCard';

const tiers = [
  {
    name: 'Medical Clinic',
    price: '$299.99',
    period: 'month',
    description: 'For US clinics launching an AI receptionist with live appointment scheduling',
    popular: true,
    features: [
      '3-day free trial included',
      '1 Vapi-owned US phone number',
      'AI receptionist configured for medical clinics',
      'Live appointment booking into Receptrix',
      'Clinic services, hours, and greeting controls',
      'Dashboard test-call workflow',
      'HIPAA-ready no-recording call handling',
      '500 Vapi voice minutes included',
      'Priority onboarding support',
    ],
    ctaLabel: 'Start Clinic Setup',
    ctaTo: '/signup',
  },
  {
    name: 'General Business',
    price: '$199.99',
    period: 'month',
    description: 'For service businesses like cleaning, repair, salons, and local teams handling live calls',
    features: [
      '3-day free trial included',
      '1 Vapi-owned US phone number',
      'AI receptionist configured for your business',
      'Live appointment booking into Receptrix',
      'Services, hours, and greeting controls',
      'Dashboard test-call workflow',
      '500 Vapi voice minutes included',
      'Priority onboarding support',
    ],
    ctaLabel: 'Start Business Setup',
    ctaTo: '/signup',
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
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
            Reception-ready pricing. <span className="text-white/30">Built for live calls.</span>
          </h2>
          <p className="text-white/40 text-lg">Two monthly plans, both with a 3-day free trial.</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="mx-auto grid max-w-5xl grid-cols-1 gap-5 items-start md:grid-cols-2"
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
