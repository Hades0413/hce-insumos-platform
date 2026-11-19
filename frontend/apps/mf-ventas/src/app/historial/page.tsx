'use client';

import { api } from '@hce/api-client';
import { DocumentoList, PageHeader } from '@hce/ui';

export default function HistorialVentasPage() {
  return (
    <>
      <PageHeader title="Historial de ventas" description="Ventas registradas, filtrables por fecha." />
      <DocumentoList resource="ventas" titulo="Ventas" listar={api.ventas.listar} obtener={api.ventas.obtener} />
    </>
  );
}
