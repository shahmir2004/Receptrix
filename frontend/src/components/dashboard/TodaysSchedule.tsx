import { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { authedRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatTime, capitalize } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Appointment {
  appointment_id?: string;
  caller_name: string;
  service_name: string;
  appointment_time: string;
  status: string;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  missed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

interface TodaysScheduleProps {
  refreshKey?: number;
}

export function TodaysSchedule({ refreshKey }: TodaysScheduleProps) {
  const { hasActiveBusinessContext } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasActiveBusinessContext()) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAppointments() {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const data = await authedRequest<{ appointments: Appointment[] }>(
          `/appointments?date=${today}`,
          { method: 'GET' }
        );
        if (!cancelled) setAppointments(data.appointments || []);
      } catch (error) {
        console.error('Failed to load today\'s schedule:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAppointments();
    return () => { cancelled = true; };
  }, [hasActiveBusinessContext, refreshKey]);

  const hasBusiness = hasActiveBusinessContext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.35 }}
      className="rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-5 py-4">
        <div className="h-4 w-1 rounded-full bg-indigo-500" />
        <Calendar className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white">Today's Schedule</h3>
      </div>

      {/* Content */}
      <div className="p-5">
        {!hasBusiness ? (
          <p className="text-sm text-white/35">
            Create your business in Settings to start receiving appointments.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-white/35">No appointments scheduled for today</p>
        ) : (
          <ul className="space-y-3">
            {appointments.map((apt, i) => (
              <li
                key={apt.appointment_id || i}
                className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.05] px-4 py-3"
              >
                <div className="flex items-center gap-1.5 shrink-0 text-xs text-white/50">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-mono">{formatTime(apt.appointment_time)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{apt.caller_name}</p>
                  <p className="text-xs text-white/45 truncate">{apt.service_name}</p>
                </div>
                <Badge
                  className={cn(
                    'text-[10px] border rounded-full px-2 py-0.5',
                    statusColors[apt.status] || statusColors.pending
                  )}
                >
                  {capitalize(apt.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
