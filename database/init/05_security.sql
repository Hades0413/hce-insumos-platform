/* =============================================================================
   05_security.sql — Logins de aplicación con MÍNIMO PRIVILEGIO
   Variables sqlcmd: INSUMOS_DB_PASSWORD, AUTH_DB_PASSWORD
   - Cada microservicio tiene su propio login y SOLO accede a SU base.
   - Solo permiso EXECUTE sobre los procedimientos (+ tipos TVP). Sin SELECT/INSERT/
     UPDATE/DELETE directo a tablas: una inyección SQL no podría leer ni alterar
     tablas arbitrarias (ownership chaining de dbo/auth).
   ============================================================================= */
USE master;
GO
SET NOCOUNT ON;
GO

IF SUSER_ID(N'hce_insumos_app') IS NULL
    CREATE LOGIN hce_insumos_app WITH PASSWORD = N'$(INSUMOS_DB_PASSWORD)', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF, DEFAULT_DATABASE = HCE_Insumos;
ELSE
    ALTER LOGIN hce_insumos_app WITH PASSWORD = N'$(INSUMOS_DB_PASSWORD)';
GO

IF SUSER_ID(N'hce_auth_app') IS NULL
    CREATE LOGIN hce_auth_app WITH PASSWORD = N'$(AUTH_DB_PASSWORD)', CHECK_POLICY = ON, CHECK_EXPIRATION = OFF, DEFAULT_DATABASE = HCE_Auth;
ELSE
    ALTER LOGIN hce_auth_app WITH PASSWORD = N'$(AUTH_DB_PASSWORD)';
GO

/* ------------------------------------------------------------- HCE_Insumos */
USE HCE_Insumos;
GO
IF USER_ID(N'hce_insumos_app') IS NULL
    CREATE USER hce_insumos_app FOR LOGIN hce_insumos_app WITH DEFAULT_SCHEMA = dbo;
GO
GRANT EXECUTE ON SCHEMA::dbo TO hce_insumos_app;
GRANT EXECUTE ON TYPE::dbo.tt_LineaCompra TO hce_insumos_app;
GRANT EXECUTE ON TYPE::dbo.tt_LineaVenta  TO hce_insumos_app;
GRANT EXECUTE ON TYPE::dbo.tt_Ids         TO hce_insumos_app;
/* Explícito: la app nunca toca el esquema de auditoría ni sus generadores. */
DENY  EXECUTE ON SCHEMA::audit TO hce_insumos_app;
DENY  SELECT, INSERT, UPDATE, DELETE ON SCHEMA::audit TO hce_insumos_app;
GO

/* ------------------------------------------------------------- HCE_Auth */
USE HCE_Auth;
GO
IF USER_ID(N'hce_auth_app') IS NULL
    CREATE USER hce_auth_app FOR LOGIN hce_auth_app WITH DEFAULT_SCHEMA = auth;
GO
GRANT EXECUTE ON SCHEMA::auth TO hce_auth_app;
GO
