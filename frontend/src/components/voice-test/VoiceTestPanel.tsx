import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import { authedRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useSpeech } from '@/hooks/use-speech';
import { CallControls } from './CallControls';
import { ChatMessages, type ChatMessage } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface ChatResponse {
  success: boolean;
  message: string;
  reply?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function VoiceTestPanel() {
  const { hasActiveBusinessContext } = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  const conversationHistoryRef = useRef<ChatMessage[]>([]);
  const isCallActiveRef = useRef(false);
  const isVoiceModeActiveRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);
  useEffect(() => {
    isVoiceModeActiveRef.current = isVoiceModeActive;
  }, [isVoiceModeActive]);

  const speech = useSpeech({
    onResult: (transcript) => {
      handleSendMessage(transcript);
    },
    onError: (msg) => {
      setVoiceStatus(msg);
      toast.show(msg, 'error');
    },
    onListeningChange: (listening) => {
      if (listening) {
        setVoiceStatus('Listening...');
      } else if (isCallActiveRef.current && isVoiceModeActiveRef.current) {
        setVoiceStatus('Click microphone to continue speaking');
      } else {
        setVoiceStatus('');
      }
    },
  });

  // Call duration timer
  useEffect(() => {
    if (!isCallActive || !callStartTime) return;
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isCallActive, callStartTime]);

  const appendMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const msg: ChatMessage = { role, content };
    setMessages((prev) => [...prev, msg]);
    conversationHistoryRef.current = [...conversationHistoryRef.current, msg];
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      if (!hasActiveBusinessContext()) {
        toast.show('Create your business in Settings before using voice test.', 'error');
        return;
      }

      // Add user message to UI immediately
      const userMsg: ChatMessage = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);

      // Build history from ref (prior messages only), then add user message after sending
      const historyForRequest = [...conversationHistoryRef.current];
      conversationHistoryRef.current = [...conversationHistoryRef.current, userMsg];

      setIsSending(true);
      try {
        const data = await authedRequest<ChatResponse>('/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: text,
            conversation_history: historyForRequest,
          }),
        });

        const reply = data.message || data.reply || '';
        appendMessage('assistant', reply);

        if (isVoiceModeActiveRef.current && reply) {
          setVoiceStatus('AI is speaking...');
          await speech.speakText(reply);

          // After speaking, auto-start listening if in call
          if (isCallActiveRef.current && isVoiceModeActiveRef.current) {
            setVoiceStatus('Your turn to speak...');
            setTimeout(() => {
              if (isCallActiveRef.current && !speech.isListening) {
                speech.startListening();
              }
            }, 500);
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
        appendMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        toast.show(errorMsg, 'error');
      } finally {
        setIsSending(false);
      }
    },
    [hasActiveBusinessContext, toast, appendMessage, speech]
  );

  const handleToggleVoiceMode = useCallback(() => {
    setIsVoiceModeActive((prev) => {
      const next = !prev;
      if (next) {
        setVoiceStatus('AI will speak responses. Click "Start Call" to begin!');
      } else {
        setVoiceStatus('');
        speech.cancelSpeech();
      }
      return next;
    });
  }, [speech]);

  const handleStartCall = useCallback(async () => {
    if (!hasActiveBusinessContext()) {
      toast.show('Create your business in Settings before using voice test.', 'error');
      return;
    }

    // Clear conversation
    setMessages([]);
    conversationHistoryRef.current = [];

    setIsCallActive(true);
    setCallStartTime(Date.now());
    setCallDuration(0);
    setVoiceStatus('Call in progress...');

    // Enable voice mode if not already
    if (!isVoiceModeActiveRef.current) {
      setIsVoiceModeActive(true);
    }

    // Speak greeting
    const greeting = 'Thank you for calling. My name is Sarah, how may I assist you today?';
    appendMessage('assistant', greeting);

    setVoiceStatus('AI is speaking...');
    await speech.speakText(greeting);

    if (isCallActiveRef.current) {
      setVoiceStatus('Your turn to speak...');
      setTimeout(() => {
        if (isCallActiveRef.current) {
          speech.startListening();
        }
      }, 500);
    }
  }, [hasActiveBusinessContext, toast, appendMessage, speech]);

  const handleEndCall = useCallback(async () => {
    setIsCallActive(false);
    setCallStartTime(null);
    setVoiceStatus('Call ended.');

    speech.cancelSpeech();
    speech.stopListening();

    const farewell = 'Thank you for calling. Have a great day!';
    appendMessage('assistant', farewell);

    await speech.speakText(farewell);
    setVoiceStatus('');
  }, [speech, appendMessage]);

  const handleToggleMic = useCallback(() => {
    if (speech.isListening) {
      speech.stopListening();
    } else {
      speech.startListening();
    }
  }, [speech]);

  return (
    <Card className="flex flex-col h-full bg-black/40 border-white/10 backdrop-blur-sm">
      <CardHeader className="pb-0">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Phone className="w-5 h-5 text-indigo-400" />
          Voice Test
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 p-0 pt-2">
        <CallControls
          isVoiceModeActive={isVoiceModeActive}
          isCallActive={isCallActive}
          callDuration={formatDuration(callDuration)}
          voiceStatus={voiceStatus}
          isSpeechSupported={speech.isSupported}
          onToggleVoiceMode={handleToggleVoiceMode}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
        />
        <ChatMessages messages={messages} />
        <ChatInput
          onSendMessage={handleSendMessage}
          onToggleMic={handleToggleMic}
          isListening={speech.isListening}
          isSpeechSupported={speech.isSupported}
          disabled={isSending}
        />
      </CardContent>
    </Card>
  );
}
