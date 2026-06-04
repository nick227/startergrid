import type { Chip } from '@/components/generic/FilterChips.tsx';
import type { StatusTone } from './statusRegistry.ts';

const TONE_CHIP_COLOR: Record<StatusTone, NonNullable<Chip['color']>> = {
  neutral: 'slate',
  success: 'green',
  info: 'slate',
  warning: 'amber',
  danger: 'red',
  muted: 'slate',
};

export function registryToFilterChips<T extends { key: string; label: string; tone: StatusTone }>(
  defs: readonly T[]
): Chip[] {
  return defs.map(d => ({
    key: d.key,
    label: d.label,
    color: TONE_CHIP_COLOR[d.tone],
  }));
}
