import { cn } from '../cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" className="fill-brand-600" />
      <path d="M12.5 5.5h7v7h7v7h-7v7h-7v-7h-7v-7h7z" className="fill-white" />
      <path d="M13.5 22.5h5" className="stroke-brand-600" strokeWidth="1.6" strokeDasharray="1.6 1.2" />
    </svg>
  );
}

export function BrandLockup({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="leading-tight">
        <span className={cn('block text-[1.0625rem] font-bold', inverted ? 'text-white' : 'text-ink')}>
          HCE Insumos
        </span>
        <span className={cn('block text-xs', inverted ? 'text-brand-100' : 'text-muted')}>Farmacia y almacén</span>
      </span>
    </span>
  );
}
