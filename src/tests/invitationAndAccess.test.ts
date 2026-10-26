import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword } from '../services/auth/passwordService.js';
import { hashSessionToken } from '../services/auth/sessionService.js';
import {
  acceptInvitation,
  createInvitation,
  previewInvitation,
  revokeInvitation,
} from '../services/dealership/invitationService.js';
import { issueTemporaryLogin, patchPerson } from '../services/dealership/peopleAccessService.js';
import { updateLeadWorkflow } from '../services/leads/leadWorkflowService.js';
import type { PrismaClient } from '@prisma/client';

function memoryDb() {
  const invitations: Array<Record<string, unknown>> = [];
  const accounts: Array<Record<string, unknown>> = [];
  const access: Array<Record<string, unknown>> = [];
  const sessions: Array<Record<string, unknown>> = [];
  const activity: Array<Record<string, unknown>> = [];
  const leads = [{
    id: 'lead-1',
    dealershipId: 'dealer-1',
    workflowStatus: 'NEW',
    assigneeOperatorId: null as string | null,
    notes: null as string | null,
    version: 1,
    statusUpdatedAt: null as Date | null,
    statusUpdatedBy: null as string | null,
  }];

  const prisma = {
    operatorInvitation: {
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        for (const row of invitations) {
          if (row.dealershipId === where['dealershipId'] && row.email === where['email'] && !row.acceptedAt && !row.revokedAt) {
            Object.assign(row, data);
          }
        }
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `inv-${invitations.length + 1}`, ...data };
        invitations.push(row);
        return row;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        invitations.find((row) => row.id === where['id'] && row.dealershipId === where['dealershipId']) ?? null,
      findUnique: async ({ where }: { where: { tokenHash?: string } }) =>
        invitations.find((row) => row.tokenHash === where.tokenHash) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = invitations.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
      findMany: async () => invitations,
    },
    operatorAccount: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) =>
        accounts.find((row) => row.email === where.email || row.id === where.id) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `acct-${accounts.length + 1}`, isActive: true, firstLoginAt: null, lastLoginAt: null, mustChangePassword: false, ...data };
        accounts.push(row);
        const nested = (data.dealerAccess as { create?: Record<string, unknown> } | undefined)?.create;
        if (nested) access.push({ id: `acc-${access.length + 1}`, operatorAccountId: row.id, ...nested });
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = accounts.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    },
    operatorDealerAccess: {
      upsert: async ({ create, update, where }: { create: Record<string, unknown>; update: Record<string, unknown>; where: { operatorAccountId_dealershipId: { operatorAccountId: string; dealershipId: string } } }) => {
        const existing = access.find((row) =>
          row.operatorAccountId === where.operatorAccountId_dealershipId.operatorAccountId
          && row.dealershipId === where.operatorAccountId_dealershipId.dealershipId,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = { id: `acc-${access.length + 1}`, ...create };
        access.push(row);
        return row;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const row = access.find((item) =>
          item.dealershipId === where['dealershipId'] && item.operatorAccountId === where['operatorAccountId'],
        );
        if (!row) return null;
        return { ...row, operator: accounts.find((account) => account.id === row.operatorAccountId) };
      },
      findMany: async () => access.map((row) => ({
        ...row,
        operator: accounts.find((account) => account.id === row.operatorAccountId),
      })),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = access.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    },
    operatorSession: {
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        for (const row of sessions) {
          if (row.operatorAccountId === where['operatorAccountId']) Object.assign(row, data);
        }
      },
    },
    dealershipActivityEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        activity.push(data);
        return data;
      },
    },
    dealershipProfile: {
      findUnique: async () => ({
        id: 'dealer-1',
        legalName: 'Lakeview',
        lifecycleStatus: 'SETTING_UP',
        waitingForStock: false,
        autopilotPreference: 'OFF',
        launchCompletedAt: null,
        handoffCompletedAt: null,
        _count: { vehicles: 0, invitations: invitations.length, operatorAccess: access.length },
        invitations: invitations.map((row) => ({ deliveryStatus: row.deliveryStatus, acceptedAt: row.acceptedAt })),
        operatorAccess: access.map((row) => ({
          accessRole: row.accessRole,
          operator: accounts.find((account) => account.id === row.operatorAccountId) ?? { firstLoginAt: null, lastLoginAt: null, isActive: true },
        })),
        onboardingSteps: [],
      }),
      update: async () => ({}),
    },
    dealershipOnboardingStep: {
      findUnique: async () => null,
      upsert: async () => ({}),
    },
    lead: {
      findFirst: async ({ where }: { where: { id: string; dealershipId: string } }) =>
        leads.find((row) => row.id === where.id && row.dealershipId === where.dealershipId) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = leads.find((item) => item.id === where.id) as Record<string, unknown> | undefined;
        if (!row) return null;
        if (data.workflowStatus) row.workflowStatus = data.workflowStatus;
        if ('assigneeOperatorId' in data) row.assigneeOperatorId = data.assigneeOperatorId;
        if ('notes' in data) row.notes = data.notes;
        row.version = Number(row.version) + 1;
        row.statusUpdatedAt = new Date();
        row.statusUpdatedBy = data.statusUpdatedBy;
        return { ...row, updatedAt: new Date() };
      },
    },
  } as unknown as PrismaClient;

  return { prisma, invitations, accounts, access, activity, leads };
}

