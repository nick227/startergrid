// Cookie replay tests for marketplace auth (mp_session) — enable when Phase C ships.
//
// Product: Marketplace Consumer + Shared Infrastructure
// Blocked until:
//   - POST /api/marketplace/auth/login
//   - requireMarketplaceAuth middleware
//   - mp_session cookie (Path=/api/marketplace)

import { describe, it } from 'node:test';

describe.skip('marketplace mp_session cookie replay — Phase C', () => {
  it('mp_session does not authenticate operator GET /api/auth/me', () => {
    // inject GET /api/auth/me with Cookie: mp_session=...
  });

  it('op_session does not authenticate marketplace GET /api/marketplace/auth/me', () => {
    // inject GET /api/marketplace/auth/me with Cookie: op_session=...
  });

  it('mp_session cookie uses Path=/api/marketplace and name mp_session', () => {
    // assert Set-Cookie attributes on marketplace login response
  });
});
