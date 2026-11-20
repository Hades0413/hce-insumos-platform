/* =============================================================================
   02_insumos_audit.sql: Triggers de auditoría e inmutabilidad
   Base: HCE_Insumos. Idempotente (CREATE OR ALTER).

   - Auditoría genérica: un generador (DRY) crea un trigger AFTER por tabla que
     registra en audit.Auditoria la fila antes y después en JSON, el usuario de
     negocio (SESSION_CONTEXT 'user_id', fijado por los SP en cada llamada; con
     pool de conexiones no se puede confiar en el login de BD) y el request-id
     para correlacionar con los logs de la API.
   - Set-based: soporta operaciones multi-fila (nunca asume 1 fila en inserted).
   - Documentos (compras, ventas) y movimientos son INMUTABLES: un kardex no se
     edita, se corrige con un nuevo documento. Se fuerza con triggers INSTEAD OF.
   ============================================================================= */
USE HCE_Insumos;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE audit.usp_GenerarTriggerAuditoria
    @Tabla       SYSNAME,
    @ColumnaPK   SYSNAME,
    @Operaciones NVARCHAR(40) = N'INSERT, UPDATE, DELETE'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF OBJECT_ID(N'dbo.' + QUOTENAME(@Tabla), N'U') IS NULL
        THROW 50000, N'La tabla indicada no existe en el esquema dbo.', 1;
    IF COL_LENGTH(N'dbo.' + QUOTENAME(@Tabla), @ColumnaPK) IS NULL
        THROW 50000, N'La columna PK indicada no existe.', 1;
    IF @Operaciones NOT IN (N'INSERT', N'INSERT, UPDATE, DELETE')
        THROW 50000, N'Operaciones no soportadas.', 1;

    DECLARE @NombreTrigger SYSNAME = N'trg_' + @Tabla + N'_Auditoria';
    DECLARE @pk NVARCHAR(260) = QUOTENAME(@ColumnaPK);
    DECLARE @sql NVARCHAR(MAX) = N'
CREATE OR ALTER TRIGGER dbo.' + QUOTENAME(@NombreTrigger) + N'
ON dbo.' + QUOTENAME(@Tabla) + N'
AFTER ' + @Operaciones + N'
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted) RETURN;

    DECLARE @Usuario   NVARCHAR(128) = COALESCE(CAST(SESSION_CONTEXT(N''user_id'') AS NVARCHAR(128)), ORIGINAL_LOGIN());
    DECLARE @RequestId NVARCHAR(64)  = CAST(SESSION_CONTEXT(N''request_id'') AS NVARCHAR(64));

    INSERT INTO audit.Auditoria (Tabla, Operacion, LlavePrimaria, ValoresAnteriores, ValoresNuevos, Usuario, RequestId)
    SELECT N''dbo.' + REPLACE(@Tabla, N'''', N'''''') + N''',
           CASE WHEN EXISTS (SELECT 1 FROM inserted i WHERE i.' + @pk + N' = k.Llave)
                 AND EXISTS (SELECT 1 FROM deleted  d WHERE d.' + @pk + N' = k.Llave) THEN ''U''
                WHEN EXISTS (SELECT 1 FROM inserted i WHERE i.' + @pk + N' = k.Llave) THEN ''I''
                ELSE ''D'' END,
           CAST(k.Llave AS NVARCHAR(100)),
           (SELECT d.* FROM deleted  d WHERE d.' + @pk + N' = k.Llave FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES),
           (SELECT i.* FROM inserted i WHERE i.' + @pk + N' = k.Llave FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES),
           @Usuario,
           @RequestId
    FROM (SELECT ' + @pk + N' AS Llave FROM inserted
          UNION
          SELECT ' + @pk + N' FROM deleted) AS k;
END;';

    EXEC sys.sp_executesql @sql;
END;
GO

CREATE OR ALTER PROCEDURE audit.usp_GenerarTriggerInmutable
    @Tabla SYSNAME
AS
BEGIN
    SET NOCOUNT ON;
    IF OBJECT_ID(N'dbo.' + QUOTENAME(@Tabla), N'U') IS NULL
        THROW 50000, N'La tabla indicada no existe en el esquema dbo.', 1;

    DECLARE @NombreTrigger SYSNAME = N'trg_' + @Tabla + N'_Inmutable';
    DECLARE @sql NVARCHAR(MAX) = N'
CREATE OR ALTER TRIGGER dbo.' + QUOTENAME(@NombreTrigger) + N'
ON dbo.' + QUOTENAME(@Tabla) + N'
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM deleted) RETURN;
    THROW 50010, N''INMUTABLE: los documentos y movimientos de kardex no se modifican ni eliminan; registre un documento de ajuste.'', 1;
END;';
    EXEC sys.sp_executesql @sql;
END;
GO

/* Tablas maestras: auditoría completa (I/U/D) */
EXEC audit.usp_GenerarTriggerAuditoria @Tabla = N'Productos', @ColumnaPK = N'Id_producto';

/* Documentos y kardex: solo INSERT (inmutables) */
EXEC audit.usp_GenerarTriggerAuditoria @Tabla = N'CompraCab',     @ColumnaPK = N'Id_CompraCab',     @Operaciones = N'INSERT';
EXEC audit.usp_GenerarTriggerAuditoria @Tabla = N'CompraDet',     @ColumnaPK = N'Id_CompraDet',     @Operaciones = N'INSERT';
EXEC audit.usp_GenerarTriggerAuditoria @Tabla = N'VentaCab',      @ColumnaPK = N'Id_VentaCab',      @Operaciones = N'INSERT';
EXEC audit.usp_GenerarTriggerAuditoria @Tabla = N'VentaDet',      @ColumnaPK = N'Id_VentaDet',      @Operaciones = N'INSERT';
EXEC audit.usp_GenerarTriggerAuditoria @Tabla = N'MovimientoCab', @ColumnaPK = N'Id_MovimientoCab', @Operaciones = N'INSERT';
EXEC audit.usp_GenerarTriggerAuditoria @Tabla = N'MovimientoDet', @ColumnaPK = N'Id_MovimientoDet', @Operaciones = N'INSERT';

EXEC audit.usp_GenerarTriggerInmutable @Tabla = N'CompraCab';
EXEC audit.usp_GenerarTriggerInmutable @Tabla = N'CompraDet';
EXEC audit.usp_GenerarTriggerInmutable @Tabla = N'VentaCab';
EXEC audit.usp_GenerarTriggerInmutable @Tabla = N'VentaDet';
EXEC audit.usp_GenerarTriggerInmutable @Tabla = N'MovimientoCab';
EXEC audit.usp_GenerarTriggerInmutable @Tabla = N'MovimientoDet';
GO

/* La auditoría también es inmutable (append-only), incluso para dbo/owner por error. */
CREATE OR ALTER TRIGGER audit.trg_Auditoria_AppendOnly
ON audit.Auditoria
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM deleted) RETURN;
    THROW 50011, N'La bitácora de auditoría es de solo inserción.', 1;
END;
GO
