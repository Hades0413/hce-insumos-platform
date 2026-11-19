/** Quién y desde qué request ejecuta una operación (trazabilidad hasta los triggers de BD). */
export interface AuditContext {
  readonly userId: string;
  readonly requestId: string;
}

export interface Pagina<T> {
  readonly items: T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface Paginacion {
  readonly page: number;
  readonly pageSize: number;
}

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

export function normalizarPaginacion(page?: number, pageSize?: number): Paginacion {
  const p = Number.isInteger(page) && (page as number) > 0 ? (page as number) : 1;
  const s =
    Number.isInteger(pageSize) && (pageSize as number) > 0
      ? Math.min(pageSize as number, PAGE_SIZE_MAX)
      : PAGE_SIZE_DEFAULT;
  return { page: p, pageSize: s };
}
