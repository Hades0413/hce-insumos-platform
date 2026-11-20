import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '../cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-200 disabled:text-white',
  secondary:
    'border border-line-strong bg-surface text-ink hover:border-brand-600 hover:text-brand-700 disabled:text-muted',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:opacity-50',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50 disabled:text-muted',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[0.9375rem]',
  lg: 'h-13 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  success?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed motion-reduce:active:scale-100',
        VARIANTS[variant],
        success && 'bg-ok hover:bg-ok disabled:bg-ok',
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {success && !loading && (
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 animate-pop"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" className="animate-check" />
        </svg>
      )}
      {children}
    </button>
  );
}
