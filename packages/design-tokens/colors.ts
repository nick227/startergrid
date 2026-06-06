/** Canonical company palette — single source of truth for both apps. */

export const companyColors = {
  navy: {
    950: '#071321',
    900: '#0F2744',
    800: '#1A3A5C',
    700: '#234E78',
    600: '#2E6294',
    500: '#3B82C4',
  },
  cta: {
    DEFAULT: '#1D4ED8',
    hover: '#1E40AF',
    light: '#EFF6FF',
  },
  orange: {
    600: '#EA580C',
    500: '#F97316',
    100: '#FFEDD5',
  },
  ink: {
    DEFAULT: '#0A0F14',
    heading: '#1E293B',
    body: '#334155',
    muted: '#64748B',
    faint: '#94A3B8',
  },
  silver: {
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
  },
  surface: {
    page: '#F4F6F8',
    'page-bright': '#F8FAFC',
    card: '#FFFFFF',
    inset: '#F1F5F9',
  },
  status: {
    success: {
      bg: '#ECFDF5',
      text: '#047857',
      border: '#A7F3D0',
      dot: '#10B981',
    },
    warning: {
      bg: '#FFEDD5',
      text: '#C2410C',
      border: '#FDBA74',
      dot: '#EA580C',
    },
    error: {
      bg: '#FEF2F2',
      text: '#B91C1C',
      border: '#FECACA',
      dot: '#EF4444',
    },
    info: {
      bg: '#EFF6FF',
      text: '#234E78',
      border: '#BFDBFE',
      dot: '#3B82C4',
    },
    neutral: {
      bg: '#F1F5F9',
      text: '#334155',
      border: '#E2E8F0',
      dot: '#94A3B8',
    },
  },
} as const;

export const companyFontFamily = {
  sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
};

export const companyBorderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  pill: '9999px',
};

export const companyBoxShadow = {
  'elevation-1': '0 1px 3px rgb(7 19 33 / 6%)',
  'elevation-2': '0 4px 16px rgb(7 19 33 / 8%)',
  'elevation-3': '0 12px 40px rgb(7 19 33 / 12%)',
  chrome: '0 4px 24px rgb(7 19 33 / 18%)',
};

/** Tailwind class fragments for status pills — used by statusRegistry. */
export const statusPill = {
  success: 'bg-status-success-bg text-status-success-text border border-status-success-border',
  warning: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
  danger: 'bg-status-error-bg text-status-error-text border border-status-error-border',
  info: 'bg-status-info-bg text-status-info-text border border-status-info-border',
  muted: 'bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border',
} as const;

export const statusDot = {
  success: 'bg-status-success-dot',
  warning: 'bg-status-warning-dot',
  danger: 'bg-status-error-dot',
  info: 'bg-status-info-dot',
  muted: 'bg-status-neutral-dot',
} as const;

export const statusRing = {
  success: 'ring-status-success-border',
  warning: 'ring-status-warning-border',
  danger: 'ring-status-error-border',
  info: 'ring-status-info-border',
  muted: 'ring-status-neutral-border',
} as const;
