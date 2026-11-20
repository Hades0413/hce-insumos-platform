/* =============================================================================
   04_auth_schema.sql: Identidad y sesiones (microservicio auth-service)
   Base: HCE_Auth. Idempotente.

   - Contraseñas: hash argon2id (OWASP: m=19 MiB, t=2, p=1) + salt aleatorio,
     calculado en el servicio. HashVersion identifica el algoritmo/parámetros
     (1 = argon2id) para poder endurecerlos con re-hash transparente.
   - Refresh tokens OPACOS: solo se guarda su SHA-256. Rotación en cada uso con
     "familias": si se reutiliza un token ya rotado (robo), se revoca la familia.
   - Bloqueo por fuerza bruta: cada intento reserva su cupo atómicamente antes
     de verificar la contraseña (sin carreras entre requests concurrentes ni
     entre réplicas). Una cuenta bloqueada responde igual que credenciales
     inválidas (sin enumeración de usuarios).
   - Sesiones con vida máxima ABSOLUTA por familia (la rotación no la extiende).
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
        HashVersion      TINYINT          NOT NULL CONSTRAINT DF_Usuarios_HashVersion DEFAULT (1),
        Rol              VARCHAR(20)      NOT NULL, -- FK a auth.Roles (04b_auth_permisos.sql)
        Activo           BIT              NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT (1),
        IntentosFallidos INT              NOT NULL CONSTRAINT DF_Usuarios_Intentos DEFAULT (0),
        BloqueadoHasta   DATETIME2(3)     NULL,
        UltimoLogin      DATETIME2(3)     NULL,
        FecRegistro      DATETIME2(3)     NOT NULL CONSTRAINT DF_Usuarios_FecRegistro DEFAULT (SYSUTCDATETIME()),
        RowVersion       ROWVERSION       NOT NULL,
        CONSTRAINT UQ_Usuarios_Email UNIQUE (Email),
        CONSTRAINT CK_Usuarios_Email       CHECK (Email = LOWER(Email) AND Email LIKE N'_%@_%._%'),
        CONSTRAINT CK_Usuarios_HashVersion CHECK (HashVersion >= 1)
    );
END
GO

IF OBJECT_ID(N'auth.Sesiones', N'U') IS NULL
BEGIN
    CREATE TABLE auth.Sesiones
    (
        Id             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Sesiones PRIMARY KEY NONCLUSTERED,
        IdUsuario      UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_Sesiones_Usuarios REFERENCES auth.Usuarios (Id),
        FamiliaId       UNIQUEIDENTIFIER NOT NULL,
        FamiliaCreadaEn DATETIME2(3)     NOT NULL CONSTRAINT DF_Sesiones_FamiliaCreadaEn DEFAULT (SYSUTCDATETIME()),
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
    @HashVersion    TINYINT,
    @Rol            VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF EXISTS (SELECT 1 FROM auth.Usuarios WHERE Email = LOWER(@Email))
        THROW 50004, N'El email ya está registrado.', 1;

    DECLARE @Nuevo TABLE (Id UNIQUEIDENTIFIER);
    INSERT INTO auth.Usuarios (Email, NombreCompleto, PasswordHash, PasswordSalt, HashVersion, Rol)
    OUTPUT inserted.Id INTO @Nuevo
    VALUES (LOWER(LTRIM(RTRIM(@Email))), LTRIM(RTRIM(@NombreCompleto)), @PasswordHash, @PasswordSalt, @HashVersion, @Rol);

    SELECT u.Id, u.Email, u.NombreCompleto, u.Rol, u.Activo
    FROM auth.Usuarios AS u INNER JOIN @Nuevo AS n ON n.Id = u.Id;
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Usuario_ObtenerPorEmail
    @Email NVARCHAR(254)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Email, NombreCompleto, PasswordHash, PasswordSalt, HashVersion, Rol, Activo
    FROM auth.Usuarios
    WHERE Email = LOWER(LTRIM(RTRIM(@Email)));
END;
GO

CREATE OR ALTER PROCEDURE auth.usp_Usuario_ObtenerPorId
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Email, NombreCompleto, Rol, Activo
    FROM auth.Usuarios
    WHERE Id = @Id;
END;
GO

/* Reserva atómica de un intento de login antes de verificar la contraseña.
   - Si la cuenta está bloqueada (o inactiva) => Permitido = 0 (sin verificar hash).
   - Si no, consume un intento; al alcanzar @MaxIntentos fija el bloqueo de
     inmediato, de modo que N requests concurrentes nunca obtienen más de
     @MaxIntentos verificaciones por ventana.
   - Al expirar el bloqueo, el contador se reinicia. */
