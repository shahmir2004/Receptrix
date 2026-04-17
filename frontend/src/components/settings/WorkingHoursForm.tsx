import { useState, useEffect, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { authedRequest } from '@/lib/api';

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

type Day = (typeof DAYS)[number];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface BusinessSettings {
  success: boolean;
  settings: {
    working_hours: Record<string, string>;
  };
}

export function WorkingHoursForm() {
  const { hasActiveBusinessContext } = useAuth();
  const toast = useToast();

  const [hours, setHours] = useState<Record<Day, string>>(() => {
    const init: Record<string, string> = {};
    for (const day of DAYS) init[day] = 'Closed';
    return init as Record<Day, string>;
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasBusiness = hasActiveBusinessContext();

  useEffect(() => {
    if (!hasBusiness) return;

    let cancelled = false;
    setLoading(true);

    authedRequest<BusinessSettings>('/business/settings', { method: 'GET' })
      .then((data) => {
        if (cancelled) return;
        const wh = data.settings?.working_hours || {};
        setHours((prev) => {
          const next = { ...prev };
          for (const day of DAYS) {
            next[day] = wh[day] || 'Closed';
          }
          return next;
        });
      })
      .catch((err: unknown) => {
        if (!cancelled && err instanceof Error && err.message !== 'Unauthorized') {
          toast.show('Failed to load working hours', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBusiness]);

  function updateDay(day: Day, value: string) {
    setHours((prev) => ({ ...prev, [day]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!hasBusiness) {
      toast.show('Create your business first, then set working hours.', 'error');
      return;
    }

    setSaving(true);
    try {
      const working_hours: Record<string, string> = {};
      for (const day of DAYS) {
        working_hours[day] = hours[day].trim() || 'Closed';
      }

      await authedRequest('/business/settings', {
        method: 'PATCH',
        body: JSON.stringify({ working_hours }),
      });
      toast.show('Working hours updated.', 'success');
    } catch (error: unknown) {
      toast.show(
        error instanceof Error ? error.message : 'Failed to save working hours',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Working Hours</h3>

      {!hasBusiness ? (
        <p className="text-sm text-white/40">
          Create your business first to configure working hours.
        </p>
      ) : loading ? (
        <p className="text-white/40 text-sm">Loading working hours...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center gap-3">
              <Label className="text-white/70 w-24 shrink-0">{capitalize(day)}</Label>
              <Input
                value={hours[day]}
                onChange={(e) => updateDay(day, e.target.value)}
                placeholder="e.g., 9:00 AM - 5:00 PM"
              />
            </div>
          ))}
          <Button type="submit" disabled={saving} className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving ? 'Saving...' : 'Save Working Hours'}
          </Button>
        </form>
      )}
    </div>
  );
}
