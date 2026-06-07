import type { QueueItemView } from '@/lib/types.ts';
import { taskActionLabel, queueItemMeta } from '@/lib/queuePresentation.ts';
import { queueStatusVisual } from '@/lib/statusRegistry.ts';
import { formatAssetLead, operatorCopy } from '@/lib/copy/index.ts';
import { RowDetailDrawer } from '@/components/layout';

type Props = {
  item: QueueItemView;
  open: boolean;
  onClose: () => void;
};

export function QueueDetailDrawer({ item, open, onClose }: Props) {
  const status = queueStatusVisual(item.status);

  return (
    <RowDetailDrawer open={open} title={formatAssetLead(item.vehicleTitle, item.stockNumber)} onClose={onClose}>
      <dl className="space-y-3 text-sm">
        <Row label={operatorCopy.drawer.action} value={taskActionLabel(item.triggerKind)} />
        <Row label={operatorCopy.drawer.channel} value={item.platformName} />
        <Row label={operatorCopy.drawer.status} value={status.label} />
        <Row label={operatorCopy.drawer.policy} value={item.policyMode} />
        {item.blockReason && <Row label={operatorCopy.drawer.blockedBecause} value={item.blockReason} />}
        {item.approvalRequiredReason && <Row label={operatorCopy.drawer.needsApproval} value={item.approvalRequiredReason} />}
        {item.holdReason && <Row label={operatorCopy.drawer.onHold} value={item.holdReason} />}
        {item.scheduledFor && (
          <Row label={operatorCopy.drawer.scheduledFor} value={new Date(item.scheduledFor).toLocaleString()} />
        )}
        {item.attemptCount > 0 && <Row label={operatorCopy.drawer.attempts} value={String(item.attemptCount)} />}
        <Row label={operatorCopy.drawer.created} value={new Date(item.createdAt).toLocaleString()} />
      </dl>
      <p className="text-xs text-ink-faint mt-4 border-t border-silver-200 pt-3">{queueItemMeta(item)}</p>
    </RowDetailDrawer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-faint uppercase tracking-wide">{label}</dt>
      <dd className="text-ink-body mt-0.5">{value}</dd>
    </div>
  );
}
