import { Button } from '@/components/ui';

type Props = {
  query: string;
  count: number;
  browseLabel: string;
  onClear: () => void;
};

export function BrowseResultsHeader({ query, count, browseLabel, onClear }: Props) {
  const term = query.trim();
  if (term === '') {
    return <p className="text-sm text-ink-muted">{browseLabel}</p>;
  }

  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-ink-heading">Results for “{term}”</h3>
        <p className="text-sm text-ink-muted">{count} {count === 1 ? 'match' : 'matches'}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>
    </div>
  );
}
