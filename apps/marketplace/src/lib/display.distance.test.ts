import { describe, expect, it } from 'vitest';
import { formatDistanceAway } from './display.ts';

describe('formatDistanceAway', () => {
  it('formats whole miles with mi away suffix', () => {
    expect(formatDistanceAway(12)).toBe('12 mi away');
    expect(formatDistanceAway(1250)).toBe('1,250 mi away');
  });
});
