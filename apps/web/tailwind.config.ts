import type { Config } from 'tailwindcss';
import companyPreset from '@auto-dealer/design-tokens/tailwind.preset';

export default {
  presets: [companyPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
