import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authedRequest } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import { formatTime } from '@/lib/format';
import { Loader2 } from 'lucide-react';

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AppointmentModal({ open, onOpenChange, onCreated }: AppointmentModalProps) {
  const toast = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const resetForm = useCallback(() => {
    setCustomerName('');
    setCustomerPhone('');
    setService('');
    setDate('');
    setTime('');
    setNotes('');
    setSlots([]);
  }, []);

  // Load services when modal opens
  useEffect(() => {
    if (!open) return;
    resetForm();
    let cancelled = false;

    async function loadServices() {
      setLoadingServices(true);
      try {
        const data = await authedRequest<{ success: boolean; services: Service[] }>('/services');
        if (!cancelled) setServices(data.services ?? []);
      } catch (err) {
        console.error('Error loading services:', err);
        if (!cancelled) toast.show('Failed to load services', 'error');
      } finally {
        if (!cancelled) setLoadingServices(false);
      }
    }

    loadServices();
    return () => { cancelled = true; };
  }, [open, resetForm, toast]);

  // Fetch availability when date or service changes
  useEffect(() => {
    if (!date || !open) return;
    let cancelled = false;

    async function loadAvailability() {
      setLoadingSlots(true);
      setTime('');
      try {
        const params = new URLSearchParams({ date });
        if (service) params.set('service', service);
        const data = await authedRequest<{
          success: boolean;
          available?: boolean;
          slots?: string[];
          available_slots?: string[];
        }>(`/appointments/availability?${params.toString()}`);

        if (cancelled) return;

        // The API may return either `slots` or `available_slots`
        const availableSlots = data.available_slots ?? data.slots ?? [];
        setSlots(availableSlots);
      } catch (err) {
        console.error('Error loading availability:', err);
        if (!cancelled) {
          toast.show('Failed to load available time slots', 'error');
          setSlots([]);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    loadAvailability();
    return () => { cancelled = true; };
  }, [date, service, open, toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const body = {
        caller_name: customerName,
        caller_phone: customerPhone,
        service_name: service,
        appointment_date: date,
        appointment_time: time,
        notes: notes || undefined,
      };
      const result = await authedRequest<{ success: boolean }>('/appointments', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (result.success) {
        toast.show('Appointment created successfully!', 'success');
        onOpenChange(false);
        onCreated();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create appointment';
      toast.show(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">New Appointment</DialogTitle>
          <DialogDescription className="text-white/50">
            Fill in the details to schedule an appointment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Customer Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-name" className="text-white/70">
              Customer Name
            </Label>
            <Input
              id="apt-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              required
              className="bg-black/50 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-phone" className="text-white/70">
              Phone
            </Label>
            <Input
              id="apt-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+92 300 1234567"
              required
              className="bg-black/50 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Service */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-white/70">Service</Label>
            {loadingServices ? (
              <div className="flex items-center gap-2 text-white/40 text-sm h-8">
                <Loader2 className="size-4 animate-spin" />
                Loading services...
              </div>
            ) : (
              <Select value={service} onValueChange={setService} required>
                <SelectTrigger className="w-full bg-black/50 border-white/10 text-white">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10">
                  {services.map((s) => (
                    <SelectItem key={s.id ?? s.name} value={s.name} className="text-white">
                      {s.name} - Rs.{s.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-date" className="text-white/70">
              Date
            </Label>
            <Input
              id="apt-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-black/50 border-white/10 text-white"
            />
          </div>

          {/* Time */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-white/70">Time</Label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 text-white/40 text-sm h-8">
                <Loader2 className="size-4 animate-spin" />
                Loading available slots...
              </div>
            ) : !date ? (
              <p className="text-white/30 text-sm h-8 flex items-center">
                Select a date first
              </p>
            ) : slots.length === 0 ? (
              <p className="text-white/30 text-sm h-8 flex items-center">
                No slots available for this date
              </p>
            ) : (
              <Select value={time} onValueChange={setTime} required>
                <SelectTrigger className="w-full bg-black/50 border-white/10 text-white">
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 max-h-48">
                  {slots.map((slot) => (
                    <SelectItem key={slot} value={slot} className="text-white">
                      {formatTime(slot)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-notes" className="text-white/70">
              Notes <span className="text-white/30">(optional)</span>
            </Label>
            <Textarea
              id="apt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="bg-black/50 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <DialogFooter className="bg-transparent border-t-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !customerName || !customerPhone || !service || !date || !time}
              className="bg-indigo-500 text-white hover:bg-indigo-600 border-indigo-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Appointment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
