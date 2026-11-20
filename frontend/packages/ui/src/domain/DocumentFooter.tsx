import type { ReactNode, Ref } from 'react';
import { Button } from '../primitives/Button';
import { Totales } from './Totales';
import type { Importes } from './types';

export interface DocumentFooterProps {
  submitLabel: string;
  loading: boolean;
  success?: boolean;
  submitRef?: Ref<HTMLButtonElement>;
  disabled: boolean;
  totales: Importes;
  note?: ReactNode;
}

export function DocumentFooter({
  submitLabel,
  loading,
  success,
  disabled,
  totales,
  note,
  submitRef,
}: DocumentFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-4 border-t border-line-strong bg-surface/95 px-4 py-4 backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between md:-mx-8 md:px-8 lg:static lg:mx-0 lg:gap-6 lg:rounded-card lg:border lg:border-line lg:p-5 lg:backdrop-blur-none">
      <div className="flex flex-col gap-2">
        <Button
          ref={submitRef}
          type="submit"
          size="lg"
          loading={loading}
          success={success}
          disabled={disabled}
          className="md:min-w-60"
        >
          {submitLabel}
        </Button>
        {note && <p className="max-w-sm text-sm text-muted">{note}</p>}
      </div>
      <Totales {...totales} live />
    </div>
  );
}
