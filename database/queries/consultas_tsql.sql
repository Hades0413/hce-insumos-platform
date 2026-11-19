/* =============================================================================
   consultas_tsql.sql — Consultas T-SQL de operación, reporte y auditoría
   Base: HCE_Insumos. Ejecutar como un usuario con permisos de lectura
   (p. ej. sa en desarrollo). La aplicación NO usa este archivo: consume los SP.

   Índice:
     A. CRUD de productos vía procedimientos (insertar, listar, actualizar, eliminar)
     B. Registro de compra y venta vía procedimientos (con TVP)
     C. Kardex: stock actual, movimientos con saldo, valorización
     D. Reportes de negocio
     E. Auditoría y verificación de integridad
   ============================================================================= */
USE HCE_Insumos;
GO
SET NOCOUNT ON;
GO

/* ============================================================ A. CRUD PRODUCTOS */

-- A.1 Insertar (precio de venta = costo * 1.35)
DECLARE @Costo DECIMAL(18, 2) = 1.20;
DECLARE @Precio DECIMAL(18, 2) = ROUND(@Costo * 1.35, 2);
EXEC dbo.usp_Producto_Insertar
     @Nombre = N'Diclofenaco 75 mg/3 ml amp', @NroLote = 'DCF-2026-07',
     @Costo = @Costo, @PrecioVenta = @Precio, @UsuarioId = N'dba', @RequestId = N'consulta-A1';
GO

-- A.2 Listar (búsqueda + paginación): RS1 = total, RS2 = página
EXEC dbo.usp_Producto_Listar @Search = N'diclo', @Page = 1, @PageSize = 20;
GO

-- A.3 Actualizar con concurrencia optimista (RowVersion leído previamente)
DECLARE @Id INT, @Rv BINARY(8);
SELECT @Id = Id_producto, @Rv = RowVersion FROM dbo.Productos WHERE NroLote = 'DCF-2026-07';
EXEC dbo.usp_Producto_Actualizar
     @Id_producto = @Id, @Nombre = N'Diclofenaco sódico 75 mg/3 ml amp', @NroLote = 'DCF-2026-07',
     @Costo = 1.25, @PrecioVenta = 1.69, @RowVersion = @Rv, @UsuarioId = N'dba', @RequestId = N'consulta-A3';
GO

-- A.4 Eliminar (solo si no tiene movimientos; si tiene -> error 50005)
DECLARE @IdEliminar INT = (SELECT Id_producto FROM dbo.Productos WHERE NroLote = 'DCF-2026-07');
EXEC dbo.usp_Producto_Eliminar @Id_producto = @IdEliminar, @UsuarioId = N'dba', @RequestId = N'consulta-A4';
GO

/* ============================================================ B. COMPRA Y VENTA */

-- B.1 Registrar compra (CompraCab + CompraDet + actualización de costo/precio + movimiento ENTRADA)
DECLARE @Lineas dbo.tt_LineaCompra;
INSERT INTO @Lineas (Id_producto, Cantidad, Precio, Sub_Total, Igv, Total, NuevoPrecioVenta)
SELECT p.Id_producto, x.Cantidad, x.Precio,
       x.Cantidad * x.Precio,
       ROUND(x.Cantidad * x.Precio * 0.18, 2),
       x.Cantidad * x.Precio + ROUND(x.Cantidad * x.Precio * 0.18, 2),
       ROUND(x.Precio * 1.35, 2)
FROM (VALUES ('PCT-2026-001', 200, CAST(0.16 AS DECIMAL(18, 2))),
             ('AMX-2026-014', 100, CAST(0.40 AS DECIMAL(18, 2)))) AS x (Lote, Cantidad, Precio)
INNER JOIN dbo.Productos AS p ON p.NroLote = x.Lote;

DECLARE @Sub DECIMAL(18, 2) = (SELECT SUM(Sub_Total) FROM @Lineas),
        @Igv DECIMAL(18, 2) = (SELECT SUM(Igv) FROM @Lineas);
DECLARE @Tot DECIMAL(18, 2) = @Sub + @Igv, @Key UNIQUEIDENTIFIER = NEWID(), @IdCompra INT, @Res VARCHAR(30);
EXEC dbo.usp_Compra_Registrar @Lineas = @Lineas, @SubTotal = @Sub, @Igv = @Igv, @Total = @Tot,
     @IdempotencyKey = @Key, @RequestHash = 0x00, @UsuarioId = N'dba', @RequestId = N'consulta-B1',
     @Id_CompraCab = @IdCompra OUTPUT, @Resultado = @Res OUTPUT;
SELECT @IdCompra AS Id_CompraCab, @Res AS Resultado;
EXEC dbo.usp_Compra_Obtener @Id_CompraCab = @IdCompra;
GO

