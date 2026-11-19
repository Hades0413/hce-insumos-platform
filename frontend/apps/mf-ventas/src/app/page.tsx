import type { Metadata } from 'next';
import { RoleGate } from '@hce/api-client/react';
import { Alert, PageHeader } from '@hce/ui';
import { VentaForm } from '@/features/ventas/VentaForm';

export const metadata: Metadata = { title: 'Registrar venta' };

export default function RegistrarVentaPage() {
  return (
    <>
      <PageHeader title="Registrar venta" description="Dispensación de medicamentos e insumos (movimiento de SALIDA). El precio lo fija el sistema." />
      <RoleGate permiso="ventas:registrar" fallback={<Alert tone="warn" title="Tu rol no puede registrar ventas">Puedes consultar el historial.</Alert>}>
        <VentaForm />
      </RoleGate>
    </>
  );
}
