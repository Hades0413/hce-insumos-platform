/* =============================================================================
   04b_auth_permisos.sql: RBAC basado en permisos con excepciones por usuario
   Base: HCE_Auth. Idempotente.

   Modelo:
     Permisos (catálogo)  <-  RolPermisos  ->  Roles
     Usuarios.Rol (rol principal)
     UsuarioPermisos: excepciones por usuario GRANT / DENY, con motivo obligatorio,
                      vigencia opcional (accesos temporales) y quién las otorgó.
   Permisos efectivos = (permisos del rol ∪ GRANT vigentes) − DENY vigentes
   (DENY siempre gana: principio de mínimo privilegio).
   Toda modificación de excepciones queda en auth.PermisoBitacora (append-only).
   ============================================================================= */
USE HCE_Auth;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

/* ------------------------------------------------------------------ Tablas */
IF OBJECT_ID(N'auth.Permisos', N'U') IS NULL
    CREATE TABLE auth.Permisos
    (
        Codigo      VARCHAR(50)   NOT NULL CONSTRAINT PK_Permisos PRIMARY KEY,
        Modulo      VARCHAR(30)   NOT NULL,
        Descripcion NVARCHAR(150) NOT NULL,
        Orden       SMALLINT      NOT NULL CONSTRAINT DF_Permisos_Orden DEFAULT (0),
        CONSTRAINT CK_Permisos_Codigo CHECK (Codigo LIKE '%_.%_' AND Codigo = LOWER(Codigo))
    );
GO
IF OBJECT_ID(N'auth.Roles', N'U') IS NULL
    CREATE TABLE auth.Roles
    (
        Codigo VARCHAR(20)   NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
        Nombre NVARCHAR(60)  NOT NULL
    );
GO
IF OBJECT_ID(N'auth.RolPermisos', N'U') IS NULL
    CREATE TABLE auth.RolPermisos
    (
        CodigoRol     VARCHAR(20) NOT NULL CONSTRAINT FK_RolPermisos_Roles REFERENCES auth.Roles (Codigo),
        CodigoPermiso VARCHAR(50) NOT NULL CONSTRAINT FK_RolPermisos_Permisos REFERENCES auth.Permisos (Codigo),
        CONSTRAINT PK_RolPermisos PRIMARY KEY (CodigoRol, CodigoPermiso)
    );
GO
IF OBJECT_ID(N'auth.UsuarioPermisos', N'U') IS NULL
BEGIN
    CREATE TABLE auth.UsuarioPermisos
    (
        IdUsuario     UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_UsuarioPermisos_Usuarios REFERENCES auth.Usuarios (Id),
        CodigoPermiso VARCHAR(50)      NOT NULL CONSTRAINT FK_UsuarioPermisos_Permisos REFERENCES auth.Permisos (Codigo),
        Tipo          CHAR(5)          NOT NULL CONSTRAINT CK_UsuarioPermisos_Tipo CHECK (Tipo IN ('GRANT', 'DENY')),
        Motivo        NVARCHAR(300)    NOT NULL CONSTRAINT CK_UsuarioPermisos_Motivo CHECK (LEN(LTRIM(RTRIM(Motivo))) >= 10),
        VigenteHasta  DATETIME2(3)     NULL,
        OtorgadoPor   UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_UsuarioPermisos_OtorgadoPor REFERENCES auth.Usuarios (Id),
        FecRegistro   DATETIME2(3)     NOT NULL CONSTRAINT DF_UsuarioPermisos_Fec DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_UsuarioPermisos PRIMARY KEY (IdUsuario, CodigoPermiso)
    );
END
GO
IF OBJECT_ID(N'auth.PermisoBitacora', N'U') IS NULL
BEGIN
    CREATE TABLE auth.PermisoBitacora
    (
        Id            BIGINT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_PermisoBitacora PRIMARY KEY,
        IdUsuario     UNIQUEIDENTIFIER NOT NULL,
        CodigoPermiso VARCHAR(50)      NOT NULL,
        Accion        VARCHAR(10)      NOT NULL CONSTRAINT CK_PermisoBitacora_Accion CHECK (Accion IN ('GRANT', 'DENY', 'REVOKE')),
        Motivo        NVARCHAR(300)    NULL,
        VigenteHasta  DATETIME2(3)     NULL,
        Actor         UNIQUEIDENTIFIER NOT NULL,
        RequestId     NVARCHAR(64)     NULL,
        Fecha         DATETIME2(3)     NOT NULL CONSTRAINT DF_PermisoBitacora_Fecha DEFAULT (SYSUTCDATETIME())
    );
    CREATE INDEX IX_PermisoBitacora_Usuario ON auth.PermisoBitacora (IdUsuario, Fecha DESC);
