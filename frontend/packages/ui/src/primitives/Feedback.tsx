import type { ReactNode } from 'react';
import { cn } from '../cn';

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'brand';

const TONE: Record<Tone, string> = {
  neutral: 'bg-canvas text-muted border-line',
  ok: 'bg-ok-bg text-ok border-ok/25',
  warn: 'bg-warn-bg text-warn border-warn/25',
  danger: 'bg-danger-bg text-danger border-danger/25',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold', TONE[tone])}>
      {children}
    </span>
  );
}

export function Alert({
  tone = 'danger',
  title,
  children,
}: {
  tone?: Exclude<Tone, 'neutral' | 'brand'>;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-md border-l-4 border-y border-r px-4 py-3 text-[0.9375rem]', TONE[tone])}
    >
      {title && <p className="font-bold">{title}</p>}
      {children && <div className={cn('text-ink/90', title && 'mt-1')}>{children}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded-md border border-dashed border-line-strong px-5 py-8">
      <p className="text-base font-bold text-ink">{title}</p>
      {description && <p className="max-w-prose text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-card border border-line bg-surface', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-prose">
        <h1 className="text-[length:var(--text-display)] font-bold leading-[var(--text-display--line-height)] text-ink">
          {title}
        </h1>
        {description && <p className="mt-2 text-[0.9375rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
