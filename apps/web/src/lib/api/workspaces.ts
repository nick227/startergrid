import { withDevOperatorHeaders } from '@/lib/devAuth.ts';
import { notifyUnauthorized } from './auth.ts';
export async function workspaceRequest<T>(dealerId: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/dealers/${encodeURIComponent(dealerId)}/${path}`, withDevOperatorHeaders({
    credentials: 'include', method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) notifyUnauthorized();
  if (!response.ok) throw new Error(data.error || 'Unable to load this workspace. Try again.');
  return data as T;
}
export type BusinessEvent = { id: string; category: string; title: string; detail: string; occurredAt: string; href: string; count: number };
export type BusinessFeed = { events: BusinessEvent[]; nextCursor: string | null };
export type SaleRow = { vehicleId: string; stockNumber: string; title: string; inventoryOutcome: string; statusChangedAt: string; transactionDate: string | null; salePriceCents: number | null; channel: string | null; evidence: string | null };
export type TeamComment = { id: string; body: string; authorEmail: string; createdAt: string };
export type TeamThread = { id: string; kind: 'POST' | 'ANNOUNCEMENT' | 'TASK'; title: string; body: string; authorEmail: string; createdAt: string; assigneeId: string | null; completedAt: string | null; reference: string | null; comments: TeamComment[] };
export type TeamData = { threads: TeamThread[]; members: { id: string; email: string }[]; truncated: boolean };
