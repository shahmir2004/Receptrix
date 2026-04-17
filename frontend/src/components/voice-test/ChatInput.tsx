import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onToggleMic: () => void;
  isListening: boolean;
  isSpeechSupported: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  onToggleMic,
  isListening,
  isSpeechSupported,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex items-center gap-2 p-4 border-t border-white/10">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 bg-[#111] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-indigo-500/30"
      />

      {isSpeechSupported && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onToggleMic}
          disabled={disabled}
          className={cn(
            'border-white/10 transition-all duration-200',
            isListening
              ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse hover:bg-red-500/30 hover:text-red-300'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          )}
          title={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
      )}

      <Button
        type="button"
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-40"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
