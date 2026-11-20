import { DomainEvent } from '@hce/core';
import { LineaDocumento, TotalesDocumento } from './documento';

export interface DocumentoRegistradoPayload {
  readonly lineas: { productoId: number; cantidad: number; precio: number; total: number }[];
  readonly subTotal: number;
  readonly igv: number;
  readonly total: number;
}

export const EVENTOS_INVENTARIO = {
  COMPRA_REGISTRADA: 'CompraRegistrada',
  VENTA_REGISTRADA: 'VentaRegistrada',
} as const;

export function documentoRegistrado(
  type: (typeof EVENTOS_INVENTARIO)[keyof typeof EVENTOS_INVENTARIO],
  lineas: readonly LineaDocumento[],
  totales: TotalesDocumento,
): DomainEvent<DocumentoRegistradoPayload> {
  return {
    type,
    occurredAt: new Date(),
    payload: {
      lineas: lineas.map((l) => ({
        productoId: l.productoId,
        cantidad: l.cantidad,
        precio: l.precio.toDecimal(),
        total: l.total.toDecimal(),
      })),
      subTotal: totales.subTotal.toDecimal(),
      igv: totales.igv.toDecimal(),
      total: totales.total.toDecimal(),
    },
  };
}