-- B.2 Registrar venta (valida stock bajo lock; si falta stock devuelve STOCK_INSUFICIENTE + detalle)
DECLARE @L dbo.tt_LineaVenta;
INSERT INTO @L (Id_producto, Cantidad, Precio, Sub_Total, Igv, Total)
SELECT p.Id_producto, 10, p.PrecioVenta, 10 * p.PrecioVenta,
       ROUND(10 * p.PrecioVenta * 0.18, 2), 10 * p.PrecioVenta + ROUND(10 * p.PrecioVenta * 0.18, 2)
FROM dbo.Productos AS p WHERE p.NroLote = 'PCT-2026-001';
DECLARE @S DECIMAL(18, 2) = (SELECT SUM(Sub_Total) FROM @L), @I DECIMAL(18, 2) = (SELECT SUM(Igv) FROM @L);
DECLARE @T DECIMAL(18, 2) = @S + @I, @K UNIQUEIDENTIFIER = NEWID(), @IdVenta INT, @R VARCHAR(30);
EXEC dbo.usp_Venta_Registrar @Lineas = @L, @SubTotal = @S, @Igv = @I, @Total = @T,
     @IdempotencyKey = @K, @RequestHash = 0x00, @UsuarioId = N'dba', @RequestId = N'consulta-B2',
     @Id_VentaCab = @IdVenta OUTPUT, @Resultado = @R OUTPUT;
SELECT @IdVenta AS Id_VentaCab, @R AS Resultado;
GO

-- B.3 Listados paginados con rango de fechas (UTC)
EXEC dbo.usp_Compra_Listar @Desde = NULL, @Hasta = NULL, @Page = 1, @PageSize = 10;
EXEC dbo.usp_Venta_Listar  @Desde = '2026-01-01', @Hasta = '2026-12-31', @Page = 1, @PageSize = 10;
GO

/* ============================================================ C. KARDEX */

-- C.1 Kardex (Id_producto, nombre_producto, stock_actual, costo, precio venta) — vía SP
EXEC dbo.usp_Kardex_Listar @Search = NULL, @Page = 1, @PageSize = 50;
GO

-- C.2 Stock actual calculado DIRECTO desde la tabla movimiento (equivale a la vista indexada)
SELECT p.Id_producto,
       p.Nombre_producto,
       SUM(CASE c.Id_TipoMovimiento WHEN 1 THEN d.Cantidad ELSE 0 END) AS Entradas,
       SUM(CASE c.Id_TipoMovimiento WHEN 2 THEN d.Cantidad ELSE 0 END) AS Salidas,
       SUM(CASE c.Id_TipoMovimiento WHEN 1 THEN d.Cantidad ELSE -d.Cantidad END) AS Stock_actual
FROM dbo.Productos AS p
LEFT JOIN dbo.MovimientoDet AS d ON d.Id_Producto = p.Id_producto
LEFT JOIN dbo.MovimientoCab AS c ON c.Id_MovimientoCab = d.Id_movimientocab
GROUP BY p.Id_producto, p.Nombre_producto
ORDER BY p.Nombre_producto;
GO

-- C.3 Movimientos de un producto con saldo acumulado (vía SP y en SQL plano)
EXEC dbo.usp_Kardex_Movimientos @Id_producto = 1, @Page = 1, @PageSize = 50;

SELECT c.Fec_registro                           AS Fecha_registro,
       t.Descripcion                            AS Tipo_movimiento,
       CASE c.Id_TipoMovimiento WHEN 1 THEN 'Compra N.º ' ELSE 'Venta N.º ' END
         + CAST(c.Id_DocumentoOrigen AS VARCHAR(12)) AS Documento,
       d.Cantidad,
       SUM(CASE c.Id_TipoMovimiento WHEN 1 THEN d.Cantidad ELSE -d.Cantidad END)
           OVER (ORDER BY c.Id_MovimientoCab ROWS UNBOUNDED PRECEDING) AS Saldo
FROM dbo.MovimientoDet AS d
INNER JOIN dbo.MovimientoCab  AS c ON c.Id_MovimientoCab = d.Id_movimientocab
INNER JOIN dbo.TipoMovimiento AS t ON t.Id_TipoMovimiento = c.Id_TipoMovimiento
WHERE d.Id_Producto = 1
ORDER BY c.Id_MovimientoCab;
GO

-- C.4 Valorización del inventario (stock * costo) y margen potencial
SELECT v.Id_producto, v.Nombre_producto, v.Stock,
       v.Costo, v.PrecioVenta,
       CAST(v.Stock * v.Costo AS DECIMAL(18, 2))                   AS Valor_al_costo,
       CAST(v.Stock * (v.PrecioVenta - v.Costo) AS DECIMAL(18, 2)) AS Margen_potencial
FROM dbo.vw_ProductoStock AS v
ORDER BY Valor_al_costo DESC;
GO

-- C.5 Productos sin stock o con stock crítico (< 20 unidades)
SELECT Id_producto, Nombre_producto, NroLote, Stock
FROM dbo.vw_ProductoStock
WHERE Stock < 20
ORDER BY Stock, Nombre_producto;
GO

