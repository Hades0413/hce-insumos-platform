import type { Metadata } from 'next';
import { RequirePermiso } from '@hce/features';
import { PageHeader } from '@hce/ui';
import { VentaForm } from '@/features/ventas/VentaForm';

export const metadata: Metadata = { title: 'Registrar venta' };

export default function RegistrarVentaPage() {
  return (
    <RequirePermiso permiso="ventas.registrar">
      <PageHeader
        title="Registrar venta"
        description="Dispensación de medicamentos e insumos. El precio lo fija el sistema y cada venta descuenta stock en el kardex."
      />
      <VentaForm />
    </RequirePermiso>
  );
}
