import { useEffect, useState } from 'react';
import { describeAutopilot, type AutopilotPreference } from '@/lib/autopilotStatus.ts';
import { fetchDealershipProfile, updateDealershipProfile } from '@/lib/api/sdk.ts';
import { AutopilotStatusCard } from './AutopilotStatusCard.tsx';

type Props = {
  dealerId: string;
  preference?: AutopilotPreference | null;
  connectedChannelCount?: number;
  persist?: (preference: AutopilotPreference) => Promise<void>;
  onUpdated?: (preference: AutopilotPreference) => void;
};

export function DealershipAutopilot({
  dealerId,
  preference,
  connectedChannelCount,
  persist,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState<AutopilotPreference | null>(preference ?? null);

  useEffect(() => {
    if (preference != null) {
      setLoaded(preference);
      return;
    }
    let live = true;
    fetchDealershipProfile(dealerId)
      .then((profile) => {
        if (live) setLoaded(profile.autopilotPreference ?? 'OFF');
      })
      .catch(() => {
        if (live) setLoaded('OFF');
      });
    return () => {
      live = false;
    };
  }, [dealerId, preference]);

  const current = loaded ?? preference ?? 'OFF';
  const view = describeAutopilot({ preference: current, connectedChannelCount });

  const apply = async (next: AutopilotPreference) => {
    setSaving(true);
    try {
      if (persist) await persist(next);
      else await updateDealershipProfile(dealerId, { autopilotPreference: next });
      setLoaded(next);
      onUpdated?.(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AutopilotStatusCard
      view={view}
      saving={saving}
      onPause={() => void apply('PAUSED')}
      onResume={() => void apply('ON')}
    />
  );
}