/* ============================================================ D. REPORTES */

-- D.1 Ventas por día (últimos 30 días) — usa IX_VentaCab_fecRegistro
SELECT CAST(v.fecRegistro AS DATE) AS Dia, COUNT(*) AS Nro_ventas,
       SUM(v.SubTotal) AS SubTotal, SUM(v.Igv) AS Igv, SUM(v.Total) AS Total
FROM dbo.VentaCab AS v
WHERE v.fecRegistro >= DATEADD(DAY, -30, SYSUTCDATETIME())
GROUP BY CAST(v.fecRegistro AS DATE)
ORDER BY Dia DESC;
GO

-- D.2 Top 10 productos más vendidos (unidades e importe)
SELECT TOP (10) p.Id_producto, p.Nombre_producto,
       SUM(d.Cantidad) AS Unidades, SUM(d.Total) AS Importe_total
FROM dbo.VentaDet AS d
INNER JOIN dbo.Productos AS p ON p.Id_producto = d.Id_producto
GROUP BY p.Id_producto, p.Nombre_producto
ORDER BY Unidades DESC;
GO

-- D.3 Compras vs ventas por mes
WITH Compras AS (SELECT FORMAT(FecRegistro, 'yyyy-MM') AS Mes, SUM(Total) AS Total FROM dbo.CompraCab GROUP BY FORMAT(FecRegistro, 'yyyy-MM')),
     Ventas  AS (SELECT FORMAT(fecRegistro, 'yyyy-MM') AS Mes, SUM(Total) AS Total FROM dbo.VentaCab  GROUP BY FORMAT(fecRegistro, 'yyyy-MM'))
SELECT COALESCE(c.Mes, v.Mes) AS Mes, ISNULL(c.Total, 0) AS Total_compras, ISNULL(v.Total, 0) AS Total_ventas
FROM Compras AS c
FULL OUTER JOIN Ventas AS v ON v.Mes = c.Mes
ORDER BY Mes DESC;
GO

/* ============================================================ E. AUDITORÍA E INTEGRIDAD */

-- E.1 Historial de cambios de un producto (antes/después en JSON)
SELECT a.Fecha, a.Operacion, a.Usuario, a.RequestId,
       JSON_VALUE(a.ValoresAnteriores, '$.PrecioVenta') AS Precio_antes,
       JSON_VALUE(a.ValoresNuevos,     '$.PrecioVenta') AS Precio_despues
FROM audit.Auditoria AS a
WHERE a.Tabla = N'dbo.Productos' AND a.LlavePrimaria = N'1'
ORDER BY a.Fecha DESC;
GO

-- E.2 Actividad por usuario de negocio (últimas 24 h)
SELECT a.Usuario, a.Tabla, a.Operacion, COUNT(*) AS Eventos
FROM audit.Auditoria AS a
WHERE a.Fecha >= DATEADD(HOUR, -24, SYSUTCDATETIME())
GROUP BY a.Usuario, a.Tabla, a.Operacion
ORDER BY Eventos DESC;
GO

-- E.3 Integridad: cada compra/venta tiene exactamente un movimiento y cantidades iguales
SELECT 'COMPRA' AS Tipo, c.Id_CompraCab AS Documento
FROM dbo.CompraCab AS c
LEFT JOIN dbo.MovimientoCab AS m ON m.Id_TipoMovimiento = 1 AND m.Id_DocumentoOrigen = c.Id_CompraCab
WHERE m.Id_MovimientoCab IS NULL
UNION ALL
SELECT 'VENTA', v.Id_VentaCab
FROM dbo.VentaCab AS v
LEFT JOIN dbo.MovimientoCab AS m ON m.Id_TipoMovimiento = 2 AND m.Id_DocumentoOrigen = v.Id_VentaCab
WHERE m.Id_MovimientoCab IS NULL;   -- debe devolver 0 filas
GO

-- E.4 Integridad: cabecera = suma del detalle
SELECT c.Id_CompraCab, c.Total, SUM(d.Total) AS Total_detalle
FROM dbo.CompraCab AS c INNER JOIN dbo.CompraDet AS d ON d.Id_CompraCab = c.Id_CompraCab
GROUP BY c.Id_CompraCab, c.Total
HAVING c.Total <> SUM(d.Total);     -- debe devolver 0 filas
GO

-- E.5 Integridad: ningún producto con stock negativo
SELECT * FROM dbo.vw_StockProducto WITH (NOEXPAND) WHERE Stock < 0;   -- debe devolver 0 filas
GO

-- E.6 Verificación de inmutabilidad: intentar modificar un movimiento falla con 50010
BEGIN TRY
    UPDATE dbo.MovimientoDet SET Cantidad = Cantidad + 1 WHERE Id_MovimientoDet = 1;
END TRY
BEGIN CATCH
    SELECT ERROR_NUMBER() AS Numero, ERROR_MESSAGE() AS Mensaje;
END CATCH;
GO
