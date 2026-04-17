import { motion } from 'framer-motion';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';
import { fadeUp, stagger } from '@/lib/animations';

const stats = [
  { value: 10000, suffix: '+', label: 'Calls Handled' },
  { value: 99.9, suffix: '%', label: 'Uptime', decimals: 1 },
  { value: 4.9, suffix: '/5', label: 'Avg Rating', decimals: 1 },
  { value: 1, prefix: '<', suffix: 's', label: 'Response Time' },
];

function StatItem({
  value,
  suffix,
  prefix,
  label,
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  decimals?: number;
}) {
  const target = decimals > 0 ? Math.round(value * 10) : value;
  const { count, ref } = useAnimatedCounter(target, 1200);
  const display = decimals > 0 ? (count / 10).toFixed(decimals) : count.toLocaleString();

  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center text-center group">
      <span
        ref={ref}
        className="text-4xl font-extrabold font-display text-white tracking-tight"
      >
        {prefix}
        {display}
        {suffix}
      </span>
      <span className="text-xs text-white/30 mt-1.5 uppercase tracking-widest">{label}</span>
    </motion.div>
  );
}

export default function StatsBar() {
  return (
    <section className="border-y border-white/[0.05] py-12 bg-[#080808]">
      <motion.div
        variants={stagger}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-50px' }}
        className="mx-auto max-w-5xl px-6 grid grid-cols-2 md:grid-cols-4 gap-10"
      >
        {stats.map((stat) => (
          <StatItem key={stat.label} {...stat} />
        ))}
      </motion.div>
    </section>
  );
}
