export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function timeUntil(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.ceil(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.ceil(hours / 24);
  return `${days}d`;
}

export function daysSince(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 86_400_000);
}
