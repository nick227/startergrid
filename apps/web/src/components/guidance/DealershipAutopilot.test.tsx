import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
let root: Root | undefined;
function render(node: ReactNode) {
  const container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container); act(() => root!.render(node));
}
function cleanup() { if(root) act(() => root!.unmount()); root=undefined; document.body.innerHTML=''; }
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DealershipAutopilot } from './DealershipAutopilot.tsx';
vi.mock('@/contexts/AuthContext.tsx', () => ({ useAuth: () => ({ user: { role: 'SUPER_ADMIN' } }) }));

const policy = { dealershipId:'d1',mode:'OFF',version:2,includedChannels:['consumer-marketplace'],excludedVehicleIds:[],
  safeguards:{maxPriceChangeFraction:.3},updatedAt:null,updatedBy:'admin' };
function fixture(mode = 'OFF') {
  return { contractVersion:1,policy:{...policy,mode},coverage:mode,counts:{VERIFIED_LIVE:0},openIncidents:0,generatedAt:null,
    capabilities:[{channel:'consumer-marketplace',qualification:'VERIFIED_AUTOMATIC',reason:'Owned readback'},
      {channel:'google',qualification:'CONFIGURED_UNVERIFIED',reason:'Provider not verified'}] };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('persisted distribution UI', () => {
  it('loads OFF and saves the versioned policy, never enabling an unqualified channel',async()=>{
    let mode='OFF';const writes: unknown[]=[];
    vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
      if(init?.method==='PUT'){const body=JSON.parse(init.body as string);writes.push(body);mode=body.mode;}
      return {ok:true,json:async()=>url.endsWith('/incidents')?{items:[]}:fixture(mode)};
    }));
    render(<DealershipAutopilot dealerId="d1"/>);
    await screen.findByText('Autopilot off');
    const google=screen.getByLabelText(/google/);
    expect((google as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Turn on Autopilot'));
    await screen.findByText('Autopilot on');
    expect(writes).toEqual([expect.objectContaining({expectedVersion:2,mode:'ON',includedChannels:['consumer-marketplace']})]);
    cleanup();
    render(<DealershipAutopilot dealerId="d1"/>);
    await screen.findByText('Autopilot on');
  });
  it('shows feature-disabled and conflict errors without optimistic activation',async()=>{
    const fetcher=vi.fn(async(url:string,init?:RequestInit)=>{
      if(init?.method==='PUT')return {ok:false,status:409,json:async()=>({error:'Policy changed. Reload before saving.'})};
      return {ok:true,json:async()=>url.endsWith('/incidents')?{items:[]}:fixture()};
    });
    vi.stubGlobal('fetch',fetcher);
    render(<DealershipAutopilot dealerId="d1"/>);
    fireEvent.click(await screen.findByText('Turn on Autopilot'));
    await screen.findByRole('alert');
    expect(screen.getByText('Autopilot off')).toBeTruthy();
    cleanup();
    fetcher.mockImplementation(async()=>({ok:false,status:503,json:async()=>({error:'disabled'})}));
    render(<DealershipAutopilot dealerId="d2"/>);
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('not enabled'));
    expect(screen.queryByText('Turn on Autopilot')).toBeNull();
  });
});
