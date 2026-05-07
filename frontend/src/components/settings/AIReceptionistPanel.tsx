import { useEffect, useState, type FormEvent } from 'react';
import { Bot, CreditCard, PhoneCall, Save, Stethoscope } from 'lucide-react';
import { authedRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Subscription {
  status: string;
  voice_features_enabled?: boolean;
}

interface VoiceState {
  phone_number?: string | null;
  area_code?: string | null;
  status?: string;
  vapi_assistant_id?: string;
  vapi_phone_number_id?: string;
}

interface AiSettings {
  greeting: string;
  tone: string;
  appointment_duration_minutes: number;
  appointment_buffer_minutes: number;
  transfer_phone: string;
  emergency_escalation_text: string;
}

interface VoiceResponse {
  success: boolean;
  voice: VoiceState | null;
  subscription: Subscription;
  settings: AiSettings;
}

const defaultSettings: AiSettings = {
  greeting: 'Thank you for calling. How may I help you today?',
  tone: 'warm, calm, and professional',
  appointment_duration_minutes: 30,
  appointment_buffer_minutes: 0,
  transfer_phone: '',
  emergency_escalation_text: 'If this is a medical emergency, please hang up and call 911.',
};

function isActive(status?: string) {
  return ['active', 'paid', 'trialing'].includes((status || '').toLowerCase());
}

export function AIReceptionistPanel() {
  const { hasActiveBusinessContext, currentUser } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billing, setBilling] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [testCalling, setTestCalling] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [voice, setVoice] = useState<VoiceState | null>(null);
  const [settings, setSettings] = useState<AiSettings>(defaultSettings);
  const [areaCode, setAreaCode] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const hasBusiness = hasActiveBusinessContext();
  const billingActive = isActive(subscription?.status);

  async function loadVoice() {
    if (!hasBusiness) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await authedRequest<VoiceResponse>('/business/voice', { method: 'GET' });
      setVoice(data.voice);
      setSubscription(data.subscription);
      setSettings({ ...defaultSettings, ...(data.settings || {}) });
      setAreaCode(data.voice?.area_code || '');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Failed to load AI receptionist', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBusiness]);

  function updateSetting<K extends keyof AiSettings>(key: K, value: AiSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function startCheckout() {
    setBilling(true);
    try {
      const data = await authedRequest<{ checkout_url?: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ email: currentUser?.email || '' }),
      });
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.show('Checkout URL was not returned.', 'error');
      }
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Unable to start checkout', 'error');
    } finally {
      setBilling(false);
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await authedRequest<{ settings: AiSettings }>('/business/ai-settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setSettings({ ...defaultSettings, ...(data.settings || {}) });
      toast.show('AI receptionist settings saved.', 'success');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Failed to save AI settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function provisionNumber() {
    if (!areaCode.trim()) {
      toast.show('Enter a US area code first.', 'error');
      return;
    }
    setProvisioning(true);
    try {
      const data = await authedRequest<{ voice: VoiceState }>('/business/voice/provision', {
        method: 'POST',
        body: JSON.stringify({ area_code: areaCode }),
      });
      setVoice(data.voice);
      toast.show('Vapi number assigned.', 'success');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Unable to provision Vapi number', 'error');
    } finally {
      setProvisioning(false);
    }
  }

  async function startTestCall() {
    if (!testPhone.trim()) {
      toast.show('Enter the phone number to call.', 'error');
      return;
    }
    setTestCalling(true);
    try {
      await authedRequest('/business/voice/test-call', {
        method: 'POST',
        body: JSON.stringify({ customer_phone: testPhone }),
      });
      toast.show('Vapi test call started.', 'success');
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Unable to start test call', 'error');
    } finally {
      setTestCalling(false);
    }
  }

  if (!hasBusiness) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 text-white/50">
        Create your business before configuring the AI receptionist.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 text-white/50">
        Loading AI receptionist...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white">
              <CreditCard className="h-5 w-5 text-indigo-400" />
              <h3 className="font-semibold">Billing</h3>
            </div>
            <Badge className={billingActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}>
              {subscription?.status || 'pending'}
            </Badge>
          </div>
          <p className="text-2xl font-bold text-white">$300/mo</p>
          <p className="mt-1 text-sm text-white/45">Medical clinic plan</p>
          {!billingActive && (
            <Button onClick={startCheckout} disabled={billing} className="mt-4 w-full bg-indigo-600 text-white hover:bg-indigo-700">
              {billing ? 'Opening...' : 'Activate Billing'}
            </Button>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-white">
            <PhoneCall className="h-5 w-5 text-indigo-400" />
            <h3 className="font-semibold">Vapi Number</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr_auto]">
            <div>
              <Label htmlFor="area-code" className="text-white/60">Area code</Label>
              <Input id="area-code" value={areaCode} onChange={(e) => setAreaCode(e.target.value)} placeholder="415" maxLength={3} />
            </div>
            <div>
              <Label className="text-white/60">Assigned number</Label>
              <div className="flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 font-mono text-sm text-white">
                {voice?.phone_number || 'Not assigned'}
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={provisionNumber} disabled={provisioning || !billingActive} className="w-full bg-indigo-600 text-white hover:bg-indigo-700 md:w-auto">
                {provisioning ? 'Assigning...' : voice?.phone_number ? 'Update' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={saveSettings} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        <div className="mb-5 flex items-center gap-2 text-white">
          <Bot className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-semibold">AI Receptionist</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="ai-greeting" className="text-white/70">Greeting</Label>
            <Textarea id="ai-greeting" value={settings.greeting} onChange={(e) => updateSetting('greeting', e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-tone" className="text-white/70">Tone</Label>
            <Input id="ai-tone" value={settings.tone} onChange={(e) => updateSetting('tone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-phone" className="text-white/70">Transfer phone</Label>
            <Input id="transfer-phone" value={settings.transfer_phone} onChange={(e) => updateSetting('transfer_phone', e.target.value)} placeholder="+14155551212" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-white/70">Appointment duration</Label>
            <Input id="duration" type="number" min={5} step={5} value={settings.appointment_duration_minutes} onChange={(e) => updateSetting('appointment_duration_minutes', Number(e.target.value) || 30)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buffer" className="text-white/70">Buffer minutes</Label>
            <Input id="buffer" type="number" min={0} step={5} value={settings.appointment_buffer_minutes} onChange={(e) => updateSetting('appointment_buffer_minutes', Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="emergency" className="text-white/70">Emergency escalation</Label>
            <Textarea id="emergency" value={settings.emergency_escalation_text} onChange={(e) => updateSetting('emergency_escalation_text', e.target.value)} rows={2} />
          </div>
        </div>
        <Button type="submit" disabled={saving} className="mt-5 bg-indigo-600 text-white hover:bg-indigo-700">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save AI Settings'}
        </Button>
      </form>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center gap-2 text-white">
          <Stethoscope className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-semibold">Test Appointment Call</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+14155551212" />
          <Button onClick={startTestCall} disabled={testCalling || !voice?.phone_number || !billingActive} className="bg-indigo-600 text-white hover:bg-indigo-700">
            {testCalling ? 'Calling...' : 'Start Test Call'}
          </Button>
        </div>
      </div>
    </div>
  );
}
