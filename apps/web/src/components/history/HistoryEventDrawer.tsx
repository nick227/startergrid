import type { SyncEvent } from '@/lib/types.ts';
import { historyEventKindLabel, historyEventMeta, historyEventSecondaryMeta } from '@/lib/historyPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { RowDetailDrawer } from '@/components/layout';

type Props = {
  event: SyncEvent;
  open: boolean;
  onClose: () => void;
};

export function HistoryEventDrawer({ event, open, onClose }: Props) {
  return (
    <RowDetailDrawer open={open} title={historyEventKindLabel(event)} onClose={onClose}>
      <dl className="space-y-3 text-sm">
        <Row label="Recorded" value={historyEventMeta(event)} />
        {event.platformSlug && (
          <Row label={operatorCopy.drawer.channel} value={event.platformSlug} />
        )}
        <Row label="Event type" value={event.kind} />
        {event.vehicleId && <Row label="Asset ID" value={event.vehicleId} />}
      </dl>
      <p className="text-xs text-ink-faint mt-4 border-t border-silver-200 pt-3">
        {historyEventSecondaryMeta(event)}
      </p>
    </RowDetailDrawer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-faint uppercase tracking-wide">{label}</dt>
      <dd className="text-ink-body mt-0.5 break-all">{value}</dd>
    </div>
  );
}
