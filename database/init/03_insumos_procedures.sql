/* =============================================================================
   03_insumos_procedures.sql — Procedimientos almacenados (API de datos)
   Base: HCE_Insumos. Idempotente (CREATE OR ALTER).

   Convenciones:
   - SET XACT_ABORT ON: cualquier error aborta y revierte la transacción completa.
   - Cada SP de escritura fija SESSION_CONTEXT (user_id, request_id) para que los
     triggers de auditoría registren al usuario de negocio real.
   - Errores de negocio con THROW 50xxx (el adaptador los traduce a HTTP):
       50002 NOT_FOUND            50003 CONCURRENCY_CONFLICT   50004 DUPLICATE
       50005 HAS_MOVEMENTS        50006 INVALID_DOCUMENT        50010 INMUTABLE
   - Resultados "esperables" (stock insuficiente, precio cambiado, idempotencia)
     se devuelven en @Resultado + un result set, NO como excepción: el cliente
     necesita el detalle por línea.
   - Listados paginados: result set 1 = total, result set 2 = página.
     OPTION (RECOMPILE) en búsquedas "catch-all" evita planes malos por sniffing.
   ============================================================================= */
USE HCE_Insumos;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ======================================================================= Utilitarios */
CREATE OR ALTER PROCEDURE dbo.usp_Contexto_Fijar
    @UsuarioId NVARCHAR(64),
    @RequestId NVARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC sys.sp_set_session_context @key = N'user_id',    @value = @UsuarioId;
    EXEC sys.sp_set_session_context @key = N'request_id', @value = @RequestId;
END;
GO

