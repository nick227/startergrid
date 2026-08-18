import { ActivityIssuesSurface } from '@/features/operations/ActivityIssuesSurface.tsx';

export default function OperationsPage() {
  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink-heading">Global Operations</h1>
        <p className="text-ink-muted mt-2">Manage systemic issues, platform outages, and cross-dealer actionable items.</p>
      </div>

      <ActivityIssuesSurface scope={{ type: 'global' }} />
    </div>
  );
}
