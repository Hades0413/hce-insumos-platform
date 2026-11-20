import type { Metadata } from 'next';
import { RequirePermiso } from '@hce/features';
import { PageHeader } from '@hce/ui';
import { ProductosView } from '@/features/productos/ProductosView';

export const metadata: Metadata = { title: 'Productos' };

export default function ProductosPage() {
  return (
    <RequirePermiso permiso="productos.ver">
      <PageHeader
        title="Productos"
        description="Catálogo de medicamentos e insumos: alta, edición de costo y precio, y eliminación lógica (el historial se conserva)."
      />
      <ProductosView />
    </RequirePermiso>
  );
}
