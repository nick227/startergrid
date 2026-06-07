import type { PlatformPublishResult, PlatformAccountDetail } from '@/lib/types.ts';
import { friendlyPlatformDetail, platformOutcomeMeta } from '@/lib/syncPresentation.ts';
import { platformConnection } from '@/lib/platformPresentation.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { AccountEditForm } from './AccountEditForm.tsx';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { RowDetailDrawer } from '@/components/layout';

type Props = {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  dealerId: string;
  nav: OperatorNavHandlers;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function PlatformDetailDrawer({
  platform,
  account,
  dealerId,
  nav,
  open,
  onClose,
  onSaved,
}: Props) {
  const connection = platformConnection(platform);
  const publish = platformOutcomeMeta(platform);
  const detail = friendlyPlatformDetail(platform);

  return (
    <RowDetailDrawer open={open} title={platform.platformName} onClose={onClose}>
      <div className="space-y-5">
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-semibold text-ink-heading">{operatorCopy.drawer.connection}: </span>
            <span>{connection.label}</span>
          </p>
          <p>
            <span className="font-semibold text-ink-heading">{operatorCopy.drawer.publishStatus}: </span>
            <span>{publish.label}</span>
          </p>
          {detail && <p className="text-ink-muted text-xs">{detail}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => nav.goToPlatformQueue(platform.platformSlug)}
            className="text-xs font-semibold text-orange-600 hover:underline"
          >
            {operatorCopy.drawer.openQueue}
          </button>
          <button
            type="button"
            onClick={() => nav.goToPlatformHistory(platform.platformSlug)}
            className="text-xs font-semibold text-navy-600 hover:underline"
          >
            {operatorCopy.drawer.viewHistory}
          </button>
        </div>

        {account ? (
          <div className="border-t border-silver-200 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-3">{operatorCopy.drawer.accountSetup}</h4>
            <AccountEditForm
              account={account}
              dealerId={dealerId}
              onSaved={onSaved}
            />
          </div>
        ) : (
          <p className="text-xs text-ink-muted">{operatorCopy.drawer.accountLoading}</p>
        )}
      </div>
    </RowDetailDrawer>
  );
}
