import type { SyncReadiness } from '@/lib/syncPresentation.ts';
import { InfoLabel } from '@/components/docs';

type Props = { readiness: SyncReadiness };

type Tile = {
  label: string;
  docId: string;
  value: number;
  hint: string;
  tone: string;
};

export function SyncSummaryStrip({ readiness }: Props) {
  const tiles: Tile[] = [
    {
      label: 'Cars ready',
      docId: 'inventory/inventory-readiness',
      value: readiness.carsReady,
      hint: readiness.carsWarning > 0 ? `${readiness.carsWarning} with warnings` : 'to sync',
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Cars blocked',
      docId: 'inventory/inventory-readiness',
      value: readiness.carsBlocked,
      hint: readiness.carsBlocked > 0 ? 'fix in inventory' : 'none',
      tone: readiness.carsBlocked > 0 ? 'text-red-700 bg-red-50 border-red-100' : 'text-slate-500 bg-white border-slate-200',
    },
    {
      label: 'Platforms ready',
      docId: 'processes/platform-readiness',
      value: readiness.platformsWillSync + readiness.platformsLive,
      hint: `${readiness.platformsLive} already live`,
      tone: 'text-sky-700 bg-sky-50 border-sky-100',
    },
    {
      label: 'Platforms blocked',
      docId: 'platforms/account-states',
      value: readiness.platformsBlocked + readiness.platformsNeedYou,
      hint: readiness.platformsNeedYou > 0 ? `${readiness.platformsNeedYou} need you` : 'need attention',
      tone:
        readiness.platformsBlocked + readiness.platformsNeedYou > 0
          ? 'text-amber-800 bg-amber-50 border-amber-100'
          : 'text-slate-500 bg-white border-slate-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map(t => (
        <div key={t.label} className={`rounded-xl border px-4 py-4 ${t.tone}`}>
          <div className="text-2xl font-bold tabular-nums leading-none">{t.value}</div>
          <div className="text-xs font-semibold mt-1.5">
            <InfoLabel term={t.label} docId={t.docId} />
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">{t.hint}</div>
        </div>
      ))}
    </div>
  );
}
