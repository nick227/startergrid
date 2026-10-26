import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PrismaClient } from '@prisma/client';
import { upsertStep } from '../services/dealership/onboardingSteps.js';

type Row = Record<string, unknown>;

function store() {
  const rows = new Map<string, Row>();
  let writes = 0;
  const db = {
    dealershipOnboardingStep: {
      findUnique: async ({ where }: Row) => rows.get((where as { dealershipId_stepKey: { stepKey: string } }).dealershipId_stepKey.stepKey) ?? null,
      update: async ({ where, data }: Row) => {
        writes++;
        return Object.assign(rows.get((where as { dealershipId_stepKey: { stepKey: string } }).dealershipId_stepKey.stepKey)!, data);
      },
      upsert: async ({ where, create, update }: Row) => {
        writes++;
        const key = (where as { dealershipId_stepKey: { stepKey: string } }).dealershipId_stepKey.stepKey;
        rows.set(key, { ...(rows.get(key) ?? (create as Row)), ...(update as Row) });
        return rows.get(key);
      },
    },
  } as unknown as PrismaClient;
  return { db, rows, writes: () => writes };
}

const completedBy = (actor: string | null, at: Date, evidence: Row) => ({
  status: 'COMPLETE' as const, ownerKind: 'OUR_TEAM' as const, incompleteReason: null,
  evidenceJson: evidence as never, completedAt: at, completedBy: actor,
});

describe('onboarding completion history', () => {
  it('re-deriving a completed step keeps the original time, actor and evidence', async () => {
    const s = store();
    const first = new Date('2026-10-01T10:00:00Z');
    await upsertStep(s.db, 'd1', 'CHANNELS', completedBy('staff-1', first, { vehicleId: 'v1' }));
    // What a record read does: no actor, a new timestamp, possibly different current evidence.
    await upsertStep(s.db, 'd1', 'CHANNELS', completedBy(null, new Date(), { vehicleId: 'v2' }));
    const row = s.rows.get('CHANNELS')!;
    assert.equal((row.completedAt as Date).toISOString(), first.toISOString());
    assert.equal(row.completedBy, 'staff-1');
    assert.deepEqual(row.evidenceJson, { vehicleId: 'v1' });
    assert.equal(s.writes(), 1, 'an unchanged completed step is not rewritten');
  });

  it('a step that genuinely regresses clears completion, and a later completion is recorded anew', async () => {
    const s = store();
    await upsertStep(s.db, 'd1', 'VEHICLES', completedBy('staff-1', new Date('2026-10-01T10:00:00Z'), { vehicleCount: 1 }));
    await upsertStep(s.db, 'd1', 'VEHICLES', { status: 'IN_PROGRESS', ownerKind: 'DEALER', incompleteReason: 'Add stock' });
    assert.equal(s.rows.get('VEHICLES')!.completedAt, null);
    assert.equal(s.rows.get('VEHICLES')!.completedBy, null);
    const again = new Date('2026-10-05T10:00:00Z');
    await upsertStep(s.db, 'd1', 'VEHICLES', completedBy('staff-2', again, { vehicleCount: 3 }));
    assert.equal((s.rows.get('VEHICLES')!.completedAt as Date).toISOString(), again.toISOString());
    assert.equal(s.rows.get('VEHICLES')!.completedBy, 'staff-2');
  });

  it('only guidance changes on a completed step, never its history', async () => {
    const s = store();
    const first = new Date('2026-10-01T10:00:00Z');
    await upsertStep(s.db, 'd1', 'HANDOFF', completedBy('staff-1', first, { inboxLeadId: 'l1' }));
    await upsertStep(s.db, 'd1', 'HANDOFF', { ...completedBy(null, new Date(), { inboxLeadId: 'l2' }), ownerKind: 'DEALER' });
    const row = s.rows.get('HANDOFF')!;
    assert.equal(row.ownerKind, 'DEALER');
    assert.equal((row.completedAt as Date).toISOString(), first.toISOString());
    assert.equal(row.completedBy, 'staff-1');
    assert.deepEqual(row.evidenceJson, { inboxLeadId: 'l1' });
  });

  it('repeating identical incomplete guidance does not write', async () => {
    const s = store();
    const blocked = { status: 'BLOCKED' as const, ownerKind: 'OUR_TEAM' as const, incompleteReason: 'Retry', evidenceJson: { missing: ['a'] } as never };
    await upsertStep(s.db, 'd1', 'CHANNELS', blocked);
    await upsertStep(s.db, 'd1', 'CHANNELS', blocked);
    assert.equal(s.writes(), 1);
    await upsertStep(s.db, 'd1', 'CHANNELS', { ...blocked, evidenceJson: { missing: ['a', 'b'] } as never });
    assert.equal(s.writes(), 2, 'changed evidence on an incomplete step is written');
  });
});
