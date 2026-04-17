import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { authedRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatPhoneNumber, formatDateTime, capitalize } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Call {
  call_id?: string;
  caller_phone: string;
  started_at: string;
  call_status: string;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'in-progress': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  missed: 'bg-red-500/10 text-red-400 border-red-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

interface RecentCallsProps {
  refreshKey?: number;
}

export function RecentCalls({ refreshKey }: RecentCallsProps) {
  const { hasActiveBusinessContext } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasActiveBusinessContext()) {
      setCalls([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchCalls() {
      setLoading(true);
      try {
        const data = await authedRequest<{ calls: Call[] }>('/calls?limit=5', { method: 'GET' });
        if (!cancelled) setCalls(data.calls || []);
      } catch (error) {
        console.error('Failed to load recent calls:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCalls();
    return () => { cancelled = true; };
  }, [hasActiveBusinessContext, refreshKey]);

  const hasBusiness = hasActiveBusinessContext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      className="rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-5 py-4">
        <div className="h-4 w-1 rounded-full bg-indigo-500" />
        <Phone className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white">Recent Calls</h3>
      </div>

      {/* Content */}
      <div className="p-5">
        {!hasBusiness ? (
          <p className="text-sm text-white/35">
            Create your business in Settings to start tracking calls.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : calls.length === 0 ? (
          <p className="text-sm text-white/35">No recent calls</p>
        ) : (
          <ul className="space-y-3">
            {calls.map((call, i) => (
              <li
                key={call.call_id || i}
                className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.05] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {formatPhoneNumber(call.caller_phone) || 'Unknown'}
                  </p>
                  <p className="text-xs text-white/45">{formatDateTime(call.started_at)}</p>
                </div>
                <Badge
                  className={cn(
                    'text-[10px] border rounded-full px-2 py-0.5',
                    statusColors[call.call_status] || statusColors.pending
                  )}
                >
                  {capitalize(call.call_status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
