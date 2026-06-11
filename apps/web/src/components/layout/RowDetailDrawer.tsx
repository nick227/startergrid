import type { ReactNode } from 'react';

type Size = 'md' | 'lg' | 'xl' | '2xl' | '3xl';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: Size;
  hideTitle?: boolean;
};

const sizeClass: Record<Size, string> = {
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '2xl':'max-w-2xl',
  '3xl':'max-w-3xl',
};

export function RowDetailDrawer({ open, title, onClose, children, size = 'md', hideTitle = false }: Props) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-navy-950/40 z-40"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full ${sizeClass[size]} bg-surface-card border-l border-silver-200 shadow-elevation-3 flex flex-col overflow-hidden`}
        aria-label={title}
      >
        {!hideTitle && (
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
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}
