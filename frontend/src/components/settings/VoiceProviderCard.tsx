export function VoiceProviderCard() {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Voice Provider Setup</h3>
      <p className="text-sm text-white/50 mb-4">
        To enable AI-powered phone call handling, follow these steps:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-white/70">
        <li>Sign up for Twilio or SignalWire</li>
        <li>Get your Account SID and Auth Token</li>
        <li>Configure a phone number</li>
        <li>
          Set the webhook URL to your Receptrix server{' '}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-indigo-400">
            https://your-server.com/voice/incoming
          </code>
        </li>
        <li>
          Set environment variables:{' '}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-indigo-400">
            VOICE_PROVIDER
          </code>
          ,{' '}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-indigo-400">
            TWILIO_ACCOUNT_SID
          </code>
          ,{' '}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-indigo-400">
            TWILIO_AUTH_TOKEN
          </code>
        </li>
      </ol>
    </div>
  );
}
