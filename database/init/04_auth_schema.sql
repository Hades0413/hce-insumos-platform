/* =============================================================================
   04_auth_schema.sql — Identidad y sesiones (microservicio auth-service)
   Base: HCE_Auth. Idempotente.

   - Contraseñas: hash scrypt (N=2^15,r=8,p=1) + salt aleatorio, calculado en el
     servicio (nunca en la BD, nunca en texto plano).
   - Refresh tokens OPACOS: solo se guarda su SHA-256. Rotación en cada uso con
     "familias": si se reutiliza un token ya rotado (robo), se revoca la familia.
   - Bloqueo por fuerza bruta atómico en SQL (sin carreras entre réplicas).
   ============================================================================= */
USE HCE_Auth;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

IF SCHEMA_ID(N'auth') IS NULL EXEC (N'CREATE SCHEMA auth AUTHORIZATION dbo;');
GO

IF OBJECT_ID(N'auth.Usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE auth.Usuarios
    (
        Id               UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Usuarios_Id DEFAULT (NEWSEQUENTIALID())
                                                   CONSTRAINT PK_Usuarios PRIMARY KEY CLUSTERED,
        Email            NVARCHAR(254)    NOT NULL,
        NombreCompleto   NVARCHAR(150)    NOT NULL,
        PasswordHash     VARBINARY(64)    NOT NULL,
        PasswordSalt     VARBINARY(32)    NOT NULL,
        Rol              VARCHAR(20)      NOT NULL,
        Activo           BIT              NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT (1),
        IntentosFallidos INT              NOT NULL CONSTRAINT DF_Usuarios_Intentos DEFAULT (0),
        BloqueadoHasta   DATETIME2(3)     NULL,
        UltimoLogin      DATETIME2(3)     NULL,
        FecRegistro      DATETIME2(3)     NOT NULL CONSTRAINT DF_Usuarios_FecRegistro DEFAULT (SYSUTCDATETIME()),
        RowVersion       ROWVERSION       NOT NULL,
        CONSTRAINT UQ_Usuarios_Email UNIQUE (Email),
        CONSTRAINT CK_Usuarios_Email CHECK (Email = LOWER(Email) AND Email LIKE N'_%@_%._%'),
        CONSTRAINT CK_Usuarios_Rol   CHECK (Rol IN ('ADMIN', 'ALMACENERO', 'FARMACEUTICO'))
    );
END
GO

IF OBJECT_ID(N'auth.Sesiones', N'U') IS NULL
BEGIN
    CREATE TABLE auth.Sesiones
    (
        Id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Sesiones PRIMARY KEY NONCLUSTERED,
        IdUsuario      UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_Sesiones_Usuarios REFERENCES auth.Usuarios (Id),
        FamiliaId      UNIQUEIDENTIFIER NOT NULL,
        TokenHash      BINARY(32)       NOT NULL,
        ExpiraEn       DATETIME2(3)     NOT NULL,
        FecCreacion    DATETIME2(3)     NOT NULL CONSTRAINT DF_Sesiones_FecCreacion DEFAULT (SYSUTCDATETIME()),
        RevocadaEn     DATETIME2(3)     NULL,
        ReemplazadaPor UNIQUEIDENTIFIER NULL,
        Ip             VARCHAR(45)      NULL,
        UserAgent      NVARCHAR(256)    NULL,
        CONSTRAINT UQ_Sesiones_TokenHash UNIQUE (TokenHash)
    );
    CREATE CLUSTERED INDEX CX_Sesiones_Usuario ON auth.Sesiones (IdUsuario, FecCreacion);
    CREATE INDEX IX_Sesiones_Familia ON auth.Sesiones (FamiliaId) WHERE RevocadaEn IS NULL;
    CREATE INDEX IX_Sesiones_ExpiraEn ON auth.Sesiones (ExpiraEn);
END
GO

IF OBJECT_ID(N'auth.HistorialLogin', N'U') IS NULL
BEGIN
    CREATE TABLE auth.HistorialLogin
    (
        Id        BIGINT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_HistorialLogin PRIMARY KEY CLUSTERED,
        IdUsuario UNIQUEIDENTIFIER NULL,
        Email     NVARCHAR(254)    NOT NULL,
        Exitoso   BIT              NOT NULL,
        Motivo    VARCHAR(40)      NOT NULL,
        Ip        VARCHAR(45)      NULL,
        UserAgent NVARCHAR(256)    NULL,
        Fecha     DATETIME2(3)     NOT NULL CONSTRAINT DF_HistorialLogin_Fecha DEFAULT (SYSUTCDATETIME())
    );
    CREATE INDEX IX_HistorialLogin_Usuario_Fecha ON auth.HistorialLogin (IdUsuario, Fecha DESC);
END
GO

/* =========================================================== Procedimientos */
CREATE OR ALTER PROCEDURE auth.usp_Usuario_Contar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT_BIG(*) AS Total FROM auth.Usuarios;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Usuario_Crear
    @Email          NVARCHAR(254),
    @NombreCompleto NVARCHAR(150),
    @PasswordHash   VARBINARY(64),
    @PasswordSalt   VARBINARY(32),
    @Rol            VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF EXISTS (SELECT 1 FROM auth.Usuarios WHERE Email = LOWER(@Email))
        THROW 50004, N'El email ya está registrado.', 1;

    DECLARE @Nuevo TABLE (Id UNIQUEIDENTIFIER);
    INSERT INTO auth.Usuarios (Email, NombreCompleto, PasswordHash, PasswordSalt, Rol)
    OUTPUT inserted.Id INTO @Nuevo
    VALUES (LOWER(LTRIM(RTRIM(@Email))), LTRIM(RTRIM(@NombreCompleto)), @PasswordHash, @PasswordSalt, @Rol);

    SELECT u.Id, u.Email, u.NombreCompleto, u.Rol, u.Activo
    FROM auth.Usuarios AS u INNER JOIN @Nuevo AS n ON n.Id = u.Id;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Usuario_ObtenerPorEmail
    @Email NVARCHAR(254)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Email, NombreCompleto, PasswordHash, PasswordSalt, Rol, Activo,
           IntentosFallidos, BloqueadoHasta
    FROM auth.Usuarios
    WHERE Email = LOWER(LTRIM(RTRIM(@Email)));
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Usuario_ObtenerPorId
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Email, NombreCompleto, Rol, Activo, BloqueadoHasta
    FROM auth.Usuarios
    WHERE Id = @Id;
END;
GO

/* Incremento ATÓMICO de intentos fallidos + bloqueo (sin read-modify-write en la app). */
CREATE OR ALTER PROCEDURE auth.usp_Usuario_RegistrarLoginFallido
    @IdUsuario       UNIQUEIDENTIFIER,
    @MaxIntentos     INT,
    @MinutosBloqueo  INT,
    @Ip              VARCHAR(45)   = NULL,
    @UserAgent       NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @Resultado TABLE (IntentosFallidos INT, BloqueadoHasta DATETIME2(3), Email NVARCHAR(254));

    BEGIN TRANSACTION;
        UPDATE auth.Usuarios
           SET IntentosFallidos = CASE WHEN IntentosFallidos + 1 >= @MaxIntentos THEN 0 ELSE IntentosFallidos + 1 END,
               BloqueadoHasta   = CASE WHEN IntentosFallidos + 1 >= @MaxIntentos
                                       THEN DATEADD(MINUTE, @MinutosBloqueo, SYSUTCDATETIME())
                                       ELSE BloqueadoHasta END
        OUTPUT inserted.IntentosFallidos, inserted.BloqueadoHasta, inserted.Email INTO @Resultado
        WHERE Id = @IdUsuario;

        INSERT INTO auth.HistorialLogin (IdUsuario, Email, Exitoso, Motivo, Ip, UserAgent)
        SELECT @IdUsuario, Email, 0, 'CREDENCIALES_INVALIDAS', @Ip, LEFT(@UserAgent, 256) FROM @Resultado;
    COMMIT TRANSACTION;

    SELECT IntentosFallidos, BloqueadoHasta FROM @Resultado;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Usuario_RegistrarLoginExitoso
    @IdUsuario UNIQUEIDENTIFIER,
    @Ip        VARCHAR(45)   = NULL,
    @UserAgent NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;
        UPDATE auth.Usuarios
           SET IntentosFallidos = 0, BloqueadoHasta = NULL, UltimoLogin = SYSUTCDATETIME()
         WHERE Id = @IdUsuario;
        INSERT INTO auth.HistorialLogin (IdUsuario, Email, Exitoso, Motivo, Ip, UserAgent)
        SELECT Id, Email, 1, 'OK', @Ip, LEFT(@UserAgent, 256) FROM auth.Usuarios WHERE Id = @IdUsuario;
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_HistorialLogin_Registrar
    @IdUsuario UNIQUEIDENTIFIER = NULL,
    @Email     NVARCHAR(254),
    @Exitoso   BIT,
    @Motivo    VARCHAR(40),
    @Ip        VARCHAR(45)   = NULL,
    @UserAgent NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO auth.HistorialLogin (IdUsuario, Email, Exitoso, Motivo, Ip, UserAgent)
    VALUES (@IdUsuario, LEFT(LOWER(@Email), 254), @Exitoso, @Motivo, @Ip, LEFT(@UserAgent, 256));
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Sesion_Crear
    @Id        UNIQUEIDENTIFIER,
    @IdUsuario UNIQUEIDENTIFIER,
    @FamiliaId UNIQUEIDENTIFIER,
    @TokenHash BINARY(32),
    @ExpiraEn  DATETIME2(3),
    @Ip        VARCHAR(45)   = NULL,
    @UserAgent NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO auth.Sesiones (Id, IdUsuario, FamiliaId, TokenHash, ExpiraEn, Ip, UserAgent)
    VALUES (@Id, @IdUsuario, @FamiliaId, @TokenHash, @ExpiraEn, @Ip, LEFT(@UserAgent, 256));
END;
GO

/* Rotación atómica del refresh token.
   @Resultado: OK | INVALIDO | EXPIRADO | REUTILIZADO (=> familia revocada) | USUARIO_INACTIVO */
CREATE OR ALTER PROCEDURE auth.usp_Sesion_Rotar
    @TokenHashActual BINARY(32),
    @NuevoId         UNIQUEIDENTIFIER,
    @NuevoTokenHash  BINARY(32),
    @NuevoExpiraEn   DATETIME2(3),
    @Ip              VARCHAR(45)   = NULL,
    @UserAgent       NVARCHAR(256) = NULL,
    @Resultado       VARCHAR(20)   OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @Id UNIQUEIDENTIFIER, @IdUsuario UNIQUEIDENTIFIER, @FamiliaId UNIQUEIDENTIFIER,
            @ExpiraEn DATETIME2(3), @RevocadaEn DATETIME2(3), @Activo BIT;

    BEGIN TRANSACTION;
        SELECT @Id = s.Id, @IdUsuario = s.IdUsuario, @FamiliaId = s.FamiliaId,
               @ExpiraEn = s.ExpiraEn, @RevocadaEn = s.RevocadaEn, @Activo = u.Activo
        FROM auth.Sesiones AS s WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN auth.Usuarios AS u ON u.Id = s.IdUsuario
        WHERE s.TokenHash = @TokenHashActual;

        IF @Id IS NULL
        BEGIN
            SET @Resultado = 'INVALIDO';
            COMMIT TRANSACTION;
            RETURN;
        END;

        IF @RevocadaEn IS NOT NULL
        BEGIN
            /* Reuso de un token ya rotado/revocado: posible robo -> revoca toda la familia. */
            UPDATE auth.Sesiones SET RevocadaEn = SYSUTCDATETIME()
            WHERE FamiliaId = @FamiliaId AND RevocadaEn IS NULL;
            SET @Resultado = 'REUTILIZADO';
            COMMIT TRANSACTION;
            SELECT @IdUsuario AS IdUsuario;
            RETURN;
        END;

        IF @ExpiraEn <= SYSUTCDATETIME()
        BEGIN
            UPDATE auth.Sesiones SET RevocadaEn = SYSUTCDATETIME() WHERE Id = @Id;
            SET @Resultado = 'EXPIRADO';
            COMMIT TRANSACTION;
            RETURN;
        END;

        IF @Activo = 0
        BEGIN
            UPDATE auth.Sesiones SET RevocadaEn = SYSUTCDATETIME() WHERE FamiliaId = @FamiliaId AND RevocadaEn IS NULL;
            SET @Resultado = 'USUARIO_INACTIVO';
            COMMIT TRANSACTION;
            RETURN;
        END;

        UPDATE auth.Sesiones SET RevocadaEn = SYSUTCDATETIME(), ReemplazadaPor = @NuevoId WHERE Id = @Id;
        INSERT INTO auth.Sesiones (Id, IdUsuario, FamiliaId, TokenHash, ExpiraEn, Ip, UserAgent)
        VALUES (@NuevoId, @IdUsuario, @FamiliaId, @NuevoTokenHash, @NuevoExpiraEn, @Ip, LEFT(@UserAgent, 256));
        SET @Resultado = 'OK';
    COMMIT TRANSACTION;

    SELECT u.Id, u.Email, u.NombreCompleto, u.Rol, u.Activo
    FROM auth.Usuarios AS u WHERE u.Id = @IdUsuario;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Sesion_RevocarPorToken
    @TokenHash BINARY(32)
AS
BEGIN
    SET NOCOUNT ON;
    /* Logout revoca la familia completa (todas las rotaciones de ese login). */
    UPDATE s SET s.RevocadaEn = SYSUTCDATETIME()
    FROM auth.Sesiones AS s
    WHERE s.RevocadaEn IS NULL
      AND s.FamiliaId = (SELECT TOP (1) FamiliaId FROM auth.Sesiones WHERE TokenHash = @TokenHash);
END;
GO

/* Limpieza (job programado / arranque): sesiones expiradas hace más de 7 días. */
CREATE OR ALTER PROCEDURE auth.usp_Sesion_Purgar
    @Lote INT = 5000
AS
BEGIN
    SET NOCOUNT ON;
    DELETE TOP (@Lote) FROM auth.Sesiones WHERE ExpiraEn < DATEADD(DAY, -7, SYSUTCDATETIME());
    SELECT @@ROWCOUNT AS Eliminadas;
END;
GO
