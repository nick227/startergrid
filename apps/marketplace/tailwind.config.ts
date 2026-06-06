import type { Config } from 'tailwindcss';
import companyPreset from '../../packages/design-tokens/tailwind.preset.ts';

export default {
  presets: [companyPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
