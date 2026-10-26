export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export function statusFromUnknown(err: unknown, fallback = 500): number {
  if (err instanceof HttpError) return err.statusCode;
  if (typeof err === 'object' && err !== null && 'statusCode' in err) {
    return Number((err as { statusCode?: number }).statusCode) || fallback;
  }
  return fallback;
}
