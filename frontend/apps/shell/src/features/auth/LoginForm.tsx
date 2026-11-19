'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '@hce/api-client';
import { safeNextPath } from '@hce/domain';
import { Alert, Button, Input, Spinner } from '@hce/ui';
import { loginSchema, type LoginValues } from './schema';

function mensajeError(err: ApiError): string {
  switch (err.status) {
    case 401:
      return 'Correo o contraseña incorrectos.';
    case 423:
      return err.message || 'Tu cuenta está bloqueada temporalmente por intentos fallidos.';
    case 429:
      return `Demasiados intentos. Espera ${err.retryAfterSeconds ?? 60} segundos e inténtalo de nuevo.`;
    default:
      return err.message;
  }
}

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [checking, setChecking] = useState(true);

  // Si el access token expiró pero el refresh (cookie HttpOnly) sigue vigente,
  // se recupera la sesión sin pedir credenciales.
  useEffect(() => {
    let cancelled = false;
    api.auth
      .refresh()
      .then(() => {
        if (!cancelled) window.location.replace(next);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [next]);

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const mutation = useMutation({
    mutationFn: (values: LoginValues) => api.auth.login(values),
    onSuccess: () => window.location.assign(next),
    onError: () => form.resetField('password'),
  });

  if (checking) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-muted">
        <Spinner /> Verificando sesión…
      </div>
    );
  }

  const error = mutation.error ? ApiError.from(mutation.error) : null;

  return (
    <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
      {error && <Alert title="No se pudo iniciar sesión">{mensajeError(error)}</Alert>}
      <Input
        label="Correo institucional"
        type="email"
        autoComplete="username"
        inputMode="email"
        autoFocus
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Input
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <Button type="submit" size="lg" loading={mutation.isPending} className="mt-2 w-full">
        Ingresar
      </Button>
    </form>
  );
}
