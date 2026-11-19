# Guion del video de evidencia (6–8 minutos)

Preparación previa (fuera de cámara): `./scripts/setup.sh && docker compose up -d --build`, esperar a que
`db-init` termine (`docker compose ps`), abrir pestañas: `http://localhost:3000`, Swagger
`http://localhost:4000/api/docs`, Postman con la colección importada, VS Code en la raíz del repo y una
terminal. Resolución 1920×1080, zoom del editor 130 %.

| # | Tiempo | Bloque | Qué mostrar | Qué decir (resumen) |
|---|---|---|---|---|
| 1 | 0:00–0:30 | Introducción | Portada del README | "Solución HCE Insumos: control de medicamentos e insumos con microservicios NestJS, microfronts Next.js y SQL Server, todo en Docker." |
| 2 | 0:30–1:30 | Arquitectura | `docs/ARQUITECTURA.md` → diagrama de contenedores | Front Multi-Zones (shell + 3 microfronts) → API Gateway (única puerta HTTP: Helmet, CORS, rate limit, CSRF, JWT 30 min en cookie HttpOnly) → NATS → auth-service / inventory-service → SQL Server con una BD por servicio. Mencionar monitoreo e integraciones futuras del diagrama de `EVALUACION_TEORICA.md` |
| 3 | 1:30–2:30 | Microservicios en Docker | Terminal: `docker compose ps`; `docker compose logs -f api-gateway inventory-service` (mostrar un `requestId` que aparece en ambos); `docker compose up -d --scale inventory-service=3`; repetir un listado y mostrar logs de distintas réplicas | "Los servicios no exponen puertos: solo el gateway. NATS balancea con queue groups, por eso escalar es un solo comando." |
| 4 | 2:30–3:45 | Estructura del código | VS Code: `backend/apps/inventory-service/src/{domain,application,infrastructure}`; abrir `domain/venta/venta.ts` (invariante de stock), `domain/shared/money.ts`, un puerto y su adaptador MSSQL | "Arquitectura hexagonal: el dominio no importa NestJS ni mssql. En salud esto da trazabilidad, testabilidad y permite agregar FHIR o SUNAT como adaptadores." |
| 5 | 3:45–4:30 | Patrones Facade y Decorator | `api-gateway/src/inventario/inventario.facade.ts` (timeout + mapeo de errores) y un controller delgado; `application/decorators/observed-use-case.decorator.ts` y su registro en el módulo; `common/decorators/` (`@Roles`, `@Idempotent` con `applyDecorators`) | "El controller no sabe que existe NATS: la Facade lo oculta. El Decorator agrega logging y métricas a los casos de uso sin modificarlos — principio abierto/cerrado." |
| 6 | 4:30–5:00 | Base de datos | `database/init/`: SP `usp_Venta_Registrar` (TVP, `UPDLOCK, HOLDLOCK`), vista indexada `vw_StockProducto`, trigger de auditoría | "El stock sale de la tabla de movimientos mediante una vista indexada; la venta se revalida bajo lock para evitar sobreventa concurrente." |
| 7 | 5:00–6:30 | Demo funcional | Navegador en modo tablet (DevTools 1024 px): **login** (mostrar en DevTools → Application → Cookies que `hce_at` es HttpOnly) → **Compras**: agregar 2 productos, uno nuevo vía **modal Registrar Producto** → guardar → **Kardex**: stock actualizado, costo y precio venta = costo × 1.35 → botón **Movimientos** (modal con fecha, tipo, cantidad) → **Ventas**: seleccionar producto (muestra precio y stock), digitar cantidad (subtotal, IGV, total en vivo), intentar cantidad mayor al stock → mensaje *"La cantidad no debe ser mayor al stock"* → corregir y guardar → volver al Kardex y ver la **Salida** | Narrar cada regla de negocio cumplida |
| 8 | 6:30–7:15 | Pruebas | Terminal: `make test` (lint + typecheck + unitarios + e2e del gateway + tests del front) y la colección Postman con newman | "Las reglas críticas están cubiertas con repositorios en memoria; corren en segundos." |
| 9 | 7:15–7:45 | Swagger y Postman | Swagger agrupado por tags; Postman: ejecutar la colección (Runner) mostrando login → compra → venta → kardex en verde | "Documentación generada del código y colección lista para QA." |
| 10 | 7:45–8:00 | Cierre | README → sección "Levantar con Docker" | "Todo el ecosistema se levanta con un comando. Gracias." |

Consejos: grabar en bloques y unir; usar datos semilla para no perder tiempo tipeando; ocultar `.env`
y cualquier secreto en pantalla.