/* Patrón LIKE seguro: escapa comodines del usuario ([ % _). NULL = sin filtro. */
CREATE OR ALTER FUNCTION dbo.fn_PatronBusqueda (@Texto NVARCHAR(100))
RETURNS NVARCHAR(320)
WITH SCHEMABINDING
AS
BEGIN
    DECLARE @t NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Texto)), N'');
    IF @t IS NULL RETURN NULL;
    RETURN N'%' + REPLACE(REPLACE(REPLACE(@t, N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]') + N'%';
END;
GO

/* Vista de lectura: producto + stock (lectura O(1) por la vista indexada). */
CREATE OR ALTER VIEW dbo.vw_ProductoStock
AS
SELECT p.Id_producto,
       p.Nombre_producto,
       p.NroLote,
       p.Fec_registro,
       p.Costo,
       p.PrecioVenta,
       CAST(ISNULL(s.Stock, 0) AS INT) AS Stock,
       p.RowVersion
FROM dbo.Productos AS p
LEFT JOIN dbo.vw_StockProducto AS s WITH (NOEXPAND) ON s.Id_Producto = p.Id_producto;
GO

/* ======================================================================= PRODUCTOS */
CREATE OR ALTER PROCEDURE dbo.usp_Producto_Insertar
    @Nombre      NVARCHAR(150),
    @NroLote     VARCHAR(50),
    @Costo       DECIMAL(18, 2),
    @PrecioVenta DECIMAL(18, 2),
    @UsuarioId   NVARCHAR(64),
    @RequestId   NVARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    EXEC dbo.usp_Contexto_Fijar @UsuarioId, @RequestId;

    SET @Nombre  = LTRIM(RTRIM(@Nombre));
    SET @NroLote = LTRIM(RTRIM(@NroLote));

    IF EXISTS (SELECT 1 FROM dbo.Productos WHERE Nombre_producto = @Nombre AND NroLote = @NroLote)
        THROW 50004, N'Ya existe un producto con el mismo nombre y número de lote.', 1;

    DECLARE @Id INT;
    INSERT INTO dbo.Productos (Nombre_producto, NroLote, Costo, PrecioVenta, Id_Usuario)
    VALUES (@Nombre, @NroLote, @Costo, @PrecioVenta, @UsuarioId);
    SET @Id = CAST(SCOPE_IDENTITY() AS INT);

    SELECT * FROM dbo.vw_ProductoStock WHERE Id_producto = @Id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Producto_Actualizar
    @Id_producto INT,
    @Nombre      NVARCHAR(150),
    @NroLote     VARCHAR(50),
    @Costo       DECIMAL(18, 2),
    @PrecioVenta DECIMAL(18, 2),
    @RowVersion  BINARY(8),
    @UsuarioId   NVARCHAR(64),
    @RequestId   NVARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    EXEC dbo.usp_Contexto_Fijar @UsuarioId, @RequestId;

    SET @Nombre  = LTRIM(RTRIM(@Nombre));
    SET @NroLote = LTRIM(RTRIM(@NroLote));

    IF EXISTS (SELECT 1 FROM dbo.Productos
               WHERE Nombre_producto = @Nombre AND NroLote = @NroLote AND Id_producto <> @Id_producto)
        THROW 50004, N'Ya existe otro producto con el mismo nombre y número de lote.', 1;

    /* Concurrencia optimista: solo actualiza si nadie modificó la fila (RowVersion). */
    UPDATE dbo.Productos
       SET Nombre_producto  = @Nombre,
           NroLote          = @NroLote,
           Costo            = @Costo,
           PrecioVenta      = @PrecioVenta,
           Fec_modificacion = SYSUTCDATETIME()
     WHERE Id_producto = @Id_producto
       AND RowVersion  = @RowVersion;

    IF @@ROWCOUNT = 0
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Id_producto = @Id_producto)
            THROW 50002, N'El producto no existe.', 1;
        THROW 50003, N'El producto fue modificado por otro usuario. Recargue e intente nuevamente.', 1;
    END;

    SELECT * FROM dbo.vw_ProductoStock WHERE Id_producto = @Id_producto;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Producto_Eliminar
    @Id_producto INT,
    @UsuarioId   NVARCHAR(64),
    @RequestId   NVARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    EXEC dbo.usp_Contexto_Fijar @UsuarioId, @RequestId;

    BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM dbo.Productos WITH (UPDLOCK, HOLDLOCK) WHERE Id_producto = @Id_producto)
            THROW 50002, N'El producto no existe.', 1;

        IF EXISTS (SELECT 1 FROM dbo.MovimientoDet WHERE Id_Producto = @Id_producto)
           OR EXISTS (SELECT 1 FROM dbo.CompraDet WHERE Id_producto = @Id_producto)
           OR EXISTS (SELECT 1 FROM dbo.VentaDet  WHERE Id_producto = @Id_producto)
            THROW 50005, N'No se puede eliminar: el producto tiene movimientos en el kardex.', 1;

        DELETE FROM dbo.Productos WHERE Id_producto = @Id_producto;
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Producto_ObtenerPorId
    @Id_producto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.vw_ProductoStock WHERE Id_producto = @Id_producto;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Producto_ObtenerPorIds
    @Ids dbo.tt_Ids READONLY
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v.* FROM dbo.vw_ProductoStock AS v
    INNER JOIN @Ids AS i ON i.Id = v.Id_producto;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Producto_Listar
    @Search   NVARCHAR(100) = NULL,
    @Page     INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page     = CASE WHEN @Page IS NULL OR @Page < 1 THEN 1 ELSE @Page END;
    SET @PageSize = CASE WHEN @PageSize IS NULL OR @PageSize < 1 THEN 20 WHEN @PageSize > 100 THEN 100 ELSE @PageSize END;
    DECLARE @Patron NVARCHAR(320) = dbo.fn_PatronBusqueda(@Search);

    SELECT COUNT_BIG(*) AS Total
    FROM dbo.Productos
    WHERE @Patron IS NULL OR Nombre_producto LIKE @Patron OR NroLote LIKE @Patron
    OPTION (RECOMPILE);

    SELECT v.*
    FROM dbo.vw_ProductoStock AS v
    WHERE @Patron IS NULL OR v.Nombre_producto LIKE @Patron OR v.NroLote LIKE @Patron
    ORDER BY v.Nombre_producto, v.Id_producto
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY
    OPTION (RECOMPILE);
