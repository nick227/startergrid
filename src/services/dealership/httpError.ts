export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

/** A matching dealership already exists; staff callers may be told which one. */
export class DuplicateDealershipError extends HttpError {
  constructor(readonly existingDealershipId: string) {
    super(409, 'A dealership with matching business details already exists');
    this.name = 'DuplicateDealershipError';
  }
}

export function statusFromUnknown(err: unknown, fallback = 500): number {
  if (err instanceof HttpError) return err.statusCode;
  if (typeof err === 'object' && err !== null && 'statusCode' in err) {
    return Number((err as { statusCode?: number }).statusCode) || fallback;
  }
  return fallback;
}
