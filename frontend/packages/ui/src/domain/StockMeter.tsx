import { cn } from '../cn';

export interface StockMeterProps {
  stock: number;
  solicitado?: number;
  className?: string;
}

const WIDTHS = [
  'w-0',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-[50%]',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-full',
] as const;

export function StockMeter({ stock, solicitado, className }: StockMeterProps) {
  const pedido = solicitado ?? 0;
  const excede = pedido > stock;
  const ratio = excede ? 1 : stock > 0 ? Math.max(0, pedido / stock) : 0;
  const width = WIDTHS[Math.round(ratio * 20)] ?? 'w-0';
  const tone = excede ? 'bg-danger' : 'bg-brand-600';
  return (
    <div
      key={excede ? 'excede' : 'ok'}
      className={cn('flex w-24 flex-col items-end gap-1', excede && 'motion-safe:animate-shake', className)}
    >
      <span
        className={cn(
          'text-[0.9375rem] font-bold tabular-nums',
          excede ? 'text-danger' : stock === 0 ? 'text-muted' : 'text-ink',
        )}
      >
        {stock.toLocaleString('es-PE')}
        <span className="sr-only"> unidades disponibles</span>
      </span>
      {solicitado !== undefined && (
        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
          <span
            className={cn(
              'block h-full rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-out-quart)]',
              width,
              tone,
            )}
          />
        </span>
      )}
    </div>
  );
}

export function StockLevel({ stock }: { stock: number }) {
  if (stock <= 0) {
    return <span className="font-bold text-danger">Agotado</span>;
  }
  return <span className="font-bold tabular-nums text-ink">{stock.toLocaleString('es-PE')}</span>;
}
