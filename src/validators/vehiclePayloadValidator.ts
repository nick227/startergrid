import type { MediaRules, ValidationIssue, VehiclePayload } from '../lib/types.js';
import { validateRequiredPaths, validateMediaRules } from './pathValidator.js';

export function validateVehiclePayloads(vehicles: VehiclePayload[], requiredFields: string[], mediaRules: MediaRules): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const vehicle of vehicles) {
    issues.push(...validateRequiredPaths(vehicle, requiredFields, `Vehicle ${vehicle.stockNumber}`));
    if (vehicle.priceCents !== undefined && Number(vehicle.priceCents) < 100000) {
      issues.push({ path: `vehicles.${vehicle.stockNumber}.priceCents`, message: `Vehicle ${vehicle.stockNumber} price looks suspiciously low`, severity: 'WARN', code: 'PRICE_SUSPICIOUS' });
    }
    if (vehicle.vin && !/^[A-HJ-NPR-Z0-9]{10,17}$/i.test(String(vehicle.vin))) {
      issues.push({ path: `vehicles.${vehicle.stockNumber}.vin`, message: `Vehicle ${vehicle.stockNumber} VIN has invalid characters/length for POC submission`, severity: 'FAIL', code: 'INVALID_VIN' });
    }
  }
  issues.push(...validateMediaRules(vehicles, mediaRules));
  return issues;
}
