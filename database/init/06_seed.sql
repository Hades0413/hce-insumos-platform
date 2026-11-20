/* =============================================================================
   06_seed.sql: Datos de demostración (solo si la base está vacía)

   Simula 60 días de operación de la farmacia/almacén de una clínica:
     - 32 productos (medicamentos, soluciones y material médico), 2 sin stock.
     - Compra de apertura + reposiciones semanales con variación de costos
       (el precio de venta = costo × 1.35 cambia en el kardex). Los productos de
       baja rotación no se reponen: terminan con stock bajo o agotados.
     - Ventas diarias de 1 a 4 líneas que nunca superan el stock.
   Todo pasa por los mismos procedimientos que la API (validaciones, kardex,
   auditoría). Generador pseudoaleatorio con semilla fija => datos reproducibles.

   Las fechas se distribuyen en el pasado: solo durante esta carga inicial se
   suspenden los triggers de inmutabilidad para fechar los documentos; se
   reactivan al terminar, pase lo que pase.

   Los usuarios los crea auth-service al arrancar (hash argon2id) desde .env.
   ============================================================================= */
USE HCE_Insumos;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF EXISTS (SELECT 1 FROM dbo.Productos)
BEGIN
    PRINT 'Seed omitido: ya existen productos.';
    RETURN;
END;

/* ------------------------------------------------------------------ Catálogo */
DECLARE @Catalogo TABLE
(
    N        INT IDENTITY(1, 1) PRIMARY KEY,
    Nombre   NVARCHAR(150),
    Lote     VARCHAR(50),
    Costo    DECIMAL(18, 2),
    Apertura INT,   -- unidades de la compra de apertura (0 = sin stock)
    Rotacion INT    -- 1 baja · 2 media · 3 alta (probabilidad de venta)
);
INSERT INTO @Catalogo (Nombre, Lote, Costo, Apertura, Rotacion) VALUES
    (N'Paracetamol 500 mg tab',               'PCT-2611-001',  0.15, 1200, 3),
    (N'Amoxicilina 500 mg cap',               'AMX-2611-014',  0.42,  600, 3),
    (N'Ibuprofeno 400 mg tab',                'IBU-2611-009',  0.18,  800, 3),
    (N'Omeprazol 20 mg cap',                  'OMP-2611-020',  0.22,  700, 3),
    (N'Azitromicina 500 mg tab',              'AZI-2611-031',  0.95,  200, 2),
    (N'Losartán 50 mg tab',                   'LOS-2611-044',  0.12,  900, 2),
    (N'Metformina 850 mg tab',                'MET-2611-052',  0.10,  900, 2),
    (N'Atorvastatina 20 mg tab',              'ATO-2611-063',  0.25,  500, 2),
    (N'Salbutamol 100 mcg inhalador',         'SAL-2611-070',  6.80,   40, 1),
    (N'Metamizol 1 g/2 ml amp',               'MTZ-2611-081',  0.90,  300, 3),
    (N'Ketorolaco 30 mg/ml amp',              'KET-2611-092',  0.85,  250, 2),
    (N'Dexametasona 4 mg/ml amp',             'DEX-2611-103',  0.70,  200, 2),
    (N'Tramadol 50 mg/ml amp',                'TRA-2611-114',  1.10,  150, 1),
    (N'Ceftriaxona 1 g amp',                  'CFT-2611-125',  2.50,  180, 2),
    (N'Pantoprazol 40 mg amp',                'PAN-2611-136',  3.20,  120, 2),
    (N'Enoxaparina 40 mg jeringa prellenada', 'ENO-2611-147', 12.50,   60, 1),
    (N'Insulina NPH 100 UI/ml frasco 10 ml',  'INS-2611-158', 18.90,   30, 1),
    (N'Cloruro de sodio 0.9% 1 L',            'CLS-2611-169',  3.80,  240, 3),
    (N'Dextrosa 5% 1 L',                      'DEX5-2611-170', 4.10,  120, 2),
    (N'Lactato de Ringer 1 L',                'RIN-2611-181',  4.30,  120, 2),
    (N'Jeringa descartable 5 ml',             'JRG-2611-192',  0.25, 2000, 3),
    (N'Jeringa descartable 10 ml',            'JRG10-2611-193',0.32, 1200, 2),
    (N'Catéter EV periférico N.º 20',         'CAT-2611-204',  1.80,  300, 2),
    (N'Equipo de venoclisis',                 'VEN-2611-215',  1.40,  300, 2),
    (N'Guantes de nitrilo talla M (par)',     'GNT-2611-226',  0.60, 1500, 3),
    (N'Gasa estéril 10x10 cm',                'GAS-2611-237',  0.35, 1500, 3),
    (N'Esparadrapo hipoalergénico 2.5 cm',    'ESP-2611-248',  2.20,  150, 1),
    (N'Alcohol etílico 70% 1 L',              'ALC-2611-259',  6.50,   80, 1),
    (N'Clorhexidina 2% 120 ml',               'CLX-2611-260',  4.80,   90, 1),
    (N'Mascarilla quirúrgica caja x50',       'MAS-2611-271',  9.00,   60, 1),
    (N'Vancomicina 1 g amp',                  'VAN-2611-282', 15.00,    0, 0),
    (N'Oxitocina 10 UI/ml amp',               'OXI-2611-293',  1.30,    0, 0);

