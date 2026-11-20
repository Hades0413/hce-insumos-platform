'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import type { TipoExcepcion } from '@hce/api-client';
import { Button, Input } from '@hce/ui';
import { excepcionSchema, type ExcepcionFormValues } from './model';

interface Props {
  tipo: TipoExcepcion;
  permisoLabel: string;
  onSubmit: (values: { motivo: string; vigenteHasta?: string }) => void;
  onCancel: () => void;
}

export function ExcepcionForm({ tipo, permisoLabel, onSubmit, onCancel }: Props) {
  const motivoId = useId();
  const form = useForm<ExcepcionFormValues>({
    resolver: zodResolver(excepcionSchema),
    defaultValues: { motivo: '', vigenteHasta: '' },
  });
  const motivoError = form.formState.errors.motivo?.message;
  const otorgar = tipo === 'GRANT';

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((v) =>
        onSubmit({
          motivo: v.motivo.trim(),
          vigenteHasta: v.vigenteHasta ? new Date(v.vigenteHasta).toISOString() : undefined,
        }),
      )}
      className="mt-3 flex flex-col gap-3 rounded-md border border-line bg-canvas p-4 motion-safe:animate-view-in"
      aria-label={`${otorgar ? 'Otorgar' : 'Denegar'} ${permisoLabel}`}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={motivoId} className="text-sm font-semibold text-ink">
          Motivo
        </label>
        <textarea
          id={motivoId}
          rows={2}
          maxLength={300}
          data-autofocus
          autoFocus
          placeholder={
            otorgar
              ? 'P. ej. cobertura del turno noche en almacén'
              : 'P. ej. investigación de una diferencia de inventario'
          }
          aria-invalid={motivoError ? true : undefined}
          aria-describedby={motivoError ? `${motivoId}-error` : undefined}
          className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[0.9375rem] focus:border-brand-600 aria-[invalid=true]:border-danger"
          {...form.register('motivo')}
        />
        {motivoError && (
          <p id={`${motivoId}-error`} className="text-sm font-semibold text-danger">
            {motivoError}
          </p>
        )}
      </div>
      <Input
        type="datetime-local"
        label="Vigente hasta (opcional)"
        hint="Sin fecha, la excepción sigue vigente hasta que se quite."
        error={form.formState.errors.vigenteHasta?.message}
        containerClassName="max-w-xs"
        {...form.register('vigenteHasta')}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant={otorgar ? 'primary' : 'danger'}>
          {otorgar ? 'Otorgar permiso' : 'Denegar permiso'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
