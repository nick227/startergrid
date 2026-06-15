import { useState } from 'react';
import type { QueueItemView } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import {
  approveQueueItem,
  holdQueueItem,
  rejectQueueItem,
  releaseQueueItem,
  publishQueueItemNow,
} from '@/lib/api/sdk.ts';
import { taskActionLabel } from '@/lib/copy/index.ts';
import { queueStatusVisual } from '@/lib/statusRegistry.ts';
import {
  formatQueueWhen,
  queueItemActions,
  queueItemReason,
  type QueueRowAction,
} from '@/lib/queueControl.ts';
import { queueTaskTitle } from '@/lib/queueRowPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { PlatformLogo } from '@/components/platforms/PlatformLogo.tsx';

type Props = {
  dealerId: string;
  items: QueueItemView[];
  nav: OperatorNavHandlers;
  onChanged: () => void;
};

function ActionButton({
  action,
  disabled,
  onClick,
}: {
  action: QueueRowAction;
  disabled: boolean;
  onClick: () => void;
}) {
  const variant =
    action.kind === 'approve' || action.kind === 'send-now'
      ? 'text-white bg-navy-700 hover:bg-navy-800'
      : action.kind === 'reject'
        ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
        : 'text-ink-body bg-white hover:bg-silver-50 border border-silver-200';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors disabled:opacity-50 ${variant}`}
    >
      {action.label}
    </button>
  );
}

export function QueueControlTable({ dealerId, items, nav, onChanged }: Props) {
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (item: QueueItemView, action: QueueRowAction) => {
    if (action.kind === 'fix-item' || action.kind === 'view-inventory') {
      nav.goToInventoryItem({
        assetTitle: item.assetTitle,
        assetRef: item.assetRef,
        stockNumber: item.assetRef,
      });
      return;
    }

    if (action.kind === 'setup-channel') {
      nav.goToPlatformDetail(item.platformSlug);
      return;
    }

    let reason: string | undefined;
    if (action.kind === 'hold' || action.kind === 'reject') {
      const promptLabel = action.kind === 'reject' ? 'Rejection reason' : 'Hold reason';
      const input = window.prompt(promptLabel);
      if (input === null) return;
      reason = input.trim() || undefined;
    }

    setWorkingId(item.id);
    setError(null);
    try {
      switch (action.kind) {
        case 'approve':
          await approveQueueItem(dealerId, item.id);
          break;
        case 'hold':
          await holdQueueItem(dealerId, item.id, reason);
          break;
        case 'reject':
          await rejectQueueItem(dealerId, item.id, reason);
          break;
        case 'release':
          await releaseQueueItem(dealerId, item.id);
          break;
        case 'send-now':
          await publishQueueItemNow(dealerId, item.id);
          break;
      }
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="hidden lg:block overflow-x-auto rounded-xl border border-silver-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-silver-200 bg-silver-50 text-left">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-faint">{operatorCopy.queue.columns.task}</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-faint">Platform</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-faint">{operatorCopy.queue.columns.change}</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-faint">Status</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-faint">{operatorCopy.queue.columns.when}</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-faint">Reason</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ink-faint">{operatorCopy.queue.columns.controls}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const st = queueStatusVisual(item.status);
              const actions = queueItemActions(item);
              const busy = workingId === item.id;
              const when = formatQueueWhen(item);
              return (
                <tr key={item.id} className="border-t border-silver-100 hover:bg-silver-50/50">
                  <td className="px-4 py-3 font-semibold text-ink-heading whitespace-nowrap">
                    {queueTaskTitle(item)}
                    {item.assetRef && item.assetTitle && (
                      <p className="text-[11px] font-normal text-ink-muted mt-0.5">#{item.assetRef}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PlatformLogo slug={item.platformSlug} name={item.platformName} size="sm" />
                      <span className="text-ink-body">{item.platformName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{taskActionLabel(item.triggerKind)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap font-bold border ${st.pill}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap" title={when.title}>
                    {when.text}
                  </td>
                  <td className="px-4 py-3 text-ink-muted max-w-[14rem]">
                    <span className="line-clamp-2">{queueItemReason(item)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {actions.map(action => (
                        <ActionButton
                          key={action.kind}
                          action={action}
                          disabled={busy}
                          onClick={() => void runAction(item, action)}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {items.map(item => {
          const st = queueStatusVisual(item.status);
          const actions = queueItemActions(item);
          const busy = workingId === item.id;
          const when = formatQueueWhen(item);
          return (
            <article key={item.id} className="surface-card-operator p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-heading">{queueTaskTitle(item)}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{item.platformName} · {taskActionLabel(item.triggerKind)}</p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold border ${st.pill}`}>
                  {st.label}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-ink-faint font-semibold uppercase tracking-wide">{operatorCopy.queue.columns.when}</dt>
                  <dd className="text-ink-body mt-0.5" title={when.title}>{when.text}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-ink-faint font-semibold uppercase tracking-wide">Reason</dt>
                  <dd className="text-ink-body mt-0.5">{queueItemReason(item)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {actions.map(action => (
                  <ActionButton
                    key={action.kind}
                    action={action}
                    disabled={busy}
                    onClick={() => void runAction(item, action)}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
