import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accessRoleForAccount,
  canonicalizeRole,
  hasCapability,
  isDealerFacingRole,
  isInternalStaffRole,
} from '../services/dealership/permissions.js';

describe('role migration aliases', () => {
  it('maps OPERATOR to INTERNAL_SUPPORT', () => {
    assert.equal(canonicalizeRole('OPERATOR'), 'INTERNAL_SUPPORT');
    assert.equal(isInternalStaffRole('OPERATOR'), true);
  });

  it('maps DEALER_OPERATOR to DEALER_OWNER', () => {
    assert.equal(canonicalizeRole('DEALER_OPERATOR'), 'DEALER_OWNER');
    assert.equal(isDealerFacingRole('DEALER_OPERATOR'), true);
  });

  it('keeps SUPER_ADMIN global', () => {
    assert.equal(canonicalizeRole('SUPER_ADMIN'), 'SUPER_ADMIN');
    assert.equal(hasCapability('SUPER_ADMIN', 'edit_site_integrations'), true);
  });
});

describe('capabilities', () => {
  it('dealer staff cannot invite or change Autopilot', () => {
    assert.equal(hasCapability('DEALER_STAFF', 'send_invite', 'DEALER_STAFF'), false);
    assert.equal(hasCapability('DEALER_STAFF', 'change_autopilot', 'DEALER_STAFF'), false);
    assert.equal(hasCapability('DEALER_STAFF', 'manage_leads', 'DEALER_STAFF'), true);
  });

  it('dealer owner can invite and change Autopilot', () => {
    assert.equal(hasCapability('DEALER_OWNER', 'send_invite', 'DEALER_OWNER'), true);
    assert.equal(hasCapability('DEALER_OWNER', 'change_autopilot', 'DEALER_OWNER'), true);
  });

  it('internal support cannot edit site integrations', () => {
    assert.equal(hasCapability('INTERNAL_SUPPORT', 'create_dealership'), true);
    assert.equal(hasCapability('INTERNAL_SUPPORT', 'edit_site_integrations'), false);
  });

  it('accessRoleForAccount follows the migrated roles', () => {
    assert.equal(accessRoleForAccount('DEALER_OPERATOR'), 'DEALER_OWNER');
    assert.equal(accessRoleForAccount('OPERATOR'), 'INTERNAL_SUPPORT');
  });
});
