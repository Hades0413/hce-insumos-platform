import type { Metadata } from 'next';
import { DocumentoHistorial, RequirePermiso } from '@hce/features';
import { PageHeader } from '@hce/ui';

export const metadata: Metadata = { title: 'Historial de ventas' };

export default function HistorialVentasPage() {
  return (
    <RequirePermiso permiso="ventas.ver">
      <PageHeader title="Historial de ventas" description="Ventas registradas, de la más reciente a la más antigua." />
      <DocumentoHistorial resource="ventas" />
    </RequirePermiso>
  );
}
