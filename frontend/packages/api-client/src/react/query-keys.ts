import type { DocumentoQuery, PageQuery, SearchQuery } from '../types';

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
  admin: {
    all: ['admin'] as const,
    catalogo: ['admin', 'permisos'] as const,
    usuarios: (q: SearchQuery) => ['admin', 'usuarios', q] as const,
    permisosUsuario: (id: string) => ['admin', 'usuario', id, 'permisos'] as const,
  },
} as const;
