import type { QueueView } from '@/lib/types.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  view: QueueView;
  activeFilter: string;
  onFilter: (key: string) => void;
};

function Tile({
  label,
  value,
  active,
  onClick,
  tone = 'default',
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const toneCls =
    tone === 'danger' ? 'border-red-200 bg-red-50/60'
    : tone === 'warn' ? 'border-amber-200 bg-amber-50/60'
    : 'border-silver-200 bg-white';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition-colors hover:border-navy-400/40 ${
        active ? 'ring-2 ring-navy-500/30 border-navy-400/50' : toneCls
      }`}
    >
      <p className="text-2xl font-bold text-ink-heading tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold text-ink-muted mt-0.5">{label}</p>
    </button>
  );
}

export function QueueSummaryStrip({ view, activeFilter, onFilter }: Props) {
  const s = view.summary;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      <Tile
        label={operatorCopy.queue.tiles.scheduled}
        value={s.scheduled}
        active={activeFilter === 'SCHEDULED'}
        onClick={() => onFilter('SCHEDULED')}
      />
      <Tile
        label={operatorCopy.queue.tiles.needsApproval}
        value={s.needsApproval}
        active={activeFilter === 'NEEDS_APPROVAL'}
        onClick={() => onFilter('NEEDS_APPROVAL')}
        tone={s.needsApproval > 0 ? 'warn' : 'default'}
      />
      <Tile
        label={operatorCopy.queue.tiles.blocked}
        value={s.blocked}
        active={activeFilter === 'BLOCKED'}
        onClick={() => onFilter('BLOCKED')}
        tone={s.blocked > 0 ? 'danger' : 'default'}
      />
      <Tile
        label={operatorCopy.queue.tiles.ready}
        value={s.ready}
        active={activeFilter === 'READY'}
        onClick={() => onFilter('READY')}
      />
      <Tile
        label={operatorCopy.queue.tiles.held}
        value={s.held}
        active={activeFilter === 'HELD'}
        onClick={() => onFilter('HELD')}
      />
    </div>
  );
}
