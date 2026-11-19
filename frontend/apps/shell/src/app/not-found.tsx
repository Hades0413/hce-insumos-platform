export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-black text-brand-700">404</p>
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <p className="text-muted">La ruta solicitada no existe.</p>
      <a href="/" className="mt-2 rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700">
        Volver al inicio
      </a>
    </main>
  );
}
