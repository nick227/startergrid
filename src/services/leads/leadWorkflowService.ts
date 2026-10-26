import type { LeadWorkflowStatus, Prisma, PrismaClient } from '@prisma/client';
import { HttpError } from '../dealership/httpError.js';

type Db = PrismaClient | Prisma.TransactionClient;

const STATUSES: LeadWorkflowStatus[] = ['NEW', 'CONTACTED', 'APPOINTMENT', 'SOLD', 'LOST'];

export async function updateLeadWorkflow(
  db: Db,
  input: {
    dealershipId: string;
    leadId: string;
    actorId: string;
    workflowStatus?: LeadWorkflowStatus;
    assigneeOperatorId?: string | null;
    notes?: string | null;
    version?: number;
  },
) {
  const lead = await db.lead.findFirst({
    where: { id: input.leadId, dealershipId: input.dealershipId },
  });
  if (!lead) throw new HttpError(404, 'Lead not found');
  if (input.version !== undefined && input.version !== lead.version) {
    throw new HttpError(409, 'Lead was updated by someone else — refresh and retry');
  }
  if (input.workflowStatus && !STATUSES.includes(input.workflowStatus)) {
    throw new HttpError(400, 'Invalid lead status');
  }

  const data: Prisma.LeadUpdateInput = { version: { increment: 1 } };
  if (input.workflowStatus) {
    data.workflowStatus = input.workflowStatus;
    data.statusUpdatedAt = new Date();
    data.statusUpdatedBy = input.actorId;
  }
  if (input.assigneeOperatorId !== undefined) data.assigneeOperatorId = input.assigneeOperatorId;
  if (input.notes !== undefined) data.notes = input.notes;

  return db.lead.update({
    where: { id: lead.id },
    data,
    select: {
      id: true,
      dealershipId: true,
      workflowStatus: true,
      assigneeOperatorId: true,
      notes: true,
      version: true,
      statusUpdatedAt: true,
      statusUpdatedBy: true,
      updatedAt: true,
    },
  });
}
