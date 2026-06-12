import { useMemo, useState } from 'react';
import type { AdminDashboardResponse } from '@/lib/api/admin.ts';
import { CLEAR_CLS, INPUT_CLS } from '@/features/adminOverview/constants/styles.ts';
import { ResultCount, SortableHeaderCell, type SortDir } from '@/features/adminOverview/components/index.ts';

type Props = {
  recentEvents: AdminDashboardResponse['recentEvents'];
};

export function AuditLogTab({ recentEvents }: Props) {
  const [auditSearch, setAuditSearch] = useState('');
  const [auditDir, setAuditDir] = useState<SortDir>('desc');

  const filteredAudit = useMemo(() => {
    let list = [...recentEvents];
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      list = list.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.actorEmail.toLowerCase().includes(q) ||
        (e.detailString?.toLowerCase().includes(q) ?? false),
      );
    }
    list.sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return auditDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [recentEvents, auditSearch, auditDir]);

  const auditActiveFilters = [auditSearch].filter(Boolean).length;

  function toggleAudit() {
    setAuditDir(d => (d === 'asc' ? 'desc' : 'asc'));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={auditSearch}
          onChange={e => setAuditSearch(e.target.value)}
          placeholder="Search action, actor, or details…"
          className={`${INPUT_CLS} w-60`}
        />
        {auditActiveFilters > 0 && (
          <button type="button" onClick={() => setAuditSearch('')} className={CLEAR_CLS}>
            Clear
          </button>
        )}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => toggleAudit()}
            className="px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink-heading border border-silver-300 hover:border-silver-400 rounded-md transition-all"
          >
            {auditDir === 'desc' ? 'Newest first ↓' : 'Oldest first ↑'}
          </button>
        </div>
      </div>

      <ResultCount shown={filteredAudit.length} total={recentEvents.length} noun="event" />

      {filteredAudit.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-silver-200 rounded-md text-ink-faint text-sm">
          No events match the search criteria.
        </div>
      ) : (
        <div className="surface-card-operator overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-silver-100 border-b border-silver-200 text-[10px] text-ink-muted uppercase tracking-wider">
                <SortableHeaderCell isActive={true} dir={auditDir} onClick={() => toggleAudit()} className="whitespace-nowrap">Timestamp</SortableHeaderCell>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudit.map(event => (
                <tr key={event.id} className="border-b border-silver-200 last:border-0 hover:bg-surface-inset transition-colors align-top">
                  <td className="px-4 py-3 font-mono text-[10px] text-ink-faint whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-ink-heading">{event.action}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{event.actorEmail}</td>
                  <td className="px-4 py-3 text-[10px] text-ink-faint font-mono max-w-xs break-words leading-relaxed">
                    {event.detailString || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