END;
GO

/* ======================================================================= COMPRAS */
CREATE OR ALTER PROCEDURE dbo.usp_Compra_Registrar
    @Lineas         dbo.tt_LineaCompra READONLY,
    @SubTotal       DECIMAL(18, 2),
    @Igv            DECIMAL(18, 2),
    @Total          DECIMAL(18, 2),
    @IdempotencyKey UNIQUEIDENTIFIER,
    @RequestHash    BINARY(32),
    @UsuarioId      NVARCHAR(64),
    @RequestId      NVARCHAR(64) = NULL,
    @Id_CompraCab   INT          OUTPUT,
    @Resultado      VARCHAR(30)  OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    EXEC dbo.usp_Contexto_Fijar @UsuarioId, @RequestId;
    SET @Resultado = 'OK';
    SET @Id_CompraCab = NULL;

    /* 1. Consistencia del documento (defensa en profundidad: el dominio ya lo calculó). */
    IF NOT EXISTS (SELECT 1 FROM @Lineas)
        THROW 50006, N'La compra debe tener al menos un producto.', 1;
    IF EXISTS (SELECT 1 FROM @Lineas WHERE Sub_Total <> Cantidad * Precio OR Total <> Sub_Total + Igv)
       OR @SubTotal <> (SELECT SUM(Sub_Total) FROM @Lineas)
       OR @Igv      <> (SELECT SUM(Igv)       FROM @Lineas)
       OR @Total    <> @SubTotal + @Igv
        THROW 50006, N'Los importes del documento son inconsistentes.', 1;

    /* 2. Idempotencia: un reintento devuelve el documento ya registrado. */
    DECLARE @HashPrevio BINARY(32);
    SELECT @Id_CompraCab = Id_CompraCab, @HashPrevio = RequestHash
    FROM dbo.CompraCab WHERE IdempotencyKey = @IdempotencyKey;
    IF @Id_CompraCab IS NOT NULL
    BEGIN
        SET @Resultado = CASE WHEN @HashPrevio = @RequestHash THEN 'IDEMPOTENTE' ELSE 'IDEMPOTENCY_CONFLICT' END;
        RETURN;
    END;

    BEGIN TRANSACTION;
        /* 3. Bloqueo de productos (orden por PK) — serializa cambios de costo/precio. */
        DECLARE @Encontrados INT;
        SELECT @Encontrados = COUNT(*)
        FROM dbo.Productos AS p WITH (UPDLOCK, HOLDLOCK, ROWLOCK)
        INNER JOIN @Lineas AS l ON l.Id_producto = p.Id_producto;
        IF @Encontrados <> (SELECT COUNT(*) FROM @Lineas)
            THROW 50002, N'Uno o más productos de la compra no existen.', 1;

        /* 4. Cabecera + detalle */
        INSERT INTO dbo.CompraCab (SubTotal, Igv, Total, Id_Usuario, IdempotencyKey, RequestHash)
        VALUES (@SubTotal, @Igv, @Total, @UsuarioId, @IdempotencyKey, @RequestHash);
        SET @Id_CompraCab = CAST(SCOPE_IDENTITY() AS INT);

        INSERT INTO dbo.CompraDet (Id_CompraCab, Id_producto, Cantidad, Precio, Sub_Total, Igv, Total)
        SELECT @Id_CompraCab, Id_producto, Cantidad, Precio, Sub_Total, Igv, Total
        FROM @Lineas;

        /* 5. Actualiza costo y precio de venta (costo * 1.35 calculado en el dominio). */
        UPDATE p
           SET p.Costo            = l.Precio,
               p.PrecioVenta      = l.NuevoPrecioVenta,
               p.Fec_modificacion = SYSUTCDATETIME()
        FROM dbo.Productos AS p
        INNER JOIN @Lineas AS l ON l.Id_producto = p.Id_producto;

        /* 6. Kardex: movimiento de ENTRADA (1) con documento origen = compra. */
        DECLARE @Id_MovimientoCab INT;
        INSERT INTO dbo.MovimientoCab (Id_TipoMovimiento, Id_DocumentoOrigen) VALUES (1, @Id_CompraCab);
        SET @Id_MovimientoCab = CAST(SCOPE_IDENTITY() AS INT);

        INSERT INTO dbo.MovimientoDet (Id_movimientocab, Id_Producto, Cantidad)
        SELECT @Id_MovimientoCab, Id_producto, Cantidad FROM @Lineas;
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Compra_Listar
    @Desde    DATE = NULL,
    @Hasta    DATE = NULL,
    @Page     INT  = 1,
    @PageSize INT  = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page     = CASE WHEN @Page IS NULL OR @Page < 1 THEN 1 ELSE @Page END;
    SET @PageSize = CASE WHEN @PageSize IS NULL OR @PageSize < 1 THEN 20 WHEN @PageSize > 100 THEN 100 ELSE @PageSize END;
    DECLARE @Ini DATETIME2(3) = CAST(@Desde AS DATETIME2(3));
    DECLARE @Fin DATETIME2(3) = DATEADD(DAY, 1, CAST(@Hasta AS DATETIME2(3)));

    SELECT COUNT_BIG(*) AS Total
    FROM dbo.CompraCab
    WHERE (@Ini IS NULL OR FecRegistro >= @Ini) AND (@Fin IS NULL OR FecRegistro < @Fin)
    OPTION (RECOMPILE);

    SELECT c.Id_CompraCab AS Id, c.FecRegistro, c.SubTotal, c.Igv, c.Total,
           (SELECT COUNT(*) FROM dbo.CompraDet AS d WHERE d.Id_CompraCab = c.Id_CompraCab) AS CantidadItems
    FROM dbo.CompraCab AS c
    WHERE (@Ini IS NULL OR c.FecRegistro >= @Ini) AND (@Fin IS NULL OR c.FecRegistro < @Fin)
    ORDER BY c.FecRegistro DESC, c.Id_CompraCab DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY
    OPTION (RECOMPILE);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Compra_Obtener
    @Id_CompraCab INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id_CompraCab AS Id, c.FecRegistro, c.SubTotal, c.Igv, c.Total,
           (SELECT COUNT(*) FROM dbo.CompraDet AS d WHERE d.Id_CompraCab = c.Id_CompraCab) AS CantidadItems
    FROM dbo.CompraCab AS c
    WHERE c.Id_CompraCab = @Id_CompraCab;

    SELECT d.Id_CompraDet AS Id, d.Id_producto, p.Nombre_producto, p.NroLote,
           d.Cantidad, d.Precio, d.Sub_Total, d.Igv, d.Total
    FROM dbo.CompraDet AS d
    INNER JOIN dbo.Productos AS p ON p.Id_producto = d.Id_producto
    WHERE d.Id_CompraCab = @Id_CompraCab
    ORDER BY d.Id_CompraDet;
