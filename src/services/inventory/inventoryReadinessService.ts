import type { BusinessCategoryId, CategoryInventorySchema } from '@auto-dealer/category-schemas';
import {
  getCategoryInventorySchema,
  getMissingRequiredPublishSlots,
} from '@auto-dealer/category-schemas';

export type InventoryReadinessResult = {
  /** BLOCKED = any BLOCKER rule fails. WARNING = only WARNINGs. READY = all pass. */
  status: 'READY' | 'WARNING' | 'BLOCKED';
  missingFields: string[];
  invalidFields: string[];
  /** Slot keys from minimumPublishSet that have no assigned media. */
  missingRequiredMediaSlots: string[];
  /** Slot keys from recommendedSet that have no assigned media. */
  missingRecommendedMediaSlots: string[];
  blockers: string[];
  warnings: string[];
  nextAction: string | null;
};

export type ReadinessInput = {
  category: BusinessCategoryId;
  /** Flat record of vehicle field values. Keys match CategoryFieldDef.key. */
  fields: Record<string, unknown>;
  /** Slot keys of VehicleMedia rows where mediaRole = 'STRUCTURED_SHOT'. */
  assignedMediaSlotKeys?: string[];
  /** Total media count (for generic photo warning fallback). */
  totalMediaCount?: number;
  /** Physical records use their own schema. Digital SONGS stays the category default. */
  schema?: CategoryInventorySchema;
};

function isMissing(val: unknown): boolean {
  return val === undefined || val === null || val === '' || val === 0;
}

export function buildInventoryReadiness(input: ReadinessInput): InventoryReadinessResult {
  const { category, fields, assignedMediaSlotKeys = [], totalMediaCount = 0 } = input;
  const schema = input.schema ?? getCategoryInventorySchema(category);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  if (schema) {
    for (const rule of schema.readinessRules) {
      // Media rules use synthetic fieldKey 'photos' — handled separately below
      if (rule.fieldKey === 'photos') continue;
      const val = fields[rule.fieldKey];
      if (isMissing(val)) {
        missingFields.push(rule.fieldKey);
        if (rule.severity === 'BLOCKER') {
          blockers.push(rule.message);
        } else {
          warnings.push(rule.message);
        }
      }
    }
    if (schema.strictFieldValidation) {
      for (const field of schema.importFields) {
        const value = fields[field.fieldKey];
        const absent = value == null || (typeof value === 'string' && value.trim() === '');
        const invalid = absent ? field.requiredLevel === 'REQUIRED'
          : (['text', 'identifier'].includes(field.kind) && typeof value !== 'string')
            || (['number', 'currency'].includes(field.kind) && (typeof value !== 'number' || !Number.isFinite(value)
              || (field.validation?.min != null && value < field.validation.min)
              || (field.validation?.max != null && value > field.validation.max)));
        if (invalid && !invalidFields.includes(field.fieldKey)) {
          invalidFields.push(field.fieldKey);
          blockers.push(`${field.label} is missing or invalid`);
        }
      }
      if (schema.validConditionValues && !schema.validConditionValues.includes(String(fields.condition ?? ''))) {
        invalidFields.push('condition');
        blockers.push('Condition is not supported by this inventory contract');
      }
    }
    // Validate VIN format if present
    const vin = fields['vin'];
    if (typeof vin === 'string' && vin.length > 0) {
      const pattern = schema.primaryIdentifier.pattern;
      if (pattern && !new RegExp(pattern).test(vin)) {
        invalidFields.push('vin');
        blockers.push('VIN format is invalid');
      }
    }
  } else {
    // Generic fallback for categories without a committed inventory schema
    const genericRequired = ['stockNumber', 'priceCents', 'condition'] as const;
    for (const key of genericRequired) {
      if (isMissing(fields[key])) {
        missingFields.push(key);
        blockers.push(`${key} is required`);
      }
    }
  }

  // Photo / media readiness
  const missingRequiredMediaSlots = getMissingRequiredPublishSlots(category, assignedMediaSlotKeys);
  const guide = schema?.mediaGuide;

  let missingRecommendedMediaSlots: string[] = [];
  if (guide) {
    const assigned = new Set(assignedMediaSlotKeys);
    missingRecommendedMediaSlots = guide.recommendedSet.filter(k => !assigned.has(k));
  }

  // Photo warning — blocker if minimumPublishSet not met, warning if no photos at all
  if (missingRequiredMediaSlots.length > 0) {
    const label = missingRequiredMediaSlots.join(', ');
    warnings.push(`Missing required shots for publishing: ${label}`);
  } else if (totalMediaCount === 0) {
    warnings.push('No photos — at least one photo improves listing quality');
  }

  // Build nextAction from highest-priority issue
  let nextAction: string | null = null;
  if (blockers.length > 0) {
    nextAction = blockers[0] ?? null;
  } else if (missingRequiredMediaSlots.length > 0) {
    nextAction = `Add required shots: ${missingRequiredMediaSlots.slice(0, 2).join(', ')}`;
  } else if (warnings.length > 0) {
    nextAction = warnings[0] ?? null;
  }

  const status: InventoryReadinessResult['status'] =
    blockers.length > 0 ? 'BLOCKED' :
    warnings.length > 0 ? 'WARNING' :
    'READY';

  return {
    status, missingFields, invalidFields,
    missingRequiredMediaSlots, missingRecommendedMediaSlots,
    blockers, warnings, nextAction,
  };
}

/** Compatibility shim — replaces classifyVehicleReadiness used by inventoryListService + importService.
 *  Accepts the vehicle-shaped record directly and returns the old shape. */
export function classifyVehicleReadinessFromSchema(
  v: Record<string, unknown> & { mediaCount?: number },
): { readiness: 'READY' | 'BLOCKED' | 'WARNING'; issues: Array<{ path: string; message: string; severity: 'FAIL' | 'WARN' }> } {
  const result = buildInventoryReadiness({
    category: 'AUTOMOTIVE',
    fields: v,
    totalMediaCount: typeof v['mediaCount'] === 'number' ? v['mediaCount'] : 0,
  });
  const issues = [
    ...result.blockers.map((msg, i) => ({
      path: result.missingFields[i] ?? 'unknown',
      message: msg,
      severity: 'FAIL' as const,
    })),
    ...result.warnings.map((msg, i) => ({
      path: result.missingFields[result.blockers.length + i] ?? 'unknown',
      message: msg,
      severity: 'WARN' as const,
    })),
  ];
  return { readiness: result.status, issues };
}
