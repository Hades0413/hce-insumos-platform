'use client';

import { navParaRol, ROL_LABEL } from '@hce/domain';
import { useSession } from '@hce/api-client/react';
import { PageHeader } from '@hce/ui';

const DESCRIPCIONES: Record<string, string> = {
  compras: 'Registra ingresos de insumos. Actualiza costo y precio de venta (costo × 1.35) y genera la ENTRADA en kardex.',
  ventas: 'Registra la dispensación con validación de stock en tiempo real. Genera la SALIDA en kardex.',
  kardex: 'Consulta el stock actual de cada producto y el detalle de sus movimientos.',
};

export default function DashboardPage() {
  const { data } = useSession();
  const modulos = navParaRol(data?.user.rol).filter((m) => m.key !== 'inicio');
  return (
    <>
      <PageHeader
        title={`Hola, ${data?.user.nombreCompleto ?? ''}`}
        description={data ? `Perfil: ${ROL_LABEL[data.user.rol]}. Selecciona un módulo para continuar.` : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modulos.map((m) => (
          // <a> y no <Link>: cada módulo es otra zona (microfront) => navegación dura.
          <a
            key={m.key}
            href={m.href}
            className="group flex flex-col gap-2 rounded-card border border-line bg-surface p-6 shadow-card transition hover:border-brand-500 hover:shadow-md"
          >
            <span className="text-lg font-semibold text-brand-800 group-hover:text-brand-600">{m.label} →</span>
            <span className="text-sm text-muted">{DESCRIPCIONES[m.key]}</span>
          </a>
        ))}
      </div>
    </>
  );
}
