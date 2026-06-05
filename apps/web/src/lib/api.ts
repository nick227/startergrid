/**
 * Prefer api/sdk.ts for OpenAPI-covered routes.
 * This file is for legacy/manual multipart/import helpers only.
 */
import type { ImportPreviewResponse, CommitImportResponse } from './types.ts';
import { toErrorMessage } from './errors.ts';
import { withDevOperatorHeaders } from './devAuth.ts';

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, withDevOperatorHeaders(init));
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(toErrorMessage({ status: res.status, message: (body as { error?: string }).error }, `HTTP ${res.status}`));
  }
  return res.json() as Promise<T>;
}

export async function previewInventoryImport(
  dealershipId: string,
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Promise<ImportPreviewResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/inventory/import/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, mapping }),
  });
}

export async function commitInventoryImport(
  dealershipId: string,
  rows: Record<string, string>[],
  mapping: Record<string, string>
): Promise<CommitImportResponse> {
  return apiFetch(`/api/dealers/${dealershipId}/inventory/import/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, mapping }),
  });
}