DECLARE @IdProducto TABLE (N INT PRIMARY KEY, Id_producto INT);
DECLARE @Ignorar TABLE (Id_producto INT, Nombre_producto NVARCHAR(150), NroLote VARCHAR(50), Fec_registro DATETIME2(3),
                        Costo DECIMAL(18, 2), PrecioVenta DECIMAL(18, 2), Stock BIGINT, RowVersion BINARY(8));
DECLARE @i INT = 1, @n INT = (SELECT COUNT(*) FROM @Catalogo);
WHILE @i <= @n
BEGIN
    DECLARE @Nom NVARCHAR(150), @Lot VARCHAR(50), @Cos DECIMAL(18, 2), @Pre DECIMAL(18, 2);
    SELECT @Nom = Nombre, @Lot = Lote, @Cos = Costo FROM @Catalogo WHERE N = @i;
    SET @Pre = ROUND(@Cos * 1.35, 2);
    DELETE FROM @Ignorar;
    INSERT INTO @Ignorar
    EXEC dbo.usp_Producto_Insertar @Nombre = @Nom, @NroLote = @Lot, @Costo = @Cos, @PrecioVenta = @Pre,
         @UsuarioId = N'seed', @RequestId = N'seed';
    INSERT INTO @IdProducto (N, Id_producto) SELECT @i, Id_producto FROM @Ignorar;
    SET @i += 1;
END;

/* ------------------------------------------------------------------ Simulación de 60 días */
DECLARE @Hoy DATE = CAST(SYSUTCDATETIME() AS DATE);
DECLARE @Rnd BIGINT = 20261119;   -- semilla fija (LCG) => datos reproducibles
DECLARE @Dia INT, @Doc INT, @Docs INT, @Lineas INT, @k INT;
DECLARE @Fecha DATETIME2(3), @Id INT, @Res VARCHAR(30), @Key UNIQUEIDENTIFIER, @Hash BINARY(32);
DECLARE @Sub DECIMAL(18, 2), @Igv DECIMAL(18, 2), @Tot DECIMAL(18, 2);
DECLARE @Compras INT = 0, @Ventas INT = 0;