END;
GO

/* ======================================================================= VENTAS */
CREATE OR ALTER PROCEDURE dbo.usp_Venta_Registrar
    @Lineas         dbo.tt_LineaVenta READONLY,
    @SubTotal       DECIMAL(18, 2),
    @Igv            DECIMAL(18, 2),
    @Total          DECIMAL(18, 2),
    @IdempotencyKey UNIQUEIDENTIFIER,
    @RequestHash    BINARY(32),
    @UsuarioId      NVARCHAR(64),
    @RequestId      NVARCHAR(64) = NULL,
    @Id_VentaCab    INT         OUTPUT,
    @Resultado      VARCHAR(30) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    EXEC dbo.usp_Contexto_Fijar @UsuarioId, @RequestId;
    SET @Resultado = 'OK';
    SET @Id_VentaCab = NULL;

    IF NOT EXISTS (SELECT 1 FROM @Lineas)
        THROW 50006, N'La venta debe tener al menos un producto.', 1;
    IF EXISTS (SELECT 1 FROM @Lineas WHERE Sub_Total <> Cantidad * Precio OR Total <> Sub_Total + Igv)
       OR @SubTotal <> (SELECT SUM(Sub_Total) FROM @Lineas)
       OR @Igv      <> (SELECT SUM(Igv)       FROM @Lineas)
       OR @Total    <> @SubTotal + @Igv
        THROW 50006, N'Los importes del documento son inconsistentes.', 1;

    DECLARE @HashPrevio BINARY(32);
    SELECT @Id_VentaCab = Id_VentaCab, @HashPrevio = RequestHash
    FROM dbo.VentaCab WHERE IdempotencyKey = @IdempotencyKey;
    IF @Id_VentaCab IS NOT NULL
    BEGIN
        SET @Resultado = CASE WHEN @HashPrevio = @RequestHash THEN 'IDEMPOTENTE' ELSE 'IDEMPOTENCY_CONFLICT' END;
        RETURN;
    END;

    DECLARE @Bloqueados TABLE (Id_producto INT PRIMARY KEY, PrecioVenta DECIMAL(18, 2) NOT NULL);
    DECLARE @Conflictos TABLE (Id_producto INT PRIMARY KEY, StockDisponible INT NOT NULL,
                               CantidadSolicitada INT NOT NULL, PrecioActual DECIMAL(18, 2) NOT NULL);

    BEGIN TRANSACTION;
        /* 1. Lock pesimista de los productos vendidos: dos ventas concurrentes del
              mismo producto se serializan aquí -> imposible sobrevender. */
        INSERT INTO @Bloqueados (Id_producto, PrecioVenta)
        SELECT p.Id_producto, p.PrecioVenta
        FROM dbo.Productos AS p WITH (UPDLOCK, HOLDLOCK, ROWLOCK)
        INNER JOIN @Lineas AS l ON l.Id_producto = p.Id_producto;

        IF (SELECT COUNT(*) FROM @Bloqueados) <> (SELECT COUNT(*) FROM @Lineas)
            THROW 50002, N'Uno o más productos de la venta no existen.', 1;

        /* 2. El precio lo fija el servidor; si cambió entre lectura y escritura -> conflicto. */
        INSERT INTO @Conflictos (Id_producto, StockDisponible, CantidadSolicitada, PrecioActual)
        SELECT l.Id_producto, ISNULL(s.Stock, 0), l.Cantidad, b.PrecioVenta
        FROM @Lineas AS l
        INNER JOIN @Bloqueados AS b ON b.Id_producto = l.Id_producto
        LEFT JOIN dbo.vw_StockProducto AS s WITH (NOEXPAND, READCOMMITTEDLOCK) ON s.Id_Producto = l.Id_producto
        WHERE b.PrecioVenta <> l.Precio;

        IF EXISTS (SELECT 1 FROM @Conflictos)
        BEGIN
            ROLLBACK TRANSACTION;
            SET @Resultado = 'PRECIO_CAMBIADO';
            SELECT Id_producto, StockDisponible, CantidadSolicitada, PrecioActual FROM @Conflictos;
            RETURN;
        END;

        /* 3. Stock basado en la tabla movimiento, leído bajo lock (no versión RCSI). */
        INSERT INTO @Conflictos (Id_producto, StockDisponible, CantidadSolicitada, PrecioActual)
        SELECT l.Id_producto, ISNULL(s.Stock, 0), l.Cantidad, b.PrecioVenta
        FROM @Lineas AS l
        INNER JOIN @Bloqueados AS b ON b.Id_producto = l.Id_producto
        LEFT JOIN dbo.vw_StockProducto AS s WITH (NOEXPAND, READCOMMITTEDLOCK) ON s.Id_Producto = l.Id_producto
        WHERE ISNULL(s.Stock, 0) < l.Cantidad;

        IF EXISTS (SELECT 1 FROM @Conflictos)
        BEGIN
            ROLLBACK TRANSACTION;
            SET @Resultado = 'STOCK_INSUFICIENTE';
            SELECT Id_producto, StockDisponible, CantidadSolicitada, PrecioActual FROM @Conflictos;
            RETURN;
        END;

        /* 4. Documento */
        INSERT INTO dbo.VentaCab (SubTotal, Igv, Total, Id_Usuario, IdempotencyKey, RequestHash)
        VALUES (@SubTotal, @Igv, @Total, @UsuarioId, @IdempotencyKey, @RequestHash);
        SET @Id_VentaCab = CAST(SCOPE_IDENTITY() AS INT);

        INSERT INTO dbo.VentaDet (Id_VentaCab, Id_producto, Cantidad, Precio, Sub_Total, Igv, Total)
        SELECT @Id_VentaCab, Id_producto, Cantidad, Precio, Sub_Total, Igv, Total
        FROM @Lineas;

        /* 5. Kardex: movimiento de SALIDA (2) con documento origen = venta. */
        DECLARE @Id_MovimientoCab INT;
        INSERT INTO dbo.MovimientoCab (Id_TipoMovimiento, Id_DocumentoOrigen) VALUES (2, @Id_VentaCab);
        SET @Id_MovimientoCab = CAST(SCOPE_IDENTITY() AS INT);

        INSERT INTO dbo.MovimientoDet (Id_movimientocab, Id_Producto, Cantidad)
        SELECT @Id_MovimientoCab, Id_producto, Cantidad FROM @Lineas;
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Venta_Listar
    @Desde    DATE = NULL,
    @Hasta    DATE = NULL,
    @Page     INT  = 1,
    @PageSize INT  = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page     = CASE WHEN @Page IS NULL OR @Page < 1 THEN 1 ELSE @Page END;
    SET @PageSize = CASE WHEN @PageSize IS NULL OR @PageSize < 1 THEN 20 WHEN @PageSize > 100 THEN 100 ELSE @PageSize END;
    DECLARE @Ini DATETIME2(3) = CAST(@Desde AS DATETIME2(3));
    DECLARE @Fin DATETIME2(3) = DATEADD(DAY, 1, CAST(@Hasta AS DATETIME2(3)));

    SELECT COUNT_BIG(*) AS Total
    FROM dbo.VentaCab
    WHERE (@Ini IS NULL OR fecRegistro >= @Ini) AND (@Fin IS NULL OR fecRegistro < @Fin)
    OPTION (RECOMPILE);

    SELECT v.Id_VentaCab AS Id, v.fecRegistro AS FecRegistro, v.SubTotal, v.Igv, v.Total,
           (SELECT COUNT(*) FROM dbo.VentaDet AS d WHERE d.Id_VentaCab = v.Id_VentaCab) AS CantidadItems
    FROM dbo.VentaCab AS v
    WHERE (@Ini IS NULL OR v.fecRegistro >= @Ini) AND (@Fin IS NULL OR v.fecRegistro < @Fin)
    ORDER BY v.fecRegistro DESC, v.Id_VentaCab DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY
    OPTION (RECOMPILE);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Venta_Obtener
    @Id_VentaCab INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v.Id_VentaCab AS Id, v.fecRegistro AS FecRegistro, v.SubTotal, v.Igv, v.Total,
           (SELECT COUNT(*) FROM dbo.VentaDet AS d WHERE d.Id_VentaCab = v.Id_VentaCab) AS CantidadItems
    FROM dbo.VentaCab AS v
    WHERE v.Id_VentaCab = @Id_VentaCab;

    SELECT d.Id_VentaDet AS Id, d.Id_producto, p.Nombre_producto, p.NroLote,
           d.Cantidad, d.Precio, d.Sub_Total, d.Igv, d.Total
    FROM dbo.VentaDet AS d
    INNER JOIN dbo.Productos AS p ON p.Id_producto = d.Id_producto
    WHERE d.Id_VentaCab = @Id_VentaCab
    ORDER BY d.Id_VentaDet;
