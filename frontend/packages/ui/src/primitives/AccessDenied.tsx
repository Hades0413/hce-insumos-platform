import type { ReactNode } from 'react';

export function AccessDenied({ permiso, action }: { permiso: string; action?: ReactNode }) {
  return (
    <section
      className="flex max-w-xl flex-col items-start gap-3 rounded-card border border-line bg-surface px-6 py-8"
      aria-labelledby="sin-acceso"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="9" rx="1.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <h1 id="sin-acceso" className="text-xl font-bold text-ink">
        No tienes acceso a esta sección
      </h1>
      <p className="text-[0.9375rem] text-muted">
        Tu usuario no tiene el permiso «{permiso}». Si lo necesitas para tu trabajo, pídelo a un administrador de
        seguridad.
      </p>
      {action}
    </section>
  );
}
