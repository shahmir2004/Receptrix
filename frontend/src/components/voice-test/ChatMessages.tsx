import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center text-white/40 text-sm px-4"
      >
        Start a conversation or begin a call simulation
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto space-y-3 p-4">
      {messages.map((msg, i) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={i}
            className={cn('flex gap-3 max-w-[85%]', isUser ? 'ml-auto flex-row-reverse' : '')}
          >
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                isUser ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white/70'
              )}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                isUser
                  ? 'bg-indigo-500/15 text-indigo-100 border border-indigo-500/20'
                  : 'bg-white/5 text-white/90 border border-white/10 backdrop-blur-sm'
              )}
            >
              <p className="font-medium text-[11px] mb-1 opacity-60">
                {isUser ? 'You' : 'AI Receptionist'}
              </p>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