END
GO
CREATE OR ALTER TRIGGER auth.trg_PermisoBitacora_AppendOnly ON auth.PermisoBitacora
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM deleted) RETURN;
    THROW 50011, N'La bitácora de permisos es de solo inserción.', 1;
END;
GO

/* ------------------------------------------------------------------ Catálogo */
MERGE auth.Permisos AS t
USING (VALUES
    ('productos.ver',           'productos',  N'Ver productos y su stock',                          10),
    ('productos.registrar',     'productos',  N'Registrar productos nuevos',                         11),
    ('productos.editar',        'productos',  N'Editar datos y costo de productos',                  12),
    ('productos.eliminar',      'productos',  N'Eliminar productos sin movimientos',                 13),
    ('productos.precio_manual', 'productos',  N'Fijar manualmente el precio de venta',               14),
    ('compras.ver',             'compras',    N'Ver historial de compras',                          20),
    ('compras.registrar',       'compras',    N'Registrar compras (entradas al kardex)',             21),
    ('ventas.ver',              'ventas',     N'Ver historial de ventas',                           30),
    ('ventas.registrar',        'ventas',     N'Registrar ventas (salidas del kardex)',              31),
    ('kardex.ver',              'kardex',     N'Ver kardex y movimientos por producto',             40),
    ('seguridad.administrar',   'seguridad',  N'Administrar usuarios, roles y excepciones de permisos', 90)
) AS s (Codigo, Modulo, Descripcion, Orden)
ON t.Codigo = s.Codigo
WHEN MATCHED THEN UPDATE SET Modulo = s.Modulo, Descripcion = s.Descripcion, Orden = s.Orden
WHEN NOT MATCHED THEN INSERT (Codigo, Modulo, Descripcion, Orden) VALUES (s.Codigo, s.Modulo, s.Descripcion, s.Orden);
GO
MERGE auth.Roles AS t
USING (VALUES ('ADMIN', N'Administrador'), ('ALMACENERO', N'Responsable de almacén'), ('FARMACEUTICO', N'Químico farmacéutico')) AS s (Codigo, Nombre)
ON t.Codigo = s.Codigo
WHEN MATCHED THEN UPDATE SET Nombre = s.Nombre
WHEN NOT MATCHED THEN INSERT (Codigo, Nombre) VALUES (s.Codigo, s.Nombre);
GO
/* Matriz rol -> permisos (fuente de verdad; re-ejecutar el script la sincroniza). */
DECLARE @Matriz TABLE (CodigoRol VARCHAR(20), CodigoPermiso VARCHAR(50), PRIMARY KEY (CodigoRol, CodigoPermiso));
INSERT INTO @Matriz SELECT 'ADMIN', Codigo FROM auth.Permisos;
INSERT INTO @Matriz VALUES
    ('ALMACENERO', 'productos.ver'), ('ALMACENERO', 'productos.registrar'), ('ALMACENERO', 'productos.editar'),
    ('ALMACENERO', 'compras.ver'), ('ALMACENERO', 'compras.registrar'), ('ALMACENERO', 'ventas.ver'), ('ALMACENERO', 'kardex.ver'),
    ('FARMACEUTICO', 'productos.ver'), ('FARMACEUTICO', 'ventas.ver'), ('FARMACEUTICO', 'ventas.registrar'),
    ('FARMACEUTICO', 'compras.ver'), ('FARMACEUTICO', 'kardex.ver');
MERGE auth.RolPermisos AS t
USING @Matriz AS s ON t.CodigoRol = s.CodigoRol AND t.CodigoPermiso = s.CodigoPermiso
WHEN NOT MATCHED BY TARGET THEN INSERT (CodigoRol, CodigoPermiso) VALUES (s.CodigoRol, s.CodigoPermiso)
WHEN NOT MATCHED BY SOURCE THEN DELETE;
GO
/* Usuarios.Rol referencia el catálogo de roles. La FK se declara aquí porque auth.Roles se crea en este script. */
IF OBJECT_ID(N'auth.FK_Usuarios_Roles', N'F') IS NULL
    ALTER TABLE auth.Usuarios ADD CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (Rol) REFERENCES auth.Roles (Codigo);
GO