CREATE OR ALTER PROCEDURE auth.usp_Login_ReservarIntento
    @IdUsuario      UNIQUEIDENTIFIER,
    @MaxIntentos    INT,
    @MinutosBloqueo INT,
    @Ip             VARCHAR(45)   = NULL,
    @UserAgent      NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @Ahora DATETIME2(3) = SYSUTCDATETIME();
    DECLARE @Reservado TABLE (Email NVARCHAR(254));

    UPDATE u
       SET u.IntentosFallidos = c.Nuevo,
           u.BloqueadoHasta   = CASE WHEN c.Nuevo >= @MaxIntentos THEN DATEADD(MINUTE, @MinutosBloqueo, @Ahora) ELSE NULL END
    OUTPUT inserted.Email INTO @Reservado
    FROM auth.Usuarios AS u
    CROSS APPLY (SELECT CASE WHEN u.BloqueadoHasta IS NOT NULL AND u.BloqueadoHasta <= @Ahora
                             THEN 1 ELSE u.IntentosFallidos + 1 END AS Nuevo) AS c
    WHERE u.Id = @IdUsuario
      AND u.Activo = 1
      AND (u.BloqueadoHasta IS NULL OR u.BloqueadoHasta <= @Ahora);

    IF NOT EXISTS (SELECT 1 FROM @Reservado)
    BEGIN
        INSERT INTO auth.HistorialLogin (IdUsuario, Email, Exitoso, Motivo, Ip, UserAgent)
        SELECT Id, Email, 0, CASE WHEN Activo = 0 THEN 'USUARIO_INACTIVO' ELSE 'CUENTA_BLOQUEADA' END, @Ip, LEFT(@UserAgent, 256)
        FROM auth.Usuarios WHERE Id = @IdUsuario;
        SELECT CAST(0 AS BIT) AS Permitido;
        RETURN;
    END;

    SELECT CAST(1 AS BIT) AS Permitido;
END;
GO

/* Login correcto: libera el cupo reservado (reinicia contador y bloqueo). */
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

CREATE OR ALTER PROCEDURE auth.usp_Usuario_ActualizarHash
    @IdUsuario    UNIQUEIDENTIFIER,
    @PasswordHash VARBINARY(64),
    @PasswordSalt VARBINARY(32),
    @HashVersion  TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE auth.Usuarios
       SET PasswordHash = @PasswordHash, PasswordSalt = @PasswordSalt, HashVersion = @HashVersion
     WHERE Id = @IdUsuario;
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
    INSERT INTO auth.Sesiones (Id, IdUsuario, FamiliaId, FamiliaCreadaEn, TokenHash, ExpiraEn, Ip, UserAgent)
    VALUES (@Id, @IdUsuario, @FamiliaId, SYSUTCDATETIME(), @TokenHash, @ExpiraEn, @Ip, LEFT(@UserAgent, 256));
END;
GO

/* Rotación atómica del refresh token.
   @Resultado: OK | INVALIDO | EXPIRADO | REUTILIZADO (=> familia revocada) | CONCURRENTE | USUARIO_INACTIVO
   - CONCURRENTE: el mismo token se presentó dos veces en <= @GraciaSegundos (dos
     pestañas refrescando a la vez). No revoca la familia: la otra pestaña ya tiene
     las cookies nuevas.
   - La vida de la familia es ABSOLUTA (@MaxHorasFamilia desde el login). */
