import { useEffect, useState } from 'react';
import { Calendar, CalendarCheck, Phone, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { authedRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useAnimatedCounter } from '@/hooks/use-animated-counter';

interface Stats {
  total_appointments: number;
  today_appointments: number;
  total_calls: number;
  completed_calls: number;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  index: number;
}

function StatCard({ icon: Icon, label, value, index }: StatCardProps) {
  const { count, ref } = useAnimatedCounter(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <span ref={ref} className="text-3xl font-bold text-white tabular-nums">
            {count}
          </span>
          <p className="mt-1 text-sm text-white/50">{label}</p>
        </div>
        <div className="rounded-lg bg-indigo-500/10 p-2.5">
          <Icon className="h-5 w-5 text-indigo-400" />
        </div>
      </div>
    </motion.div>
  );
}

interface StatsCardsProps {
  refreshKey?: number;
}

export function StatsCards({ refreshKey }: StatsCardsProps) {
  const { hasActiveBusinessContext } = useAuth();
  const [stats, setStats] = useState<Stats>({
    total_appointments: 0,
    today_appointments: 0,
    total_calls: 0,
    completed_calls: 0,
  });

  useEffect(() => {
    if (!hasActiveBusinessContext()) {
      setStats({ total_appointments: 0, today_appointments: 0, total_calls: 0, completed_calls: 0 });
      return;
    }

    let cancelled = false;

    async function fetchStats() {
      try {
        const data = await authedRequest<Stats>('/stats', { method: 'GET' });
        if (!cancelled) setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [hasActiveBusinessContext, refreshKey]);

  const cards = [
    { icon: Calendar, label: 'Total Appointments', value: stats.total_appointments },
    { icon: CalendarCheck, label: "Today's Appointments", value: stats.today_appointments },
    { icon: Phone, label: 'Total Calls', value: stats.total_calls },
    { icon: CheckCircle, label: 'Completed Calls', value: stats.completed_calls },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} index={i} />
      ))}
    </div>
  );
}
