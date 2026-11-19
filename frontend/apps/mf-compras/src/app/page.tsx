import type { Metadata } from 'next';
import { RoleGate } from '@hce/api-client/react';
import { Alert, PageHeader } from '@hce/ui';
import { CompraForm } from '@/features/compras/CompraForm';

export const metadata: Metadata = { title: 'Registrar compra' };

export default function RegistrarCompraPage() {
  return (
    <>
      <PageHeader title="Registrar compra" description="Ingreso de medicamentos e insumos al almacén (movimiento de ENTRADA)." />
      <RoleGate permiso="compras:registrar" fallback={<Alert tone="warn" title="Tu rol no puede registrar compras">Puedes consultar el historial.</Alert>}>
        <CompraForm />
      </RoleGate>
    </>
  );
}
