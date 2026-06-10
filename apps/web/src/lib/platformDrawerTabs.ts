export type Tab = 'setup' | 'feed' | 'activity' | 'notes' | 'social' | 'catalog' | 'listing' | 'leads';
export type TabEntry = { key: Tab; label: string };

// Narrow input — only the flags that drive tab presence.
export type TabCapabilityFlags = {
  socialPosting: boolean;
  catalogSync: boolean;
  marketplaceListing: boolean;
  leadSync: boolean;
};

// Tab ordering:
//   Setup → [Social] → Feed → Activity → [Catalog] → [Listings] → [Leads] → Notes
//
// Capability tabs are inserted before Notes so they sit in a consistent
// "action" zone. Social is inserted early (position 1) because it drives
// content creation, not configuration.
export function buildTabs(flags: TabCapabilityFlags): TabEntry[] {
  const tabs: TabEntry[] = [
    { key: 'setup',    label: 'Setup'    },
    { key: 'feed',     label: 'Feed'     },
    { key: 'activity', label: 'Activity' },
    { key: 'notes',    label: 'Notes'    },
  ];

  if (flags.socialPosting) {
    tabs.splice(1, 0, { key: 'social', label: 'Social' });
  }
  if (flags.catalogSync) {
    tabs.splice(tabs.length - 1, 0, { key: 'catalog', label: 'Catalog' });
  }
  if (flags.marketplaceListing) {
    tabs.splice(tabs.length - 1, 0, { key: 'listing', label: 'Listings' });
  }
  if (flags.leadSync) {
    tabs.splice(tabs.length - 1, 0, { key: 'leads', label: 'Leads' });
  }

  return tabs;
}
