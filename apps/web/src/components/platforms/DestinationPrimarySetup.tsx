import { ConnectionSetupPanel } from './ConnectionSetupPanel.tsx';
import { PlatformAvailabilityPanel } from './PlatformAvailabilityPanel.tsx';
import { PartnerSetupGuide, type PartnerSetupGuideData } from './PartnerSetupGuide.tsx';
import type { PlatformAccountDetail, PlatformPublishResult } from '@/lib/types.ts';
import { presentValidationNote } from '@/lib/partnerSetupPresentation.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { isInternalSupportRole } from '@/lib/operatorAccess.ts';

type RichAccount = PlatformAccountDetail & {
  operatorSetup?: PartnerSetupGuideData | null;
};

type Props = {
  dealerId: string;
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  onRefresh: () => void;
};

export function DestinationPrimarySetup({ dealerId, platform, account, onRefresh }: Props) {
  const { user } = useAuth();
  const isInternal = isInternalSupportRole(user?.role ?? '');
  const rich = account as RichAccount | null;
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

      {platform.integrationClass !== 'OWNED' && (
        <ConnectionSetupPanel
          dealerId={dealerId}
          platform={platform}
          account={account || undefined}
          onRefresh={onRefresh}
          hideInstructions={!!rich?.operatorSetup}
        />
      )}

      <PlatformAvailabilityPanel
        dealerId={dealerId}
        platform={platform}
        account={account}
        onRefresh={onRefresh}
      />

      {rich?.operatorSetup && <PartnerSetupGuide guide={rich.operatorSetup} />}
    </div>
  );
}
