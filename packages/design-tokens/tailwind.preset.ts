import type { Config } from 'tailwindcss';
import {
  companyBorderRadius,
  companyBoxShadow,
  companyColors,
  companyFontFamily,
} from './colors.ts';

export default {
  theme: {
    extend: {
      colors: companyColors,
      fontFamily: companyFontFamily,
      borderRadius: companyBorderRadius,
      boxShadow: companyBoxShadow,
    },
  },
} satisfies Config;
