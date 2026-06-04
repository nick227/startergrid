import type { DealershipPayload, ValidationIssue } from '../../lib/types.js';
import { validateRequiredPaths } from '../pathValidator.js';

export function validateDealershipProfile(dealership: DealershipPayload, requiredFields: string[]): ValidationIssue[] {
  const issues = validateRequiredPaths(dealership, requiredFields, 'Dealership profile');
  if (dealership.inventorySize !== undefined && Number(dealership.inventorySize) <= 0) {
    issues.push({ path: 'inventorySize', message: 'Dealership inventorySize should be greater than zero', severity: 'WARN' });
  }
  if (dealership.websiteUrl && !String(dealership.websiteUrl).startsWith('https://')) {
    issues.push({ path: 'websiteUrl', message: 'Dealership websiteUrl should be HTTPS for platform submissions', severity: 'WARN' });
  }
  return issues;
}
