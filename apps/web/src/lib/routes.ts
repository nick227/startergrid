import type { OperatorNavHandlers } from './operatorNav.ts';

export type OperatorPageSegment = 'inventory' | 'accounts';

export type OperatorRoute = {
  dealerId: string | null;
  page: OperatorPageSegment | null;
};

export function parseOperatorRoute(): OperatorRoute {
  const match = window.location.hash.match(/^#\/([^/]+)(?:\/(.+))?/);
  if (!match) return { dealerId: null, page: null };
  const segment = match[2];
  const page: OperatorPageSegment | null =
    segment === 'inventory' ? 'inventory' : segment === 'accounts' ? 'accounts' : null;
  return { dealerId: match[1] ?? null, page };
}

export function dealerPickerHash(): string {
  return '';
}

export function operatorHash(dealerId: string, page?: OperatorPageSegment | null): string {
  if (!page) return `#/${dealerId}`;
  return `#/${dealerId}/${page}`;
}

export function buildOperatorNav(dealerId: string): OperatorNavHandlers {
  return {
    goToSync: () => { window.location.hash = operatorHash(dealerId); },
    goToInventory: () => { window.location.hash = operatorHash(dealerId, 'inventory'); },
    goToAccounts: () => { window.location.hash = operatorHash(dealerId, 'accounts'); },
    changeDealer: () => { window.location.hash = dealerPickerHash(); },
  };
}
