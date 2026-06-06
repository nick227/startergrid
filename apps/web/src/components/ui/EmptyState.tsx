type Props = {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon = '📭', title, subtitle, action }: Props) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <div className="text-base font-bold text-ink-heading tracking-tight">{title}</div>
      {subtitle && <div className="text-sm text-ink-muted mt-2 max-w-sm mx-auto leading-relaxed">{subtitle}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
