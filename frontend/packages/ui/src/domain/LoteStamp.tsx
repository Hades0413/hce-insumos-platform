import { cn } from '../cn';

export function LoteStamp({ lote, stamp = false, className }: { lote: string; stamp?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-[3px] border border-dashed border-line-strong bg-surface px-1.5 text-xs leading-5 text-ink',
        stamp && 'motion-safe:animate-stamp',
        className,
      )}
    >
      <span className="text-[0.6875rem] text-muted">Lote</span>
      <span className="font-code font-semibold tracking-wide">{lote}</span>
    </span>
  );
}
