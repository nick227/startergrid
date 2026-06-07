import type { QueueItemView } from '@/lib/types.ts';
import { taskActionLabel, queueItemMeta } from '@/lib/queuePresentation.ts';
import { queueStatusVisual } from '@/lib/statusRegistry.ts';
import { assetLeadLine } from '@/lib/copy/automotive.ts';
import { RowDetailDrawer } from '@/components/layout';

type Props = {
  item: QueueItemView;
  open: boolean;
  onClose: () => void;
};

export function QueueDetailDrawer({ item, open, onClose }: Props) {
  const status = queueStatusVisual(item.status);

  return (
    <RowDetailDrawer open={open} title={assetLeadLine(item.vehicleTitle, item.stockNumber)} onClose={onClose}>
      <dl className="space-y-3 text-sm">
        <Row label="Action" value={taskActionLabel(item.triggerKind)} />
        <Row label="Channel" value={item.platformName} />
        <Row label="Status" value={status.label} />
        <Row label="Policy" value={item.policyMode} />
        {item.blockReason && <Row label="Blocked because" value={item.blockReason} />}
        {item.approvalRequiredReason && <Row label="Needs approval" value={item.approvalRequiredReason} />}
        {item.holdReason && <Row label="On hold" value={item.holdReason} />}
        {item.scheduledFor && (
          <Row label="Scheduled for" value={new Date(item.scheduledFor).toLocaleString()} />
        )}
        {item.attemptCount > 0 && <Row label="Attempts" value={String(item.attemptCount)} />}
        <Row label="Created" value={new Date(item.createdAt).toLocaleString()} />
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
