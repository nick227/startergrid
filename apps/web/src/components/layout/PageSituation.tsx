type Props = {
  title: string;
  line: string;
};

export function PageSituation({ title, line }: Props) {
  return (
    <header className="mb-4">
      <h2 className="text-lg font-bold text-ink-heading tracking-tight">{title}</h2>
      <p className="text-sm text-ink-muted mt-1">{line}</p>
    </header>
  );
}
