'use client';

import type { KeyboardEvent } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { formatPEN, IGV_RATE, precioVentaDesdeCosto, type LineAmounts } from '@hce/domain';
import {
  LineAmountsCells,
  LineCell,
  LineNumberInput,
  LoteStamp,
  parseNumberInput,
  ProductoCell,
  RemoveLineButton,
  useExitAnimation,
} from '@hce/ui';
import type { CompraFormValues } from './schema';

const IGV_LABEL = `IGV ${Math.round(IGV_RATE * 100)} %`;

interface Props {
  index: number;
  nombre: string;
  nroLote: string;
  costo: number;
  linea: LineAmounts;
  register: UseFormRegister<CompraFormValues>;
  errors: FieldErrors<CompraFormValues>['items'];
  autoFocus?: boolean;
  onRemove: () => void;
  onEnter: (field: 'cantidad' | 'costoUnitario', e: KeyboardEvent<HTMLInputElement>) => void;
}

export function CompraLineRow({
  autoFocus = false,
  index,
  nombre,
  nroLote,
  costo,
  linea,
  register,
  errors,
  onRemove,
  onEnter,
}: Props) {
  const errs = errors?.[index];
  const exit = useExitAnimation(onRemove);
  return (
    <tr
      onAnimationEnd={exit.onAnimationEnd}
      className={exit.leaving ? 'pointer-events-none motion-safe:animate-line-out' : 'motion-safe:animate-line-in'}
    >
      <LineCell>
        <ProductoCell nombre={nombre} lote={<LoteStamp lote={nroLote} stamp />} />
      </LineCell>
      <LineCell align="right" className="w-32">
        <LineNumberInput
          accessibleLabel={`Cantidad de ${nombre}`}
          focusOnMount={autoFocus}
          error={errs?.cantidad?.message}
          onKeyDown={(e) => onEnter('cantidad', e)}
          {...register(`items.${index}.cantidad`, {
            setValueAs: parseNumberInput,
          })}
        />
      </LineCell>
      <LineCell align="right" className="w-36">
        <LineNumberInput
          decimal
          accessibleLabel={`Costo unitario de ${nombre}`}
          error={errs?.costoUnitario?.message}
          onKeyDown={(e) => onEnter('costoUnitario', e)}
          {...register(`items.${index}.costoUnitario`, {
            setValueAs: parseNumberInput,
          })}
        />
      </LineCell>
      <LineCell align="right">
        <span className="text-ink">
          {Number.isFinite(costo) && costo > 0 ? formatPEN(precioVentaDesdeCosto(costo)) : '—'}
        </span>
      </LineCell>
      <LineAmountsCells linea={linea} igvLabel={IGV_LABEL} />
      <LineCell align="right" className="w-14">
        <RemoveLineButton label={`Quitar ${nombre}`} onClick={exit.start} />
      </LineCell>
    </tr>
  );
}
