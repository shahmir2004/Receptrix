import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface ShimmerButtonProps {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  className?: string;
  size?: 'default' | 'lg';
}

export default function ShimmerButton({
  children,
  to,
  onClick,
  className,
  size = 'default',
}: ShimmerButtonProps) {
  const classes = cn(
    'relative group inline-flex items-center justify-center font-semibold text-white',
    'bg-indigo-500 hover:bg-indigo-400',
    'transition-all duration-200',
    'shadow-[0_0_30px_rgba(99,102,241,0.35)]',
    'hover:shadow-[0_0_50px_rgba(99,102,241,0.5)]',
    'overflow-hidden rounded-lg',
    size === 'lg' ? 'px-8 py-3.5 text-base' : 'px-6 py-2.5 text-sm',
    className
  );

  const inner = (
    <>
      <span
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                   bg-gradient-to-r from-transparent via-white/20 to-transparent
                   transition-transform duration-700"
      />
      <span className="relative">{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {inner}
    </button>
  );
}
