export function toErrorMessage(e: unknown, fallback = 'Failed'): string {
  const status = typeof e === 'object' && e !== null && 'status' in e
    ? Number((e as { status?: unknown }).status)
    : undefined;
  const message = e instanceof Error
    ? e.message
    : typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string'
      ? (e as { message: string }).message
      : fallback;

  if (status === 401 || message === 'Operator authentication required') {
    return 'Operator auth is not configured. Set VITE_DEV_OPERATOR_ID in apps/web/.env.local and DEV_OPERATOR_ID in the API environment for local development.';
  }

  if (status === 403 || message === 'Operator does not have access to this dealership') {
    return 'This operator is not allowed to access the selected organization. Update DEV_OPERATOR_DEALER_IDS or choose an allowed organization.';
  }

  return message;
}
