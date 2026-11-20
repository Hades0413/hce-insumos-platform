'use client';

import { usePermisos, useSession } from '@hce/api-client/react';
import { ROL_LABEL, tienePermiso, type Permiso } from '@hce/domain';

interface Accion {
  href: string;
  titulo: string;
  detalle: string;
  permiso: Permiso;
  salvo?: Permiso;
}

const ACCIONES: ReadonlyArray<Accion> = [
  {
    href: '/compras',
    titulo: 'Registrar una compra',
    detalle: 'Ingresa insumos al almacén. Actualiza el costo y el precio de venta, y suma stock.',
    permiso: 'compras.registrar',
  },
  {
    href: '/compras/historial',
    titulo: 'Consultar compras',
    detalle: 'Compras registradas y su detalle por producto y lote.',
    permiso: 'compras.ver',
    salvo: 'compras.registrar',
  },
  {
    href: '/ventas',
    titulo: 'Registrar una venta',
    detalle: 'Dispensa con el precio del sistema y el stock a la vista. Descuenta stock.',
    permiso: 'ventas.registrar',
  },
  {
    href: '/ventas/historial',
    titulo: 'Consultar ventas',
    detalle: 'Ventas registradas y su detalle por producto y lote.',
    permiso: 'ventas.ver',
    salvo: 'ventas.registrar',
  },
  {
    href: '/kardex',
    titulo: 'Consultar el kardex',
    detalle: 'Stock actual de cada producto y el detalle de sus entradas y salidas.',
    permiso: 'kardex.ver',
  },
  {
    href: '/seguridad',
    titulo: 'Administrar usuarios y permisos',
    detalle: 'Otorga o deniega permisos puntuales por usuario, con motivo y vigencia.',
    permiso: 'seguridad.administrar',
  },
];

const saludo = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
};

export default function InicioPage() {
  const { data } = useSession();
  const permisos = usePermisos();
  const acciones = ACCIONES.filter(
    (a) => tienePermiso(permisos, a.permiso) && !(a.salvo && tienePermiso(permisos, a.salvo)),
  );
  const nombre = data?.user.nombreCompleto.split(' ')[0] ?? '';

  return (
    <div className="max-w-3xl">
      <h1 className="text-[length:var(--text-display)] font-bold leading-tight text-ink">
        {saludo()}, {nombre}
      </h1>
      {data && (
        <p className="mt-2 text-[0.9375rem] text-muted">
          Ingresaste como {ROL_LABEL[data.user.rol].toLowerCase()}. ¿Qué vas a hacer?
        </p>
      )}

      {acciones.length === 0 ? (
        <p className="mt-8 rounded-card border border-line bg-surface px-6 py-5 text-muted">
          Tu usuario aún no tiene permisos asignados. Pídelos a un administrador de seguridad.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-card border border-line bg-surface">
          {acciones.map((a) => (
            <li key={a.href}>
              <a
                href={a.href}
                className="group flex items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-brand-50 focus-visible:bg-brand-50"
              >
                <span>
                  <span className="block text-lg font-bold text-ink group-hover:text-brand-700">{a.titulo}</span>
                  <span className="mt-0.5 block text-[0.9375rem] text-muted">{a.detalle}</span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 text-line-strong transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-600 motion-reduce:transition-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
