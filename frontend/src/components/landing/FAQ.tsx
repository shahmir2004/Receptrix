import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/animations';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    q: 'How does Receptrix handle complex customer questions?',
    a: 'Receptrix is trained on your business information, FAQs, and service details. For questions it cannot answer, it gracefully escalates to your team via callback scheduling or live transfer, ensuring no customer is left hanging.',
  },
  {
    q: 'Can I use my existing phone number?',
    a: 'Absolutely. Simply set up call forwarding from your existing business number to your Receptrix line. Works with any carrier — no number porting required.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most businesses are up and running in under 10 minutes. Just describe your business in plain English, configure your greeting and common responses, and activate. No coding required.',
  },
  {
    q: 'Does the AI sound robotic?',
    a: 'Not at all. Receptrix uses state-of-the-art voice synthesis that sounds natural and conversational. Most callers cannot tell they are speaking with an AI assistant.',
  },
  {
    q: "What happens if the AI can't answer a question?",
    a: 'Receptrix gracefully handles edge cases by offering to schedule a callback, take a message, or transfer the call to a live team member. You control the fallback behavior.',
  },
  {
    q: 'Can I train it on my specific business?',
    a: 'Yes. You provide your business details, service menu, pricing, FAQs, and any custom instructions in plain language. Receptrix adapts its responses to match your brand voice.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! The Starter plan is completely free with 50 calls per month. The Pro plan also includes a 30-day free trial so you can test all premium features risk-free.',
  },
  {
    q: 'What integrations are supported?',
    a: 'Receptrix integrates with popular tools including Google Calendar, Calendly, HubSpot, Salesforce, and more. We also offer API access on the Business plan for custom integrations.',
  },
];

export default function FAQ() {
  const half = Math.ceil(faqs.length / 2);
  const leftColumn = faqs.slice(0, half);
  const rightColumn = faqs.slice(half);

  return (
    <section id="faq" className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-500/70 font-medium mb-4">
            FAQ
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-white/40 text-lg">
            Everything you need to know about Receptrix
          </p>
        </motion.div>

        {/* 2-column FAQ grid */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-0"
        >
          <Accordion className="w-full">
            {leftColumn.map((faq, i) => (
              <AccordionItem key={i} className="border-white/[0.05]">
                <AccordionTrigger className="text-left text-white/70 hover:text-white font-medium text-sm py-5 no-underline hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-white/40 leading-relaxed pr-8 pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Accordion className="w-full">
            {rightColumn.map((faq, i) => (
              <AccordionItem key={i} className="border-white/[0.05]">
                <AccordionTrigger className="text-left text-white/70 hover:text-white font-medium text-sm py-5 no-underline hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-white/40 leading-relaxed pr-8 pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
