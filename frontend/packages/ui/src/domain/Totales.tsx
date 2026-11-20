import { IGV_RATE } from '@hce/domain';
import { AnimatedMoney } from '../data/AnimatedMoney';
import type { Importes } from './types';

export function Totales({ subTotal, igv, total, live = false }: Importes & { live?: boolean }) {
  return (
    <dl
      aria-live={live ? 'polite' : undefined}
      aria-atomic={live || undefined}
      className="grid w-full max-w-xs grid-cols-[1fr_auto] gap-y-1.5 text-[0.9375rem]"
    >
      <dt className="pr-6 text-muted">Subtotal</dt>
      <dd className="text-right">
        <AnimatedMoney value={subTotal} />
      </dd>
      <dt className="pr-6 text-muted">IGV {Math.round(IGV_RATE * 100)} %</dt>
      <dd className="text-right">
        <AnimatedMoney value={igv} />
      </dd>
      <dt className="mt-1 border-t border-dashed border-line-strong pt-2 pr-6 text-lg font-bold">Total</dt>
      <dd className="mt-1 border-t border-dashed border-line-strong pt-2 text-right text-2xl font-bold">
        <AnimatedMoney value={total} />
      </dd>
    </dl>
  );
}
