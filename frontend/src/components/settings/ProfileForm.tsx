import { useState, useEffect, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { authedRequest } from '@/lib/api';

export function ProfileForm() {
  const { currentUser, refreshSession } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(currentUser?.full_name || '');
    setEmail(currentUser?.email || '');
  }, [currentUser]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await authedRequest<{ success: boolean }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
        }),
      });
      if (result.success) {
        await refreshSession();
        toast.show('Profile updated successfully.', 'success');
      }
    } catch (error: unknown) {
      toast.show(
        error instanceof Error ? error.message : 'Failed to update profile',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Profile</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="profile-full-name" className="text-white/70">
            Full Name
          </Label>
          <Input
            id="profile-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email" className="text-white/70">
            Email
          </Label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
    </div>
  );
}
