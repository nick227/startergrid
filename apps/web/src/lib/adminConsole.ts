export type AdminPrimary = 'dealers' | 'problems' | 'settings';
export type SettingsJob = 'index' | 'platforms' | 'system' | 'users' | 'audit';

const PROBLEMS = new Set(['operations', 'insights', 'blockers', 'blocked-dealers']);

const SETTINGS_JOBS: Record<string, SettingsJob> = {
  settings: 'index',
  platforms: 'platforms',
  integrations: 'platforms',
  system: 'system',
  audit: 'audit',
  users: 'users',
};

export const ADMIN_PRIMARY_HASH: Record<AdminPrimary, string> = {
  dealers: '#/admin/dealers',
  problems: '#/admin/operations',
  settings: '#/admin/settings',
};

export function adminPrimaryFromRoute(adminDealerId: string | null, platformSlug: string | null): AdminPrimary {
  if (adminDealerId) return 'dealers';
  if (!platformSlug || platformSlug === 'dealers') return 'dealers';
  if (PROBLEMS.has(platformSlug)) return 'problems';
  if (platformSlug in SETTINGS_JOBS) return 'settings';
  return 'dealers';
}

export function settingsJobFromSlug(platformSlug: string | null): SettingsJob {
  if (!platformSlug) return 'index';
  return SETTINGS_JOBS[platformSlug] ?? 'index';
}
