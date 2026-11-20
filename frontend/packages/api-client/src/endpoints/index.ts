import type { AxiosInstance } from 'axios';
import type {
  ActualizarProductoDto,
  CompraDetalleDto,
  CrearProductoDto,
  DocumentoQuery,
  GuardarExcepcionDto,
  PermisoCatalogoDto,
  PermisosUsuarioDto,
  RolDto,
  UsuarioAdminDto,
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERMISO_CODE = /^[a-z_]+\.[a-z_]+$/;

const uuid = (value: string): string => {
  if (!UUID.test(value)) throw new RangeError('Identificador de usuario inválido');
  return value;
};
const permisoCode = (value: string): string => {
  if (!PERMISO_CODE.test(value)) throw new RangeError('Código de permiso inválido');
  return encodeURIComponent(value);
};

export function createApi(http: AxiosInstance, resetCsrf: () => void = () => undefined) {
  return {
    auth: {
      csrf: () => http.get<{ csrfToken: string }>('/auth/csrf', { skipAuthRefresh: true }).then((r) => r.data),
      login: (dto: LoginDto) =>
        http.post<SessionDto>('/auth/login', dto, { skipAuthRefresh: true }).then((r) => {
          resetCsrf();
          return r.data;
        }),
      refresh: () =>
        http
          .post<SessionDto>('/auth/refresh', undefined, {
            skipAuthRefresh: true,
          })
          .then((r) => {
            resetCsrf();
            return r.data;
          }),
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
          .post<CompraDetalleDto>('/compras', dto, {
            headers: { 'Idempotency-Key': idempotencyKey },
          })
          .then((r) => r.data),
      listar: (q?: DocumentoQuery) =>
        http.get<Paginated<DocumentoResumenDto>>('/compras', { params: clean(q) }).then((r) => r.data),
      obtener: (compraId: number) => http.get<CompraDetalleDto>(`/compras/${id(compraId)}`).then((r) => r.data),
    },
    ventas: {
      registrar: (dto: RegistrarVentaDto, idempotencyKey: string) =>
        http
          .post<VentaDetalleDto>('/ventas', dto, {
            headers: { 'Idempotency-Key': idempotencyKey },
          })
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
          .get<KardexMovimientosDto>(`/kardex/${id(productoId)}/movimientos`, {
            params: clean(q),
          })
          .then((r) => r.data),
    },
    admin: {
      permisos: () => http.get<PermisoCatalogoDto[]>('/admin/permisos').then((r) => r.data),
      roles: () => http.get<RolDto[]>('/admin/roles').then((r) => r.data),
      usuarios: (q?: SearchQuery) =>
        http
          .get<Paginated<UsuarioAdminDto>>('/admin/usuarios', {
            params: clean(q),
          })
          .then((r) => r.data),
      permisosUsuario: (usuarioId: string) =>
        http.get<PermisosUsuarioDto>(`/admin/usuarios/${uuid(usuarioId)}/permisos`).then((r) => r.data),
      guardarExcepcion: (usuarioId: string, permiso: string, dto: GuardarExcepcionDto) =>
        http
          .put<PermisosUsuarioDto>(`/admin/usuarios/${uuid(usuarioId)}/excepciones/${permisoCode(permiso)}`, dto)
          .then((r) => r.data),
      quitarExcepcion: (usuarioId: string, permiso: string) =>
        http
          .delete<PermisosUsuarioDto>(`/admin/usuarios/${uuid(usuarioId)}/excepciones/${permisoCode(permiso)}`)
          .then((r) => r.data),
    },
    health: () => http.get<HealthDto>('/health').then((r) => r.data),
  };
}

export type Api = ReturnType<typeof createApi>;
