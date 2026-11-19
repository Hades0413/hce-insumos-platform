/* =============================================================================
   06_seed.sql — Datos de demostración (solo si la base está vacía)
   Usa los MISMOS procedimientos que la API -> kardex y auditoría consistentes.
   Los usuarios de la aplicación los crea auth-service al arrancar (necesita
   calcular el hash scrypt), a partir de variables SEED_* del .env.
   ============================================================================= */
USE HCE_Insumos;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Productos)
BEGIN
    DECLARE @Productos TABLE (Nombre NVARCHAR(150), Lote VARCHAR(50), Costo DECIMAL(18, 2), Cantidad INT);
    INSERT INTO @Productos (Nombre, Lote, Costo, Cantidad) VALUES
        (N'Paracetamol 500 mg tab',         'PCT-2026-001', 0.15, 500),
        (N'Amoxicilina 500 mg cap',         'AMX-2026-014', 0.42, 300),
        (N'Cloruro de sodio 0.9% 1L',       'CLS-2026-102', 3.80, 120),
        (N'Jeringa descartable 5 ml',       'JRG-2026-330', 0.25, 1000),
        (N'Guantes de nitrilo talla M (par)','GNT-2026-077', 0.60, 400),
        (N'Omeprazol 20 mg cap',            'OMP-2026-020', 0.22, 250),
        (N'Gasa estéril 10x10 cm',          'GAS-2026-045', 0.35, 600),
        (N'Ibuprofeno 400 mg tab',          'IBU-2026-009', 0.18, 0);

    DECLARE @Nombre NVARCHAR(150), @Lote VARCHAR(50), @Costo DECIMAL(18, 2);
    DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT Nombre, Lote, Costo FROM @Productos;
    OPEN c;
    FETCH NEXT FROM c INTO @Nombre, @Lote, @Costo;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @Precio DECIMAL(18, 2) = ROUND(@Costo * 1.35, 2);
        EXEC dbo.usp_Producto_Insertar @Nombre = @Nombre, @NroLote = @Lote, @Costo = @Costo,
             @PrecioVenta = @Precio, @UsuarioId = N'seed', @RequestId = N'seed';
        FETCH NEXT FROM c INTO @Nombre, @Lote, @Costo;
    END;
    CLOSE c;
    DEALLOCATE c;

    /* Compra inicial (stock de apertura) */
    DECLARE @Lineas dbo.tt_LineaCompra;
    INSERT INTO @Lineas (Id_producto, Cantidad, Precio, Sub_Total, Igv, Total, NuevoPrecioVenta)
    SELECT p.Id_producto, s.Cantidad, s.Costo,
           s.Cantidad * s.Costo,
           ROUND(s.Cantidad * s.Costo * 0.18, 2),
           s.Cantidad * s.Costo + ROUND(s.Cantidad * s.Costo * 0.18, 2),
           ROUND(s.Costo * 1.35, 2)
    FROM @Productos AS s
    INNER JOIN dbo.Productos AS p ON p.Nombre_producto = s.Nombre AND p.NroLote = s.Lote
    WHERE s.Cantidad > 0;

    DECLARE @SubTotal DECIMAL(18, 2) = (SELECT SUM(Sub_Total) FROM @Lineas);
    DECLARE @Igv      DECIMAL(18, 2) = (SELECT SUM(Igv) FROM @Lineas);
    DECLARE @Total    DECIMAL(18, 2) = @SubTotal + @Igv;
    DECLARE @Key UNIQUEIDENTIFIER = NEWID();
    DECLARE @Hash BINARY(32) = HASHBYTES('SHA2_256', CAST(@Key AS NVARCHAR(36)));
    DECLARE @IdCompra INT, @Resultado VARCHAR(30);

    EXEC dbo.usp_Compra_Registrar @Lineas = @Lineas, @SubTotal = @SubTotal, @Igv = @Igv, @Total = @Total,
         @IdempotencyKey = @Key, @RequestHash = @Hash, @UsuarioId = N'seed', @RequestId = N'seed',
         @Id_CompraCab = @IdCompra OUTPUT, @Resultado = @Resultado OUTPUT;

    PRINT CONCAT('Seed: compra inicial #', @IdCompra, ' -> ', @Resultado);
END
ELSE
    PRINT 'Seed omitido: ya existen productos.';
GO
