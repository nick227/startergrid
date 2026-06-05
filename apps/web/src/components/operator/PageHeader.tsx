import { InfoLabel } from '@/components/docs';

type Props = {
  title: string;
  infoDocId?: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, infoDocId, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-1">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {infoDocId ? <InfoLabel term={title} docId={infoDocId} /> : title}
        </h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
