import type { Metadata } from 'next';
import { RequirePermiso } from '@hce/features';
import { PageHeader } from '@hce/ui';
import { KardexView } from '@/features/kardex/KardexView';

export const metadata: Metadata = { title: 'Kardex' };

export default function KardexPage() {
  return (
    <RequirePermiso permiso="kardex.ver">
      <PageHeader
        title="Kardex"
        description="Stock actual de cada producto según sus entradas (compras) y salidas (ventas)."
      />
      <KardexView />
    </RequirePermiso>
  );
}
