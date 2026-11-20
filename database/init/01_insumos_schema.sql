/* =============================================================================
   01_insumos_schema.sql: Modelo de datos de control de medicamentos / insumos
   Base: HCE_Insumos. Idempotente.

   Decisiones:
   - Nombres de tablas/columnas EXACTOS al enunciado (Productos, CompraCab, ...).
   - Columnas técnicas adicionales (no rompen el modelo pedido):
       RowVersion       -> concurrencia optimista en Productos.
       Id_Usuario       -> trazabilidad (quién registró el documento).
       IdempotencyKey   -> reintentos seguros desde el front (sin doble venta).
       RequestHash      -> detecta reuso de una IdempotencyKey con otro payload.
   - MovimientoCab.Id_DocumentoOrigen es polimórfico (CompraCab o VentaCab según tipo).
     Se garantiza integridad referencial REAL con columnas calculadas PERSISTED + FK.
   - Stock = SUM(entradas) - SUM(salidas) sobre Movimiento*, materializado por una
     VISTA INDEXADA (mantenida por el motor, siempre consistente, lectura O(1)).
   ============================================================================= */
USE HCE_Insumos;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET NOCOUNT ON;
GO

IF SCHEMA_ID(N'audit') IS NULL EXEC (N'CREATE SCHEMA audit AUTHORIZATION dbo;');
GO

