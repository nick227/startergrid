const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export function sanitizeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function formatWebsiteHostname(raw: string): string {
  const safe = sanitizeExternalUrl(raw);
  if (!safe) return raw.replace(/^https?:\/\//i, '').split('/')[0] ?? raw;
  return new URL(safe).hostname.replace(/^www\./, '');
}
