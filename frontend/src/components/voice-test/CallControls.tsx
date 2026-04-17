import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Volume2, VolumeX, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallControlsProps {
  isVoiceModeActive: boolean;
  isCallActive: boolean;
  callDuration: string;
  voiceStatus: string;
  isSpeechSupported: boolean;
  onToggleVoiceMode: () => void;
  onStartCall: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isVoiceModeActive,
  isCallActive,
  callDuration,
  voiceStatus,
  isSpeechSupported,
  onToggleVoiceMode,
  onStartCall,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/10">
      {isSpeechSupported && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleVoiceMode}
          className={cn(
            'gap-2 transition-all duration-200 border-white/10',
            isVoiceModeActive
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          )}
        >
          {isVoiceModeActive ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
          {isVoiceModeActive ? 'Voice Mode Active' : 'Enable Voice Mode'}
        </Button>
      )}

      {!isCallActive ? (
        <Button
          type="button"
          size="sm"
          onClick={onStartCall}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Phone className="w-4 h-4" />
          Start Call
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          onClick={onEndCall}
          className="gap-2 bg-red-600 hover:bg-red-700 text-white"
        >
          <PhoneOff className="w-4 h-4" />
          End Call
        </Button>
      )}

      {isCallActive && (
        <Badge
          variant="outline"
          className="gap-1.5 border-white/10 bg-white/5 text-white/80 font-mono text-xs"
        >
          <Clock className="w-3 h-3 text-red-400 animate-pulse" />
          {callDuration}
        </Badge>
      )}

      {voiceStatus && (
        <span className="text-xs text-white/40 ml-auto">{voiceStatus}</span>
      )}
    </div>
  );
}
