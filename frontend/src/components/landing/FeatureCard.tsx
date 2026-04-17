import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/animations';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export default function FeatureCard({ icon: Icon, title, description, className }: FeatureCardProps) {
  return (
    <motion.article
      variants={fadeUp}
      className={cn(
        'group relative rounded-2xl overflow-hidden p-7',
        'bg-[#0d0d0d] border border-white/[0.06]',
        'hover:border-indigo-500/20 hover:bg-[#111]',
        'transition-all duration-300 cursor-default',
        className
      )}
    >
      {/* Subtle corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/[0.04] to-transparent rounded-bl-3xl" />

      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-5
                    bg-indigo-500/[0.08] border border-indigo-500/[0.15] text-indigo-400
                    group-hover:bg-indigo-500/[0.12] group-hover:border-indigo-500/25
                    transition-all duration-300"
      >
        <Icon className="w-5 h-5" />
      </div>

      <h3 className="text-base font-semibold text-white mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-white/45 leading-relaxed">{description}</p>

      {/* Bottom line accent on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/30 to-indigo-500/0
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.article>
  );
}
