type NavigationGuard = (nextHash: string) => boolean;

let guard: NavigationGuard | null = null;
let shownHash = typeof window === 'undefined' ? '' : window.location.hash;

/** One active form can hold in-app hash changes until the person confirms. */
export function setNavigationGuard(next: NavigationGuard | null): void {
  guard = next;
}

/**
 * Call from each hashchange listener before applying the route.
 * A blocked change is restored here, before React commits another page.
 * Returns false only for the listener that performed that restore.
 */
export function acceptHashChange(): boolean {
  const nextHash = window.location.hash;
  if (nextHash === shownHash) return true;
  if (guard?.(nextHash)) {
    window.location.hash = shownHash;
    return false;
  }
  shownHash = nextHash;
  return true;
}
