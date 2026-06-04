import { OpenAPI } from '@auto-dealer/api-client';

type ViteImportMeta = ImportMeta & {
  env?: {
    VITE_DEV_OPERATOR_ID?: string;
  };
};

const DEV_OPERATOR_ID = (import.meta as ViteImportMeta).env?.VITE_DEV_OPERATOR_ID;

export function devOperatorHeaders(): Record<string, string> {
  const operatorId = DEV_OPERATOR_ID?.trim();
  return operatorId ? { 'x-operator-id': operatorId } : {};
}

export function withDevOperatorHeaders(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...devOperatorHeaders(),
      ...(init?.headers ?? {}),
    },
  };
}

export function configureSdkDevAuth(): void {
  OpenAPI.HEADERS = async () => devOperatorHeaders();
}
