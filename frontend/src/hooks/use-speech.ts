import { useRef, useState, useCallback, useEffect } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone blocked. Allow access in browser settings.',
  'no-speech': 'No speech detected. Try again.',
  'network': 'Network error. Speech recognition requires internet.',
  'aborted': 'Speech recognition was stopped.',
};

function getPreferredVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const preferred = voices.find(
    (v) =>
      v.name.includes('Female') ||
      v.name.includes('Samantha') ||
      v.name.toLowerCase().includes('victoria') ||
      v.name.toLowerCase().includes('karen') ||
      v.name.includes('Google UK English Female') ||
      v.name.includes('Microsoft Zira')
  );
  if (preferred) return preferred;
  const english = voices.find((v) => v.lang.startsWith('en'));
  return english || voices[0] || null;
}

export interface UseSpeechOptions {
  onResult?: (transcript: string) => void;
  onError?: (message: string) => void;
  onListeningChange?: (listening: boolean) => void;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize recognition once
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      optionsRef.current.onListeningChange?.(true);
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult[0]) {
        const transcript = lastResult[0].transcript.trim();
        if (transcript) {
          optionsRef.current.onResult?.(transcript);
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      optionsRef.current.onListeningChange?.(false);
      const msg = ERROR_MESSAGES[event.error] || `Speech error: ${event.error}`;
      optionsRef.current.onError?.(msg);
    };

    rec.onend = () => {
      setIsListening(false);
      optionsRef.current.onListeningChange?.(false);
    };

    recognitionRef.current = rec;

    return () => {
      rec.abort();
    };
  }, [isSupported]);

  // Load voices early
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const startListening = useCallback(async () => {
    const rec = recognitionRef.current;
    if (!rec) return;

    // Request mic permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      optionsRef.current.onError?.('Microphone access denied.');
      return;
    }

    try {
      rec.start();
    } catch {
      // Already started — restart
      rec.abort();
      setTimeout(() => {
        try {
          rec.start();
        } catch {
          // Silently fail
        }
      }, 200);
    }
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // Ignore
    }
  }, []);

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        resolve();
        return;
      }

      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.volume = 1;

      const voices = synth.getVoices();
      const voice = getPreferredVoice(voices);
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      synth.speak(utterance);
    });
  }, []);

  const cancelSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    speakText,
    cancelSpeech,
  };
}
