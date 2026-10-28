import { workspaceHash } from '@/lib/routes.ts';
export function WorkspaceTabs({ dealerId, workspace, active, tabs }: { dealerId: string; workspace: 'activity' | 'team'; active: string; tabs: { id: string; label: string }[] }) {
  return <nav aria-label={`${workspace === 'activity' ? 'Activity' : 'Team'} views`} className="flex gap-5 overflow-x-auto border-b border-silver-200 mb-6">
    {tabs.map(tab => <a key={tab.id} href={workspaceHash(dealerId, workspace, tab.id)} aria-current={active === tab.id ? 'page' : undefined} className={`shrink-0 py-3 text-sm font-semibold border-b-2 ${active === tab.id ? 'border-navy-900 text-ink-heading' : 'border-transparent text-ink-muted hover:text-ink-heading'}`}>{tab.label}</a>)}
  </nav>;
}
