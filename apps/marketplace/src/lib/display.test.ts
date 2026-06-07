import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { formatUsage } from './display.ts';

describe('formatUsage — null-safety', () => {
  it('formats miles by default', () => {
    expect(formatUsage(12_000)).toBe('12,000 mi');
  });

  it('formats hours when usageUnit is hours', () => {
    expect(formatUsage(125, 'hours')).toBe('125 hrs');
  });

  it('returns em dash for non-finite mileage', () => {
    expect(formatUsage(Number.NaN)).toBe('—');
    expect(formatUsage(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('category label isolation — no automotive leak on trailers or boats', () => {
  const automotive = resolveCategorySchema('AUTOMOTIVE');
  const trailers = resolveCategorySchema('TRAILERS_POWERSPORTS_RV');
  const boats = resolveCategorySchema('BOATS');

  it('trailers schema uses unit labels, not vehicle/vin defaults', () => {
    expect(trailers.asset.singular).toBe('unit');
    expect(trailers.asset.idLabel).toBe('Serial #');
    expect(trailers.fields.find(f => f.key === 'mileage')?.label).toBe('Miles / Hours');
  });

  it('automotive schema keeps vehicle/vin labels', () => {
    expect(automotive.asset.singular).toBe('vehicle');
    expect(automotive.asset.idLabel).toBe('VIN');
    expect(automotive.fields.find(f => f.key === 'mileage')?.label).toBe('Mileage');
  });

  it('trailers usage field label is not the automotive mileage label', () => {
    const trailersUsage = trailers.fields.find(f => f.key === 'mileage')?.label;
    const automotiveUsage = automotive.fields.find(f => f.key === 'mileage')?.label;
    expect(trailersUsage).not.toBe(automotiveUsage);
  });

  it('boats schema uses HIN and Hours labels, not vehicle/vin defaults', () => {
    expect(boats.asset.singular).toBe('boat');
    expect(boats.asset.idLabel).toBe('HIN');
    expect(boats.fields.find(f => f.key === 'mileage')?.label).toBe('Hours');
    expect(boats.copy.titleColumn).toBe('Boat');
  });

  it('boats labels differ from automotive and trailers', () => {
    expect(boats.asset.idLabel).not.toBe(automotive.asset.idLabel);
    expect(boats.asset.idLabel).not.toBe(trailers.asset.idLabel);
    expect(boats.fields.find(f => f.key === 'mileage')?.label).not.toBe(
      automotive.fields.find(f => f.key === 'mileage')?.label,
    );
  });
});
