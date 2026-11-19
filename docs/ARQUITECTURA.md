# Arquitectura implementada — HCE Insumos

Documento técnico de la solución entregada. Complementa a [EVALUACION_TEORICA.md](./EVALUACION_TEORICA.md)
(conceptos) y a [API_CONTRACT.md](./API_CONTRACT.md) (contrato HTTP).

## Índice

1. [Contexto (C4 nivel 1)](#1-contexto-c4-nivel-1)
2. [Contenedores (C4 nivel 2)](#2-contenedores-c4-nivel-2)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Arquitectura hexagonal del inventory-service](#4-arquitectura-hexagonal-del-inventory-service)
5. [Justificación de Arquitectura Hexagonal en sistemas de salud](#justificación-de-arquitectura-hexagonal-en-sistemas-de-salud)
6. [Flujos (diagramas de secuencia)](#6-flujos-diagramas-de-secuencia)
7. [Modelo de datos](#7-modelo-de-datos)
8. [Reglas de negocio e interpretaciones](#8-reglas-de-negocio-e-interpretaciones)
9. [Seguridad (OWASP)](#9-seguridad-owasp)
10. [Rendimiento y escalabilidad](#10-rendimiento-y-escalabilidad)
11. [Patrones de diseño aplicados](#11-patrones-de-diseño-aplicados)
12. [Observabilidad](#12-observabilidad)

---

## 1. Contexto (C4 nivel 1)

```mermaid
flowchart TB
  alm["Almacenero<br/>registra compras y productos"]
  far["Químico farmacéutico<br/>registra ventas / dispensación"]
  adm["Administrador"]
  sys["Sistema HCE Insumos<br/>control de medicamentos e insumos"]
  his["HIS / HCE clínico<br/>externo, futuro"]
  sunat["SUNAT / OSE<br/>externo, futuro"]
  alm --> sys
  far --> sys
  adm --> sys
  his -. "prescripciones FHIR" .-> sys
  sys -. "comprobantes electrónicos" .-> sunat
```

## 2. Contenedores (C4 nivel 2)

```mermaid
flowchart LR
  browser["Navegador<br/>Tablet / Laptop clínica"]

  subgraph net["Docker network: hce-net"]
    shell["shell<br/>Next.js 16 :3000"]
    mfc["mf-compras<br/>Next.js :3001<br/>basePath /compras"]
    mfv["mf-ventas<br/>Next.js :3002<br/>basePath /ventas"]
    mfk["mf-kardex<br/>Next.js :3003<br/>basePath /kardex"]
    gw["api-gateway<br/>NestJS HTTP :4000"]
    nats["NATS 2.10<br/>:4222, auth por token"]
    auth["auth-service<br/>NestJS microservice<br/>queue: auth"]
    inv["inventory-service<br/>NestJS microservice<br/>queue: inventory"]
    mssql[("SQL Server 2022<br/>:1433")]
    init["db-init<br/>sqlcmd, one-shot"]
    prom["Prometheus<br/>profile monitoring"]
    graf["Grafana<br/>profile monitoring"]
  end

  browser -- "páginas" --> shell
  shell -- "rewrites /compras" --> mfc
  shell -- "rewrites /ventas" --> mfv
  shell -- "rewrites /kardex" --> mfk
  browser -- "API JSON + cookies HttpOnly<br/>CORS solo origen del front" --> gw
  gw -- "request-reply" --> nats
  nats -- "auth.*" --> auth
  nats -- "inventory.*" --> inv
  auth -- "login hce_auth_app<br/>BD HCE_Auth" --> mssql
  inv -- "login hce_insumos_app<br/>EXECUTE en SPs<br/>BD HCE_Insumos" --> mssql
  init -- "scripts idempotentes" --> mssql
  prom -- "scrape" --> gw
  graf --> prom
```

| Contenedor | Tecnología | Responsabilidad | Escala |
|---|---|---|---|
| `shell` | Next.js 16 (App Router, standalone) | Login, layout común, navegación, composición de zonas | Horizontal (stateless) |
| `mf-compras` / `mf-ventas` / `mf-kardex` | Next.js 16 Multi-Zones | Un microfront por capacidad de negocio, build y deploy independientes | Horizontal |
| `api-gateway` | NestJS 11 + Express | Única puerta HTTP: seguridad, enrutamiento, composición, Swagger | Horizontal (stateless, JWT local) |
| `nats` | NATS 2.10 | Bus request-reply; **queue groups** balancean entre réplicas | Cluster |
| `auth-service` | NestJS 11 microservice | Usuarios, credenciales, sesiones, emisión de JWT ES256 | `--scale auth-service=N` |
| `inventory-service` | NestJS 11 microservice, hexagonal | Productos, compras, ventas, kardex | `--scale inventory-service=N` |
| `sqlserver` | SQL Server 2022 | Persistencia, invariantes atómicas, auditoría | Vertical / AG de lectura |
| `db-init` | mssql-tools (sqlcmd) | Crea BDs, esquema, SPs, triggers, logins, seed | One-shot |

## 3. Estructura del repositorio

```text
hce-insumos-platform/
├── backend/                         # Monorepo NestJS (nest-cli monorepo mode)
│   ├── apps/
│   │   ├── api-gateway/src/
│   │   │   ├── auth/                # AuthController + AuthFacade + cookies/CSRF
│   │   │   ├── inventario/          # Controllers productos/compras/ventas/kardex + InventarioFacade
│   │   │   ├── common/              # guards (Jwt, Roles, Csrf), decorators, filters (RFC 7807), interceptors
│   │   │   ├── health/ metrics/
│   │   │   └── main.ts
│   │   ├── auth-service/src/
│   │   │   ├── domain/ application/ infrastructure/
│   │   │   └── main.ts
│   │   └── inventory-service/src/
│   │       ├── domain/              # Agregados, VOs, puertos — sin NestJS ni mssql
│   │       ├── application/         # Casos de uso + decorador ObservedUseCase
│   │       ├── infrastructure/      # persistence/mssql (adaptadores), messaging/nats (controllers)
│   │       └── main.ts
│   └── libs/
│       ├── contracts/               # Patrones de mensaje NATS + DTOs compartidos
│       └── common/                  # AppError, MssqlExecutor (pool + reintentos), NATS, logger, métricas
├── frontend/                        # pnpm workspace
│   ├── apps/{shell,mf-compras,mf-ventas,mf-kardex}
│   └── packages/{domain,ui,api-client,config}  # Reglas puras, Tailwind UI, Axios + interceptores, config Next
├── database/
│   ├── init/                        # 00..N_*.sql ejecutados por db-init en orden
│   └── queries/consultas_tsql.sql   # Consultas T-SQL solicitadas / reportes
├── infra/nats/nats.conf             # Usuarios NATS con permisos mínimos por servicio
├── infra/monitoring/                # prometheus.yml, provisioning Grafana
├── scripts/setup.sh                 # Genera .env (secretos + claves ES256)
├── postman/                         # Colección + environment
├── docs/                            # Este documento y la evaluación teórica
└── docker-compose.yml
```

## 4. Arquitectura hexagonal del inventory-service

```mermaid
flowchart LR
  subgraph IN["Adaptadores de entrada"]
    c1["ProductoNatsController"]
    c2["CompraNatsController"]
    c3["VentaNatsController"]
    c4["KardexNatsController"]
  end
  subgraph APP["Aplicación — casos de uso"]
    u1["RegistrarProducto / ActualizarProducto"]
    u2["RegistrarCompra / ListarCompras"]
    u3["RegistrarVenta / ListarVentas"]
    u4["ListarKardex / ListarMovimientos"]
    dec["ObservedUseCase<br/>Decorator GoF"]
  end
  subgraph DOM["Dominio"]
    a1["Producto"]
    a2["Compra + LineaCompra"]
    a3["Venta + LineaVenta"]
    vo["Money, Cantidad, PoliticaPrecios"]
    p["Puertos: ProductoRepository,<br/>CompraRepository, VentaRepository,<br/>KardexReadModel"]
  end
  subgraph OUT["Adaptadores de salida"]
    r1["MssqlProductoRepository"]
    r2["MssqlCompraRepository"]
    r3["MssqlVentaRepository"]
    r4["MssqlKardexReadModel"]
    ex["MssqlExecutor<br/>pool + retry deadlock 1205"]
  end
  IN --> dec --> APP
  APP --> DOM
  r1 -. implementa .-> p
  r2 -. implementa .-> p
  r3 -. implementa .-> p
  r4 -. implementa .-> p
  r1 --> ex
  r2 --> ex
  r3 --> ex
  r4 --> ex
```

Reglas:

- `domain/` es TypeScript puro: **cero imports** de `@nestjs/*`, `mssql` o `nats`.
- `application/` depende solo de `domain/` (puertos por símbolos de inyección).
- `infrastructure/` implementa puertos y conoce los detalles (SPs, TVPs, NATS).
- El cableado (qué adaptador implementa qué puerto) vive en el módulo Nest — único lugar con conocimiento de ambos lados.

## Justificación de Arquitectura Hexagonal en sistemas de salud

| Necesidad del sector salud | Cómo la resuelve la arquitectura hexagonal |
|---|---|
| **Trazabilidad regulatoria** (DIGEMID, Ley 29733 de protección de datos personales, NTS de HCE del MINSA) | Las reglas (stock, precios, IGV, inmutabilidad de documentos) están **en un único lugar** (dominio) y son auditables por lectura de código; la persistencia agrega auditoría por triggers sin mezclarla con la lógica |
| **Interoperabilidad cambiante** (HL7 FHIR, SIS/SITEDS, SUNAT, HIS legado) | Cada integración es un **adaptador** nuevo detrás de un puerto. Integrar FHIR `MedicationDispense` = un adaptador de entrada que invoca `RegistrarVentaUseCase`; el dominio no cambia |
| **Seguridad del paciente** — un error de stock o lote es un riesgo clínico | Dominio testeable en aislamiento con repositorios en memoria: pruebas rápidas y exhaustivas de las invariantes críticas |
| **Auditabilidad** | Casos de uso explícitos (un caso de uso = una intención de negocio registrable); el decorador `ObservedUseCase` registra cada ejecución con `requestId` y usuario sin contaminar la lógica |
| **Longevidad** — los sistemas clínicos viven 10–20 años | El framework (NestJS), la BD (SQL Server) o el transporte (NATS) pueden reemplazarse sin reescribir las reglas de negocio |
| **Alta disponibilidad** | Los adaptadores pueden cambiar por versiones resilientes (cache, colas) sin impacto funcional |
| **Validación y certificación** | Un núcleo pequeño y estable reduce el alcance de re-validación ante cambios de infraestructura |

## 6. Flujos (diagramas de secuencia)

### 6.1 Login, uso y refresh

```mermaid
sequenceDiagram
  autonumber
  participant B as Navegador + Axios
  participant G as api-gateway
  participant N as NATS
  participant A as auth-service
  participant D as SQL Server HCE_Auth
  B->>G: GET /auth/csrf
  G-->>B: 200 csrfToken + Set-Cookie hce_csrf HttpOnly
  B->>G: POST /auth/login email, password + X-CSRF-Token
  Note over G: Throttler 10/min por IP en login, CsrfGuard
  G->>N: auth.login con ip y userAgent
  N->>A: queue group auth-service
  A->>D: buscar usuario, verificar lockout
  A->>A: scrypt async + timingSafeEqual
  A->>D: registrar intento, crear sesión con hash del refresh
  A-->>G: accessToken ES256 30 min + refreshToken opaco
  G-->>B: 200 SessionDto + Set-Cookie hce_at, hce_rt HttpOnly SameSite=Strict
  B->>G: GET /productos con cookie hce_at
  Note over G: JwtAuthGuard verifica firma ES256 LOCAL, sin red
  G-->>B: 200
  B->>G: GET /kardex con hce_at vencido
  G-->>B: 401 UNAUTHENTICATED
  Note over B: Interceptor single-flight: encola requests concurrentes
  B->>G: POST /auth/refresh con hce_rt
  G->>N: auth.refresh
  N->>A: rotar refresh
  A->>D: revocar actual, emitir nuevo de la misma familia
  Note over A: Si el refresh ya estaba revocado = reuso, se revoca TODA la familia
  A-->>G: nuevos tokens
  G-->>B: 200 + nuevas cookies
  B->>G: reintenta GET /kardex
  G-->>B: 200
```

### 6.2 Registrar compra (Entrada)

```mermaid
sequenceDiagram
  autonumber
  participant F as mf-compras
  participant G as api-gateway
  participant I as inventory-service
  participant D as SQL Server HCE_Insumos
  F->>G: POST /compras items + Idempotency-Key + X-CSRF-Token
  Note over G: JWT, Roles ADMIN o ALMACENERO, ValidationPipe whitelist
  G->>I: InventarioFacade.send inventory.compra.registrar, timeout
  I->>I: RegistrarCompraUseCase: Compra.crear, Money, IGV 18 %, precioVenta = costo x 1.35
  I->>D: EXEC usp_Compra_Registrar con TVP Lineas, 1 round-trip
  activate D
  D->>D: BEGIN TRAN, XACT_ABORT ON, SESSION_CONTEXT usuario
  D->>D: ¿IdempotencyKey existe? devolver Id existente
  D->>D: INSERT CompraCab y CompraDet
  D->>D: UPDATE Productos Costo, PrecioVenta
  D->>D: INSERT MovimientoCab tipo 1 Entrada, Id_DocumentoOrigen = Id_CompraCab
  D->>D: INSERT MovimientoDet
  D->>D: triggers escriben audit.Auditoria
  D-->>I: Id_CompraCab, COMMIT
  deactivate D
  I-->>G: CompraDetalleDto
  G-->>F: 201 Created
```

### 6.3 Registrar venta (Salida) con control de concurrencia de stock

```mermaid
sequenceDiagram
  autonumber
  participant F as mf-ventas
  participant G as api-gateway
  participant I as inventory-service
  participant D as SQL Server
  F->>G: POST /ventas productoId, cantidad + Idempotency-Key
  G->>I: inventory.venta.registrar
  I->>D: leer precioVenta y stock vigentes desde vw_StockProducto NOEXPAND
  I->>I: Venta.registrar: valida cantidad menor o igual a stock, calcula totales
  alt stock insuficiente en dominio
    I-->>G: RpcException 422 STOCK_INSUFICIENTE
    G-->>F: 422 La cantidad no debe ser mayor al stock
  else ok
    I->>D: EXEC usp_Venta_Registrar TVP
    D->>D: SELECT Productos WITH UPDLOCK, HOLDLOCK ordenado por Id
    Note over D: Serializa ventas concurrentes del mismo producto, orden fijo evita deadlocks
    D->>D: revalida stock y precio bajo lock
    alt otro usuario vendió primero
      D-->>I: ROLLBACK, @Resultado = STOCK_INSUFICIENTE + filas por producto
      I-->>G: 422
    else
      D->>D: INSERT VentaCab, VentaDet, MovimientoCab tipo 2 Salida, MovimientoDet
      D-->>I: Id_VentaCab, COMMIT
      I-->>G: VentaDetalleDto
      G-->>F: 201
    end
  end
```

## 7. Modelo de datos

Base `HCE_Insumos` (esquema `dbo` para el modelo solicitado, `audit` para la bitácora). Se respetan
exactamente los nombres de tablas y columnas del enunciado; se agregan solo columnas técnicas
(`RowVersion`, `IdempotencyKey`, `Id_Usuario`).

```mermaid
erDiagram
  Productos {
    int Id_producto PK
    nvarchar Nombre_producto
    nvarchar NroLote
    datetime2 Fec_registro
    decimal Costo
    decimal PrecioVenta
    rowversion RowVersion
  }
  CompraCab {
    int Id_CompraCab PK
    datetime2 FecRegistro
    decimal SubTotal
    decimal Igv
    decimal Total
    uniqueidentifier IdempotencyKey
  }
  CompraDet {
    int Id_CompraDet PK
    int Id_CompraCab FK
    int Id_producto FK
    int Cantidad
    decimal Precio
    decimal Sub_Total
    decimal Igv
    decimal Total
  }
  VentaCab {
    int Id_VentaCab PK
    datetime2 fecRegistro
    decimal SubTotal
    decimal Igv
    decimal Total
    uniqueidentifier IdempotencyKey
  }
  VentaDet {
    int Id_VentaDet PK
    int Id_VentaCab FK
    int Id_producto FK
    int Cantidad
    decimal Precio
    decimal Sub_Total
    decimal Igv
    decimal Total
  }
  TipoMovimiento {
    tinyint Id_TipoMovimiento PK
    nvarchar Descripcion
  }
  MovimientoCab {
    int Id_MovimientoCab PK
    datetime2 Fec_registro
    tinyint Id_TipoMovimiento FK
    int Id_DocumentoOrigen
  }
  MovimientoDet {
    int Id_MovimientoDet PK
    int Id_movimientocab FK
    int Id_Producto FK
    int Cantidad
  }
  Auditoria {
    bigint Id_Auditoria PK
    nvarchar Tabla
    char Operacion
    nvarchar LlavePrimaria
    nvarchar ValoresAnteriores
    nvarchar ValoresNuevos
    nvarchar Usuario
    datetime2 Fecha
  }
  CompraCab ||--|{ CompraDet : contiene
  VentaCab ||--|{ VentaDet : contiene
  Productos ||--o{ CompraDet : comprado_en
  Productos ||--o{ VentaDet : vendido_en
  TipoMovimiento ||--o{ MovimientoCab : clasifica
  MovimientoCab ||--|{ MovimientoDet : contiene
  Productos ||--o{ MovimientoDet : mueve
  CompraCab ||--o| MovimientoCab : "origina Entrada"
  VentaCab ||--o| MovimientoCab : "origina Salida"
```

Objetos de soporte:

| Objeto | Propósito |
|---|---|
| `dbo.vw_StockProducto` (`WITH SCHEMABINDING` + índice cluster único) | **Vista indexada**: stock = Σ entradas − Σ salidas por producto, materializada y mantenida por el motor en cada INSERT. Lectura O(1) con `WITH (NOEXPAND)` — el stock se basa en la tabla de movimientos, como pide el enunciado, sin recalcular |
| `UQ_MovimientoCab_Tipo_Documento` (único `Id_TipoMovimiento, Id_DocumentoOrigen`) | Un documento genera exactamente un movimiento; habilita la búsqueda del origen |
| Tipos tabla (`dbo.tt_LineaCompra`, `dbo.tt_LineaVenta`) | TVP: todas las líneas del documento viajan en **una** llamada |
| CHECK constraints | `Cantidad > 0`, `Precio >= 0`, `Total = Sub_Total + Igv`, `Id_TipoMovimiento IN (1,2)` |
| Índices únicos filtrados `IdempotencyKey IS NOT NULL` | Idempotencia de `POST /compras` y `POST /ventas` |
| `UQ_Productos_Nombre_Lote` | Un producto/lote no se duplica |
| Triggers `trg_*_Auditoria` (generados por `audit.usp_GenerarTriggerAuditoria`) y `trg_*_Inmutable` | INSERT/UPDATE/DELETE → `audit.Auditoria` con JSON (`FOR JSON`) de valores anteriores/nuevos y usuario de `SESSION_CONTEXT(N'user_id')` |
| Base `HCE_Auth` (esquema `auth`) | `Usuarios`, `Sesiones` (hash SHA-256 del refresh, familia, revocación), `HistorialLogin` |

Stored procedures (CRUD solicitados + operaciones de negocio): `usp_Producto_Insertar`, `usp_Producto_Listar`,
`usp_Producto_ObtenerPorId`, `usp_Producto_ObtenerPorIds`, `usp_Producto_Actualizar`, `usp_Producto_Eliminar`, `usp_Compra_Registrar`,
`usp_Compra_Listar`, `usp_Compra_Obtener`, `usp_Venta_Registrar`, `usp_Venta_Listar`, `usp_Venta_Obtener`,
`usp_Kardex_Listar`, `usp_Kardex_Movimientos`.

## 8. Reglas de negocio e interpretaciones

| # | Regla | Interpretación / decisión |
|---|---|---|
| R1 | IGV de venta/compra | El PDF indica `Igv = cantidad × PrecioVenta × 1.18`; aplicado literalmente, `Total = Subtotal + Igv` sería **2.18 × Subtotal** (doble conteo). Se implementa la norma tributaria peruana: **`Igv = Subtotal × 0.18`**, `Total = Subtotal + Igv` (tasa configurable `IGV_RATE`). Equivale a que `Total = cantidad × PrecioVenta × 1.18`, que es la intención evidente de la fórmula |
| R2 | Precio de venta | Al registrar una compra: `Productos.Costo = costo unitario de la compra` (último costo) y `PrecioVenta = round(Costo × 1.35, 2)` (margen configurable `MARGEN_VENTA`) |
| R3 | Stock | `stock = Σ MovimientoDet.Cantidad (tipo 1) − Σ (tipo 2)` vía vista indexada. Nunca se almacena en `Productos` |
| R4 | Validación de stock | Doble: (1) en el front al digitar y en el dominio para feedback inmediato, (2) **bajo lock** en el SP para concurrencia. Mensaje: *"La cantidad no debe ser mayor al stock"* |
| R5 | Precio de venta en la venta | Lo decide el servidor (precio vigente), el cliente solo envía `productoId` y `cantidad` |
| R6 | Documentos financieros inmutables | Compras y ventas **no se eliminan ni editan** (integridad contable y kardex). Una corrección sería una nota de crédito/devolución (fuera de alcance). Solo se eliminan **productos sin movimientos** |
| R7 | Productos duplicados en un documento | Se rechazan (cada `productoId` aparece una vez por documento) |
| R8 | Montos | `DECIMAL(18,2)`; aritmética en céntimos enteros en el dominio (VO `Money`) para evitar errores de punto flotante |
| R9 | Fechas | `DATETIME2` en UTC (`SYSUTCDATETIME()`); el front las muestra en `America/Lima` |

## 9. Seguridad (OWASP)

### 9.1 OWASP Top 10 (2021)

| Riesgo | Controles implementados |
|---|---|
| **A01** Broken Access Control | `JwtAuthGuard` global + `@Public()` explícito; `RolesGuard` con `@Roles()`; CORS con lista blanca del origen del front y `credentials: true`; `userId` siempre del token |
| **A02** Cryptographic Failures | JWT **ES256** (clave privada solo en auth-service; gateway solo tiene la pública → no puede emitir tokens); refresh tokens opacos de 256 bits guardados como **SHA-256**; contraseñas con **scrypt** (sal 16 B) y `timingSafeEqual`; cookies `Secure` en producción |
| **A03** Injection | 100 % consultas parametrizadas / SPs con parámetros tipados y TVPs; sin SQL dinámico concatenado; validación estricta con `class-validator`; React escapa la salida |
| **A04** Insecure Design | Invariantes en el dominio + revalidación atómica en BD; idempotencia; documentos inmutables; modelado de amenazas por flujo (secciones 6.x) |
| **A05** Security Misconfiguration | Helmet (CSP, HSTS, frameguard, `X-Content-Type-Options: nosniff`, `Referrer-Policy`), `x-powered-by` deshabilitado, Swagger off en producción, contenedores non-root, puertos internos no publicados (NATS, servicios) |
| **A06** Vulnerable Components | Lockfiles congelados, `pnpm audit` en CI, imágenes base mínimas (alpine), versiones fijadas |
| **A07** Identification & Auth Failures | Access token de **30 min**; refresh con **rotación y detección de reuso** (revoca la familia); bloqueo tras 5 intentos fallidos (15 min, 423); rate limit 5/min en login; mensajes genéricos (no enumeración de usuarios); logout revoca sesión |
| **A08** Software & Data Integrity | Algoritmo JWT fijado (`algorithms: ['ES256']`, `iss`, `aud` verificados); `rowversion` para concurrencia optimista; build reproducible |
| **A09** Logging & Monitoring Failures | Logs JSON (pino) con `requestId` propagado gateway → NATS → servicio; redacción de `cookie`, `authorization`, `password`; auditoría de datos por triggers; historial de login; métricas Prometheus |
| **A10** SSRF | Sin fetch de URLs de usuario; servicios internos solo accesibles en la red Docker |

### 9.2 Controles adicionales

- **CSRF**: cookies `SameSite=Strict` + **double-submit** (`hce_csrf` HttpOnly ↔ header `X-CSRF-Token`) verificado en todo método no seguro.
- **XSS**: el token nunca es accesible a JS (HttpOnly) — mitigación exigida por el enunciado; CSP en el gateway y el front.
- **Mínimo privilegio en BD**: `hce_insumos_app` solo tiene `EXECUTE` sobre los SPs (sin `SELECT/UPDATE/DELETE` directo a tablas); `audit.Auditoria` es append-only; `sa` solo lo usa `db-init`.
- **NATS** con autenticación por token: un contenedor ajeno no puede publicar en `inventory.*`.
- **Secretos** fuera del repositorio (`.env` generado por `scripts/setup.sh`, `.env.example` sin valores reales).
- **Límites**: body ≤ 100 KB, `pageSize ≤ 100`, ≤ 100 líneas por documento, timeouts RPC.

## 10. Rendimiento y escalabilidad

| Posible cuello de botella | Mitigación |
|---|---|
| Calcular stock sumando todos los movimientos | **Vista indexada** materializada: lectura constante con `NOEXPAND`, mantenida por el motor |
| Lectores bloqueados por escritores (listados durante ventas) | **READ_COMMITTED_SNAPSHOT ON**: lecturas por versionado de filas, sin bloqueos compartidos |
| N round-trips por línea de documento | **TVP**: cabecera + N líneas + movimiento en **una** llamada y **una** transacción |
| Apertura de conexiones | Pool `mssql` por servicio con tamaño configurable (`DB_POOL_MAX`) y reutilización |
| Deadlocks bajo carga | Locks en orden determinista (por `Id_producto`) + **reintento automático** con backoff ante error 1205 |
| Gateway con estado / sesión | **Stateless**: JWT verificado localmente (sin round-trip a auth-service por request) |
| Un solo proceso de dominio | **NATS queue groups**: N réplicas de `inventory-service` reciben mensajes balanceados sin configuración extra |
| Hash de contraseñas bloqueando el event loop | `scrypt` **asíncrono** (libuv threadpool), nunca `scryptSync` |
| Respuestas gigantes | Paginación obligatoria `OFFSET/FETCH` con `pageSize ≤ 100` e índices de soporte (`FecRegistro DESC`, `MovimientoDet(Id_Producto) INCLUDE(Cantidad)`) |
| Servicio lento arrastrando al gateway | `timeout()` RxJS por llamada RPC → 504 controlado; health checks Terminus |
| Re-fetch redundante en el front | TanStack Query (cache, dedupe, `staleTime`); búsqueda con debounce; `next build` standalone |
| Escalado futuro | Rate limit con storage Redis compartido al tener múltiples gateways; réplicas de lectura de SQL Server (AG) para kardex/reportes |

## 11. Patrones de diseño aplicados

| Patrón | Dónde | Propósito |
|---|---|---|
| **Facade** | `apps/api-gateway/src/inventario/inventario.facade.ts`, `apps/api-gateway/src/auth/auth.facade.ts` | Ocultar NATS, patrones de mensaje, timeouts y mapeo de errores RPC → HTTP detrás de métodos de negocio |
| **Decorator (GoF)** | `apps/inventory-service/src/application/decorators/observed-use-case.decorator.ts` | Agregar logging y métricas a cualquier caso de uso sin modificarlo |
| **Decorator (TS/Nest)** | `apps/api-gateway/src/common/decorators/` (`@Roles`, `@Public`, `@CurrentUser`, `@Idempotent`, `@ApiProblemResponses`) | Metadatos declarativos y composición con `applyDecorators` |
| **Ports & Adapters** | `inventory-service` | Independencia de infraestructura |
| **Repository** | `domain/*/*.repository.port.ts` + `infrastructure/persistence/mssql/*` | Abstracción de persistencia |
| **Aggregate / Value Object** | `Compra`, `Venta`, `Money`, `Cantidad` | Invariantes de negocio |
| **API Gateway** | `api-gateway` | Punto único de entrada, seguridad transversal |
| **Interceptor / Chain of Responsibility** | Axios interceptors (front), Nest interceptors/guards (back) | Preocupaciones transversales en cadena |
| **Single-flight** | `frontend/packages/api-client` | Un único refresh para N requests 401 concurrentes |

## 12. Observabilidad

- **Logs**: JSON estructurado (pino) en stdout de cada contenedor; `requestId` (header `X-Request-Id` o generado)
  viaja en el payload NATS y aparece en los logs de gateway y servicios.
- **Métricas**: `prom-client` en el gateway (latencia por ruta, códigos HTTP, métricas de proceso Node) — Prometheus
  las recolecta; Grafana las grafica (`docker compose --profile monitoring up -d`).
- **Salud**: `GET /api/v1/health` (Terminus) verifica NATS y la respuesta de cada microservicio; los contenedores
  tienen `healthcheck` en compose para orden de arranque.
- **Auditoría de datos**: `audit.Auditoria` (quién, qué, cuándo, antes/después) — consultas de ejemplo en
  `database/queries/consultas_tsql.sql`.
