import { SETTINGS_JOB_COPY, SETTINGS_JOB_INDEX, type SettingsJobId } from '@/lib/adminConsole.ts';

export function SettingsJobFrame({ job, children }: { job: SettingsJobId; children: React.ReactNode }) {
  const copy = SETTINGS_JOB_COPY[job];
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => { window.location.hash = '#/admin/settings'; }}
        className="text-sm font-medium text-ink-muted hover:text-ink-heading"
      >
        ← Settings
      </button>
      <div>
        <h1 className="text-xl font-bold text-ink-heading">{copy.title}</h1>
        <p className="text-sm text-ink-muted">{copy.why}</p>
      </div>
      {children}
    </div>
  );
}

export function AdminSettingsIndex() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-heading">Settings</h1>
        <p className="text-sm text-ink-muted">Site-wide tools. Day-to-day work stays on Dealerships.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS_JOB_INDEX.map(job => (
          <button
            key={job.href}
            type="button"
            onClick={() => { window.location.hash = job.href; }}
            className="text-left p-5 rounded-xl border border-silver-200 bg-white hover:border-silver-300 shadow-sm space-y-1"
          >
            <h2 className="text-sm font-bold text-ink-heading">{job.title}</h2>
            <p className="text-sm text-ink-muted">{job.why}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
