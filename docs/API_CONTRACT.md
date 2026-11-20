# Contrato de API: HCE Insumos

Contrato entre el frontend (Next.js) y el API Gateway (NestJS). La versión interactiva está en Swagger:
`http://localhost:4000/api/docs` (activo solo fuera de producción).

- **URL base:** `http://localhost:4000/api/v1` (variable `NEXT_PUBLIC_API_URL`).
- **Formato:** JSON en `camelCase`, fechas ISO-8601 en UTC y montos con 2 decimales.
- **Autenticación:** el gateway emite cookies HttpOnly y el navegador las envía solo (`withCredentials: true`).
  El código del front nunca ve el JWT.
  - `hce_at`: access token JWT (ES256), 30 min, `Path=/`.
  - `hce_rt`: refresh token, 8 h, cambia en cada uso, `Path=/api/v1/auth`.
  - `hce_csrf`: secreto CSRF. El valor para el header se pide con `GET /auth/csrf` y se envía en `X-CSRF-Token`
    en todo `POST`, `PUT`, `PATCH` y `DELETE`.
  - Todas con `HttpOnly`, `SameSite=Strict` y `Secure` en producción.
- **Headers del cliente:** `X-Request-Id` (opcional, aparece en los logs) e `Idempotency-Key` (UUID v4,
  obligatorio en `POST /compras` y `POST /ventas` para que un reintento no duplique el documento).

## Errores (RFC 7807, `application/problem+json`)

```json
{
  "type": "about:blank",
  "title": "Unprocessable Entity",
  "status": 422,
  "code": "STOCK_INSUFICIENTE",
  "detail": "La cantidad no debe ser mayor al stock",
  "errors": [{ "field": "items[0].cantidad", "message": "...", "productoId": 3, "stockDisponible": 5, "cantidadSolicitada": 8 }],
  "requestId": "6a1f..."
}
```

| Estado | Código | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body o query inválido; `errors[]` indica el campo |
| 401 | `UNAUTHENTICATED` | Sin cookie o token vencido. El interceptor llama a `POST /auth/refresh` una vez y reintenta |
| 401 | `INVALID_CREDENTIALS` | Login fallido por cualquier motivo, siempre con el mismo mensaje |
| 401 | `PERMISSIONS_CHANGED` | Cambiaron los permisos del usuario; el interceptor renueva el token y reintenta |
| 403 | `FORBIDDEN` | El usuario no tiene el permiso |
| 403 | `CSRF_INVALID` | Falta `X-CSRF-Token` o no coincide. El interceptor pide `/auth/csrf` y reintenta una vez |
| 404 | `NOT_FOUND` | El recurso no existe |
| 409 | `CONFLICT`, `CONCURRENCY_CONFLICT`, `DUPLICATE` | Producto duplicado o `rowVersion` desactualizado |
| 422 | `STOCK_INSUFICIENTE`, `BUSINESS_RULE` | Regla de negocio (por ejemplo, eliminar un producto con stock) |
| 429 | `RATE_LIMITED` | Demasiadas peticiones; incluye `Retry-After` |
| 502, 503, 504 | `UPSTREAM_UNAVAILABLE`, `UPSTREAM_TIMEOUT` | Un microservicio no responde |

## Paginación

Query `page` (desde 1, por defecto 1) y `pageSize` (1 a 100, por defecto 20). Respuesta:

```ts
interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }
```

## Permisos

Cada endpoint exige un permiso. Los roles dan estos permisos por defecto y el administrador puede conceder o
quitar permisos a un usuario concreto.

| Permiso | ADMIN | ALMACENERO | FARMACEUTICO |
|---|:-:|:-:|:-:|
| `productos.ver`, `compras.ver`, `ventas.ver`, `kardex.ver` | sí | sí | sí |
| `productos.registrar`, `productos.editar`, `compras.registrar` | sí | sí | no |
| `ventas.registrar` | sí | no | sí |
| `productos.eliminar`, `productos.precio_manual`, `seguridad.administrar` | sí | no | no |

---

## Auth

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET  | `/auth/csrf` | - | `200 { csrfToken: string }` (+ cookie `hce_csrf`) |
| POST | `/auth/login` | `{ email, password }` | `200 SessionDto` (+ cookies `hce_at`, `hce_rt`). Máximo 10 por minuto por IP |
| POST | `/auth/refresh` | - | `200 SessionDto` (rota cookies), `401` si inválido |
| POST | `/auth/logout` | - | `204` (cierra la sesión y borra las cookies) |
| GET  | `/auth/me` | - | `200 SessionDto` |

```ts
type Rol = 'ADMIN' | 'ALMACENERO' | 'FARMACEUTICO';
interface UserDto { id: string; email: string; nombreCompleto: string; rol: Rol; permisos: Permiso[] }
interface SessionDto { user: UserDto; accessTokenExpiresAt: string /* ISO */ }
```

## Productos

| Método | Ruta | Permiso | Body / Query | Respuesta |
|---|---|---|---|---|
| GET    | `/productos` | `productos.ver` | `?search=&page=&pageSize=` | `Paginated<ProductoDto>` |
| GET    | `/productos/:id` | `productos.ver` | - | `ProductoDto` |
| POST   | `/productos` | `productos.registrar` | `CrearProductoDto` | `201 ProductoDto` |
| PUT    | `/productos/:id` | `productos.editar` | `ActualizarProductoDto` | `200 ProductoDto` |
| DELETE | `/productos/:id` | `productos.eliminar` | - | `204`; `422` si el producto tiene stock |

