import { cn } from '@/lib/utils';

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}

export default function Marquee({ children, className, speed = 30 }: MarqueeProps) {
  return (
    <div className={cn('overflow-hidden relative', className)}>
      <div
        className="flex gap-12 whitespace-nowrap animate-marquee"
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
        {children}
      </div>
      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent pointer-events-none" />
    </div>
  );
}
