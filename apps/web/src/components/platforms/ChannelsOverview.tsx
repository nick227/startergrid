import { useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { PlatformLogo } from '@/components/platforms/PlatformLogo.tsx';
import type { ChannelView } from '@/lib/routes.ts';
import { operatorChannelName } from '@/lib/platformPresentation.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { usesVehicleIdentifier } from '@/lib/categoryPresentation.ts';
import {
  CAPABILITY_LABEL,
  STATUS_LABEL,
  fetchChannelOverview,
  waitingLabel,
  type ChannelDisplayStatus,
  type ChannelOverviewItem,
  type ChannelPurpose,
} from '@/lib/api/channelOverviewApi.ts';

type Props = {
  dealerId: string;
  /** Link to one channel's page; the dealer app and the admin record point at different routes. */
  hrefFor: (channel: string, view?: ChannelView) => string;
  /** Change to reload, e.g. from the page's Refresh button. */
  refreshKey?: number;
};

const GROUPS: Array<{ status: ChannelDisplayStatus; title: string }> = [
  { status: 'NEEDS_ATTENTION', title: 'Needs attention' },
  { status: 'SETTING_UP', title: 'Setting up' },
  { status: 'CONNECTED', title: 'Connected' },
];

const PILL: Record<ChannelDisplayStatus, string> = {
  NEEDS_ATTENTION: 'bg-amber-50 text-amber-800 border-amber-200',
  SETTING_UP: 'bg-navy-50 text-navy-800 border-navy-200',
  CONNECTED: 'bg-status-success-bg text-status-success-text border-status-success-border',
  NOT_SET_UP: 'bg-silver-50 text-ink-muted border-silver-200',
};

/**
 * Channels overview: what each kind of channel is doing, the channels in use, and the ones
 * that can be added. Each channel is counted once, under its primary purpose.
 */
export function ChannelsOverview({ dealerId, hrefFor, refreshKey = 0 }: Props) {
  const schema = useCategorySchema();
  const { data, loading, error, reload } = useAsyncQuery(() => fetchChannelOverview(dealerId), [dealerId, refreshKey]);
  const [purpose, setPurpose] = useState<ChannelPurpose | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (loading && !data) return <p className="text-sm text-ink-muted" aria-busy="true">Loading channels…</p>;
  if (error || !data) {
    return (
      <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50/60 p-5">
        <p className="text-sm font-semibold text-ink-heading">Channels did not load.</p>
        <p className="mt-1 text-xs text-ink-body">{error ?? 'Try again.'}</p>
        <button type="button" onClick={reload} className="mt-3 text-sm font-semibold text-navy-700 hover:underline">Try again</button>
      </section>
    );
  }

  const inScope = data.channels.filter(c => !purpose || c.purpose === purpose);
  const active = inScope.filter(c => c.displayStatus !== 'NOT_SET_UP');
  const available = inScope.filter(c => c.displayStatus === 'NOT_SET_UP');
  const purposeLabel = (p: ChannelPurpose) => data.purposes.find(x => x.purpose === p)?.label ?? p;
  const selected = data.purposes.find(p => p.purpose === purpose) ?? null;

  return (
    <div className="space-y-8">
      <section aria-label="Channel types">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {data.purposes.map(p => {
            const parts = [
              p.counts.CONNECTED && `${p.counts.CONNECTED} connected`,
              p.counts.SETTING_UP && `${p.counts.SETTING_UP} setting up`,
              p.counts.NEEDS_ATTENTION && `${p.counts.NEEDS_ATTENTION} need${p.counts.NEEDS_ATTENTION === 1 ? 's' : ''} attention`,
            ].filter(Boolean);
            const on = purpose === p.purpose;
            return (
              <button key={p.purpose} type="button" aria-pressed={on}
                onClick={() => { setPurpose(on ? null : p.purpose); setShowAll(false); }}
                className={`rounded-xl border p-3 sm:p-4 text-left transition-colors ${on ? 'border-navy-600 bg-navy-50/60' : 'border-silver-200 bg-white hover:border-silver-300'}`}>
                <span className="block text-sm font-bold text-ink-heading">{p.label}</span>
                <span className="mt-1 hidden text-xs text-ink-muted sm:block">{usesVehicleIdentifier(schema) ? p.description : p.description.replace('your vehicles', `your ${schema.asset.plural}`)}</span>
                <span className={`mt-2 sm:mt-3 block text-xs font-semibold ${p.counts.NEEDS_ATTENTION ? 'text-amber-800' : 'text-ink-body'}`}>
                  {parts.length ? parts.join(' · ') : p.total ? 'None in use yet' : 'None available'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="your-channels" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="your-channels" className="text-sm font-bold text-ink-heading">
            {selected ? `Your ${selected.label.toLowerCase()}` : 'Your channels'}
          </h2>
          {selected && (
            <button type="button" onClick={() => setPurpose(null)} className="text-xs font-semibold text-navy-700 hover:underline">Show all types</button>
          )}
        </div>
        {active.length === 0 ? (
          <p className="rounded-xl border border-dashed border-silver-300 bg-white p-5 text-sm text-ink-muted">
            {selected ? `No ${selected.label.toLowerCase()} set up yet.` : 'No channels set up yet.'} Pick one below to start.
          </p>
        ) : GROUPS.map(g => {
          const rows = active.filter(c => c.displayStatus === g.status);
          if (!rows.length) return null;
          return (
            <div key={g.status} className="space-y-2">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${g.status === 'NEEDS_ATTENTION' ? 'text-amber-800' : 'text-ink-faint'}`}>
                {g.title} ({rows.length})
              </h3>
              <ul className="divide-y divide-silver-100 overflow-hidden rounded-xl border border-silver-200 bg-white">
                {rows.map(c => <ChannelRow key={c.channel} item={c} href={hrefFor(c.channel)} purposeLabel={purpose ? null : purposeLabel(c.purpose)} />)}
              </ul>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="add-channel" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="add-channel" className="text-sm font-bold text-ink-heading">Add a channel ({available.length})</h2>
          {!purpose && available.length > 0 && (
            <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll} className="text-xs font-semibold text-navy-700 hover:underline">
              {showAll ? 'Hide' : 'Show all'}
            </button>
          )}
        </div>
        {!purpose && !showAll ? (
          <p className="text-xs text-ink-muted">Pick a channel type above, or show all channels you can add.</p>
        ) : available.length === 0 ? (
          <p className="text-xs text-ink-muted">Every channel of this type is already set up or in progress.</p>
        ) : data.purposes.filter(p => !purpose || p.purpose === purpose).map(p => {
          const rows = available.filter(c => c.purpose === p.purpose);
          if (!rows.length) return null;
          return (
            <div key={p.purpose} className="space-y-2">
              {!purpose && <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint">{p.label}</h3>}
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map(c => (
                  <li key={c.channel}>
                    <a href={hrefFor(c.channel, 'setup')} className="flex items-center gap-3 rounded-lg border border-silver-200 bg-white px-3 py-2.5 hover:border-navy-300">
                      <PlatformLogo slug={c.channel} name={operatorChannelName(c.channel, c.name)} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-heading">{operatorChannelName(c.channel, c.name)}</span>
                      <span className="shrink-0 text-xs font-semibold text-navy-700">Set up</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function ChannelRow({ item, href, purposeLabel }: { item: ChannelOverviewItem; href: string; purposeLabel: string | null }) {
  const waiting = item.displayStatus === 'SETTING_UP' ? waitingLabel(item) : null;
  const facts = [
    item.distribution.inProgress > 0 && `${item.distribution.inProgress} sending`,
    item.distribution.problems > 0 && `${item.distribution.problems} not confirmed`,
  ].filter(Boolean);
  return (
    <li>
      <a href={href} className="flex items-start gap-3 px-4 py-3 hover:bg-silver-50/70">
        <PlatformLogo slug={item.channel} name={operatorChannelName(item.channel, item.name)} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-ink-heading">{operatorChannelName(item.channel, item.name)}</span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PILL[item.displayStatus]}`}>
              {STATUS_LABEL[item.displayStatus]}{waiting ? ` · waiting on ${waiting}` : ''}
            </span>
          </span>
          <span className="mt-0.5 block text-xs text-ink-body">{item.displayReason}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            {purposeLabel && <span className="text-[11px] text-ink-faint">{purposeLabel}</span>}
            {item.capabilities.filter(c => c !== 'PARTNER_FEED').map(c => (
              <span key={c} className="rounded bg-silver-50 px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">{CAPABILITY_LABEL[c]}</span>
            ))}
            {facts.length > 0 && <span className="text-[11px] text-ink-muted">{facts.join(' · ')}</span>}
          </span>
        </span>
        <span aria-hidden="true" className="self-center text-ink-faint">›</span>
      </a>
    </li>
  );
}