```ts
interface ProductoDto {
  id: number; nombre: string; nroLote: string; fecRegistro: string;
  costo: number; precioVenta: number; stock: number; rowVersion: string /* base64 */;
}
interface CrearProductoDto { nombre: string /*2..150*/; nroLote: string /*1..50, [A-Za-z0-9-_/.]*/; costo?: number /*>=0, default 0*/ }
// precioVenta = round(costo * 1.35, 2); en ActualizarProductoDto solo se acepta con productos.precio_manual
interface ActualizarProductoDto { nombre: string; nroLote: string; costo: number; precioVenta?: number; rowVersion: string }
```

El `DELETE` es una eliminación lógica: el producto queda con `Activo = 0`, fecha y usuario, y deja de aparecer en
listados y documentos nuevos. Sus compras, ventas y movimientos se conservan.

## Compras (movimiento ENTRADA)

| Método | Ruta | Permiso | Body / Query | Respuesta |
|---|---|---|---|---|
| POST | `/compras` | `compras.registrar` | `RegistrarCompraDto` + header `Idempotency-Key` | `201 CompraDetalleDto` |
| GET  | `/compras` | `compras.ver` | `?page&pageSize&desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | `Paginated<DocumentoResumenDto>` |
| GET  | `/compras/:id` | `compras.ver` | - | `CompraDetalleDto` |

En una sola transacción se guardan `CompraCab` y `CompraDet`, se actualiza el costo del producto
(`costoUnitario`) y su precio de venta (`round(costo * 1.35, 2)`), y se crea el movimiento de entrada
(`MovimientoCab` con `Id_TipoMovimiento = 1` e `Id_DocumentoOrigen = Id_CompraCab`, más `MovimientoDet`).

```ts
interface RegistrarCompraDto { items: { productoId: number; cantidad: number /*int 1..100000*/; costoUnitario: number /*>0*/ }[] /*1..100, productoId únicos*/ }
interface DocumentoResumenDto { id: number; fecRegistro: string; subTotal: number; igv: number; total: number; cantidadItems: number }
interface DocumentoLineaDto {
  id: number; productoId: number; productoNombre: string; nroLote: string;
  cantidad: number; precio: number; subTotal: number; igv: number; total: number;
}
interface CompraDetalleDto extends DocumentoResumenDto { detalles: DocumentoLineaDto[] }
```

## Ventas (movimiento SALIDA)

| Método | Ruta | Permiso | Body / Query | Respuesta |
|---|---|---|---|---|
| POST | `/ventas` | `ventas.registrar` | `RegistrarVentaDto` + header `Idempotency-Key` | `201 VentaDetalleDto`, `422 STOCK_INSUFICIENTE` |
| GET  | `/ventas` | `ventas.ver` | `?page&pageSize&desde&hasta` | `Paginated<DocumentoResumenDto>` |
| GET  | `/ventas/:id` | `ventas.ver` | - | `VentaDetalleDto` |

El precio lo pone el servidor con el `PrecioVenta` vigente; el cliente no lo envía.
Por línea: `subTotal = cantidad * precioVenta`, `igv = subTotal * 0.18`, `total = subTotal + igv`.
El stock se valida en el servicio y otra vez dentro del SP con los productos bloqueados, así dos ventas
simultáneas no pueden dejarlo en negativo.

```ts
interface RegistrarVentaDto { items: { productoId: number; cantidad: number }[] }
type VentaDetalleDto = CompraDetalleDto;
```

## Kardex

| Método | Ruta | Query | Respuesta |
|---|---|---|---|
| GET | `/kardex` | `?search&page&pageSize` | `Paginated<KardexItemDto>` |
| GET | `/kardex/:productoId/movimientos` | `?page&pageSize` | `KardexMovimientosDto` |

```ts
interface KardexItemDto { productoId: number; nombreProducto: string; nroLote: string; stockActual: number; costo: number; precioVenta: number }
interface MovimientoDto {
  movimientoId: number; fecRegistro: string; tipoMovimiento: 'ENTRADA' | 'SALIDA'; idTipoMovimiento: 1 | 2;
  documentoOrigenId: number; cantidad: number; saldo: number /* stock acumulado tras el movimiento */
}
interface KardexMovimientosDto extends Paginated<MovimientoDto> { producto: KardexItemDto }
```

Ambas rutas de kardex exigen `kardex.ver`.

## Seguridad (administración)

Todas exigen `seguridad.administrar`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/permisos` | Catálogo de permisos |
| GET | `/admin/roles` | Roles y sus permisos por defecto |
| GET | `/admin/usuarios` | Usuarios |
| GET | `/admin/usuarios/:id/permisos` | Permisos efectivos y excepciones de un usuario |
| PUT | `/admin/usuarios/:id/excepciones/:permiso` | Concede o quita un permiso (motivo y vigencia) |
| DELETE | `/admin/usuarios/:id/excepciones/:permiso` | Elimina la excepción |

## Salud

`GET /health` es público y no cuenta para el límite de peticiones. Devuelve
`{ status: 'ok' | 'error', info, error, details }` con el estado de NATS y de cada microservicio.
