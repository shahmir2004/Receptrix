import { useState, useEffect, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { authedRequest } from '@/lib/api';

const TIMEZONES = [
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Istanbul',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

interface BusinessSettings {
  success: boolean;
  settings: {
    business_name: string;
    phone: string;
    email: string;
    address: string;
    timezone: string;
    greeting_message: string;
    working_hours: Record<string, string>;
  };
}

export function BusinessInfoForm() {
  const { currentUser, hasActiveBusinessContext, refreshSession } = useAuth();
  const toast = useToast();

  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasBusiness = hasActiveBusinessContext();

  useEffect(() => {
    if (!hasBusiness) {
      setEmail(currentUser?.email || '');
      return;
    }

    let cancelled = false;
    setLoading(true);

    authedRequest<BusinessSettings>('/business/settings', { method: 'GET' })
      .then((data) => {
        if (cancelled) return;
        const s = data.settings;
        setBusinessName(s.business_name || '');
        setPhone(s.phone || '');
        setEmail(s.email || currentUser?.email || '');
        setAddress(s.address || '');
        setTimezone(s.timezone || 'Asia/Karachi');
        setGreetingMessage(s.greeting_message || '');
      })
      .catch((err: unknown) => {
        if (!cancelled && err instanceof Error && err.message !== 'Unauthorized') {
          toast.show('Failed to load business settings', 'error');
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!businessName.trim()) {
      toast.show('Business name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        business_name: businessName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        timezone: timezone || 'Asia/Karachi',
        greeting_message: greetingMessage.trim(),
      };

      if (hasBusiness) {
        await authedRequest('/business/settings', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.show('Business information updated.', 'success');
      } else {
        await authedRequest('/auth/business', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        await refreshSession();
        toast.show('Business created successfully.', 'success');
      }
    } catch (error: unknown) {
      toast.show(
        error instanceof Error ? error.message : 'Failed to save business info',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  const hint = hasBusiness
    ? 'Update your business details below.'
    : 'No business is linked yet. Fill this form and click Create Business.';

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
      <h3 className="text-lg font-semibold text-white mb-1">Business Information</h3>
      <p className="text-sm text-white/50 mb-4">{hint}</p>

      {loading ? (
        <p className="text-white/40 text-sm">Loading settings...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name" className="text-white/70">
              Business Name
            </Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your business name"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business-phone" className="text-white/70">
                Phone
              </Label>
              <Input
                id="business-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-email" className="text-white/70">
                Email
              </Label>
              <Input
                id="business-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@business.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-address" className="text-white/70">
              Address
            </Label>
            <Input
              id="business-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-greeting" className="text-white/70">
              Greeting Message
            </Label>
            <Textarea
              id="business-greeting"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="Welcome message for callers..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving
              ? 'Saving...'
              : hasBusiness
                ? 'Save Business Info'
                : 'Create Business'}
          </Button>
        </form>
      )}
    </div>
  );
}
