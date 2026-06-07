import type { OperatorUser } from '@/lib/api/auth.ts';
import { OperatorIdentityResponse } from '@auto-dealer/api-client';

type ViteImportMeta = ImportMeta & {
  env?: {
    VITE_DEV_OPERATOR_ID?: string;
    VITE_DEV_OPERATOR_DEALER_IDS?: string;
    DEV?: boolean;
  };
};

const env = (import.meta as ViteImportMeta).env;
const DEV_OPERATOR_ID = env?.VITE_DEV_OPERATOR_ID;

export function devOperatorHeaders(): Record<string, string> {
  const operatorId = DEV_OPERATOR_ID?.trim();
  return operatorId ? { 'x-operator-id': operatorId } : {};
}

export function withDevOperatorHeaders(init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: 'include',
    headers: {
      ...devOperatorHeaders(),
      ...(init?.headers ?? {}),
    },
  };
}

export function devBypassIdentity(): OperatorUser | null {
  if (!env?.DEV) return null;
  const id = DEV_OPERATOR_ID?.trim();
  if (!id) return null;

  const dealerAccessIds = (env.VITE_DEV_OPERATOR_DEALER_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return {
    id,
    email: 'dev@local',
    role: OperatorIdentityResponse.role.SUPER_ADMIN,
    dealerAccessIds,
    devBypass: true,
  };
}

export function isDevBypassConfigured(): boolean {
  return Boolean(env?.DEV && DEV_OPERATOR_ID?.trim());
}
