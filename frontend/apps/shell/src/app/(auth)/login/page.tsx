import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BrandLockup } from '@hce/ui';
import { KardexCard } from '@/features/auth/KardexCard';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <BrandLockup />
      <div className="w-full max-w-[34rem] rounded-lg border border-line-strong bg-surface">
        <KardexCard />
        <div className="relative px-6 pb-7 pt-8 sm:px-8" role="presentation">
          <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-line-strong" aria-hidden="true" />
          <span
            className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-line-strong bg-canvas [clip-path:inset(0_0_0_50%)]"
            aria-hidden="true"
          />
          <span
            className="absolute -right-3 -top-3 h-6 w-6 rounded-full border border-line-strong bg-canvas [clip-path:inset(0_50%_0_0)]"
            aria-hidden="true"
          />
          <h1 className="mb-5 text-xl font-bold text-ink">Iniciar sesión</h1>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
      <p className="max-w-[34rem] text-center text-sm text-muted">
        Acceso solo para personal autorizado. Cada acción queda registrada con tu usuario.
      </p>
    </main>
  );
}