BEGIN TRY
    DISABLE TRIGGER dbo.trg_CompraCab_Inmutable ON dbo.CompraCab;
    DISABLE TRIGGER dbo.trg_VentaCab_Inmutable ON dbo.VentaCab;
    DISABLE TRIGGER dbo.trg_MovimientoCab_Inmutable ON dbo.MovimientoCab;

    SET @Dia = 60;
    WHILE @Dia >= 1
    BEGIN
        /* Productos: fecha de alta coherente con la apertura */
        IF @Dia = 60
            UPDATE dbo.Productos SET Fec_registro = DATEADD(HOUR, 8, CAST(DATEADD(DAY, -61, @Hoy) AS DATETIME2(3)));

        /* ---------------- Compras: apertura (día 60) y reposición cada 7 días */
        IF @Dia = 60 OR @Dia % 7 = 0
        BEGIN
            DECLARE @LC dbo.tt_LineaCompra;
            DELETE FROM @LC;
            INSERT INTO @LC (Id_producto, Cantidad, Precio, Sub_Total, Igv, Total, NuevoPrecioVenta)
            SELECT x.Id_producto, x.Cantidad, x.Precio, x.Cantidad * x.Precio,
                   ROUND(x.Cantidad * x.Precio * 0.18, 2),
                   x.Cantidad * x.Precio + ROUND(x.Cantidad * x.Precio * 0.18, 2),
                   ROUND(x.Precio * 1.35, 2)
            FROM (
                SELECT p.Id_producto,
                       CASE WHEN @Dia = 60 THEN c.Apertura
                            ELSE CEILING(c.Apertura * (0.15 + (ABS(CHECKSUM(@Dia * 31 + c.N)) % 25) / 100.0)) END AS Cantidad,
                       /* costo con variación de -3% a +6% respecto al costo de referencia */
                       CAST(ROUND(c.Costo * (0.97 + (ABS(CHECKSUM(@Dia * 17 + c.N)) % 10) / 100.0), 2) AS DECIMAL(18, 2)) AS Precio
                FROM @Catalogo AS c
                INNER JOIN @IdProducto AS p ON p.N = c.N
                WHERE c.Apertura > 0
                  /* Baja rotación (1) no se repone: termina con stock bajo o agotado, como en la realidad. */
                  AND (@Dia = 60 OR (c.Rotacion >= 2 AND (ABS(CHECKSUM(@Dia * 7 + c.N)) % 100) < c.Rotacion * 18))
            ) AS x
            WHERE x.Cantidad > 0;

            IF EXISTS (SELECT 1 FROM @LC)
            BEGIN
                SELECT @Sub = SUM(Sub_Total), @Igv = SUM(Igv) FROM @LC;
                SET @Tot = @Sub + @Igv;
                SET @Key = NEWID();
                SET @Hash = HASHBYTES('SHA2_256', CAST(@Key AS NVARCHAR(36)));
                EXEC dbo.usp_Compra_Registrar @Lineas = @LC, @SubTotal = @Sub, @Igv = @Igv, @Total = @Tot,
                     @IdempotencyKey = @Key, @RequestHash = @Hash, @UsuarioId = N'seed', @RequestId = N'seed',
                     @Id_CompraCab = @Id OUTPUT, @Resultado = @Res OUTPUT;
                /* Horas en UTC; Perú = UTC-5 => compras desde las 07:30 locales. */
                SET @Fecha = DATEADD(MINUTE, 12 * 60 + 30 + (@Dia % 4) * 20, CAST(DATEADD(DAY, -@Dia, @Hoy) AS DATETIME2(3)));
                UPDATE dbo.CompraCab SET FecRegistro = @Fecha WHERE Id_CompraCab = @Id;
                UPDATE dbo.MovimientoCab SET Fec_registro = @Fecha WHERE Id_TipoMovimiento = 1 AND Id_DocumentoOrigen = @Id;
                SET @Compras += 1;
            END;
        END;

        /* ---------------- Ventas del día: 2 a 7 documentos, 1 a 4 líneas cada uno */
        SET @Rnd = (@Rnd * 1103515245 + 12345) % 2147483648;
        SET @Docs = CASE WHEN @Dia = 60 THEN 0 ELSE 2 + @Rnd % 6 END;
        SET @Doc = 1;
        WHILE @Doc <= @Docs
        BEGIN
            DECLARE @LV dbo.tt_LineaVenta;
            DELETE FROM @LV;
            SET @Rnd = (@Rnd * 1103515245 + 12345) % 2147483648;
            SET @Lineas = 1 + @Rnd % 4;

            INSERT INTO @LV (Id_producto, Cantidad, Precio, Sub_Total, Igv, Total)
            SELECT TOP (@Lineas)
                   v.Id_producto, q.Cantidad, v.PrecioVenta, q.Cantidad * v.PrecioVenta,
                   ROUND(q.Cantidad * v.PrecioVenta * 0.18, 2),
                   q.Cantidad * v.PrecioVenta + ROUND(q.Cantidad * v.PrecioVenta * 0.18, 2)
            FROM dbo.vw_ProductoStock AS v
            INNER JOIN @IdProducto AS p ON p.Id_producto = v.Id_producto
            INNER JOIN @Catalogo AS c ON c.N = p.N
            CROSS APPLY (SELECT CAST(CASE
                    WHEN v.PrecioVenta >= 10 THEN 1 + ABS(CHECKSUM(@Rnd, v.Id_producto)) % 2
                    WHEN v.PrecioVenta >= 2  THEN 1 + ABS(CHECKSUM(@Rnd, v.Id_producto)) % 4
                    ELSE 2 + ABS(CHECKSUM(@Rnd, v.Id_producto)) % 20 END AS INT) AS Cantidad) AS q
            WHERE c.Rotacion > 0
              AND v.Stock >= q.Cantidad
              AND (ABS(CHECKSUM(@Rnd, @Doc, v.Id_producto)) % 100) < c.Rotacion * 25
            ORDER BY ABS(CHECKSUM(@Rnd, v.Id_producto)), v.Id_producto;

            IF EXISTS (SELECT 1 FROM @LV)
            BEGIN
                SELECT @Sub = SUM(Sub_Total), @Igv = SUM(Igv) FROM @LV;
                SET @Tot = @Sub + @Igv;
                SET @Key = NEWID();
                SET @Hash = HASHBYTES('SHA2_256', CAST(@Key AS NVARCHAR(36)));
                EXEC dbo.usp_Venta_Registrar @Lineas = @LV, @SubTotal = @Sub, @Igv = @Igv, @Total = @Tot,
                     @IdempotencyKey = @Key, @RequestHash = @Hash, @UsuarioId = N'seed', @RequestId = N'seed',
                     @Id_VentaCab = @Id OUTPUT, @Resultado = @Res OUTPUT;
                IF @Res = 'OK'
                BEGIN
                    /* Ventas en horario de atención: 09:00–17:00 hora de Perú (14:00–22:00 UTC). */
                    SET @Fecha = DATEADD(MINUTE, 14 * 60 + (@Doc - 1) * 70 + @Rnd % 50, CAST(DATEADD(DAY, -@Dia, @Hoy) AS DATETIME2(3)));
                    UPDATE dbo.VentaCab SET fecRegistro = @Fecha WHERE Id_VentaCab = @Id;
                    UPDATE dbo.MovimientoCab SET Fec_registro = @Fecha WHERE Id_TipoMovimiento = 2 AND Id_DocumentoOrigen = @Id;
                    SET @Ventas += 1;
                END;
            END;
            SET @Doc += 1;
        END;

        SET @Dia -= 1;
    END;

    ENABLE TRIGGER dbo.trg_CompraCab_Inmutable ON dbo.CompraCab;
    ENABLE TRIGGER dbo.trg_VentaCab_Inmutable ON dbo.VentaCab;
    ENABLE TRIGGER dbo.trg_MovimientoCab_Inmutable ON dbo.MovimientoCab;
END TRY
BEGIN CATCH
    /* La inmutabilidad se restablece siempre, incluso si la carga falla. */
    ENABLE TRIGGER dbo.trg_CompraCab_Inmutable ON dbo.CompraCab;
    ENABLE TRIGGER dbo.trg_VentaCab_Inmutable ON dbo.VentaCab;
    ENABLE TRIGGER dbo.trg_MovimientoCab_Inmutable ON dbo.MovimientoCab;
    THROW;
END CATCH;

PRINT CONCAT('Seed: ', @n, ' productos, ', @Compras, ' compras y ', @Ventas, ' ventas en 60 días.');
GO
