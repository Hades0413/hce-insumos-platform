# Checklist de entrega — Examen Técnico Especialista Desarrollo HCE

Mapeo de cada requisito del enunciado a su ubicación en el repositorio.

## Entregables generales

| Requisito | Ubicación | Estado |
|---|---|---|
| Evaluación teórica (API REST, Monolito vs Microservicios, BFF, DDD) | `docs/EVALUACION_TEORICA.md` | ✅ |
| Diagrama de arquitectura con Docker, monitoreo e integraciones | `docs/EVALUACION_TEORICA.md` §8, `docs/ARQUITECTURA.md` §2 | ✅ |
| Repositorio Git público con BackEnd y FrontEnd | Raíz del repo (`backend/`, `frontend/`) | ⏳ publicar en GitHub |
| Scripts SQL Server: tablas, consultas T-SQL, SPs, triggers de auditoría | `database/init/*.sql`, `database/queries/consultas_tsql.sql` | ✅ |
| Video de evidencia | Guion en `docs/GUION_VIDEO.md` | ⏳ grabar y adjuntar enlace |
| README con instrucciones Docker | `README.md` | ✅ |

## 1.1 BackEnd — Microservicios NestJS

| Requisito | Ubicación |
|---|---|
| API REST NestJS en microservicios | `backend/apps/api-gateway`, `backend/apps/auth-service`, `backend/apps/inventory-service` |
| Contenedorizado con Docker | `backend/Dockerfile` (multi-stage, `ARG APP`), `docker-compose.yml` |
| JWT con duración estricta de 30 minutos | `backend/apps/auth-service` (emisión ES256, `JWT_ACCESS_TTL_MIN=30`, validado con máximo 30), `backend/apps/api-gateway/src/common/guards/jwt-auth.guard.ts` |
| Modelo de entidades (Productos, CompraCab/Det, VentaCab/Det, MovimientoCab/Det) | `database/init/` (esquema), ER en `docs/ARQUITECTURA.md` §7 |
| Registrar Venta | `POST /api/v1/ventas` → `RegistrarVentaUseCase` → `usp_Venta_Registrar` |
| Registrar Compra | `POST /api/v1/compras` → `RegistrarCompraUseCase` → `usp_Compra_Registrar` |
| Registrar Producto | `POST /api/v1/productos` → `usp_Producto_Insertar` |
| Actualizar Producto | `PUT /api/v1/productos/:id` → `usp_Producto_Actualizar` |
| Listar Venta / Compra / Producto | `GET /api/v1/ventas`, `/compras`, `/productos` → `usp_*_Listar` |
| Listar Kardex | `GET /api/v1/kardex`, `GET /api/v1/kardex/:productoId/movimientos` → `usp_Kardex_*` |
| Scripts BD insertar, listar, actualizar, eliminar | `database/init/` (SPs `usp_Producto_Insertar/Listar/Actualizar/Eliminar`, etc.) y ejemplos en `database/queries/consultas_tsql.sql` |
| Documentador Swagger | `http://localhost:4000/api/docs` (`backend/apps/api-gateway/src/main.ts`) |
| Colección para probar la API | `postman/` |
| CORS solo para el Front | `CORS_ORIGINS` en `.env` → `app.enableCors` del gateway |
| Patrones Facade y Decorator | `docs/ARQUITECTURA.md` §11 (rutas exactas) |
| Principios SOLID | `docs/EVALUACION_TEORICA.md` §7 |

## 1.2 FrontEnd — MicroFront Next.js

| Requisito | Ubicación |
|---|---|
| Next.js con microfront | `frontend/apps/shell` + `frontend/apps/mf-compras`, `mf-ventas`, `mf-kardex` (Multi-Zones) |
| Responsivo | Tailwind CSS 4, layouts para tablet/laptop |
| Interceptores de peticiones para JWT | `frontend/packages/api-client` (Axios: CSRF, refresh single-flight, errores RFC 7807) |
| 1.2.1 Registrar compra con varios productos + modal Registrar Producto | `frontend/apps/mf-compras` |
| a) CompraCab/CompraDet + actualizar costo y precio venta (costo × 1.35) + movimiento Entrada | `usp_Compra_Registrar` (transacción única) |
| 1.2.2 Registrar venta, precio venta y stock (desde movimientos), validación de stock | `frontend/apps/mf-ventas`, `dbo.vw_StockProducto`, `usp_Venta_Registrar` |
| b–e) Cálculo de Subtotal, IGV, Total al digitar | `frontend/apps/mf-ventas` (interpretación del IGV en `docs/ARQUITECTURA.md` §8) |
| Venta en movimiento Salida | `usp_Venta_Registrar` |
| 1.2.3 Vista Kardex (Id_producto, nombre, stock actual, costo, precio venta) | `frontend/apps/mf-kardex` |
| Botón por fila → modal de movimientos (fecha, tipo, cantidad) | `frontend/apps/mf-kardex` |

## 1.3 Consideraciones globales

| Requisito | Ubicación |
|---|---|
| Tailwind CSS / Bootstrap | Tailwind CSS 4 (`frontend/packages/ui`) |
| Arquitectura Hexagonal + justificación en salud | `backend/apps/inventory-service/src/{domain,application,infrastructure}`; `docs/ARQUITECTURA.md` → "Justificación de Arquitectura Hexagonal en sistemas de salud" |
| docker-compose.yml unificado (Back, Front, BD) | `docker-compose.yml` |
| API Gateway en NestJS | `backend/apps/api-gateway` |
| Seguridad: JWT 30 min en cookies HttpOnly | ✅ |
| Seguridad: Rate Limit | ✅ `@nestjs/throttler` (global + login 5/min) |
| Seguridad: CORS | ✅ |
| Seguridad: Helmet + `X-Content-Type-Options: nosniff` | ✅ |
| Extra | CSRF double-submit, refresh rotativo con detección de reuso, bloqueo de cuenta, RBAC, idempotencia, auditoría por triggers, logins de BD de mínimo privilegio |

## Pasos finales antes de enviar

1. Crear repositorio **público** en GitHub y publicar: `git remote add origin <url> && git push -u origin main`.
2. Grabar el video siguiendo `docs/GUION_VIDEO.md`; subirlo (YouTube no listado / Drive con acceso por enlace).
3. Exportar `docs/EVALUACION_TEORICA.md` a PDF si se requiere como documento adjunto.
4. Enviar el correo.

## Plantilla de correo

**Para:** hvidal@clinicasanfelipe.com
**Asunto:** Especialista Desarrollo HCE + [Número Documento] + [Apellidos y Nombres completos]

```text
Estimado(a):

Por medio del presente hago entrega de la prueba técnica para el puesto de Especialista Desarrollo TI - HCE.

Identificador: Especialista Desarrollo HCE + [Número Documento] + [Apellidos y Nombres completos]

Entregables:
- Repositorio público (BackEnd NestJS microservicios + FrontEnd Next.js microfront + scripts SQL Server):
  [URL del repositorio GitHub]
- Evaluación teórica y diagrama de arquitectura: docs/EVALUACION_TEORICA.md (adjunto también en PDF)
- Documentación de arquitectura y justificación hexagonal: docs/ARQUITECTURA.md
- Video explicativo: [URL del video]

El ecosistema completo (Front, Back y BD) se levanta con Docker siguiendo el README.md.

Quedo atento a cualquier consulta.

Saludos cordiales,
[Apellidos y Nombres completos]
[Teléfono]
```
