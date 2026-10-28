import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'btn-primary-operator',
  secondary: 'btn-secondary-operator',
  ghost: 'focus-ring inline-flex items-center justify-center rounded-md font-semibold text-ink-muted hover:bg-silver-100 hover:text-ink-heading disabled:cursor-not-allowed disabled:opacity-40',
  danger: 'focus-ring inline-flex items-center justify-center rounded-md bg-status-error-dot font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-10 px-3.5 text-sm',
};

type Props = {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  pressed?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'sm',
  disabled,
  loading,
  loadingLabel,
  pressed,
  icon,
  onClick,
  type = 'button',
  className = '',
  children,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-pressed={pressed}
      className={`gap-1.5 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {icon}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
