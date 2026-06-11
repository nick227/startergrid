import {
  ApiError,
  AuthService,
  type OperatorIdentityResponse,
} from '@auto-dealer/api-client';
import { configureOpenApiClient } from './configureOpenApi.ts';
import { toErrorMessage } from '../errors.ts';

configureOpenApiClient();

export type OperatorUser = OperatorIdentityResponse & { devBypass?: boolean, avatarUrl?: string };

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function subscribeUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function notifyUnauthorized(): void {
  for (const listener of unauthorizedListeners) listener();
}

export class OperatorAuthError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OperatorAuthError';
    this.status = status;
  }
}

function toAuthError(e: unknown): OperatorAuthError {
  if (e instanceof ApiError) {
    const body = e.body as { error?: string } | undefined;
    return new OperatorAuthError(
      toErrorMessage({ status: e.status, message: body?.error ?? e.message }, e.message),
      e.status,
    );
  }
  if (e instanceof Error) return new OperatorAuthError(e.message);
  return new OperatorAuthError('Request failed');
}

export async function fetchOperatorMe(): Promise<OperatorUser> {
  try {
    return await AuthService.getOperatorMe();
  } catch (e) {
    throw toAuthError(e);
  }
}

export async function loginOperator(email: string, password: string): Promise<OperatorUser> {
  try {
    return await AuthService.operatorLogin({ requestBody: { email, password } });
  } catch (e) {
    throw toAuthError(e);
  }
}

export async function logoutOperator(): Promise<void> {
  try {
    await AuthService.operatorLogout();
  } catch {
    // Logout is idempotent — always clear local state.
  }
}

export async function uploadOperatorAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append('avatar', file);

  const res = await fetch('/api/auth/avatar', {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload avatar');
  }
  return res.json();
}
