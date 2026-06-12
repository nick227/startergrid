export function formatDuration(sec: number | null): string {
  if (sec === null) return 'N/A';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}
