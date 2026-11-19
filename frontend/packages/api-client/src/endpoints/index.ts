import type { AxiosInstance } from 'axios';
import type {
  ActualizarProductoDto,
  CompraDetalleDto,
  CrearProductoDto,
  DocumentoQuery,
  DocumentoResumenDto,
  HealthDto,
  KardexItemDto,
  KardexMovimientosDto,
  LoginDto,
  PageQuery,
  Paginated,
  ProductoDto,
  RegistrarCompraDto,
  RegistrarVentaDto,
  SearchQuery,
  SessionDto,
  VentaDetalleDto,
} from '../types';

/** Elimina parámetros vacíos para no enviar `?search=` innecesarios. */
const clean = <T extends object>(q: T | undefined): Partial<T> | undefined => {
  if (!q) return undefined;
  return Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>;
};

const id = (value: number): string => {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError('Identificador inválido');
  return encodeURIComponent(String(value));
};

export function createApi(http: AxiosInstance, resetCsrf: () => void = () => undefined) {
  return {
    auth: {
      csrf: () => http.get<{ csrfToken: string }>('/auth/csrf', { skipAuthRefresh: true }).then((r) => r.data),
      login: (dto: LoginDto) =>
        http.post<SessionDto>('/auth/login', dto, { skipAuthRefresh: true }).then((r) => r.data),
      refresh: () => http.post<SessionDto>('/auth/refresh', undefined, { skipAuthRefresh: true }).then((r) => r.data),
      logout: () =>
        http.post<void>('/auth/logout', undefined, { skipAuthRefresh: true }).then(() => {
          resetCsrf();
        }),
      me: () => http.get<SessionDto>('/auth/me').then((r) => r.data),
    },
    productos: {
      listar: (q?: SearchQuery) =>
        http.get<Paginated<ProductoDto>>('/productos', { params: clean(q) }).then((r) => r.data),
      obtener: (productoId: number) => http.get<ProductoDto>(`/productos/${id(productoId)}`).then((r) => r.data),
      crear: (dto: CrearProductoDto) => http.post<ProductoDto>('/productos', dto).then((r) => r.data),
      actualizar: (productoId: number, dto: ActualizarProductoDto) =>
        http.put<ProductoDto>(`/productos/${id(productoId)}`, dto).then((r) => r.data),
      eliminar: (productoId: number) => http.delete<void>(`/productos/${id(productoId)}`).then(() => undefined),
    },
    compras: {
      registrar: (dto: RegistrarCompraDto, idempotencyKey: string) =>
        http
          .post<CompraDetalleDto>('/compras', dto, { headers: { 'Idempotency-Key': idempotencyKey } })
          .then((r) => r.data),
      listar: (q?: DocumentoQuery) =>
        http.get<Paginated<DocumentoResumenDto>>('/compras', { params: clean(q) }).then((r) => r.data),
      obtener: (compraId: number) => http.get<CompraDetalleDto>(`/compras/${id(compraId)}`).then((r) => r.data),
    },
    ventas: {
      registrar: (dto: RegistrarVentaDto, idempotencyKey: string) =>
        http
          .post<VentaDetalleDto>('/ventas', dto, { headers: { 'Idempotency-Key': idempotencyKey } })
          .then((r) => r.data),
      listar: (q?: DocumentoQuery) =>
        http.get<Paginated<DocumentoResumenDto>>('/ventas', { params: clean(q) }).then((r) => r.data),
      obtener: (ventaId: number) => http.get<VentaDetalleDto>(`/ventas/${id(ventaId)}`).then((r) => r.data),
    },
    kardex: {
      listar: (q?: SearchQuery) =>
        http.get<Paginated<KardexItemDto>>('/kardex', { params: clean(q) }).then((r) => r.data),
      movimientos: (productoId: number, q?: PageQuery) =>
        http
          .get<KardexMovimientosDto>(`/kardex/${id(productoId)}/movimientos`, { params: clean(q) })
          .then((r) => r.data),
    },
    health: () => http.get<HealthDto>('/health').then((r) => r.data),
  };
}

export type Api = ReturnType<typeof createApi>;
