export function toErrorMessage(e: unknown, fallback = 'Failed'): string {
  return e instanceof Error ? e.message : fallback;
}
