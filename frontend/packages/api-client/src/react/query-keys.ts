import type { DocumentoQuery, PageQuery, SearchQuery } from '../types';

/** Fábrica centralizada de query keys: invalidaciones precisas y sin strings sueltos. */
export const queryKeys = {
  session: ['session'] as const,
  productos: {
    all: ['productos'] as const,
    list: (q: SearchQuery) => ['productos', 'list', q] as const,
    detail: (id: number) => ['productos', 'detail', id] as const,
  },
  compras: {
    all: ['compras'] as const,
    list: (q: DocumentoQuery) => ['compras', 'list', q] as const,
    detail: (id: number) => ['compras', 'detail', id] as const,
  },
  ventas: {
    all: ['ventas'] as const,
    list: (q: DocumentoQuery) => ['ventas', 'list', q] as const,
    detail: (id: number) => ['ventas', 'detail', id] as const,
  },
  kardex: {
    all: ['kardex'] as const,
    list: (q: SearchQuery) => ['kardex', 'list', q] as const,
    movimientos: (productoId: number, q: PageQuery) => ['kardex', 'movimientos', productoId, q] as const,
  },
} as const;