CREATE OR ALTER PROCEDURE auth.usp_Sesion_Rotar
    @TokenHashActual BINARY(32),
    @NuevoId         UNIQUEIDENTIFIER,
    @NuevoTokenHash  BINARY(32),
    @NuevoExpiraEn   DATETIME2(3),
    @MaxHorasFamilia INT           = 12,
    @GraciaSegundos  INT           = 10,
    @Ip              VARCHAR(45)   = NULL,
    @UserAgent       NVARCHAR(256) = NULL,
    @Resultado       VARCHAR(20)   OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @Id UNIQUEIDENTIFIER, @IdUsuario UNIQUEIDENTIFIER, @FamiliaId UNIQUEIDENTIFIER,
            @FamiliaCreadaEn DATETIME2(3), @ExpiraEn DATETIME2(3), @RevocadaEn DATETIME2(3),
            @ReemplazadaPor UNIQUEIDENTIFIER, @Activo BIT, @Ahora DATETIME2(3) = SYSUTCDATETIME();

    BEGIN TRANSACTION;
        SELECT @Id = s.Id, @IdUsuario = s.IdUsuario, @FamiliaId = s.FamiliaId, @FamiliaCreadaEn = s.FamiliaCreadaEn,
               @ExpiraEn = s.ExpiraEn, @RevocadaEn = s.RevocadaEn, @ReemplazadaPor = s.ReemplazadaPor, @Activo = u.Activo
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
            IF @ReemplazadaPor IS NOT NULL AND @RevocadaEn > DATEADD(SECOND, -@GraciaSegundos, @Ahora)
                SET @Resultado = 'CONCURRENTE';
            ELSE
            BEGIN
                /* Reuso de un token ya rotado/revocado: posible robo -> revoca toda la familia. */
                UPDATE auth.Sesiones SET RevocadaEn = @Ahora WHERE FamiliaId = @FamiliaId AND RevocadaEn IS NULL;
                SET @Resultado = 'REUTILIZADO';
            END;
            COMMIT TRANSACTION;
            SELECT @IdUsuario AS IdUsuario, @FamiliaId AS FamiliaId;
            RETURN;
        END;

        IF @ExpiraEn <= @Ahora OR @FamiliaCreadaEn <= DATEADD(HOUR, -@MaxHorasFamilia, @Ahora)
        BEGIN
            UPDATE auth.Sesiones SET RevocadaEn = @Ahora WHERE FamiliaId = @FamiliaId AND RevocadaEn IS NULL;
            SET @Resultado = 'EXPIRADO';
            COMMIT TRANSACTION;
            SELECT @IdUsuario AS IdUsuario, @FamiliaId AS FamiliaId;
            RETURN;
        END;

        IF @Activo = 0
        BEGIN
            UPDATE auth.Sesiones SET RevocadaEn = @Ahora WHERE FamiliaId = @FamiliaId AND RevocadaEn IS NULL;
            SET @Resultado = 'USUARIO_INACTIVO';
            COMMIT TRANSACTION;
            SELECT @IdUsuario AS IdUsuario, @FamiliaId AS FamiliaId;
            RETURN;
        END;

        /* La familia nunca vive más allá de su límite absoluto. */
        DECLARE @Limite DATETIME2(3) = DATEADD(HOUR, @MaxHorasFamilia, @FamiliaCreadaEn);
        UPDATE auth.Sesiones SET RevocadaEn = @Ahora, ReemplazadaPor = @NuevoId WHERE Id = @Id;
        INSERT INTO auth.Sesiones (Id, IdUsuario, FamiliaId, FamiliaCreadaEn, TokenHash, ExpiraEn, Ip, UserAgent)
        VALUES (@NuevoId, @IdUsuario, @FamiliaId, @FamiliaCreadaEn, @NuevoTokenHash,
                CASE WHEN @NuevoExpiraEn < @Limite THEN @NuevoExpiraEn ELSE @Limite END, @Ip, LEFT(@UserAgent, 256));
        SET @Resultado = 'OK';
    COMMIT TRANSACTION;

    SELECT u.Id, u.Email, u.NombreCompleto, u.Rol, u.Activo, @FamiliaId AS FamiliaId,
           CASE WHEN @NuevoExpiraEn < @Limite THEN @NuevoExpiraEn ELSE @Limite END AS ExpiraEn
    FROM auth.Usuarios AS u WHERE u.Id = @IdUsuario;
END;
GO

/* Logout: revoca la familia completa y devuelve su id (para invalidar access tokens vivos). */
CREATE OR ALTER PROCEDURE auth.usp_Sesion_RevocarPorToken
    @TokenHash BINARY(32)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @FamiliaId UNIQUEIDENTIFIER = (SELECT TOP (1) FamiliaId FROM auth.Sesiones WHERE TokenHash = @TokenHash);
    IF @FamiliaId IS NULL RETURN;
    UPDATE auth.Sesiones SET RevocadaEn = SYSUTCDATETIME() WHERE FamiliaId = @FamiliaId AND RevocadaEn IS NULL;
    SELECT @FamiliaId AS FamiliaId;
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
