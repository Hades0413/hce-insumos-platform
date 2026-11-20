import type { Metadata } from 'next';
import { RequirePermiso } from '@hce/features';
import { PageHeader } from '@hce/ui';
import { CompraForm } from '@/features/compras/CompraForm';

export const metadata: Metadata = { title: 'Registrar compra' };

export default function RegistrarCompraPage() {
  return (
    <RequirePermiso permiso="compras.registrar">
      <PageHeader
        title="Registrar compra"
        description="Ingreso de medicamentos e insumos al almacén. Cada compra suma stock en el kardex."
      />
      <CompraForm />
    </RequirePermiso>
  );
}
