import { useCallback, useId, useLayoutEffect, useRef, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from '../cn';

const CONTROL =
  'w-full rounded-md border bg-surface text-ink placeholder:text-muted/80 disabled:bg-canvas disabled:text-muted focus:border-brand-600';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  ref?: Ref<HTMLInputElement>;
  containerClassName?: string;
}

export function Input({ label, error, hint, id, className, containerClassName, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(CONTROL, 'h-11 px-3 text-[0.9375rem]', error ? 'border-danger' : 'border-line-strong', className)}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface LineNumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> {
  accessibleLabel: string;
  error?: string;
  decimal?: boolean;
  focusOnMount?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function parseNumberInput(value: unknown): number {
  if (typeof value === 'number') return value;
  const text = String(value ?? '')
    .trim()
    .replace(',', '.');
  return text === '' ? Number.NaN : Number(text);
}

export function LineNumberInput({
  accessibleLabel,
  error,
  decimal = false,
  focusOnMount = false,
  ref,
  id,
  className,
  ...rest
}: LineNumberInputProps) {
  const inner = useRef<HTMLInputElement | null>(null);
  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      inner.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  useLayoutEffect(() => {
    if (!focusOnMount || !inner.current) return;
    inner.current.focus();
    inner.current.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={setRefs}
        id={inputId}
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        autoComplete="off"
        onFocus={(e) => e.currentTarget.select()}
        aria-label={accessibleLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          CONTROL,
          'h-11 px-2 text-right tabular-nums',
          error ? 'border-danger bg-danger-bg' : 'border-line-strong',
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} className="max-w-44 text-right text-xs font-semibold leading-snug text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
