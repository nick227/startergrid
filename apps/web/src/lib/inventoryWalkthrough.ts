export type InventoryWalkthroughStep = {
  id: string;
  title: string;
  body: string;
};

export const INVENTORY_WALKTHROUGH_STEPS: InventoryWalkthroughStep[] = [
  {
    id: 'import',
    title: '1 · Bring stock in',
    body: 'Import CSV or connect a JSON/API feed. Readiness filters show what still blocks platform sync.',
  },
  {
    id: 'snapshot',
    title: '2 · Review feed snapshots',
    body: 'When a feed is authoritative, dry-run snapshot mode lists vehicles missing from the latest payload — not sold. Commit removals explicitly.',
  },
  {
    id: 'movement',
    title: '3 · Check movement',
    body: 'Expand a row for days vs similar stock and platform exposure. Sold and removed vehicles have their own lifecycle filters.',
  },
  {
    id: 'sync',
    title: '4 · Sync when ready',
    body: 'Send active, ready vehicles to platforms. Benchmark freshness shows when movement signals last updated.',
  },
];

const STORAGE_KEY = 'ads-portal-inventory-walkthrough-dismissed';

export function isInventoryWalkthroughDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissInventoryWalkthrough(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function resetInventoryWalkthroughDismissed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
