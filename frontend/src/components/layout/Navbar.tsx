import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useScrollEffect } from '@/hooks/use-scroll-effect';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

export default function Navbar() {
  const scrolled = useScrollEffect(50);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <>
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <nav
          className={cn(
            'flex items-center justify-between gap-4 px-5 py-2.5 rounded-2xl transition-all duration-300',
            scrolled
              ? 'bg-black/80 backdrop-blur-2xl border border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.6)]'
              : 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]'
          )}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 shrink-0">
            <span className="text-[15px] font-semibold tracking-tight text-white font-sans">
              Receptrix
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className="text-[13px] text-white/50 hover:text-white/90 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/signin"
              className="text-[13px] text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-[13px] px-4 py-2 rounded-xl transition-all duration-200 shadow-[0_0_16px_rgba(99,102,241,0.25)] hover:shadow-[0_0_24px_rgba(99,102,241,0.4)]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white/60 hover:text-white p-1 transition-colors cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/97 backdrop-blur-2xl flex flex-col items-center justify-center gap-7"
          >
            {navLinks.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ delay: i * 0.07, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="text-2xl font-display font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                {link.label}
              </motion.a>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.32, duration: 0.28 }}
              className="flex flex-col items-center gap-4 mt-2"
            >
              <Link
                to="/signin"
                onClick={() => setMobileOpen(false)}
                className="text-base text-white/50 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileOpen(false)}
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-3 rounded-2xl transition-all duration-200 shadow-[0_0_24px_rgba(99,102,241,0.3)]"
              >
                Get Started
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
