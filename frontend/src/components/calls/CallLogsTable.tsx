import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { authedRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { formatDateTime, formatDuration, formatPhoneNumber } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TranscriptModal } from './TranscriptModal';

interface CallLog {
  id: string;
  caller_phone: string;
  started_at: string;
  duration_seconds?: number;
  call_status: string;
  appointment_created: boolean;
  transcript?: string | null;
}

interface CallsResponse {
  success: boolean;
  calls: CallLog[];
}

const statusStyles: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  missed: 'bg-red-500/15 text-red-400 border-red-500/30',
  'in-progress': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
};

export function CallLogsTable() {
  const { hasActiveBusinessContext } = useAuth();
  const toast = useToast();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!hasActiveBusinessContext()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchCalls() {
      try {
        const data = await authedRequest<CallsResponse>('/calls');
        if (!cancelled) {
          setCalls(data.calls ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          toast.show(err instanceof Error ? err.message : 'Failed to load call logs', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCalls();
    return () => { cancelled = true; };
  }, [hasActiveBusinessContext, toast]);

  function openTranscript(transcript: string) {
    setSelectedTranscript(transcript);
    setModalOpen(true);
  }

  if (!hasActiveBusinessContext()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
        <Phone className="mb-4 h-10 w-10 text-neutral-600" />
        <p>Create your business in Settings to start tracking calls.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-400">
        Loading call logs...
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
        <Phone className="mb-4 h-10 w-10 text-neutral-600" />
        <p>No call logs found</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-neutral-400">Date/Time</TableHead>
                <TableHead className="text-neutral-400">Caller</TableHead>
                <TableHead className="text-neutral-400">Duration</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                <TableHead className="text-neutral-400">Appointment</TableHead>
                <TableHead className="text-neutral-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="text-neutral-200">
                    {formatDateTime(call.started_at)}
                  </TableCell>
                  <TableCell className="font-mono text-neutral-200">
                    {formatPhoneNumber(call.caller_phone)}
                  </TableCell>
                  <TableCell className="text-neutral-300">
                    {call.duration_seconds ? formatDuration(call.duration_seconds) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusStyles[call.call_status] ?? 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30'}
                    >
                      {call.call_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {call.appointment_created ? (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-neutral-500">No</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {call.transcript ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                        onClick={() => openTranscript(call.transcript!)}
                      >
                        View Transcript
                      </Button>
                    ) : (
                      <span className="text-neutral-600">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <TranscriptModal
        transcript={selectedTranscript}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
