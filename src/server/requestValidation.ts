import { z } from 'zod';

const nonEmptyString = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function messageFor(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid request body';
  const path = issue.path.length ? issue.path.join('.') : 'body';
  return `${path}: ${issue.message}`;
}

export function validateBody<T>(schema: z.ZodType<T>, body: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, error: messageFor(parsed.error) };
  return { ok: true, data: parsed.data };
}

export const preparePublishSchema = z.object({
  dryRun: z.boolean().optional(),
  platforms: z.array(nonEmptyString(80)).max(18).optional(),
}).strict();

export const inventoryImportSchema = z.object({
  rows: z.array(
    z.record(z.string().max(200), z.string().max(2000)).refine(
      row => Object.keys(row).length <= 200,
      'Must have no more than 200 columns'
    )
  ).max(2000),
  mapping: z.record(z.string().max(200), nonEmptyString(80)).optional(),
}).strict();

export const bulkEditFieldsSchema = z.object({
  priceCents: z.number().int().min(1).max(100_000_000).optional(),
  mileage: z.number().int().min(0).max(2_000_000).optional(),
  condition: z.enum(['NEW', 'USED', 'CPO']).optional(),
  exteriorColor: nonEmptyString(80).optional(),
  interiorColor: nonEmptyString(80).optional(),
  bodyStyle: nonEmptyString(80).optional(),
  drivetrain: nonEmptyString(80).optional(),
  fuelType: nonEmptyString(80).optional(),
  transmission: nonEmptyString(80).optional(),
}).strict().refine(fields => Object.keys(fields).length > 0, {
  message: 'At least one editable field is required',
});

export const bulkEditSchema = z.object({
  stockNumbers: z.array(nonEmptyString(80)).min(1).max(2000),
  fields: bulkEditFieldsSchema,
}).strict();

export const accountUpdateSchema = z.object({
  state: z.enum([
    'ACCOUNT_NEEDED',
    'CREDENTIALS_NEEDED',
    'PENDING_REVIEW',
    'ACTIVE',
    'BLOCKED',
    'PARTNER_REQUIRED',
    'SUSPENDED',
  ]).optional(),
  notes: optionalText(5000),
  accountId: optionalText(120),
  platformRepName: optionalText(160),
  platformRepEmail: z.string().trim().email().max(255).optional().or(z.literal('')),
  membershipStatus: optionalText(80),
  nextAction: optionalText(255),
  nextActionOwner: z.enum(['DEALER', 'OPERATOR', 'PLATFORM']).nullable().optional(),
}).strict();

export const priceUpdateSchema = z.object({
  priceCents: z.number().int().min(1).max(100_000_000),
}).strict();

export const photoUpdateSchema = z.object({
  photoUrls: z.array(z.string().trim().url().max(512)).min(1).max(100),
}).strict();

export const emptyBodySchema = z.object({}).strict().optional();

export const leadCaptureSchema = z.object({
  stockNumber: optionalText(80),
  contactName: optionalText(160),
  contactEmail: z.string().trim().email().max(255).optional().or(z.literal('')),
  contactPhone: optionalText(40),
  message: optionalText(5000),
}).strict().refine(
  body => Boolean(body.contactName || body.contactEmail || body.contactPhone),
  'At least one of contactName, contactEmail, or contactPhone is required'
);

export type PreparePublishBody = z.infer<typeof preparePublishSchema>;
export type InventoryImportBody = z.infer<typeof inventoryImportSchema>;
export type BulkEditBody = z.infer<typeof bulkEditSchema>;
export type AccountUpdateBody = z.infer<typeof accountUpdateSchema>;
export type LeadCaptureBody = z.infer<typeof leadCaptureSchema>;
