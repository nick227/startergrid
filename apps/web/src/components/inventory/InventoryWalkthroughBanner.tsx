import { useState } from 'react';
import {
  dismissInventoryWalkthrough,
  INVENTORY_WALKTHROUGH_STEPS,
  isInventoryWalkthroughDismissed,
} from '@/lib/inventoryWalkthrough.ts';

export function InventoryWalkthroughBanner() {
  const [dismissed, setDismissed] = useState(isInventoryWalkthroughDismissed);
  const [open, setOpen] = useState(!dismissed);

  if (dismissed && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-status-success-text hover:underline"
      >
        Show inventory walkthrough
      </button>
    );
  }

  const handleDismiss = () => {
    dismissInventoryWalkthrough();
    setDismissed(true);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-status-success-border bg-status-success-bg/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-heading">Inventory walkthrough</p>
          <p className="text-xs text-ink-body mt-0.5">
            Trust the flow — import, snapshot review, movement checks, then sync.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-semibold text-ink-muted hover:text-ink-body shrink-0"
        >
          Dismiss
        </button>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {INVENTORY_WALKTHROUGH_STEPS.map(step => (
          <li key={step.id} className="rounded-lg bg-white/80 border border-status-success-border/80 px-3 py-2">
            <p className="text-xs font-bold text-navy-800">{step.title}</p>
            <p className="text-[11px] text-ink-body mt-0.5 leading-snug">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
