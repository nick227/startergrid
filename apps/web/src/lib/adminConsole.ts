export type AdminPrimary = 'dealers' | 'problems' | 'settings';
export type SettingsJob = 'index' | 'platforms' | 'system' | 'users' | 'audit';
export type SettingsJobId = Exclude<SettingsJob, 'index'>;

export type SettingsJobCopy = {
  id: SettingsJobId;
  title: string;
  why: string;
  href: string;
};

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

export const SETTINGS_JOB_COPY: Record<SettingsJobId, SettingsJobCopy> = {
  platforms: {
    id: 'platforms',
    title: 'Destinations we support',
    why: 'Turn a destination on for every rooftop, or hide it. Check shared credentials when a rooftop cannot connect.',
    href: '#/admin/platforms',
  },
  system: {
    id: 'system',
    title: 'Is DealerGrid up',
    why: 'Whether the site can sign people in and send vehicles.',
    href: '#/admin/system',
  },
  users: {
    id: 'users',
    title: 'Who can sign in',
    why: 'Internal staff accounts and which dealerships they can help.',
    href: '#/admin/users',
  },
  audit: {
    id: 'audit',
    title: 'Recent changes',
    why: 'What staff changed recently across the site.',
    href: '#/admin/audit',
  },
};

export const SETTINGS_JOB_INDEX = Object.values(SETTINGS_JOB_COPY);
