import { LoteStamp } from '@hce/ui';

const MOVIMIENTOS = [
  { fecha: '03 nov', tipo: 'Entrada', cantidad: '+500', saldo: '500' },
  { fecha: '05 nov', tipo: 'Salida', cantidad: '−24', saldo: '476' },
  { fecha: '09 nov', tipo: 'Salida', cantidad: '−60', saldo: '416' },
  { fecha: '12 nov', tipo: 'Entrada', cantidad: '+200', saldo: '616' },
] as const;

export function KardexCard() {
  return (
    <div className="px-6 pb-6 pt-6 sm:px-8" aria-hidden="true">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-muted">Tarjeta de control</p>
        <LoteStamp lote="PCT-2611-001" className="motion-safe:animate-stamp" />
      </div>
      <p className="mt-1 text-2xl font-bold text-ink">Paracetamol 500 mg</p>
      <table className="mt-4 w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-line-strong text-left text-muted">
            <th className="py-1.5 font-semibold">Fecha</th>
            <th className="py-1.5 font-semibold">Movimiento</th>
            <th className="py-1.5 text-right font-semibold">Cantidad</th>
            <th className="py-1.5 text-right font-semibold">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {MOVIMIENTOS.map((m) => (
            <tr key={m.fecha} className="border-b border-line last:border-b-0">
              <td className="py-1.5 text-muted">{m.fecha}</td>
              <td className={m.tipo === 'Entrada' ? 'py-1.5 text-ok' : 'py-1.5 text-warn'}>{m.tipo}</td>
              <td className="py-1.5 text-right">{m.cantidad}</td>
              <td className="py-1.5 text-right font-bold text-ink">{m.saldo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
