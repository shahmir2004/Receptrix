import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Loader2, Mic, PhoneOff, PhoneIncoming, Volume2 } from 'lucide-react';
import { fadeUp } from '@/lib/animations';
import { getErrorMessage, publicRequest } from '@/lib/api';
import AudioWaveform from './AudioWaveform';
import ShimmerButton from './ShimmerButton';

type DemoStatus = 'idle' | 'connecting' | 'live' | 'ending' | 'error';

interface VapiInstance {
  on(event: string, callback: (...args: any[]) => void): void;
  start(assistantId: string, assistantOverrides?: Record<string, unknown>): Promise<void> | void;
  stop(): void;
}

type VapiConstructor = new (publicKey: string) => VapiInstance;
type VapiModule = {
  default?: VapiConstructor | { default?: VapiConstructor };
  'module.exports'?: { default?: VapiConstructor };
};

interface WebCallConfig {
  public_key: string;
  assistant_id: string;
  business_id: string;
}

interface TranscriptLine {
  role: string;
  text: string;
}

export default function DemoPreview() {
  const vapiRef = useRef<VapiInstance | null>(null);
  const [status, setStatus] = useState<DemoStatus>('idle');
  const [message, setMessage] = useState('');
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  const isConnecting = status === 'connecting' || status === 'ending';
  const isLive = status === 'live';

  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
      vapiRef.current = null;
    };
  }, []);

  function resolveVapiConstructor(module: VapiModule): VapiConstructor {
    if (typeof module.default === 'function') {
      return module.default;
    }

    if (module.default && typeof module.default === 'object' && typeof module.default.default === 'function') {
      return module.default.default;
    }

    if (typeof module['module.exports']?.default === 'function') {
      return module['module.exports'].default;
    }

    throw new Error('Vapi web SDK did not expose a constructor.');
  }

  function attachVapiEvents(vapi: VapiInstance) {
    vapi.on('call-start', () => {
      setStatus('live');
      setMessage('Live demo is connected.');
    });

    vapi.on('call-end', () => {
      setStatus('idle');
      setAssistantSpeaking(false);
      setVolume(0);
      setMessage('Demo ended.');
      vapiRef.current = null;
    });

    vapi.on('speech-start', () => setAssistantSpeaking(true));
    vapi.on('speech-end', () => setAssistantSpeaking(false));
    vapi.on('volume-level', (level: number) => setVolume(Math.max(0, Math.min(1, level || 0))));

    vapi.on('message', (event: Record<string, unknown>) => {
      if (event.type !== 'transcript' || event.transcriptType !== 'final' || typeof event.transcript !== 'string') {
        return;
      }
      const role = typeof event.role === 'string' ? event.role : 'assistant';
      const text = event.transcript.trim();
      if (!text) return;
      setTranscript((current) => [...current.slice(-3), { role, text }]);
    });

    vapi.on('error', (error: unknown) => {
      console.error('Vapi web demo error', error);
      setStatus('error');
      setAssistantSpeaking(false);
      setMessage('Unable to start the web demo. Check microphone permission and Vapi demo settings.');
      vapiRef.current = null;
    });
  }

  async function startWebDemo() {
    setStatus('connecting');
    setMessage('');
    setTranscript([]);

    try {
      const { response, data } = await publicRequest<WebCallConfig>('/demo/web-call-config', { method: 'GET' });
      if (!response.ok) {
        throw new Error(getErrorMessage(data as unknown as Record<string, unknown>, 'Demo voice is not configured yet.'));
      }

      const Vapi = resolveVapiConstructor(await import('@vapi-ai/web') as VapiModule);
      const vapi = new Vapi(data.public_key);
      attachVapiEvents(vapi);
      vapiRef.current = vapi;

      await vapi.start(data.assistant_id, {
        firstMessage:
          'Hi, this is Receptrix. I am live in your browser now. Ask me to book a fake appointment, check clinic hours, or explain how I handle calls.',
        firstMessageMode: 'assistant-speaks-first',
        metadata: {
          receptrix_business_id: data.business_id,
          source: 'landing_page_web_demo',
          demo_call: 'true',
        },
        variableValues: {
          receptrix_business_id: data.business_id,
          demo_mode: 'web',
        },
      });
    } catch (error) {
      vapiRef.current?.stop();
      vapiRef.current = null;
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to start the web demo.');
    }
  }

  function stopWebDemo() {
    setStatus('ending');
    vapiRef.current?.stop();
  }

  return (
    <section id="demo" className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-500/70 font-medium mb-4">
            Live Demo
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Speak With Receptrix Right Here
          </h2>
          <p className="text-white/40 text-lg">
            Press the button and the AI receptionist starts talking in your browser
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="relative mx-auto max-w-md"
        >
          <div className="absolute -inset-8 -z-10 bg-gradient-to-b from-indigo-500/[0.07] via-indigo-500/[0.04] to-transparent rounded-[2.5rem] blur-3xl" />

          <div
            className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/[0.08]
                        shadow-[0_40px_80px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.05] bg-white/[0.02]">
              <span className="relative flex h-2 w-2">
                {(isLive || isConnecting) && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-green-400' : 'bg-white/25'}`} />
              </span>
              <span className="text-sm font-medium text-white/70">
                Receptrix AI &middot; {isLive ? 'Live' : isConnecting ? 'Connecting' : 'Ready'}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-white/25 font-mono">
                <Volume2 className="h-3.5 w-3.5" />
                {Math.round(volume * 100)}%
              </span>
            </div>

            <AudioWaveform />

            <div className="px-5 pb-5">
              <div className="bg-white/[0.04] border border-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-3 min-h-[112px]">
                {transcript.length ? (
                  <div className="space-y-2">
                    {transcript.map((line, index) => (
                      <p key={`${line.role}-${index}`} className="text-sm text-white/70 leading-relaxed">
                        <span className="text-white/35">{line.role === 'user' ? 'You' : 'Receptrix'}: </span>
                        {line.text}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/70 leading-relaxed">
                    {assistantSpeaking
                      ? 'Receptrix is speaking now.'
                      : 'Start the live demo and ask about booking a fake appointment, clinic hours, or call handoff.'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 px-5 py-4 border-t border-white/[0.05]">
              {[
                { icon: Calendar, label: 'Book Appt' },
                { icon: PhoneIncoming, label: 'Callback' },
                { icon: CheckCircle, label: 'Resolve' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-white/[0.04] border border-white/[0.07]
                             text-xs text-white/50"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-50px' }}
          className="mx-auto mt-14 max-w-2xl text-center"
        >
          <button
            type="button"
            onClick={isLive ? stopWebDemo : startWebDemo}
            disabled={isConnecting}
            className="inline-flex h-14 min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-7 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-white/35"
          >
            {status === 'connecting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLive ? (
              <PhoneOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            {status === 'connecting' ? 'Opening mic...' : isLive ? 'End Web Demo' : 'Start Live Web Demo'}
          </button>

          {message && (
            <p className={`mt-3 text-sm ${status === 'error' ? 'text-rose-300' : 'text-white/45'}`}>
              {message}
            </p>
          )}

          <div className="mt-5">
            <ShimmerButton to="/signup" size="lg">
              Start Free Trial
            </ShimmerButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
