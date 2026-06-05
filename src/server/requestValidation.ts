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

// operationId: preparePublish
export const preparePublishSchema = z.object({
  dryRun: z.boolean().optional(),
  platforms: z.array(nonEmptyString(80)).max(18).optional(),
}).strict();

// operationId: previewInventoryImport | commitInventoryImport
export const inventoryImportSchema = z.object({
  rows: z.array(
    z.record(z.string().max(200), z.string().max(2000)).refine(
      row => Object.keys(row).length <= 200,
      'Must have no more than 200 columns'
    )
  ).max(2000),
  mapping: z.record(z.string().max(200), nonEmptyString(80)).optional(),
}).strict();

// operationId: bulkEditInventory (fields sub-schema)
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

// operationId: bulkEditInventory
export const bulkEditSchema = z.object({
  stockNumbers: z.array(nonEmptyString(80)).min(1).max(2000),
  fields: bulkEditFieldsSchema,
}).strict();

// operationId: updateAccount
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

// operationId: updateVehiclePrice
export const priceUpdateSchema = z.object({
  priceCents: z.number().int().min(1).max(100_000_000),
}).strict();

// operationId: updateVehiclePhotos
export const photoUpdateSchema = z.object({
  photoUrls: z.array(z.string().trim().url().max(512)).min(1).max(100),
}).strict();

// operationId: markVehicleSold | markVehicleRemoved
export const emptyBodySchema = z.object({}).strict().optional();

// operationId: createIngressSource
export const createIngressSourceSchema = z.object({
  label:      nonEmptyString(160),
  feedUrl:    z.string().trim().url().max(512).refine(
    url => url.startsWith('https://'),
    'feedUrl must use HTTPS'
  ),
  sourceSlug: optionalText(80),
  status:     z.enum(['ACTIVE', 'PAUSED']).optional(),
}).strict();

// operationId: updateIngressSource
export const updateIngressSourceSchema = z.object({
  label:   nonEmptyString(160).optional(),
  feedUrl: z.string().trim().url().max(512).refine(
    url => url.startsWith('https://'),
    'feedUrl must use HTTPS'
  ).optional(),
  status:  z.enum(['ACTIVE', 'PAUSED', 'DISCONNECTED', 'ERROR']).optional(),
}).strict().refine(
  body => Object.keys(body).length > 0,
  'At least one field is required'
);

export type CreateIngressSourceBody = z.infer<typeof createIngressSourceSchema>;
export type UpdateIngressSourceBody = z.infer<typeof updateIngressSourceSchema>;

// operationId: ingestJsonInventory
const jsonIngestVehicleSchema = z.object({
  stockNumber:   nonEmptyString(80),
  vin:           nonEmptyString(17),
  year:          z.number().int().min(1900).max(2100),
  make:          nonEmptyString(80),
  model:         nonEmptyString(80),
  trim:          optionalText(80),
  mileage:       z.number().int().min(0).max(2_000_000),
  priceCents:    z.number().int().min(1).max(100_000_000),
  condition:     z.enum(['NEW', 'USED', 'CPO']),
  exteriorColor: nonEmptyString(80),
  interiorColor: optionalText(80),
  bodyStyle:     optionalText(80),
  drivetrain:    optionalText(80),
  fuelType:      optionalText(80),
  transmission:  optionalText(80),
  photoUrls:     z.array(z.string().trim().url().max(512)).max(100).optional(),
}).strict();

export const jsonIngestSchema = z.object({
  sourceSlug:  optionalText(80),
  sourceLabel: optionalText(160),
  mode:        z.enum(['upsert']).optional(),
  vehicles:    z.array(jsonIngestVehicleSchema).min(1).max(2000),
}).strict();

export type JsonIngestBody = z.infer<typeof jsonIngestSchema>;

// operationId: captureLead
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
