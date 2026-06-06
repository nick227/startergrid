import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-orange-600 hover:bg-orange-500 text-white',
  secondary: 'bg-navy-800 hover:bg-navy-700 text-silver-100 border border-navy-700',
  ghost:     'text-ink-muted hover:text-ink-heading',
  danger:    'bg-status-error-dot hover:bg-red-700 text-white',
  success:   'bg-status-success-text hover:bg-green-800 text-white',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-md',
};

type Props = {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = 'primary', size = 'sm', disabled, loading, loadingLabel,
  onClick, type = 'button', className = '', children
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`focus-ring font-semibold transition-colors disabled:opacity-40
        ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
