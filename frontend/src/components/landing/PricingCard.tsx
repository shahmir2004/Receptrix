import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import ShimmerButton from './ShimmerButton';

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  popular?: boolean;
  ctaLabel: string;
  ctaTo: string;
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  features,
  popular = false,
  ctaLabel,
  ctaTo,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl p-8 flex flex-col transition-all duration-300',
        popular
          ? 'border border-indigo-500/25 bg-[#0d0d0d] lg:scale-[1.03] shadow-[0_0_80px_rgba(99,102,241,0.10),0_0_0_1px_rgba(99,102,241,0.08)]'
          : 'border border-white/[0.06] bg-[#0a0a0a] hover:border-white/[0.10]'
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[11px] font-bold px-4 py-1 rounded-full tracking-wide">
          MOST POPULAR
        </div>
      )}

      {/* Plan name + price */}
      <div className="mb-7">
        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">{name}</h3>
        <div className="flex items-baseline gap-1.5">
          <span className="text-5xl font-extrabold font-display text-white tracking-tight">{price}</span>
          {period && <span className="text-white/30 text-sm">/{period}</span>}
        </div>
        <p className="text-sm text-white/35 mt-3">{description}</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mb-6" />

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-white/60">
            <Check className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {popular ? (
        <ShimmerButton to={ctaTo} className="w-full justify-center">
          {ctaLabel}
        </ShimmerButton>
      ) : (
        <a
          href={ctaTo}
          className={cn(
            'inline-flex items-center justify-center w-full rounded-xl px-6 py-2.5 text-sm font-medium',
            'border border-white/[0.08] hover:border-white/[0.15]',
            'text-white/60 hover:text-white',
            'bg-white/[0.03] hover:bg-white/[0.06]',
            'transition-all duration-200 cursor-pointer'
          )}
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}
