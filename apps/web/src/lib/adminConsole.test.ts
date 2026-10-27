import { describe, expect, it } from 'vitest';
import { adminPrimaryFromRoute, settingsJobFromSlug, SETTINGS_JOB_COPY } from './adminConsole.ts';

describe('adminPrimaryFromRoute', () => {
  it('defaults to the dealership work list', () => {
    expect(adminPrimaryFromRoute(null, null)).toBe('dealers');
    expect(adminPrimaryFromRoute(null, 'dealers')).toBe('dealers');
    expect(adminPrimaryFromRoute('d1', 'platforms')).toBe('dealers');
  });

  it('sends operations hashes to Problems', () => {
    expect(adminPrimaryFromRoute(null, 'operations')).toBe('problems');
    expect(adminPrimaryFromRoute(null, 'blockers')).toBe('problems');
  });

  it('keeps the four platform tools under Settings', () => {
    expect(adminPrimaryFromRoute(null, 'settings')).toBe('settings');
    expect(adminPrimaryFromRoute(null, 'platforms')).toBe('settings');
    expect(adminPrimaryFromRoute(null, 'system')).toBe('settings');
    expect(adminPrimaryFromRoute(null, 'users')).toBe('settings');
    expect(adminPrimaryFromRoute(null, 'audit')).toBe('settings');
  });
});

describe('settingsJobFromSlug', () => {
  it('opens the job index from /admin/settings', () => {
    expect(settingsJobFromSlug('settings')).toBe('index');
    expect(settingsJobFromSlug('platforms')).toBe('platforms');
    expect(settingsJobFromSlug('integrations')).toBe('platforms');
  });
});

describe('SETTINGS_JOB_COPY', () => {
  it('names the four jobs, not the old subsystems', () => {
    expect(SETTINGS_JOB_COPY.platforms.title).toBe('Destinations we support');
    expect(SETTINGS_JOB_COPY.system.title).toBe('Is DealerGrid up');
    expect(SETTINGS_JOB_COPY.users.title).toBe('Who can sign in');
    expect(SETTINGS_JOB_COPY.audit.title).toBe('Recent changes');
  });
});
