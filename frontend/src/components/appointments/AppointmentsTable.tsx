import { useState, useEffect, useCallback } from 'react';
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
import { authedRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { formatDate, formatTime, formatPhoneNumber, capitalize } from '@/lib/format';
import { AppointmentFilters, type AppointmentFilterValues } from './AppointmentFilters';
import { AppointmentModal } from './AppointmentModal';
import { Plus, Loader2 } from 'lucide-react';

interface Appointment {
  id: number;
  appointment_date: string;
  appointment_time: string;
  caller_name: string;
  caller_phone: string;
  service_name: string;
  status: string;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-500/15 text-green-400 border-green-500/30',
  pending: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export function AppointmentsTable() {
  const { hasActiveBusinessContext } = useAuth();
  const toast = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AppointmentFilterValues>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!hasActiveBusinessContext()) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date) params.set('date', filters.date);

      const queryString = params.toString();
      const url = `/appointments${queryString ? `?${queryString}` : ''}`;
      const data = await authedRequest<{ success: boolean; appointments: Appointment[] }>(url);
      setAppointments(data.appointments ?? []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      toast.show('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }, [hasActiveBusinessContext, filters.date, toast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  async function updateStatus(id: number, status: 'confirmed' | 'cancelled') {
    setUpdatingId(id);
    try {
      await authedRequest<{ success: boolean }>(
        `/appointments/${id}/status?status=${status}`,
        { method: 'PATCH' }
      );
      toast.show(
        `Appointment ${status}`,
        status === 'confirmed' ? 'success' : 'info'
      );
      await loadAppointments();
    } catch (err) {
      console.error('Error updating appointment:', err);
      toast.show('Failed to update appointment', 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  // Client-side status filtering (date filtering is done server-side)
  const filtered = filters.status
    ? appointments.filter((a) => a.status === filters.status)
    : appointments;

  // No business context
  if (!hasActiveBusinessContext()) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111] p-8 text-center">
        <p className="text-white/50">
          Create your business in Settings to manage appointments.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header row with filters and create button */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <AppointmentFilters filters={filters} onFilterChange={setFilters} />
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-500"
        >
          <Plus className="size-4" />
          New Appointment
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-white/40">
            <Loader2 className="size-5 animate-spin" />
            Loading appointments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-white/40">
            No appointments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Date</TableHead>
                  <TableHead className="text-white/60">Time</TableHead>
                  <TableHead className="text-white/60">Customer</TableHead>
                  <TableHead className="text-white/60">Phone</TableHead>
                  <TableHead className="text-white/60">Service</TableHead>
                  <TableHead className="text-white/60">Status</TableHead>
                  <TableHead className="text-white/60">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((apt) => (
                  <TableRow key={apt.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="text-white/80">
                      {formatDate(apt.appointment_date)}
                    </TableCell>
                    <TableCell className="text-white/80">
                      {formatTime(apt.appointment_time)}
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      {apt.caller_name}
                    </TableCell>
                    <TableCell className="text-white/70">
                      {formatPhoneNumber(apt.caller_phone)}
                    </TableCell>
                    <TableCell className="text-white/80">{apt.service_name}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          statusColors[apt.status] ??
                          'bg-white/10 text-white/60 border-white/10'
                        }
                      >
                        {capitalize(apt.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {apt.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={updatingId === apt.id}
                            onClick={() => updateStatus(apt.id, 'confirmed')}
                            className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                          >
                            {updatingId === apt.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              'Confirm'
                            )}
                          </Button>
                        )}
                        {apt.status !== 'cancelled' && (
                          <Button
                            variant="outline"
                            size="xs"
                            disabled={updatingId === apt.id}
                            onClick={() => updateStatus(apt.id, 'cancelled')}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            {updatingId === apt.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              'Cancel'
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={loadAppointments}
      />
    </div>
  );
}
