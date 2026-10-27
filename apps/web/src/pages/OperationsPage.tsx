import { ActivityIssuesSurface } from '@/features/operations/ActivityIssuesSurface.tsx';

export default function OperationsPage() {
  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-ink-heading">Sending problems</h1>
        <p className="text-sm text-ink-muted mt-1">Issues that stop vehicles from updating across dealerships.</p>
      </div>

      <ActivityIssuesSurface scope={{ type: 'global' }} />
    </div>
  );
}
