import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { authedRequest } from '@/lib/api';

interface ServiceRow {
  /** null for newly added rows */
  id: string | null;
  name: string;
  price: number | '';
  duration_minutes: number;
}

interface ServiceFromApi {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active?: boolean;
}

interface ServicesResponse {
  success: boolean;
  services: ServiceFromApi[];
}

function emptyRow(): ServiceRow {
  return { id: null, name: '', price: '', duration_minutes: 30 };
}

export function ServicesEditor() {
  const { hasActiveBusinessContext } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState<ServiceRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Track the original loaded service IDs so we know what was deleted
  const loadedIds = useRef<Set<string>>(new Set());

  const hasBusiness = hasActiveBusinessContext();

  useEffect(() => {
    if (!hasBusiness) return;

    let cancelled = false;
    setLoading(true);

    authedRequest<ServicesResponse>('/business/services', { method: 'GET' })
      .then((data) => {
        if (cancelled) return;
        const active = (data.services || []).filter((s) => s.is_active !== false);
        loadedIds.current = new Set(active.map((s) => String(s.id)));

        if (active.length === 0) {
          setRows([emptyRow()]);
        } else {
          setRows(
            active.map((s) => ({
              id: String(s.id),
              name: s.name,
              price: s.price,
              duration_minutes: s.duration_minutes ?? 30,
            })),
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && err instanceof Error && err.message !== 'Unauthorized') {
          toast.show('Failed to load services', 'error');
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

  function updateRow(index: number, field: keyof ServiceRow, value: string | number) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [emptyRow()] : next;
    });
  }

  async function handleSave() {
    if (!hasBusiness) {
      toast.show('Create your business first, then add services.', 'error');
      return;
    }

    const parsed = rows
      .map((r) => ({
        id: r.id,
        name: r.name.trim(),
        price: Number(r.price) || 0,
        duration: Number(r.duration_minutes) || 0,
      }))
      .filter((r) => r.name);

    if (parsed.length === 0) {
      toast.show('Add at least one service before saving.', 'error');
      return;
    }

    setSaving(true);
    try {
      const submittedIds = new Set(
        parsed.filter((r) => r.id).map((r) => String(r.id)),
      );

      // Create or update
      for (const service of parsed) {
        const payload = {
          name: service.name,
          price: service.price,
          duration: service.duration,
        };
        if (service.id) {
          await authedRequest(`/business/services/${service.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
        } else {
          await authedRequest('/business/services', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
      }

      // Delete removed services
      for (const existingId of loadedIds.current) {
        if (!submittedIds.has(existingId)) {
          await authedRequest(`/business/services/${existingId}`, {
            method: 'DELETE',
          });
        }
      }

      toast.show('Services updated successfully.', 'success');

      // Reload to get fresh IDs for newly created services
      const fresh = await authedRequest<ServicesResponse>('/business/services', {
        method: 'GET',
      });
      const active = (fresh.services || []).filter((s) => s.is_active !== false);
      loadedIds.current = new Set(active.map((s) => String(s.id)));
      if (active.length === 0) {
        setRows([emptyRow()]);
      } else {
        setRows(
          active.map((s) => ({
            id: String(s.id),
            name: s.name,
            price: s.price,
            duration_minutes: s.duration_minutes ?? 30,
          })),
        );
      }
    } catch (error: unknown) {
      toast.show(
        error instanceof Error ? error.message : 'Failed to save services',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Services</h3>

      {!hasBusiness ? (
        <p className="text-sm text-white/40">
          Create your business first to manage services.
        </p>
      ) : loading ? (
        <p className="text-white/40 text-sm">Loading services...</p>
      ) : (
        <div className="space-y-4">
          {/* Header labels */}
          <div className="hidden md:grid md:grid-cols-[1fr_100px_100px_auto] gap-3 text-sm">
            <Label className="text-white/50">Service Name</Label>
            <Label className="text-white/50">Price ($)</Label>
            <Label className="text-white/50">Duration (min)</Label>
            <span className="w-20" />
          </div>

          {rows.map((row, index) => (
            <div
              key={`${row.id ?? 'new'}-${index}`}
              className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_auto] gap-3 items-center"
            >
              <Input
                value={row.name}
                onChange={(e) => updateRow(index, 'name', e.target.value)}
                placeholder="Service name"
              />
              <Input
                type="number"
                value={row.price}
                onChange={(e) =>
                  updateRow(index, 'price', e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Price"
                min={0}
                step={0.01}
              />
              <Input
                type="number"
                value={row.duration_minutes}
                onChange={(e) =>
                  updateRow(index, 'duration_minutes', Number(e.target.value) || 0)
                }
                placeholder="Minutes"
                min={5}
                step={5}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeRow(index)}
                className="w-20"
              >
                Remove
              </Button>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="border-white/10 text-white/70 hover:text-white"
            >
              + Add Service
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? 'Saving...' : 'Save Services'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
