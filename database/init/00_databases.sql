/* =============================================================================
   00_databases.sql: Bases de datos (una por microservicio: "database per service")
   Idempotente: se puede ejecutar N veces.
   Variables sqlcmd: ninguna.
   ============================================================================= */
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF DB_ID(N'HCE_Insumos') IS NULL
BEGIN
    CREATE DATABASE HCE_Insumos;
    PRINT 'Base HCE_Insumos creada.';
END
GO

IF DB_ID(N'HCE_Auth') IS NULL
BEGIN
    CREATE DATABASE HCE_Auth;
    PRINT 'Base HCE_Auth creada.';
END
GO

/* READ_COMMITTED_SNAPSHOT: los lectores no bloquean a los escritores ni viceversa
   (versionado de filas en tempdb). Elimina el cuello de botella clásico de
   "listar kardex mientras se registran ventas". */
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'HCE_Insumos' AND is_read_committed_snapshot_on = 0)
    ALTER DATABASE HCE_Insumos SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'HCE_Auth' AND is_read_committed_snapshot_on = 0)
    ALTER DATABASE HCE_Auth SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
GO

/* Estadísticas asíncronas: evita que una consulta espere a que se recalculen. */
ALTER DATABASE HCE_Insumos SET AUTO_UPDATE_STATISTICS_ASYNC ON;
ALTER DATABASE HCE_Auth    SET AUTO_UPDATE_STATISTICS_ASYNC ON;
GO
