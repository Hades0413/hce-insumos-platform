# HCE Insumos: frontend

Microfrontends con Next.js 16 (Multi-Zones), React 19, Tailwind CSS 4 y TanStack Query, organizados como
monorepo con pnpm. Consumen el API Gateway según [`docs/API_CONTRACT.md`](../docs/API_CONTRACT.md).

## Zonas

| App | Puerto | Rutas |
|---|---|---|
| `shell` | 3000 | `/login`, inicio, `/seguridad`; une las demás zonas con *rewrites* |
| `mf-compras` | 3001 | `/compras`, `/compras/historial` |
| `mf-ventas` | 3002 | `/ventas`, `/ventas/historial` |
| `mf-kardex` | 3003 | `/kardex`, `/kardex/productos` |

El navegador solo ve `localhost:3000`; el `shell` reenvía `/compras`, `/ventas` y `/kardex` a cada zona.

## Paquetes compartidos

| Paquete | Contenido |
|---|---|
| `@hce/domain` | Montos en céntimos, IGV, precio de venta, permisos por rol y rutas seguras. Sin React |
| `@hce/api-client` | Axios con interceptores, una función por endpoint y hooks de TanStack Query |
| `@hce/ui` | Componentes visuales: botones, tablas, modales, buscador de productos, totales |
| `@hce/features` | Piezas que unen API y UI: layout de zona, control de permisos por página, historial de documentos |
| `@hce/config` | CSP con nonce y redirección al login cuando no hay sesión |

## Seguridad en el navegador

- Los tokens viajan solo en cookies HttpOnly; el código del front no los lee ni los guarda.
- Los interceptores de Axios agregan `X-CSRF-Token` y `X-Request-Id`, y ante un 401 renuevan la sesión una sola
  vez aunque fallen varias peticiones a la vez.
- `POST /compras` y `POST /ventas` llevan una `Idempotency-Key` para que un reintento no duplique el documento.
- CSP con nonce por petición. En modo desarrollo se permiten estilos en línea porque Next.js los necesita.
- Menús y botones se muestran según los permisos del usuario. Es solo visual: el gateway valida cada petición.

## Comandos

```bash
pnpm install
pnpm dev                                      # las 4 apps en 3000–3003
pnpm -r typecheck && pnpm -r lint && pnpm -r test
```

Para levantar el sistema completo (con backend y base de datos) usar `make dev` o `make prod` desde la raíz; ver
[`docs/INSTALACION.md`](../docs/INSTALACION.md).
