import { cn } from '../cn';

export function Spinner({ size = 'md', className, label = 'Cargando' }: { size?: 'sm' | 'md' | 'lg'; className?: string; label?: string }) {
  const dims = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }[size];
  return (
    <span role="status" aria-label={label} className={cn('inline-block', className)}>
      <svg className={cn('animate-spin text-brand-600', dims)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted">
      <Spinner size="lg" />
      <span>{label}</span>
    </div>
  );
}
