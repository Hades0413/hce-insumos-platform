'use client';

import type { KeyboardEvent } from 'react';
import type { FieldError, UseFormRegister } from 'react-hook-form';
import { IGV_RATE, type LineAmounts } from '@hce/domain';
import {
  LineAmountsCells,
  LineCell,
  LineNumberInput,
  parseNumberInput,
  LoteStamp,
  Money,
  ProductoCell,
  RemoveLineButton,
  StockMeter,
  useExitAnimation,
} from '@hce/ui';
import type { VentaFormValues } from './schema';

const IGV_LABEL = `IGV ${Math.round(IGV_RATE * 100)} %`;

interface Props {
  index: number;
  nombre: string;
  nroLote: string;
  precioVenta: number;
  stock: number;
  cantidad: number;
  linea: LineAmounts;
  error?: FieldError;
  register: UseFormRegister<VentaFormValues>;
  autoFocus?: boolean;
  onRemove: () => void;
  onEnter: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function VentaLineRow({
  autoFocus = false,
  index,
  nombre,
  nroLote,
  precioVenta,
  stock,
  cantidad,
  linea,
  error,
  register,
  onRemove,
  onEnter,
}: Props) {
  const exit = useExitAnimation(onRemove);
  return (
    <tr
      onAnimationEnd={exit.onAnimationEnd}
      className={exit.leaving ? 'pointer-events-none motion-safe:animate-line-out' : 'motion-safe:animate-line-in'}
    >
      <LineCell>
        <ProductoCell nombre={nombre} lote={<LoteStamp lote={nroLote} stamp />} />
      </LineCell>
      <LineCell align="right">
        <Money value={precioVenta} />
      </LineCell>
      <LineCell align="right">
        <StockMeter stock={stock} solicitado={Number.isFinite(cantidad) ? cantidad : 0} className="ml-auto" />
      </LineCell>
      <LineCell align="right" className="w-36">
        <LineNumberInput
          accessibleLabel={`Cantidad de ${nombre}`}
          focusOnMount={autoFocus}
          error={error?.message}
          onKeyDown={onEnter}
          {...register(`items.${index}.cantidad`, {
            setValueAs: parseNumberInput,
          })}
        />
      </LineCell>
      <LineAmountsCells linea={linea} igvLabel={IGV_LABEL} />
      <LineCell align="right" className="w-14">
        <RemoveLineButton label={`Quitar ${nombre}`} onClick={exit.start} />
      </LineCell>
    </tr>
  );
}
