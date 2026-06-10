import { describe, it, expect } from 'vitest';
import { buildTabs, type TabCapabilityFlags } from './platformDrawerTabs.ts';

const none: TabCapabilityFlags = {
  socialPosting: false,
  catalogSync: false,
  marketplaceListing: false,
  leadSync: false,
};

function keys(flags: TabCapabilityFlags) {
  return buildTabs(flags).map(t => t.key);
}

// ── baseline ─────────────────────────────────────────────────────────────────

describe('buildTabs — baseline (no capability flags)', () => {
  it('returns setup, feed, activity, notes', () => {
    expect(keys(none)).toEqual(['setup', 'feed', 'activity', 'notes']);
  });

  it('returns exactly four tabs', () => {
    expect(buildTabs(none)).toHaveLength(4);
  });
});

// ── socialPosting lane ────────────────────────────────────────────────────────

describe('buildTabs — socialPosting', () => {
  const flags = { ...none, socialPosting: true };

  it('inserts Social tab at position 1 (after Setup)', () => {
    expect(keys(flags)[1]).toBe('social');
  });

  it('tab label is "Social"', () => {
    const social = buildTabs(flags).find(t => t.key === 'social');
    expect(social?.label).toBe('Social');
  });

  it('Notes remains last', () => {
    const tabs = keys(flags);
    expect(tabs[tabs.length - 1]).toBe('notes');
  });

  it('does not add catalog, listing, or leads', () => {
    const k = keys(flags);
    expect(k).not.toContain('catalog');
    expect(k).not.toContain('listing');
    expect(k).not.toContain('leads');
  });
});

// ── catalogSync lane ──────────────────────────────────────────────────────────

describe('buildTabs — catalogSync', () => {
  const flags = { ...none, catalogSync: true };

  it('inserts Catalog tab before Notes', () => {
    const k = keys(flags);
    expect(k[k.length - 2]).toBe('catalog');
    expect(k[k.length - 1]).toBe('notes');
  });

  it('tab label is "Catalog"', () => {
    const catalog = buildTabs(flags).find(t => t.key === 'catalog');
    expect(catalog?.label).toBe('Catalog');
  });

  it('does not add social, listing, or leads', () => {
    const k = keys(flags);
    expect(k).not.toContain('social');
    expect(k).not.toContain('listing');
    expect(k).not.toContain('leads');
  });
});

// ── marketplaceListing lane ───────────────────────────────────────────────────

describe('buildTabs — marketplaceListing', () => {
  const flags = { ...none, marketplaceListing: true };

  it('inserts Listings tab before Notes', () => {
    const k = keys(flags);
    expect(k[k.length - 2]).toBe('listing');
    expect(k[k.length - 1]).toBe('notes');
  });

  it('tab label is "Listings"', () => {
    const listing = buildTabs(flags).find(t => t.key === 'listing');
    expect(listing?.label).toBe('Listings');
  });

  it('does not add social, catalog, or leads', () => {
    const k = keys(flags);
    expect(k).not.toContain('social');
    expect(k).not.toContain('catalog');
    expect(k).not.toContain('leads');
  });
});

// ── leadSync lane ─────────────────────────────────────────────────────────────

describe('buildTabs — leadSync', () => {
  const flags = { ...none, leadSync: true };

  it('inserts Leads tab before Notes', () => {
    const k = keys(flags);
    expect(k[k.length - 2]).toBe('leads');
    expect(k[k.length - 1]).toBe('notes');
  });

  it('tab label is "Leads"', () => {
    const leads = buildTabs(flags).find(t => t.key === 'leads');
    expect(leads?.label).toBe('Leads');
  });

  it('does not add social, catalog, or listing', () => {
    const k = keys(flags);
    expect(k).not.toContain('social');
    expect(k).not.toContain('catalog');
    expect(k).not.toContain('listing');
  });
});

// ── LinkedIn profile: leadSync only, NOT catalogSync ─────────────────────────

describe('buildTabs — LinkedIn Lead Gen (leadSync only)', () => {
  const linkedIn: TabCapabilityFlags = {
    socialPosting: false,
    catalogSync: false,
    marketplaceListing: false,
    leadSync: true,
  };

  it('has leads tab', () => {
    expect(keys(linkedIn)).toContain('leads');
  });

  it('does NOT have catalog tab', () => {
    expect(keys(linkedIn)).not.toContain('catalog');
  });

  it('does NOT have listing tab', () => {
    expect(keys(linkedIn)).not.toContain('listing');
  });

  it('does NOT have social tab', () => {
    expect(keys(linkedIn)).not.toContain('social');
  });
});

// ── eBay Motors: marketplaceListing only ─────────────────────────────────────

describe('buildTabs — eBay Motors (marketplaceListing only)', () => {
  const ebay: TabCapabilityFlags = {
    socialPosting: false,
    catalogSync: false,
    marketplaceListing: true,
    leadSync: false,
  };

  it('has listing tab', () => {
    expect(keys(ebay)).toContain('listing');
  });

  it('does NOT have leads or catalog tabs', () => {
    expect(keys(ebay)).not.toContain('leads');
    expect(keys(ebay)).not.toContain('catalog');
  });
});

// ── ordering with multiple capability tabs ────────────────────────────────────

describe('buildTabs — ordering invariants', () => {
  it('setup is always first', () => {
    const allOn: TabCapabilityFlags = { socialPosting: true, catalogSync: true, marketplaceListing: true, leadSync: true };
    expect(keys(allOn)[0]).toBe('setup');
  });

  it('notes is always last', () => {
    const allOn: TabCapabilityFlags = { socialPosting: true, catalogSync: true, marketplaceListing: true, leadSync: true };
    const k = keys(allOn);
    expect(k[k.length - 1]).toBe('notes');
  });

  it('social comes before feed when both present', () => {
    const flags = { ...none, socialPosting: true };
    const k = keys(flags);
    expect(k.indexOf('social')).toBeLessThan(k.indexOf('feed'));
  });

  it('catalog comes before listing when both present', () => {
    const flags = { ...none, catalogSync: true, marketplaceListing: true };
    const k = keys(flags);
    expect(k.indexOf('catalog')).toBeLessThan(k.indexOf('listing'));
  });

  it('listing comes before leads when both present', () => {
    const flags = { ...none, marketplaceListing: true, leadSync: true };
    const k = keys(flags);
    expect(k.indexOf('listing')).toBeLessThan(k.indexOf('leads'));
  });

  it('catalog comes before leads when both present', () => {
    const flags = { ...none, catalogSync: true, leadSync: true };
    const k = keys(flags);
    expect(k.indexOf('catalog')).toBeLessThan(k.indexOf('leads'));
  });

  it('no duplicate tab keys', () => {
    const allOn: TabCapabilityFlags = { socialPosting: true, catalogSync: true, marketplaceListing: true, leadSync: true };
    const k = keys(allOn);
    expect(new Set(k).size).toBe(k.length);
  });
});
