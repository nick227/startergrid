import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function RowDetailDrawer({ open, title, onClose, children }: Props) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-navy-950/40 z-40 lg:hidden"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface-card border-l border-silver-200 shadow-elevation-3 flex flex-col
          lg:static lg:z-auto lg:max-w-none lg:shadow-elevation-1 lg:rounded-md lg:border lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-silver-200 shrink-0">
          <h3 className="text-sm font-bold text-ink-heading truncate">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-ink-muted hover:text-ink-heading px-2 py-1"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
