import { cn } from '@/lib/utils';

interface AudioWaveformProps {
  className?: string;
  bars?: number;
}

export default function AudioWaveform({ className, bars = 24 }: AudioWaveformProps) {
  return (
    <div className={cn('flex items-end justify-center gap-[3px] h-16 px-5 py-4', className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-indigo-500/60 origin-bottom animate-waveform"
          style={{
            animationDelay: `${i * 80}ms`,
            height: '100%',
          }}
        />
      ))}
    </div>
  );
}