/* ---------------------------------------------------------------- Catálogo */
IF OBJECT_ID(N'dbo.TipoMovimiento', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TipoMovimiento
    (
        Id_TipoMovimiento TINYINT      NOT NULL CONSTRAINT PK_TipoMovimiento PRIMARY KEY,
        Descripcion       VARCHAR(20)  NOT NULL CONSTRAINT UQ_TipoMovimiento_Descripcion UNIQUE
    );
END
GO
MERGE dbo.TipoMovimiento AS t
USING (VALUES (CAST(1 AS TINYINT), 'ENTRADA'), (CAST(2 AS TINYINT), 'SALIDA')) AS s (Id, Descripcion)
   ON t.Id_TipoMovimiento = s.Id
WHEN NOT MATCHED THEN INSERT (Id_TipoMovimiento, Descripcion) VALUES (s.Id, s.Descripcion);
GO

/* ---------------------------------------------------------------- Productos */
IF OBJECT_ID(N'dbo.Productos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Productos
    (
        Id_producto      INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Productos PRIMARY KEY CLUSTERED,
        Nombre_producto  NVARCHAR(150)      NOT NULL,
        NroLote          VARCHAR(50)        NOT NULL,
        Fec_registro     DATETIME2(3)       NOT NULL CONSTRAINT DF_Productos_Fec_registro DEFAULT (SYSUTCDATETIME()),
        Costo            DECIMAL(18, 2)     NOT NULL CONSTRAINT DF_Productos_Costo DEFAULT (0),
        PrecioVenta      DECIMAL(18, 2)     NOT NULL CONSTRAINT DF_Productos_PrecioVenta DEFAULT (0),
        Id_Usuario       NVARCHAR(64)       NULL,
        Fec_modificacion DATETIME2(3)       NULL,
        Activo           BIT                NOT NULL CONSTRAINT DF_Productos_Activo DEFAULT (1),
        Fec_eliminacion  DATETIME2(3)       NULL,
        Id_UsuarioElimina NVARCHAR(64)      NULL,
        RowVersion       ROWVERSION         NOT NULL,
        CONSTRAINT CK_Productos_Costo        CHECK (Costo >= 0),
        CONSTRAINT CK_Productos_PrecioVenta  CHECK (PrecioVenta >= 0),
        CONSTRAINT CK_Productos_Nombre       CHECK (LEN(LTRIM(RTRIM(Nombre_producto))) >= 2),
        CONSTRAINT CK_Productos_NroLote      CHECK (LEN(LTRIM(RTRIM(NroLote))) >= 1),
        CONSTRAINT CK_Productos_Eliminacion  CHECK ((Activo = 1 AND Fec_eliminacion IS NULL)
                                                 OR (Activo = 0 AND Fec_eliminacion IS NOT NULL))
    );
    /* Eliminación lógica: el producto se conserva (kardex, compras y ventas lo
       referencian). Nombre + lote son únicos solo entre productos activos. */
    CREATE UNIQUE INDEX UX_Productos_Nombre_Lote ON dbo.Productos (Nombre_producto, NroLote) WHERE Activo = 1;
END
GO

/* ---------------------------------------------------------------- Compras */
IF OBJECT_ID(N'dbo.CompraCab', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompraCab
    (
        Id_CompraCab   INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_CompraCab PRIMARY KEY CLUSTERED,
        FecRegistro    DATETIME2(3)       NOT NULL CONSTRAINT DF_CompraCab_FecRegistro DEFAULT (SYSUTCDATETIME()),
        SubTotal       DECIMAL(18, 2)     NOT NULL,
        Igv            DECIMAL(18, 2)     NOT NULL,
        Total          DECIMAL(18, 2)     NOT NULL,
        Id_Usuario     NVARCHAR(64)       NOT NULL,
        IdempotencyKey UNIQUEIDENTIFIER   NULL,
        RequestHash    BINARY(32)         NULL,
        CONSTRAINT CK_CompraCab_Montos CHECK (SubTotal >= 0 AND Igv >= 0 AND Total = SubTotal + Igv)
    );
    CREATE UNIQUE INDEX UX_CompraCab_IdempotencyKey ON dbo.CompraCab (IdempotencyKey) WHERE IdempotencyKey IS NOT NULL;
    CREATE INDEX IX_CompraCab_FecRegistro ON dbo.CompraCab (FecRegistro DESC) INCLUDE (SubTotal, Igv, Total);
END
GO

IF OBJECT_ID(N'dbo.CompraDet', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompraDet
    (
        Id_CompraDet INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_CompraDet PRIMARY KEY CLUSTERED,
        Id_CompraCab INT                NOT NULL CONSTRAINT FK_CompraDet_CompraCab REFERENCES dbo.CompraCab (Id_CompraCab),
        Id_producto  INT                NOT NULL CONSTRAINT FK_CompraDet_Productos REFERENCES dbo.Productos (Id_producto),
        Cantidad     INT                NOT NULL,
        Precio       DECIMAL(18, 2)     NOT NULL,
        Sub_Total    DECIMAL(18, 2)     NOT NULL,
        Igv          DECIMAL(18, 2)     NOT NULL,
        Total        DECIMAL(18, 2)     NOT NULL,
        CONSTRAINT CK_CompraDet_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_CompraDet_Montos   CHECK (Precio >= 0 AND Sub_Total = Cantidad * Precio AND Igv >= 0 AND Total = Sub_Total + Igv),
        CONSTRAINT UQ_CompraDet_Cab_Producto UNIQUE (Id_CompraCab, Id_producto)
    );
    CREATE INDEX IX_CompraDet_Id_producto ON dbo.CompraDet (Id_producto);
END
GO

/* ---------------------------------------------------------------- Ventas */
IF OBJECT_ID(N'dbo.VentaCab', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VentaCab
    (
        Id_VentaCab    INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_VentaCab PRIMARY KEY CLUSTERED,
        fecRegistro    DATETIME2(3)       NOT NULL CONSTRAINT DF_VentaCab_fecRegistro DEFAULT (SYSUTCDATETIME()),
        SubTotal       DECIMAL(18, 2)     NOT NULL,
        Igv            DECIMAL(18, 2)     NOT NULL,
        Total          DECIMAL(18, 2)     NOT NULL,
        Id_Usuario     NVARCHAR(64)       NOT NULL,
        IdempotencyKey UNIQUEIDENTIFIER   NULL,
        RequestHash    BINARY(32)         NULL,
        CONSTRAINT CK_VentaCab_Montos CHECK (SubTotal >= 0 AND Igv >= 0 AND Total = SubTotal + Igv)
    );
    CREATE UNIQUE INDEX UX_VentaCab_IdempotencyKey ON dbo.VentaCab (IdempotencyKey) WHERE IdempotencyKey IS NOT NULL;
    CREATE INDEX IX_VentaCab_fecRegistro ON dbo.VentaCab (fecRegistro DESC) INCLUDE (SubTotal, Igv, Total);
END
GO

IF OBJECT_ID(N'dbo.VentaDet', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.VentaDet
    (
        Id_VentaDet INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_VentaDet PRIMARY KEY CLUSTERED,
        Id_VentaCab INT                NOT NULL CONSTRAINT FK_VentaDet_VentaCab REFERENCES dbo.VentaCab (Id_VentaCab),
        Id_producto INT                NOT NULL CONSTRAINT FK_VentaDet_Productos REFERENCES dbo.Productos (Id_producto),
        Cantidad    INT                NOT NULL,
        Precio      DECIMAL(18, 2)     NOT NULL,
        Sub_Total   DECIMAL(18, 2)     NOT NULL,
        Igv         DECIMAL(18, 2)     NOT NULL,
        Total       DECIMAL(18, 2)     NOT NULL,
        CONSTRAINT CK_VentaDet_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_VentaDet_Montos   CHECK (Precio >= 0 AND Sub_Total = Cantidad * Precio AND Igv >= 0 AND Total = Sub_Total + Igv),
        CONSTRAINT UQ_VentaDet_Cab_Producto UNIQUE (Id_VentaCab, Id_producto)
    );
    CREATE INDEX IX_VentaDet_Id_producto ON dbo.VentaDet (Id_producto);
END
GO

/* ---------------------------------------------------------------- Movimientos (Kardex) */
IF OBJECT_ID(N'dbo.MovimientoCab', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MovimientoCab
    (
        Id_MovimientoCab   INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_MovimientoCab PRIMARY KEY CLUSTERED,
        Fec_registro       DATETIME2(3)       NOT NULL CONSTRAINT DF_MovimientoCab_Fec_registro DEFAULT (SYSUTCDATETIME()),
        Id_TipoMovimiento  TINYINT            NOT NULL CONSTRAINT FK_MovimientoCab_TipoMovimiento REFERENCES dbo.TipoMovimiento (Id_TipoMovimiento),
        Id_DocumentoOrigen INT                NOT NULL,
        /* FK polimórfica verificable: (1) Entrada -> CompraCab, (2) Salida -> VentaCab */
        Id_CompraCab AS (CASE WHEN Id_TipoMovimiento = 1 THEN Id_DocumentoOrigen END) PERSISTED
            CONSTRAINT FK_MovimientoCab_CompraCab REFERENCES dbo.CompraCab (Id_CompraCab),
        Id_VentaCab  AS (CASE WHEN Id_TipoMovimiento = 2 THEN Id_DocumentoOrigen END) PERSISTED
            CONSTRAINT FK_MovimientoCab_VentaCab REFERENCES dbo.VentaCab (Id_VentaCab),
        CONSTRAINT UQ_MovimientoCab_Tipo_Documento UNIQUE (Id_TipoMovimiento, Id_DocumentoOrigen)
    );
END
GO

IF OBJECT_ID(N'dbo.MovimientoDet', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MovimientoDet
    (
        Id_MovimientoDet INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_MovimientoDet PRIMARY KEY CLUSTERED,
        Id_movimientocab INT                NOT NULL CONSTRAINT FK_MovimientoDet_MovimientoCab REFERENCES dbo.MovimientoCab (Id_MovimientoCab),
        Id_Producto      INT                NOT NULL CONSTRAINT FK_MovimientoDet_Productos REFERENCES dbo.Productos (Id_producto),
        Cantidad         INT                NOT NULL,
        CONSTRAINT CK_MovimientoDet_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT UQ_MovimientoDet_Cab_Producto UNIQUE (Id_movimientocab, Id_Producto)
    );
    /* Kardex por producto: búsqueda por producto + covering de cantidad. */
    CREATE INDEX IX_MovimientoDet_Producto ON dbo.MovimientoDet (Id_Producto, Id_movimientocab) INCLUDE (Cantidad);
END
GO

/* ---------------------------------------------------------------- Stock materializado
   Vista indexada: el motor la mantiene en cada INSERT de MovimientoDet dentro de la
   misma transacción -> siempre consistente con la tabla movimiento (requisito) y
   lectura por clave (sin recorrer todo el historial). */
IF OBJECT_ID(N'dbo.vw_StockProducto', N'V') IS NULL
BEGIN
    EXEC (N'
    CREATE VIEW dbo.vw_StockProducto
    WITH SCHEMABINDING
    AS
    SELECT d.Id_Producto,
           SUM(CAST(CASE WHEN c.Id_TipoMovimiento = 1 THEN d.Cantidad ELSE -d.Cantidad END AS BIGINT)) AS Stock, -- BIGINT: sin overflow
           COUNT_BIG(*) AS NroMovimientos
    FROM dbo.MovimientoDet AS d
    INNER JOIN dbo.MovimientoCab AS c ON c.Id_MovimientoCab = d.Id_movimientocab
    GROUP BY d.Id_Producto;');
    CREATE UNIQUE CLUSTERED INDEX UCX_vw_StockProducto ON dbo.vw_StockProducto (Id_Producto);
END
GO

/* ---------------------------------------------------------------- Tipos tabla (TVP)
   Un documento completo viaja en UN solo round-trip al SP. */
IF TYPE_ID(N'dbo.tt_LineaCompra') IS NULL
    CREATE TYPE dbo.tt_LineaCompra AS TABLE
    (
        Id_producto     INT            NOT NULL PRIMARY KEY,
        Cantidad        INT            NOT NULL CHECK (Cantidad > 0),
        Precio          DECIMAL(18, 2) NOT NULL CHECK (Precio >= 0),
        Sub_Total       DECIMAL(18, 2) NOT NULL,
        Igv             DECIMAL(18, 2) NOT NULL,
        Total           DECIMAL(18, 2) NOT NULL,
        NuevoPrecioVenta DECIMAL(18, 2) NOT NULL CHECK (NuevoPrecioVenta >= 0)
    );
GO
IF TYPE_ID(N'dbo.tt_LineaVenta') IS NULL
    CREATE TYPE dbo.tt_LineaVenta AS TABLE
    (
        Id_producto INT            NOT NULL PRIMARY KEY,
        Cantidad    INT            NOT NULL CHECK (Cantidad > 0),
        Precio      DECIMAL(18, 2) NOT NULL CHECK (Precio >= 0),
        Sub_Total   DECIMAL(18, 2) NOT NULL,
        Igv         DECIMAL(18, 2) NOT NULL,
        Total       DECIMAL(18, 2) NOT NULL
    );
GO
IF TYPE_ID(N'dbo.tt_Ids') IS NULL
    CREATE TYPE dbo.tt_Ids AS TABLE (Id INT NOT NULL PRIMARY KEY);
GO

/* ---------------------------------------------------------------- Transactional Outbox
   Eventos de dominio guardados en la misma transacción que el documento que los
   origina; un relay los publica después en el bus (NATS). Garantiza que nunca se
   publique un evento de una transacción revertida ni se pierda uno confirmado. */
IF OBJECT_ID(N'dbo.OutboxEvento', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OutboxEvento
    (
        Id             BIGINT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_OutboxEvento PRIMARY KEY CLUSTERED,
        EventoId       UNIQUEIDENTIFIER      NOT NULL CONSTRAINT DF_OutboxEvento_EventoId DEFAULT (NEWID())
                                                       CONSTRAINT UQ_OutboxEvento_EventoId UNIQUE,
        Tipo           VARCHAR(100)          NOT NULL,
        AgregadoId     INT                   NOT NULL,
        Payload        NVARCHAR(MAX)         NOT NULL CONSTRAINT CK_OutboxEvento_Payload CHECK (ISJSON(Payload) = 1),
        OcurridoEn     DATETIME2(3)          NOT NULL,
        RequestId      NVARCHAR(64)          NULL,
        PublicadoEn    DATETIME2(3)          NULL,
        Intentos       INT                   NOT NULL CONSTRAINT DF_OutboxEvento_Intentos DEFAULT (0),
        BloqueadoHasta DATETIME2(3)          NULL,
        UltimoError    NVARCHAR(400)         NULL
    );
    /* Solo los pendientes (índice filtrado pequeño => lectura del relay O(pendientes)). */
    CREATE INDEX IX_OutboxEvento_Pendientes ON dbo.OutboxEvento (Id) INCLUDE (BloqueadoHasta, Intentos)
        WHERE PublicadoEn IS NULL;
END
GO

/* ---------------------------------------------------------------- Auditoría (append-only) */
IF OBJECT_ID(N'audit.Auditoria', N'U') IS NULL
BEGIN
    CREATE TABLE audit.Auditoria
    (
        Id_Auditoria      BIGINT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Auditoria PRIMARY KEY CLUSTERED,
        Tabla             SYSNAME            NOT NULL,
        Operacion         CHAR(1)            NOT NULL CONSTRAINT CK_Auditoria_Operacion CHECK (Operacion IN ('I', 'U', 'D')),
        LlavePrimaria     NVARCHAR(100)      NOT NULL,
        ValoresAnteriores NVARCHAR(MAX)      NULL,
        ValoresNuevos     NVARCHAR(MAX)      NULL,
        Usuario           NVARCHAR(128)      NOT NULL,
        RequestId         NVARCHAR(64)       NULL,
        LoginBD           NVARCHAR(128)      NOT NULL CONSTRAINT DF_Auditoria_LoginBD DEFAULT (ORIGINAL_LOGIN()),
        Aplicacion        NVARCHAR(128)      NULL CONSTRAINT DF_Auditoria_Aplicacion DEFAULT (APP_NAME()),
        Fecha             DATETIME2(3)       NOT NULL CONSTRAINT DF_Auditoria_Fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT CK_Auditoria_JsonAnt CHECK (ValoresAnteriores IS NULL OR ISJSON(ValoresAnteriores) = 1),
        CONSTRAINT CK_Auditoria_JsonNue CHECK (ValoresNuevos IS NULL OR ISJSON(ValoresNuevos) = 1)
    );
    CREATE INDEX IX_Auditoria_Tabla_Llave ON audit.Auditoria (Tabla, LlavePrimaria, Fecha DESC);
    CREATE INDEX IX_Auditoria_Fecha ON audit.Auditoria (Fecha DESC);
END
GO
