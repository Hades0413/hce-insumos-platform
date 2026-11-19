# Contrato de API — HCE Insumos

Fuente única de verdad entre FrontEnd (Next.js) y BackEnd (API Gateway NestJS).
Swagger en vivo: `http://localhost:4000/api/docs` (solo en `NODE_ENV != production`).

- **Base URL**: `http://localhost:4000/api/v1` (env `NEXT_PUBLIC_API_URL`).
- **Formato**: JSON `camelCase`. Fechas ISO-8601 UTC. Montos `number` con 2 decimales.
- **Autenticación**: cookies **HttpOnly** emitidas por el gateway. El navegador las envía solo
  (`withCredentials: true`). El JS del front **nunca** ve el JWT.
  - `hce_at`  — access token JWT (ES256), **30 min**, `Path=/`, `SameSite=Strict`, `HttpOnly`, `Secure` en prod.
  - `hce_rt`  — refresh token opaco (rotación + detección de reuso), 8 h, `Path=/api/v1/auth`.
  - `hce_csrf` — secreto CSRF HttpOnly (double-submit). El valor público se obtiene con `GET /auth/csrf`
    y se manda en el header **`X-CSRF-Token`** en todo `POST/PUT/PATCH/DELETE`.
- **Headers de cliente**: `X-Request-Id` (uuid, opcional, se propaga a logs), `Idempotency-Key` (uuid v4,
  **obligatorio** en `POST /compras` y `POST /ventas` — reintentos seguros, evita doble registro).

## Errores — RFC 7807 (`application/problem+json`)

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

| status | code                     | Cuándo |
|-------:|--------------------------|--------|
| 400    | `VALIDATION_ERROR`       | Body/query inválido (`errors[]` con `field`) |
| 401    | `UNAUTHENTICATED`        | Sin cookie / token vencido → el interceptor intenta `POST /auth/refresh` 1 vez |
| 403    | `FORBIDDEN`              | Rol sin permiso |
| 403    | `CSRF_INVALID`           | Falta/no coincide `X-CSRF-Token` → el interceptor pide `/auth/csrf` y reintenta 1 vez |
| 404    | `NOT_FOUND`              | Recurso inexistente |
| 409    | `CONFLICT` / `CONCURRENCY_CONFLICT` / `DUPLICATE` | Duplicado o `rowVersion` desactualizado |
| 422    | `STOCK_INSUFICIENTE` / `BUSINESS_RULE`   | Regla de negocio |
| 423    | `ACCOUNT_LOCKED`         | Cuenta bloqueada por intentos fallidos |
| 429    | `RATE_LIMITED`           | Rate limit (`Retry-After`) |
| 502/503/504 | `UPSTREAM_UNAVAILABLE` / `UPSTREAM_TIMEOUT` | Microservicio caído / lento |

## Paginación

Query `page` (≥1, default 1), `pageSize` (1..100, default 20). Respuesta:

```ts
interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }
```

## Roles

`ADMIN` (todo), `ALMACENERO` (productos + compras + lectura), `FARMACEUTICO` (ventas + lectura).
Lectura (`GET`) disponible para los tres.

---

## Auth

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET  | `/auth/csrf` | — | `200 { csrfToken: string }` (+ cookie `hce_csrf`) |
| POST | `/auth/login` | `{ email, password }` | `200 SessionDto` (+ cookies `hce_at`, `hce_rt`). Rate limit 5/min/IP |
| POST | `/auth/refresh` | — | `200 SessionDto` (rota cookies) · `401` si inválido |
| POST | `/auth/logout` | — | `204` (revoca refresh y limpia cookies) |
| GET  | `/auth/me` | — | `200 SessionDto` |

```ts
type Rol = 'ADMIN' | 'ALMACENERO' | 'FARMACEUTICO';
interface UserDto { id: string; email: string; nombreCompleto: string; rol: Rol }
interface SessionDto { user: UserDto; accessTokenExpiresAt: string /* ISO */ }
```

## Productos

| Método | Ruta | Rol | Body / Query | Respuesta |
|---|---|---|---|---|
| GET    | `/productos` | todos | `?search=&page=&pageSize=` | `Paginated<ProductoDto>` |
| GET    | `/productos/:id` | todos | — | `ProductoDto` |
| POST   | `/productos` | ADMIN, ALMACENERO | `CrearProductoDto` | `201 ProductoDto` |
| PUT    | `/productos/:id` | ADMIN, ALMACENERO | `ActualizarProductoDto` | `200 ProductoDto` |
| DELETE | `/productos/:id` | ADMIN | — | `204` · `409` si tiene movimientos |

```ts
interface ProductoDto {
  id: number; nombre: string; nroLote: string; fecRegistro: string;
  costo: number; precioVenta: number; stock: number; rowVersion: string /* base64 */;
}
interface CrearProductoDto { nombre: string /*2..150*/; nroLote: string /*1..50, [A-Za-z0-9-_/.]*/; costo?: number /*>=0, default 0*/ }
// precioVenta = round(costo * 1.35, 2) si no se envía
interface ActualizarProductoDto { nombre: string; nroLote: string; costo: number; precioVenta?: number; rowVersion: string }
```

## Compras (movimiento ENTRADA)

| Método | Ruta | Rol | Body / Query | Respuesta |
|---|---|---|---|---|
| POST | `/compras` | ADMIN, ALMACENERO | `RegistrarCompraDto` + header `Idempotency-Key` | `201 CompraDetalleDto` |
| GET  | `/compras` | todos | `?page&pageSize&desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | `Paginated<DocumentoResumenDto>` |
| GET  | `/compras/:id` | todos | — | `CompraDetalleDto` |

Efectos (atómicos, en un solo SP/transacción): `CompraCab` + `CompraDet`, actualiza `Productos.Costo = costoUnitario`
y `Productos.PrecioVenta = round(costo * 1.35, 2)`, crea `MovimientoCab(Id_TipoMovimiento=1, Id_DocumentoOrigen=Id_CompraCab)` + `MovimientoDet`.

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

| Método | Ruta | Rol | Body / Query | Respuesta |
|---|---|---|---|---|
| POST | `/ventas` | ADMIN, FARMACEUTICO | `RegistrarVentaDto` + header `Idempotency-Key` | `201 VentaDetalleDto` · `422 STOCK_INSUFICIENTE` |
| GET  | `/ventas` | todos | `?page&pageSize&desde&hasta` | `Paginated<DocumentoResumenDto>` |
| GET  | `/ventas/:id` | todos | — | `VentaDetalleDto` |

El **precio lo decide el servidor** (`Productos.PrecioVenta` vigente) — nunca se confía en un precio del cliente.
Cálculo por línea: `subTotal = cantidad * precioVenta`, `igv = subTotal * 0.18`, `total = subTotal + igv`.
El stock se valida en el dominio y se **revalida bajo lock** (`UPDLOCK, HOLDLOCK`) en el SP → sin sobreventa concurrente.

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

## Salud

`GET /health` (público, sin rate limit) → `{ status: 'ok'|'error', info, error, details }` (Terminus: NATS + servicios).