describe('invitations', () => {
  it('creates a hashed invite and previews without exposing the token digest', async () => {
    const { prisma, invitations } = memoryDb();
    const created = await createInvitation(prisma, {
      dealershipId: 'dealer-1',
      email: 'owner@lakeview.test',
      accessRole: 'DEALER_OWNER',
      invitedBy: { id: 'staff-1', email: 'maya@internal.test' },
    });
    assert.match(created.setupUrl, /invite\//);
    assert.equal(typeof invitations[0]?.tokenHash, 'string');
    assert.equal((invitations[0]?.tokenHash as string).includes(created.setupUrl.slice(-10)), false);

    const token = created.setupUrl.split('/').pop() ?? '';
    const preview = await previewInvitation(prisma, token);
    assert.equal(preview.email, 'owner@lakeview.test');
    assert.equal(hashSessionToken(token), invitations[0]?.tokenHash);
  });

  it('accepts a new owner and rejects an expired or revoked invite', async () => {
    const { prisma, invitations } = memoryDb();
    const created = await createInvitation(prisma, {
      dealershipId: 'dealer-1',
      email: 'owner@lakeview.test',
      accessRole: 'DEALER_OWNER',
      invitedBy: { id: 'staff-1', email: 'maya@internal.test' },
    });
    const token = created.setupUrl.split('/').pop() ?? '';
    const accepted = await acceptInvitation(prisma, token, 'password-1234');
    assert.equal(accepted.email, 'owner@lakeview.test');
    assert.equal(accepted.dealershipId, 'dealer-1');

    await assert.rejects(() => acceptInvitation(prisma, token, 'password-1234'), /already accepted/);

    const resent = await createInvitation(prisma, {
      dealershipId: 'dealer-1',
      email: 'second@lakeview.test',
      accessRole: 'DEALER_STAFF',
      invitedBy: { id: 'staff-1', email: 'maya@internal.test' },
    });
    await revokeInvitation(prisma, 'dealer-1', invitations.find((row) => row.email === 'second@lakeview.test')?.id as string, {
      id: 'staff-1',
      email: 'maya@internal.test',
    });
    const revokedToken = resent.setupUrl.split('/').pop() ?? '';
    await assert.rejects(() => acceptInvitation(prisma, revokedToken, 'password-1234'), /not found/);
  });
});

describe('temporary login and suspension', () => {
  it('issues a one-time password and revokes sessions on reset/suspend', async () => {
    const { prisma, accounts } = memoryDb();
    const issued = await issueTemporaryLogin(prisma, {
      dealershipId: 'dealer-1',
      email: 'gm@lakeview.test',
      accessRole: 'DEALER_OWNER',
      actor: { id: 'staff-1', email: 'maya@internal.test' },
    });
    assert.ok(issued.temporaryPassword.length >= 8);
    assert.equal(accounts[0]?.mustChangePassword, true);

    const patched = await patchPerson(prisma, {
      dealershipId: 'dealer-1',
      accountId: issued.accountId,
      actor: { id: 'staff-1', email: 'maya@internal.test' },
      resetPassword: true,
    });
    assert.ok(patched.temporaryPassword);
    assert.notEqual(patched.temporaryPassword, issued.temporaryPassword);
  });
});

describe('shared lead workflow', () => {
  it('persists status for every reader and rejects stale versions', async () => {
    const { prisma } = memoryDb();
    const first = await updateLeadWorkflow(prisma, {
      dealershipId: 'dealer-1',
      leadId: 'lead-1',
      actorId: 'user-a',
      workflowStatus: 'CONTACTED',
      notes: 'Called',
      version: 1,
    });
    assert.equal(first.workflowStatus, 'CONTACTED');
    assert.equal(first.version, 2);

    const second = await updateLeadWorkflow(prisma, {
      dealershipId: 'dealer-1',
      leadId: 'lead-1',
      actorId: 'user-b',
      workflowStatus: 'APPOINTMENT',
      version: 2,
    });
    assert.equal(second.workflowStatus, 'APPOINTMENT');

    await assert.rejects(() => updateLeadWorkflow(prisma, {
      dealershipId: 'dealer-1',
      leadId: 'lead-1',
      actorId: 'user-a',
      workflowStatus: 'LOST',
      version: 2,
    }), /updated by someone else/);
  });
});

describe('existing-account invite claim', () => {
  it('requires the existing password before linking a rooftop', async () => {
    const { prisma, accounts } = memoryDb();
    const passwordHash = await hashPassword('correct-password');
    accounts.push({
      id: 'acct-existing',
      email: 'existing@lakeview.test',
      passwordHash,
      role: 'DEALER_OWNER',
      isActive: true,
    });
    const created = await createInvitation(prisma, {
      dealershipId: 'dealer-1',
      email: 'existing@lakeview.test',
      accessRole: 'DEALER_OWNER',
      invitedBy: { id: 'staff-1', email: 'maya@internal.test' },
    });
    const token = created.setupUrl.split('/').pop() ?? '';
    await assert.rejects(() => acceptInvitation(prisma, token, 'wrong-password'), /Existing account password/);
    const accepted = await acceptInvitation(prisma, token, 'correct-password');
    assert.equal(accepted.accountId, 'acct-existing');
  });
});
