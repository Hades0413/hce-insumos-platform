/* =============================================================================
   05_security.sql: Logins de aplicación con MÍNIMO PRIVILEGIO
   Variables sqlcmd: INSUMOS_DB_PASSWORD, AUTH_DB_PASSWORD
   - Cada microservicio tiene su propio login y solo accede a SU base.
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

/* ------------------------------------------------------------- HCE_Insumos
   Permisos por PROCEDIMIENTO a través de un rol (no GRANT sobre todo el esquema):
   un SP nuevo no queda expuesto a la aplicación hasta autorizarlo aquí. */
USE HCE_Insumos;
GO
IF USER_ID(N'hce_insumos_app') IS NULL
    CREATE USER hce_insumos_app FOR LOGIN hce_insumos_app WITH DEFAULT_SCHEMA = dbo;
IF DATABASE_PRINCIPAL_ID(N'rol_app_insumos') IS NULL
    CREATE ROLE rol_app_insumos AUTHORIZATION dbo;
IF IS_ROLEMEMBER(N'rol_app_insumos', N'hce_insumos_app') = 0
    ALTER ROLE rol_app_insumos ADD MEMBER hce_insumos_app;
GO
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'GRANT EXECUTE ON OBJECT::dbo.' + QUOTENAME(p.name) + N' TO rol_app_insumos;' + CHAR(10)
FROM (VALUES (N'usp_Producto_Insertar'), (N'usp_Producto_Actualizar'), (N'usp_Producto_Eliminar'),
             (N'usp_Producto_ObtenerPorId'), (N'usp_Producto_ObtenerPorIds'), (N'usp_Producto_Listar'),
             (N'usp_Compra_Registrar'), (N'usp_Compra_Listar'), (N'usp_Compra_Obtener'),
             (N'usp_Venta_Registrar'), (N'usp_Venta_Listar'), (N'usp_Venta_Obtener'),
             (N'usp_Documento_BuscarPorIdempotencia'), (N'usp_Kardex_Listar'), (N'usp_Kardex_Movimientos'),
             (N'usp_Outbox_Reclamar'), (N'usp_Outbox_MarcarPublicados'), (N'usp_Outbox_RegistrarFallo'),
             (N'usp_Outbox_Purgar')) AS p (name)
WHERE OBJECT_ID(N'dbo.' + QUOTENAME(p.name), N'P') IS NOT NULL;
EXEC sys.sp_executesql @sql;
GO
GRANT EXECUTE ON TYPE::dbo.tt_LineaCompra TO rol_app_insumos;
GRANT EXECUTE ON TYPE::dbo.tt_LineaVenta  TO rol_app_insumos;
GRANT EXECUTE ON TYPE::dbo.tt_Ids         TO rol_app_insumos;
/* Explícito: la app nunca toca el esquema de auditoría ni sus generadores. */
DENY  EXECUTE ON SCHEMA::audit TO rol_app_insumos;
DENY  SELECT, INSERT, UPDATE, DELETE ON SCHEMA::audit TO rol_app_insumos;
GO

/* ------------------------------------------------------------- HCE_Auth */
USE HCE_Auth;
GO
IF USER_ID(N'hce_auth_app') IS NULL
    CREATE USER hce_auth_app FOR LOGIN hce_auth_app WITH DEFAULT_SCHEMA = auth;
IF DATABASE_PRINCIPAL_ID(N'rol_app_auth') IS NULL
    CREATE ROLE rol_app_auth AUTHORIZATION dbo;
IF IS_ROLEMEMBER(N'rol_app_auth', N'hce_auth_app') = 0
    ALTER ROLE rol_app_auth ADD MEMBER hce_auth_app;
GO
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'GRANT EXECUTE ON OBJECT::auth.' + QUOTENAME(p.name) + N' TO rol_app_auth;' + CHAR(10)
FROM (VALUES (N'usp_Usuario_Contar'), (N'usp_Usuario_Crear'), (N'usp_Usuario_ObtenerPorEmail'),
             (N'usp_Usuario_ObtenerPorId'), (N'usp_Login_ReservarIntento'), (N'usp_Usuario_RegistrarLoginExitoso'),
             (N'usp_Usuario_ActualizarHash'), (N'usp_HistorialLogin_Registrar'), (N'usp_Sesion_Crear'),
             (N'usp_Sesion_Rotar'), (N'usp_Sesion_RevocarPorToken'), (N'usp_Sesion_Purgar'),
             (N'usp_Usuario_PermisosEfectivos'), (N'usp_Admin_Permisos_Listar'), (N'usp_Admin_Roles_Listar'),
             (N'usp_Admin_Usuarios_Listar'), (N'usp_Admin_Usuario_Permisos'), (N'usp_Admin_Excepcion_Guardar'),
             (N'usp_Admin_Excepcion_Eliminar')) AS p (name)
WHERE OBJECT_ID(N'auth.' + QUOTENAME(p.name), N'P') IS NOT NULL;
EXEC sys.sp_executesql @sql;
GO
