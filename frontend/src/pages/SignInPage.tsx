import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fadeUp } from '@/lib/animations';
import SignInForm from '@/components/auth/SignInForm';

export default function SignInPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-4 py-12">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/[0.06] blur-[120px]" />
      </div>

      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 backdrop-blur-sm sm:p-10"
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
            <Phone className="h-5 w-5 text-indigo-400" />
          </div>
          <span className="text-xl font-bold text-white">Receptrix</span>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-white/50">Sign in to your account</p>
        </div>

        <SignInForm />

        {/* Footer links */}
        <p className="mt-6 text-center text-sm text-white/40">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-indigo-400 hover:text-indigo-400 transition-colors">
            Sign up
          </Link>
        </p>

        <Link
          to="/"
          className="mt-4 block text-center text-sm text-white/30 hover:text-white/50 transition-colors"
        >
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
