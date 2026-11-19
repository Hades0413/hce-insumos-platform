import type { Metadata } from 'next';
import { PageHeader } from '@hce/ui';
import { KardexView } from '@/features/kardex/KardexView';

export const metadata: Metadata = { title: 'Kardex' };

export default function KardexPage() {
  return (
    <>
      <PageHeader title="Kardex de productos" description="Stock actual calculado a partir de los movimientos de entrada (compras) y salida (ventas)." />
      <KardexView />
    </>
  );
}
