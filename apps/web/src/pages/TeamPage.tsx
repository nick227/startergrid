import { useState } from 'react';
import { OperatorPage, PageHeader } from '@/components/operator';
import { WorkspaceTabs } from '@/components/operator/WorkspaceTabs.tsx';
import { PeoplePanel } from '@/components/people/PeoplePanel.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { workspaceRequest, type TeamData, type TeamThread } from '@/lib/api/workspaces.ts';
import { preserveSupport } from '@/lib/routes.ts';
import { useDealerSummary } from '@/hooks/useDealerSummary.ts';

const tabs = [{ id: 'board', label: 'Board' }, { id: 'tasks', label: 'Tasks' }, { id: 'people', label: 'People' }];

function relatedRecordLabel(reference: string): string {
  if (reference.includes('/activity/leads')) return 'Open the inquiry';
  if (reference.includes('/activity/sales')) return 'Open the sale';
  if (reference.includes('/inventory')) return 'Open inventory';
  if (reference.includes('/channels') || reference.includes('/platforms')) return 'Open the channel';
  return 'Open related record';
}

function teamWhen(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric', hour: 'numeric', minute: '2-digit' });
}
export default function TeamPage(props: OperatorPageBaseProps & { view?: string }) {
  const { user } = useAuth();
  const summary = useDealerSummary(props.dealerId);
  const view = tabs.some(t => t.id === props.view) ? props.view! : 'board';
  const viewLabel = tabs.find(tab => tab.id === view)?.label ?? 'Team';
  return <OperatorPage {...props} activeTab="team" sectionLabel={view === 'board' ? 'Team' : `Team · ${viewLabel}`}>
    <PageHeader title="Team" />
    <WorkspaceTabs dealerId={props.dealerId} workspace="team" active={view} tabs={tabs} />
    {view === 'people' ? <PeoplePanel dealerId={props.dealerId} dealershipName={summary?.legalName || 'this dealership'} viewer={{ kind: ['SUPER_ADMIN', 'INTERNAL_SUPPORT', 'OPERATOR'].includes(user?.role ?? '') ? 'internal' : 'dealer', userId: user?.id, isSiteAdmin: user?.role === 'SUPER_ADMIN' }} /> : <TeamDiscussions key={`${props.dealerId}:${view}`} dealerId={props.dealerId} tasks={view === 'tasks'} />}
  </OperatorPage>;
}
function TeamDiscussions({ dealerId, tasks }: { dealerId: string; tasks: boolean }) {
  const query = useAsyncQuery(() => workspaceRequest<TeamData>(dealerId, 'team'), [dealerId]);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState('POST');
  const [assigneeId, setAssigneeId] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const members = query.data?.members ?? [];
  const allTasks = (query.data?.threads ?? []).filter(t => t.kind === 'TASK');
  const openCount = allTasks.filter(t => !t.completedAt).length;
  const completedCount = allTasks.filter(t => Boolean(t.completedAt)).length;

  const threads = (query.data?.threads ?? []).filter(t => (tasks ? t.kind === 'TASK' : t.kind !== 'TASK') && (filter === 'all' || (filter === 'complete' ? Boolean(t.completedAt) : !t.completedAt)) && `${t.title} ${t.body}`.toLowerCase().includes(search.toLowerCase()));

  async function mutate(path: string, method: string, payload: unknown, successMsg?: string) {
    setSaving(true); setError('');
    try {
      await workspaceRequest(dealerId, path, method, payload);
      query.reload();
      if (successMsg) showFeedback(successMsg);
      return true;
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Try again.'); return false; }
    finally { setSaving(false); }
  }
  return <section className="space-y-5" aria-label={tasks ? 'Team tasks' : 'Team board'}>
    <div className="flex gap-3 flex-wrap items-center">
      <input aria-label={tasks ? 'Search tasks' : 'Search discussions'} className="field-input flex-1 min-w-48" placeholder={tasks ? 'Search tasks' : 'Search discussions'} value={search} onChange={e => setSearch(e.target.value)} />
      {tasks && (
        <select aria-label="Task status" className="field-input" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All tasks ({allTasks.length})</option>
          <option value="open">Open ({openCount})</option>
          <option value="complete">Completed ({completedCount})</option>
        </select>
      )}
      <button className="btn-secondary-operator" onClick={query.reload}>Refresh</button>
      <button className="btn-primary-operator" onClick={() => setComposing(!composing)}>{composing ? 'Cancel' : tasks ? 'Create task' : 'Write a post'}</button>
    </div>
    {feedback && (
      <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800 transition-all flex items-center gap-2">
        <span>✓</span>
        <span>{feedback}</span>
      </div>
    )}
    {(error || query.error) && <p role="alert" className="text-red-700">{error || query.error}</p>}
    {composing && <form className="surface-card-operator p-5 space-y-4" onSubmit={async e => { e.preventDefault(); if (await mutate('team', 'POST', { kind: tasks ? 'TASK' : kind, title, body, assigneeId: assigneeId || null, reference: reference || null }, tasks ? 'Task created' : 'Post published')) { setComposing(false); setTitle(''); setBody(''); setReference(''); } }}>
      <label className="block text-sm">Title<input required maxLength={200} className="field-input block w-full mt-1" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="block text-sm">{tasks ? 'What needs to be done?' : 'Message'}<textarea required maxLength={10000} rows={4} className="field-input block w-full mt-1" value={body} onChange={e => setBody(e.target.value)} /></label>
      {tasks ? <label className="block text-sm">Assign to<select aria-label="Assign to" className="field-input block mt-1" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{members.map(m => <option key={m.id} value={m.id}>{m.email}</option>)}</select></label> : <label className="block text-sm">Post type<select className="field-input block mt-1" value={kind} onChange={e => setKind(e.target.value)}><option value="POST">Discussion</option><option value="ANNOUNCEMENT">Announcement</option></select></label>}
      <label className="block text-sm">Related record link (optional)<input className="field-input block w-full mt-1" placeholder={`#/${dealerId}/activity/attention`} value={reference} onChange={e => { const value = e.target.value; setReference(value.includes('#') ? value.slice(value.indexOf('#')) : value); }} /><span className="text-xs text-ink-muted">Paste a vehicle, channel, lead or operational issue link from this dealership.</span></label>
      <button disabled={saving} className="btn-primary-operator">{saving ? 'Saving…' : tasks ? 'Create task' : 'Publish post'}</button>
    </form>}
    {query.loading && !query.data ? <p role="status">Loading team workspace…</p> : !query.error && !threads.length ? <p className="py-10 text-ink-muted">{search ? 'No matches. Try a different search.' : tasks ? 'No tasks here yet. Create a task and assign the next step.' : 'Start a discussion or share an announcement with your team.'}</p> : threads.map(thread => <article key={thread.id} className="surface-card-operator p-5 space-y-4">
      <div><p className="text-xs text-ink-muted mb-1">{thread.kind === 'ANNOUNCEMENT' ? 'Announcement · ' : ''}<span className="break-all">{thread.authorEmail}</span> · <span className="whitespace-nowrap">{teamWhen(thread.createdAt)}</span></p><h2 className="text-lg font-semibold">{thread.title}</h2></div>
      <p className="text-sm whitespace-pre-wrap break-words">{thread.body}</p>
      {thread.reference && <a className="inline-flex min-h-11 items-center text-sm underline" href={preserveSupport(thread.reference)}>{relatedRecordLabel(thread.reference)}</a>}
      {tasks && <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Assigned to <select aria-label={`Assignee for ${thread.title}`} disabled={saving} className="field-input" value={thread.assigneeId ?? ''} onChange={e => void mutate(`team/${thread.id}`, 'PATCH', { assigneeId: e.target.value || null }, 'Assignee updated')}><option value="">Unassigned</option>{thread.assigneeId && !members.some(m => m.id === thread.assigneeId) && <option value={thread.assigneeId}>Inactive member</option>}{members.map(m => <option value={m.id} key={m.id}>{m.email}</option>)}</select></label><button disabled={saving} className="btn-secondary-operator" onClick={() => void mutate(`team/${thread.id}`, 'PATCH', { completed: !thread.completedAt }, thread.completedAt ? 'Task reopened' : 'Task completed')}>{thread.completedAt ? 'Reopen task' : 'Mark complete'}</button>{thread.completedAt && <span className="text-sm text-ink-muted">Completed {teamWhen(thread.completedAt)}</span>}</div>}
      <ThreadDiscussion thread={thread} saving={saving} onComment={body => mutate(`team/${thread.id}/comments`, 'POST', { body }, 'Comment added')} />
    </article>)}
    {query.data?.truncated && <p className="text-sm text-ink-muted">Showing the 200 most recent discussions and tasks.</p>}
  </section>;
}
function ThreadDiscussion({ thread, onComment, saving }: { thread: TeamThread; onComment: (body: string) => Promise<boolean>; saving: boolean }) {
  const [body, setBody] = useState('');
  const [isOpen, setIsOpen] = useState(thread.comments.length > 0);
  return (
    <details
      open={isOpen}
      onToggle={e => setIsOpen(e.currentTarget.open)}
      className="border-t border-silver-200 pt-3"
    >
      <summary className="cursor-pointer text-sm font-medium select-none text-ink-heading hover:text-navy-900">
        Discussion ({thread.comments.length})
      </summary>
      <div className="mt-4 space-y-4">
        {thread.comments.map(c => (
          <div key={c.id} className="border-l-2 border-silver-300 pl-4 py-0.5">
            <p className="text-xs text-ink-muted">
              <span className="font-semibold text-ink-heading break-all">{c.authorEmail}</span> · <span className="whitespace-nowrap">{teamWhen(c.createdAt)}</span>
            </p>
            <p className="text-sm whitespace-pre-wrap break-words mt-1 text-slate-800">{c.body}</p>
          </div>
        ))}
        <form
          className="flex gap-2 items-start"
          onSubmit={async e => {
            e.preventDefault();
            if (await onComment(body)) {
              setBody('');
              setIsOpen(true);
            }
          }}
        >
          <textarea
            aria-label={`Comment on ${thread.title}`}
            required
            maxLength={10000}
            className="field-input flex-1 min-w-0"
            placeholder="Add to the discussion…"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <button disabled={saving} className="btn-secondary-operator shrink-0">
            {saving ? 'Posting…' : 'Comment'}
          </button>
        </form>
      </div>
    </details>
  );
}