END;
GO

/* ======================================================================= KARDEX */
CREATE OR ALTER PROCEDURE dbo.usp_Kardex_Listar
    @Search   NVARCHAR(100) = NULL,
    @Page     INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page     = CASE WHEN @Page IS NULL OR @Page < 1 THEN 1 ELSE @Page END;
    SET @PageSize = CASE WHEN @PageSize IS NULL OR @PageSize < 1 THEN 20 WHEN @PageSize > 100 THEN 100 ELSE @PageSize END;
    DECLARE @Patron NVARCHAR(320) = dbo.fn_PatronBusqueda(@Search);

    SELECT COUNT_BIG(*) AS Total
    FROM dbo.Productos
    WHERE @Patron IS NULL OR Nombre_producto LIKE @Patron OR NroLote LIKE @Patron
    OPTION (RECOMPILE);

    SELECT v.Id_producto, v.Nombre_producto, v.NroLote, v.Stock AS Stock_actual, v.Costo, v.PrecioVenta
    FROM dbo.vw_ProductoStock AS v
    WHERE @Patron IS NULL OR v.Nombre_producto LIKE @Patron OR v.NroLote LIKE @Patron
    ORDER BY v.Nombre_producto, v.Id_producto
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY
    OPTION (RECOMPILE);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Kardex_Movimientos
    @Id_producto INT,
    @Page        INT = 1,
    @PageSize    INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page     = CASE WHEN @Page IS NULL OR @Page < 1 THEN 1 ELSE @Page END;
    SET @PageSize = CASE WHEN @PageSize IS NULL OR @PageSize < 1 THEN 20 WHEN @PageSize > 100 THEN 100 ELSE @PageSize END;

    /* RS1: producto (vacío -> 404 en el adaptador) */
    SELECT v.Id_producto, v.Nombre_producto, v.NroLote, v.Stock AS Stock_actual, v.Costo, v.PrecioVenta
    FROM dbo.vw_ProductoStock AS v
    WHERE v.Id_producto = @Id_producto;

    /* RS2: total */
    SELECT COUNT_BIG(*) AS Total FROM dbo.MovimientoDet WHERE Id_Producto = @Id_producto;

    /* RS3: movimientos con saldo acumulado (más recientes primero). */
    WITH Mov AS
    (
        SELECT c.Id_MovimientoCab,
               c.Fec_registro,
               c.Id_TipoMovimiento,
               t.Descripcion AS TipoMovimiento,
               c.Id_DocumentoOrigen,
               d.Cantidad,
               SUM(CASE WHEN c.Id_TipoMovimiento = 1 THEN d.Cantidad ELSE -d.Cantidad END)
                   OVER (ORDER BY c.Id_MovimientoCab ROWS UNBOUNDED PRECEDING) AS Saldo
        FROM dbo.MovimientoDet AS d
        INNER JOIN dbo.MovimientoCab  AS c ON c.Id_MovimientoCab = d.Id_movimientocab
        INNER JOIN dbo.TipoMovimiento AS t ON t.Id_TipoMovimiento = c.Id_TipoMovimiento
        WHERE d.Id_Producto = @Id_producto
    )
    SELECT Id_MovimientoCab, Fec_registro, Id_TipoMovimiento, TipoMovimiento, Id_DocumentoOrigen, Cantidad, Saldo
    FROM Mov
    ORDER BY Id_MovimientoCab DESC
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;
END;
GO
