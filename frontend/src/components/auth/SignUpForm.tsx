import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignUpForm() {
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter.';
    if (!/\d/.test(pw)) return 'Password must contain a number.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const pwError = validatePassword(password);
    if (pwError) {
      toast.show(pwError, 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(fullName, businessName, email, password);

      if (result.needsVerification) {
        setVerificationSent(true);
      } else {
        toast.show('Account created! Welcome to Receptrix.', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      toast.show(message, 'error');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    'h-10 rounded-xl border-white/[0.07] bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20';

  if (verificationSent) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5 flex flex-col gap-3 text-center">
          <div className="text-2xl">📧</div>
          <p className="text-white font-semibold">Check your inbox</p>
          <p className="text-white/60 text-sm">
            A confirmation email has been sent to <span className="text-white/80 font-medium">{email}</span>.
            Please verify your email before signing in.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => navigate('/signin')}
          className="h-10 w-full rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors cursor-pointer"
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-name" className="text-white/70">
          Full Name
        </Label>
        <Input
          id="signup-name"
          type="text"
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-business" className="text-white/70">
          Business Name
        </Label>
        <Input
          id="signup-business"
          type="text"
          placeholder="Acme Dental Clinic"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
          autoComplete="organization"
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email" className="text-white/70">
          Email
        </Label>
        <Input
          id="signup-email"
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
        <Label htmlFor="signup-password" className="text-white/70">
          Password
        </Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="Min 8 chars, upper, lower & number"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          className={inputClasses}
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="h-10 w-full rounded-xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 disabled:opacity-50 transition-colors cursor-pointer"
      >
        {loading ? 'Please wait...' : 'Create Account'}
      </Button>
    </form>
  );
}