/* ------------------------------------------------------------------ Permisos efectivos */
CREATE OR ALTER FUNCTION auth.fn_PermisosEfectivos (@IdUsuario UNIQUEIDENTIFIER)
RETURNS TABLE
AS
RETURN
(
    SELECT p.Codigo
    FROM auth.Permisos AS p
    WHERE (
            EXISTS (SELECT 1 FROM auth.Usuarios AS u
                    INNER JOIN auth.RolPermisos AS rp ON rp.CodigoRol = u.Rol
                    WHERE u.Id = @IdUsuario AND rp.CodigoPermiso = p.Codigo)
         OR EXISTS (SELECT 1 FROM auth.UsuarioPermisos AS g
                    WHERE g.IdUsuario = @IdUsuario AND g.CodigoPermiso = p.Codigo AND g.Tipo = 'GRANT'
                      AND (g.VigenteHasta IS NULL OR g.VigenteHasta > SYSUTCDATETIME()))
          )
      AND NOT EXISTS (SELECT 1 FROM auth.UsuarioPermisos AS d
                      WHERE d.IdUsuario = @IdUsuario AND d.CodigoPermiso = p.Codigo AND d.Tipo = 'DENY'
                        AND (d.VigenteHasta IS NULL OR d.VigenteHasta > SYSUTCDATETIME()))
);
GO

CREATE OR ALTER PROCEDURE auth.usp_Usuario_PermisosEfectivos
    @IdUsuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Codigo FROM auth.fn_PermisosEfectivos(@IdUsuario) ORDER BY Codigo;
END;
GO

