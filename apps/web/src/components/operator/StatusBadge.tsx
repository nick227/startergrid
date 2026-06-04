import { publishStateVisual, queueStatusVisual, accountStateVisual, type StatusVisual } from '../../lib/statusRegistry.ts';

type Props = {
  visual: StatusVisual;
  size?: 'sm' | 'md';
  showDot?: boolean;
};

export function StatusBadge({ visual, size = 'sm', showDot = true }: Props) {
  const text = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium ${text} ${visual.pill}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${visual.dot}`} />}
      {visual.label}
    </span>
  );
}

export function PublishStateBadge({ state }: { state: string }) {
  return <StatusBadge visual={publishStateVisual(state)} />;
}

export function QueueStatusBadge({ status }: { status: string }) {
  return <StatusBadge visual={queueStatusVisual(status)} />;
}

export function AccountStateBadge({ state }: { state: string }) {
  return <StatusBadge visual={accountStateVisual(state)} />;
}
