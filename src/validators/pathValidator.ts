import type { MediaRules, ValidationIssue, VehiclePayload } from '../lib/types.js';

function readPath(source: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  return parts.reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

export function validateRequiredPaths(source: unknown, paths: string[], label: string): ValidationIssue[] {
  return paths.flatMap((path) => {
    const value = readPath(source, path);
    const missing = value === undefined || value === null || value === '';
    return missing ? [{ path, message: `${label} missing required field: ${path}`, severity: 'FAIL' as const }] : [];
  });
}

export function validateMediaRules(vehicles: VehiclePayload[], rules: MediaRules): ValidationIssue[] {
  const minImages = Number(rules.minImages ?? 0);
  const minWidth = Number(rules.minWidth ?? 0);
  const minHeight = Number(rules.minHeight ?? 0);
  const issues: ValidationIssue[] = [];

  vehicles.forEach((vehicle) => {
    const images = Array.isArray(vehicle.media) ? vehicle.media.filter((item) => item.kind === 'IMAGE') : [];
    if (images.length < minImages) {
      issues.push({
        path: `vehicles.${vehicle.stockNumber}.media`,
        message: `Vehicle ${vehicle.stockNumber} needs at least ${minImages} images for this platform`,
        severity: 'FAIL'
      });
    }

    images.forEach((image, index) => {
      if (minWidth && image.width && image.width < minWidth) {
        issues.push({ path: `vehicles.${vehicle.stockNumber}.media[${index}].width`, message: `Image width below ${minWidth}`, severity: 'FAIL' });
      }
      if (minHeight && image.height && image.height < minHeight) {
        issues.push({ path: `vehicles.${vehicle.stockNumber}.media[${index}].height`, message: `Image height below ${minHeight}`, severity: 'FAIL' });
      }
    });
  });

  return issues;
}
