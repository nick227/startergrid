import type { StatusTone } from '../../lib/statusRegistry.ts';
import { TONE_SURFACE } from '../../lib/statusRegistry.ts';

type Props = {
  tone?: StatusTone;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  icon?: string;
};

export function InlineCallout({ tone = 'info', title, children, action, icon }: Props) {
  const s = TONE_SURFACE[tone];
  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${s.bg} ${s.border}`}>
      {icon && <span className="text-lg leading-none mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${s.accent}`}>{title}</p>}
        <div className={`text-sm ${title ? 'mt-0.5 text-slate-600' : s.accent}`}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
