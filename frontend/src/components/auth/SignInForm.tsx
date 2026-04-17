import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { publicRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RESEND_COOLDOWN = 30;

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { login, ensureActiveBusinessContext } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setEmailNotVerified(false);

    try {
      await login(email, password);
      const hasBusiness = await ensureActiveBusinessContext();

      if (hasBusiness) {
        toast.show('Signed in successfully!', 'success');
      } else {
        toast.show('Signed in. Add your business from Settings to continue.', 'info');
      }

      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      if (message === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
      } else {
        toast.show(message, 'error');
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const { response, data } = await publicRequest<{ success: boolean; message?: string }>(
        '/auth/resend-verification',
        { method: 'POST', body: JSON.stringify({ email }) }
      );
      if (response.ok && data.success) {
        toast.show('Verification email sent. Please check your inbox.', 'success');
        startCooldown();
      } else {
        toast.show('Failed to resend. Please try again later.', 'error');
      }
    } catch {
      toast.show('Failed to resend. Please try again later.', 'error');
    } finally {
      setResending(false);
    }
  }

  const inputClasses =
    'h-10 rounded-xl border-white/[0.07] bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {emailNotVerified && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col gap-3">
          <p className="text-amber-300 text-sm font-medium">
            Email not verified. Please check your inbox and click the confirmation link before signing in.
          </p>
          <Button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            className="h-9 w-full rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {resending
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend verification email'}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="signin-email" className="text-white/70">
          Email
        </Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signin-password" className="text-white/70">
          Password
        </Label>
        <Input
          id="signin-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className={inputClasses}
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-10 w-full rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {loading ? 'Please wait...' : 'Sign In'}
      </Button>
    </form>
  );
}
