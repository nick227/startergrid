import type { DealerAccessRole, OperatorRole } from '@prisma/client';

export type CanonicalRole = 'SUPER_ADMIN' | 'INTERNAL_SUPPORT' | 'DEALER_OWNER' | 'DEALER_STAFF';

export type Capability =
  | 'create_dealership'
  | 'manage_onboarding'
  | 'view_access'
  | 'send_invite'
  | 'manage_dealer_users'
  | 'connect_channels'
  | 'change_autopilot'
  | 'edit_inventory'
  | 'manage_leads'
  | 'edit_site_integrations';

const ROLE_CAPABILITIES: Record<CanonicalRole, readonly Capability[]> = {
  SUPER_ADMIN: [
    'create_dealership', 'manage_onboarding', 'view_access', 'send_invite',
    'manage_dealer_users', 'connect_channels', 'change_autopilot',
    'edit_inventory', 'manage_leads', 'edit_site_integrations',
  ],
  INTERNAL_SUPPORT: [
    'create_dealership', 'manage_onboarding', 'view_access', 'send_invite',
    'manage_dealer_users', 'connect_channels', 'change_autopilot',
    'edit_inventory', 'manage_leads',
  ],
  DEALER_OWNER: [
    'view_access', 'send_invite', 'manage_dealer_users',
    'connect_channels', 'change_autopilot', 'edit_inventory', 'manage_leads',
  ],
  DEALER_STAFF: ['edit_inventory', 'manage_leads'],
};

export function canonicalizeRole(role: OperatorRole | string): CanonicalRole {
  if (role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (role === 'DEALER_STAFF') return 'DEALER_STAFF';
  if (role === 'DEALER_OWNER' || role === 'DEALER_OPERATOR') return 'DEALER_OWNER';
  return 'INTERNAL_SUPPORT';
}

export function isInternalStaffRole(role: OperatorRole | string): boolean {
  const canonical = canonicalizeRole(role);
  return canonical === 'SUPER_ADMIN' || canonical === 'INTERNAL_SUPPORT';
}

export function isDealerFacingRole(role: OperatorRole | string): boolean {
  const canonical = canonicalizeRole(role);
  return canonical === 'DEALER_OWNER' || canonical === 'DEALER_STAFF';
}

export function accessRoleForAccount(role: OperatorRole | string): DealerAccessRole {
  const canonical = canonicalizeRole(role);
  if (canonical === 'DEALER_STAFF') return 'DEALER_STAFF';
  if (canonical === 'DEALER_OWNER') return 'DEALER_OWNER';
  return 'INTERNAL_SUPPORT';
}

export function accountRoleForAccess(accessRole: DealerAccessRole): OperatorRole {
  if (accessRole === 'DEALER_STAFF') return 'DEALER_STAFF';
  if (accessRole === 'DEALER_OWNER') return 'DEALER_OWNER';
  return 'INTERNAL_SUPPORT';
}

export function hasCapability(
  role: OperatorRole | string,
  capability: Capability,
  accessRole?: DealerAccessRole | null,
): boolean {
  if (canonicalizeRole(role) === 'SUPER_ADMIN') return true;
  const scoped = accessRole ? canonicalizeRole(accessRole) : canonicalizeRole(role);
  return ROLE_CAPABILITIES[scoped].includes(capability);
}