/* ------------------------------------------------------------------ Administración */
CREATE OR ALTER PROCEDURE auth.usp_Admin_Permisos_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Codigo, Modulo, Descripcion FROM auth.Permisos ORDER BY Orden, Codigo;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Admin_Roles_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Codigo, r.Nombre,
           (SELECT rp.CodigoPermiso AS Codigo FROM auth.RolPermisos AS rp WHERE rp.CodigoRol = r.Codigo
            ORDER BY rp.CodigoPermiso FOR JSON PATH) AS PermisosJson
    FROM auth.Roles AS r ORDER BY r.Codigo;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Admin_Usuarios_Listar
    @Search   NVARCHAR(100) = NULL,
    @Page     INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET @Page     = CASE WHEN @Page IS NULL OR @Page < 1 THEN 1 ELSE @Page END;
    SET @PageSize = CASE WHEN @PageSize IS NULL OR @PageSize < 1 THEN 20 WHEN @PageSize > 100 THEN 100 ELSE @PageSize END;
    DECLARE @t NVARCHAR(100) = NULLIF(LTRIM(RTRIM(@Search)), N'');
    DECLARE @Patron NVARCHAR(320) = CASE WHEN @t IS NULL THEN NULL
        ELSE N'%' + REPLACE(REPLACE(REPLACE(@t, N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]') + N'%' END;

    SELECT COUNT_BIG(*) AS Total FROM auth.Usuarios
    WHERE @Patron IS NULL OR Email LIKE @Patron OR NombreCompleto LIKE @Patron
    OPTION (RECOMPILE);

    SELECT u.Id, u.Email, u.NombreCompleto, u.Rol, u.Activo,
           (SELECT COUNT(*) FROM auth.UsuarioPermisos AS e
            WHERE e.IdUsuario = u.Id AND (e.VigenteHasta IS NULL OR e.VigenteHasta > SYSUTCDATETIME())) AS Excepciones
    FROM auth.Usuarios AS u
    WHERE @Patron IS NULL OR u.Email LIKE @Patron OR u.NombreCompleto LIKE @Patron
    ORDER BY u.NombreCompleto, u.Id
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY
    OPTION (RECOMPILE);
END;
GO

/* RS1 usuario | RS2 permisos del rol | RS3 excepciones vigentes | RS4 efectivos */
CREATE OR ALTER PROCEDURE auth.usp_Admin_Usuario_Permisos
    @IdUsuario UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Email, NombreCompleto, Rol FROM auth.Usuarios WHERE Id = @IdUsuario;
    SELECT rp.CodigoPermiso AS Codigo
    FROM auth.Usuarios AS u INNER JOIN auth.RolPermisos AS rp ON rp.CodigoRol = u.Rol
    WHERE u.Id = @IdUsuario ORDER BY rp.CodigoPermiso;
    SELECT e.CodigoPermiso, e.Tipo, e.Motivo, e.VigenteHasta, o.Email AS OtorgadoPor, e.FecRegistro
    FROM auth.UsuarioPermisos AS e INNER JOIN auth.Usuarios AS o ON o.Id = e.OtorgadoPor
    WHERE e.IdUsuario = @IdUsuario AND (e.VigenteHasta IS NULL OR e.VigenteHasta > SYSUTCDATETIME())
    ORDER BY e.CodigoPermiso;
    SELECT Codigo FROM auth.fn_PermisosEfectivos(@IdUsuario) ORDER BY Codigo;
END;
GO

/* Upsert de excepción. Reglas: motivo ≥ 10, vigencia futura, el actor no puede
   quitarse a sí mismo 'seguridad.administrar' (evita dejar el sistema sin admin). */
CREATE OR ALTER PROCEDURE auth.usp_Admin_Excepcion_Guardar
    @IdUsuario     UNIQUEIDENTIFIER,
    @CodigoPermiso VARCHAR(50),
    @Tipo          CHAR(5),
    @Motivo        NVARCHAR(300),
    @VigenteHasta  DATETIME2(3) = NULL,
    @Actor         UNIQUEIDENTIFIER,
    @RequestId     NVARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF NOT EXISTS (SELECT 1 FROM auth.Usuarios WHERE Id = @IdUsuario)
        THROW 50002, N'El usuario no existe.', 1;
    IF NOT EXISTS (SELECT 1 FROM auth.Permisos WHERE Codigo = @CodigoPermiso)
        THROW 50002, N'El permiso no existe.', 1;
    IF @Tipo NOT IN ('GRANT', 'DENY')
        THROW 50006, N'Tipo de excepción inválido.', 1;
    IF @VigenteHasta IS NOT NULL AND @VigenteHasta <= SYSUTCDATETIME()
        THROW 50006, N'La vigencia debe ser una fecha futura.', 1;
    IF @Tipo = 'DENY' AND @IdUsuario = @Actor AND @CodigoPermiso = 'seguridad.administrar'
        THROW 50006, N'No puede quitarse a sí mismo el permiso de administrar seguridad.', 1;

    BEGIN TRANSACTION;
        MERGE auth.UsuarioPermisos WITH (HOLDLOCK) AS t
        USING (SELECT @IdUsuario AS IdUsuario, @CodigoPermiso AS CodigoPermiso) AS s
        ON t.IdUsuario = s.IdUsuario AND t.CodigoPermiso = s.CodigoPermiso
        WHEN MATCHED THEN UPDATE SET Tipo = @Tipo, Motivo = LTRIM(RTRIM(@Motivo)), VigenteHasta = @VigenteHasta,
                                     OtorgadoPor = @Actor, FecRegistro = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN INSERT (IdUsuario, CodigoPermiso, Tipo, Motivo, VigenteHasta, OtorgadoPor)
                              VALUES (@IdUsuario, @CodigoPermiso, @Tipo, LTRIM(RTRIM(@Motivo)), @VigenteHasta, @Actor);
        INSERT INTO auth.PermisoBitacora (IdUsuario, CodigoPermiso, Accion, Motivo, VigenteHasta, Actor, RequestId)
        VALUES (@IdUsuario, @CodigoPermiso, @Tipo, LTRIM(RTRIM(@Motivo)), @VigenteHasta, @Actor, @RequestId);
    COMMIT TRANSACTION;

    EXEC auth.usp_Admin_Usuario_Permisos @IdUsuario = @IdUsuario;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Admin_Excepcion_Eliminar
    @IdUsuario     UNIQUEIDENTIFIER,
    @CodigoPermiso VARCHAR(50),
    @Actor         UNIQUEIDENTIFIER,
    @RequestId     NVARCHAR(64) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF NOT EXISTS (SELECT 1 FROM auth.Usuarios WHERE Id = @IdUsuario)
        THROW 50002, N'El usuario no existe.', 1;
    BEGIN TRANSACTION;
        DELETE FROM auth.UsuarioPermisos WHERE IdUsuario = @IdUsuario AND CodigoPermiso = @CodigoPermiso;
        IF @@ROWCOUNT > 0
            INSERT INTO auth.PermisoBitacora (IdUsuario, CodigoPermiso, Accion, Actor, RequestId)
            VALUES (@IdUsuario, @CodigoPermiso, 'REVOKE', @Actor, @RequestId);
    COMMIT TRANSACTION;
    EXEC auth.usp_Admin_Usuario_Permisos @IdUsuario = @IdUsuario;
END;
GO
