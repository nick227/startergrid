import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tailwindConfig = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'tailwind.config.ts');

export default {
  plugins: {
    'postcss-import': {},
    tailwindcss: { config: tailwindConfig },
    autoprefixer: {},
  },
};
