import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface SetupBannerProps {
  onGoToSettings: () => void;
}

export function SetupBanner({ onGoToSettings }: SetupBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
        <div>
          <h3 className="text-sm font-semibold text-white">Finish Setup To Start Using Receptrix</h3>
          <p className="mt-1 text-sm text-white/50">
            You are signed in, but no business is linked yet. Create one in Settings to unlock
            appointments, calls, and voice features.
          </p>
        </div>
      </div>
      <Button
        onClick={onGoToSettings}
        className="shrink-0 bg-indigo-500 text-white hover:bg-indigo-600 border-0"
        size="sm"
      >
        Go To Settings
      </Button>
    </motion.div>
  );
}
