export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center gap-3 px-6 sm:mx-auto sm:max-w-lg">
      <p className="font-code text-sm text-muted">Error 404</p>
      <h1 className="text-[length:var(--text-display)] font-bold text-ink">Esta página no existe</h1>
      <p className="text-muted">Revisa la dirección o vuelve al inicio para elegir un módulo.</p>
      <a
        href="/"
        className="mt-3 inline-flex h-11 items-center rounded-md bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700"
      >
        Volver al inicio
      </a>
    </main>
  );
}
