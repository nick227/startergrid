import { ConnectionSetupPanel } from './ConnectionSetupPanel.tsx';
import { PlatformAvailabilityPanel } from './PlatformAvailabilityPanel.tsx';
import type { PlatformAccountDetail, PlatformPublishResult } from '@/lib/types.ts';
import { presentValidationNote } from '@/lib/partnerSetupPresentation.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { isInternalSupportRole } from '@/lib/operatorAccess.ts';

type Props = {
  dealerId: string;
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  onRefresh: () => void;
};

/**
 * Channel Settings controls: whether vehicles are sent here, and every connection field.
 * Step-by-step setup lives only in the setup wizard (ChannelSetupGuide), so no instructions here.
 */
export function DestinationPrimarySetup({ dealerId, platform, account, onRefresh }: Props) {
  const { user } = useAuth();
  const isInternal = isInternalSupportRole(user?.role ?? '');
  const validation = presentValidationNote(account?.liveValidationNote);

  return (
    <div className="space-y-6">
      {validation.dealer && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mb-0.5">
            Listings not confirmed yet
          </p>
          <p className="text-xs text-amber-800">{validation.dealer}</p>
          {isInternal && validation.technical && (
            <p className="mt-2 text-[11px] text-amber-900/70">{validation.technical}</p>
          )}
        </div>
      )}

      <PlatformAvailabilityPanel
        dealerId={dealerId}
        platform={platform}
        account={account}
        onRefresh={onRefresh}
      />

      {platform.integrationClass !== 'OWNED' && (
        <section className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-ink-heading">Connection details</h2>
          <p className="text-xs text-ink-muted mt-0.5 mb-4">Every field for this channel, including ones StarterGrid support usually fills in.</p>
          <ConnectionSetupPanel
            dealerId={dealerId}
            platform={platform}
            account={account || undefined}
            onRefresh={onRefresh}
            hideInstructions
          />
        </section>
      )}
    </div>
  );
}
