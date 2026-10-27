/** Vehicle can be listed — not the same as already sent. */
export function vehicleReadinessText(readiness: string): string {
  if (readiness === 'BLOCKED') return 'Cannot list';
  if (readiness === 'WARNING') return 'Needs details';
  return 'Ready to send';
}

/** Publication outcome. Sent is not verified live. */
export function publicationStatusText(liveCount?: number): string {
  return (liveCount ?? 0) > 0 ? 'Sent' : 'Not sent yet';
}

/** Combined listing column for callers that still want one phrase. */
export function listingStatusText(input: {
  readiness: string;
  liveCount?: number;
}): string {
  if (input.readiness === 'BLOCKED') return 'Cannot list';
  if (input.readiness === 'WARNING') return 'Needs details';
  if ((input.liveCount ?? 0) > 0) return 'Sent';
  return 'Ready to send';
}
