/**
 * Navigation URLs for cross-application links:
 * - Dealership & Operator Portal (/app/)
 * - Consumer Marketplace (/marketplace/)
 * - Core API Health check (/api/health)
 *
 * Local Dev (port 5175):
 * - Operator Portal runs on Vite dev server at http://localhost:5173/app/
 * - Consumer Marketplace runs on Vite dev server at http://localhost:5174/marketplace/
 *
 * Production (Fastify single-service host serving all three SPAs):
 * - Operator Portal is mounted at /app/
 * - Consumer Marketplace is mounted at /marketplace/
 * - REST API is mounted at /api/ (health at /api/health or /health)
 */

export function isLocalDev(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost')
  );
}

export function getOperatorPortalUrl(path = ''): string {
  const envUrl = (import.meta.env.VITE_OPERATOR_URL as string | undefined)?.trim();
  const cleanPath = path ? (path.startsWith('/') ? path.slice(1) : path) : '';
  if (envUrl) {
    const base = envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
    return cleanPath ? `${base}${cleanPath}` : base;
  }

  if (isLocalDev()) {
    return cleanPath ? `http://localhost:5173/app/${cleanPath}` : 'http://localhost:5173/app/';
  }

  return cleanPath ? `/app/${cleanPath}` : '/app/';
}

export function getMarketplaceUrl(path = ''): string {
  const envUrl = (import.meta.env.VITE_MARKETPLACE_URL as string | undefined)?.trim();
  const cleanPath = path ? (path.startsWith('/') ? path.slice(1) : path) : '';
  if (envUrl) {
    const base = envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
    return cleanPath ? `${base}${cleanPath}` : base;
  }

  if (isLocalDev()) {
    return cleanPath ? `http://localhost:5174/marketplace/${cleanPath}` : 'http://localhost:5174/marketplace/';
  }

  return cleanPath ? `/marketplace/${cleanPath}` : '/marketplace/';
}

export function getHealthUrl(): string {
  if (isLocalDev()) {
    return 'http://localhost:3000/health';
  }
  return '/api/health';
}
