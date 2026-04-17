import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, ensureActiveBusinessContext } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

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
      toast.show(message, 'error');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
          className="h-10 rounded-xl border-white/[0.07] bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
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
          className="h-10 rounded-xl border-white/[0.07] bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
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
