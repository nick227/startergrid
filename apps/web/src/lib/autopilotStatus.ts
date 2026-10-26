export type AutopilotPreference = 'OFF' | 'ON' | 'PAUSED';

export type AutopilotView = {
  preference: AutopilotPreference;
  label: string;
  tone: 'off' | 'on' | 'paused';
  summary: string;
  guidance: string;
  canPause: boolean;
  canResume: boolean;
};

export function describeAutopilot(input: {
  preference?: AutopilotPreference | null;
  lastVerifiedAt?: string | null;
  connectedChannelCount?: number;
}): AutopilotView {
  const preference = input.preference ?? 'OFF';
  const connected = input.connectedChannelCount ?? 0;
  const lastVerified = formatWhen(input.lastVerifiedAt);

  if (preference === 'PAUSED') {
    return {
      preference,
      label: 'Paused',
      tone: 'paused',
      summary: 'Eligible updates are held until Autopilot is resumed.',
      guidance: 'Resume only after the current exception is fixed.',
      canPause: false,
      canResume: true,
    };
  }

  if (preference === 'ON') {
    return {
      preference,
      label: lastVerified ? 'On' : 'On · not verified yet',
      tone: 'on',
      summary: lastVerified
        ? `Last verified update ${lastVerified}.`
        : 'Intent is on. We have not confirmed a successful distribution yet.',
      guidance: connected > 0
        ? `${connected} channel${connected === 1 ? '' : 's'} connected. Connected is not the same as live.`
        : 'No connected channels yet. Our team turns destinations on after they qualify.',
      canPause: true,
      canResume: false,
    };
  }

  return {
    preference: 'OFF',
    label: 'Off',
    tone: 'off',
    summary: 'Autopilot is not on for this dealership.',
    guidance: 'Our team turns this on after the first qualified channel is ready.',
    canPause: false,
    canResume: false,
  };
}

function formatWhen(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
