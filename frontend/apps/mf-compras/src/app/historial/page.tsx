import type { Metadata } from 'next';
import { DocumentoHistorial, RequirePermiso } from '@hce/features';
import { PageHeader } from '@hce/ui';

export const metadata: Metadata = { title: 'Historial de compras' };

export default function HistorialComprasPage() {
  return (
    <RequirePermiso permiso="compras.ver">
      <PageHeader
        title="Historial de compras"
        description="Compras registradas, de la más reciente a la más antigua."
      />
      <DocumentoHistorial resource="compras" />
    </RequirePermiso>
  );
}
