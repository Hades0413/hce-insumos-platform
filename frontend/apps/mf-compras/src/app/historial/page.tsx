'use client';

import { api } from '@hce/api-client';
import { DocumentoList, PageHeader } from '@hce/ui';

export default function HistorialComprasPage() {
  return (
    <>
      <PageHeader title="Historial de compras" description="Compras registradas, filtrables por fecha." />
      <DocumentoList resource="compras" titulo="Compras" listar={api.compras.listar} obtener={api.compras.obtener} />
    </>
  );
}
