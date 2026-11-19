# HCE Insumos — Frontend (Next.js Multi-Zones)

Microfrontends con **Next.js 16 (App Router, React 19, TypeScript strict) + Tailwind CSS v4**,
organizados como monorepo **pnpm workspace**. Consume el API Gateway según
[`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md).

## Arquitectura

```
Navegador ──► shell :3000  (login, inicio, layout; router de zonas vía rewrites)
                 ├── /compras/*  ──► mf-compras :3001  (basePath /compras)
                 ├── /ventas/*   ──► mf-ventas  :3002  (basePath /ventas)
                 └── /kardex/*   ──► mf-kardex  :3003  (basePath /kardex)
Navegador ──► API Gateway :4000/api/v1  (Axios + cookies HttpOnly, CORS solo para :3000)
```

- **Multi-Zones** (patrón oficial de Next.js para microfrontends): cada zona es una app Next
  independiente (build, deploy y escalado propios). El shell enruta con `rewrites`, por lo que el
  navegador ve **un solo origen** → cookies, CSP y CORS simples. Entre zonas se navega con `<a>`
  (navegación dura); dentro de una zona, con `<Link>`.
- **Paquetes compartidos** (fuente TS, `transpilePackages`):
  | Paquete | Responsabilidad |
  |---|---|
  | `@hce/domain` | Reglas puras: dinero en céntimos enteros, IGV 18 %, precio venta = costo × 1.35, RBAC/menú por rol, `safeNextPath` (anti open-redirect), UUID |
  | `@hce/api-client` | Axios + interceptores, endpoints tipados, DTOs, `ApiError` (RFC 7807), hooks de sesión (`useSession`, `RoleGate`), query keys |
  | `@hce/ui` | Design system Tailwind: Button, Input, Modal accesible, DataTable, Pagination, Badge, Toast, AppShell responsivo, ProductoPicker (combobox ARIA), historial de documentos |
  | `@hce/config` | `createNextConfig` (standalone, headers de seguridad) y `createAuthProxy` (CSP con nonce + redirección a login) |
- Cada zona sigue `app/` (rutas) → `features/<módulo>/` (componentes, schemas zod) → paquetes compartidos.

## Seguridad en el cliente

- **JWT en cookies HttpOnly** (`hce_at` 30 min, `hce_rt` refresh): el JS **nunca** lee ni guarda tokens
  (nada en `localStorage`) → mitiga robo de sesión por XSS.
- **Interceptor de request**: `X-Request-Id` (trazabilidad) y `X-CSRF-Token` en POST/PUT/PATCH/DELETE
  (double-submit; token en memoria, obtenido de `GET /auth/csrf` con promesa deduplicada).
- **Interceptor de response**: normaliza errores a `ApiError`; ante **401** ejecuta **un único refresh
  compartido** (single-flight) para todas las peticiones concurrentes y reintenta cada una una vez; si falla,
  redirige a `/login?next=…`. Ante **403 `CSRF_INVALID`** renueva el token y reintenta una vez. Timeout 15 s.
- `Idempotency-Key` estable por intento en `POST /compras` y `POST /ventas` (sin dobles registros ante reintentos).
- **CSP estricta con nonce por request** (`script-src 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`,
  `connect-src` limitado al gateway), `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, COOP/CORP, HSTS en producción, `poweredByHeader: false`.
- `proxy.ts` (antes `middleware`) redirige a login sin cookie de sesión — **solo UX**; la autorización real
  la hace el gateway. `RoleGate` también es solo UX.
- Validación de formularios con **zod** + react-hook-form (los mismos límites que el backend).

## Reglas de negocio en UI

- Compra: varias líneas, alta de producto en modal, subtotal/IGV/total en vivo; nota de precio venta = costo × 1.35.
- Venta: el picker muestra precio de venta y stock; al guardar valida `cantidad ≤ stock` con el mensaje
  **"La cantidad no debe ser mayor al stock"**, y mapea el `422 STOCK_INSUFICIENTE` del servidor por línea.
- IGV: el PDF dice "cantidad × precio × 1.18"; se interpreta como **IGV = 18 % del subtotal** y
  `Total = Subtotal + IGV` (constante única `IGV_RATE` en `@hce/domain`).
- Kardex: Id, nombre, stock actual, costo, precio venta + modal de movimientos (fecha, tipo, cantidad, saldo).

## Ejecutar

```bash
corepack enable
pnpm install
pnpm dev              # 4 apps en paralelo → abrir http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test && pnpm build   # = pnpm verify
```

Variables (todas de **build**, salvo `APP_PUBLIC_URL`):

| Variable | Apps | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | todas | `http://localhost:4000/api/v1` |
| `MF_COMPRAS_URL` / `MF_VENTAS_URL` / `MF_KARDEX_URL` | shell | `http://localhost:3001/3002/3003` |
| `APP_PUBLIC_URL` (runtime, opcional) | zonas | origen derivado de `x-forwarded-host` |

## Docker

Un único `Dockerfile` multi-stage para las 4 zonas (usuario no root, output `standalone`, healthcheck):

```bash
docker build --build-arg APP=shell \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1 \
  --build-arg MF_COMPRAS_URL=http://mf-compras:3001 \
  --build-arg MF_VENTAS_URL=http://mf-ventas:3002 \
  --build-arg MF_KARDEX_URL=http://mf-kardex:3003 -t hce/shell .
docker build --build-arg APP=mf-compras --build-arg PORT=3001 -t hce/mf-compras .
```
