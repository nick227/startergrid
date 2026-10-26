import { ownerLabel, ownerTone } from '@/lib/taskOwnership.ts';

const TONE_CLASS: Record<string, string> = {
  you: 'bg-amber-50 text-amber-900 border-amber-200',
  team: 'bg-silver-50 text-navy-900 border-navy-200',
  system: 'bg-silver-100 text-ink-heading border-silver-300',
  partner: 'bg-silver-50 text-ink-body border-silver-200',
};

type Props = {
  action: string;
  ownerKind?: string | null;
  ownerName?: string | null;
  due?: string | null;
};

export function OwnershipLine({ action, ownerKind, ownerName, due }: Props) {
  const tone = ownerTone(ownerKind);
  return (
    <p className="text-xs text-ink-body flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        Next: <span className="font-medium text-ink-heading">{action}</span>
      </span>
      <span className="text-silver-300" aria-hidden="true">·</span>
      <span className={`inline-flex px-1.5 py-0.5 rounded border text-[11px] font-medium ${TONE_CLASS[tone]}`}>
        {ownerLabel(ownerKind, ownerName)}
      </span>
      {due && (
        <>
          <span className="text-silver-300" aria-hidden="true">·</span>
          <span className="text-ink-muted">{due}</span>
        </>
      )}
    </p>
  );
}
