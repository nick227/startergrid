import { OpenAPI } from '@auto-dealer/api-client';
import { devOperatorHeaders } from '../devAuth.ts';

let configured = false;

/** Same-origin API client — session cookies + optional dev header fallback. */
export function configureOpenApiClient(): void {
  if (configured) return;
  configured = true;
  OpenAPI.BASE = import.meta.env.VITE_API_URL ?? '';
  OpenAPI.WITH_CREDENTIALS = true;
  OpenAPI.CREDENTIALS = 'include';
  OpenAPI.HEADERS = async () => devOperatorHeaders();
}
