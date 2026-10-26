import { useEffect, useState } from 'react';
import { fetchAdminDealerships, type DealershipRecordSummary } from '@/lib/api/dealershipRecordApi.ts';
import { DealershipRecordView } from '@/components/dealers/DealershipRecordView.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';

export default function InternalWorkspace({ dealerId }: { dealerId?: string | null }) {
  const { logout } = useAuth();
  const [dealers, setDealers] = useState<DealershipRecordSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    let active = true;
    fetchAdminDealerships({ q: query, limit: 100 }).then(r => { if(active) { setDealers(r.dealerships); setError(null); } })
      .catch(e => { if(active) setError(e.message); });
    return () => { active = false; };
  }, [query, dealerId]);
  if (dealerId) return <DealershipRecordView key={dealerId} dealerId={dealerId}
    onOpenDealerView={id => { window.location.hash = '#/' + id; }}
    onBackToDirectory={() => { window.location.hash = '#/'; }} />;
  return <main className="max-w-5xl mx-auto p-6 space-y-5">
    <div className="flex justify-between"><h1 className="text-2xl font-bold">Dealership work</h1><button onClick={() => void logout()}>Sign out</button></div>
    <p>Open an assigned dealership to manage setup, people and distribution.</p>
    <input aria-label="Search dealerships" className="border rounded p-2 w-full" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dealerships" />
    {error && <p role="alert">{error}</p>}
    {dealers.map(d => <button key={d.id} className="block w-full text-left border rounded p-4"
      onClick={() => { window.location.hash = '#/admin/dealers/' + d.id; }}>
      <strong>{d.legalName}</strong><p>{d.nextStep?.label ?? d.lifecycleStatus} · {d.nextStep?.nextAction}</p>
    </button>)}
    {!error && !dealers.length && <p>No assigned dealerships match this search.</p>}
  </main>;
}
