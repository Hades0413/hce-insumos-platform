'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api, publishSessionEvent } from '@hce/api-client';
import { safeNextPath } from '@hce/domain';
import { Alert, Button, Input, Spinner } from '@hce/ui';
import { loginErrorMessage } from './messages';
import { loginSchema, type LoginValues } from './schema';
import { useSessionProbe } from './useSessionProbe';

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const loggedOut = params.get('out') === '1';
  const { checking } = useSessionProbe(next, loggedOut);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: LoginValues) => api.auth.login(values),
    onSuccess: () => {
      publishSessionEvent('login');
      window.location.assign(next);
    },
    onError: () => form.resetField('password'),
  });

  if (checking) {
    return (
      <p role="status" className="flex items-center gap-3 py-6 text-muted">
        <Spinner className="text-brand-600" /> Comprobando si ya tienes una sesión abierta…
      </p>
    );
  }

  return (
    <form noValidate onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-4">
      {loggedOut && !mutation.error && (
        <Alert tone="ok" title="Cerraste sesión">
          Tu sesión se cerró en este equipo.
        </Alert>
      )}
      {mutation.error && <Alert title="No pudimos iniciar tu sesión">{loginErrorMessage(mutation.error)}</Alert>}
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
      <Button type="submit" size="lg" loading={mutation.isPending} success={mutation.isSuccess} className="mt-2 w-full">
        Ingresar
      </Button>
    </form>
  );
}
