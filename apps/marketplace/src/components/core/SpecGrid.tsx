type Spec = { label: string; value: string };

type Props = {
  specs: Spec[];
  columns?: 1 | 2;
};

export function SpecGrid({ specs, columns = 2 }: Props) {
  const gridClass = columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1';

  return (
    <dl className={`grid gap-3 ${gridClass}`}>
      {specs.map(({ label, value }) => (
        <div key={label} className="mp-card p-4">
          <dt className="mp-label text-slate-400">{label}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
