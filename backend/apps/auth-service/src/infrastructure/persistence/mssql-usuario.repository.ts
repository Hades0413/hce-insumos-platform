import { Injectable } from '@nestjs/common';
import { MssqlExecutor } from '@hce/common';
import { Permiso, Rol, sanearPermisos } from '@hce/contracts';
import * as sql from 'mssql';
import { HashedPassword } from '../../domain/security/password-hasher.port';
import { InfoCliente } from '../../domain/usuario/info-cliente';
import { UsuarioRepository } from '../../domain/usuario/usuario.repository.port';
import { POLITICA_BLOQUEO, Usuario, UsuarioConCredenciales } from '../../domain/usuario/usuario';

interface UsuarioRow {
  Id: string;
  Email: string;
  NombreCompleto: string;
  Rol: Rol;
  Activo: boolean;
  PasswordHash?: Buffer;
  PasswordSalt?: Buffer;
  HashVersion?: number;
}

const toUsuario = (r: UsuarioRow): Usuario => ({
  id: r.Id.toLowerCase(),
  email: r.Email,
  nombreCompleto: r.NombreCompleto,
  rol: r.Rol,
  activo: Boolean(r.Activo),
});

export function bindCliente(r: sql.Request, cliente: InfoCliente): void {
  r.input('Ip', sql.VarChar(45), cliente.ip?.slice(0, 45) ?? null);
  r.input('UserAgent', sql.NVarChar(256), cliente.userAgent?.slice(0, 256) ?? null);
}

@Injectable()
export class MssqlUsuarioRepository implements UsuarioRepository {
  constructor(private readonly db: MssqlExecutor) {}

  async contar(): Promise<number> {
    const r = await this.db.execute<{ Total: number }>('auth.usp_Usuario_Contar');
    return Number(r.recordset[0]?.Total ?? 0);
  }

  async crear(data: { email: string; nombreCompleto: string; password: HashedPassword; rol: Rol }): Promise<Usuario> {
    const r = await this.db.execute<UsuarioRow>('auth.usp_Usuario_Crear', (req) => {
      req.input('Email', sql.NVarChar(254), data.email);
      req.input('NombreCompleto', sql.NVarChar(150), data.nombreCompleto);
      bindPassword(req, data.password);
      req.input('Rol', sql.VarChar(20), data.rol);
    });
    return toUsuario(r.recordset[0]);
  }

  async obtenerPorEmail(email: string): Promise<UsuarioConCredenciales | null> {
    const r = await this.db.execute<UsuarioRow>('auth.usp_Usuario_ObtenerPorEmail', (req) =>
      req.input('Email', sql.NVarChar(254), email),
    );
    const row = r.recordset[0];
    if (!row) return null;
    return {
      ...toUsuario(row),
      passwordHash: Buffer.from(row.PasswordHash ?? []),
      passwordSalt: Buffer.from(row.PasswordSalt ?? []),
      hashVersion: Number(row.HashVersion ?? 1),
    };
  }

  async reservarIntento(id: string, cliente: InfoCliente): Promise<boolean> {
    const r = await this.db.execute<{ Permitido: boolean }>('auth.usp_Login_ReservarIntento', (req) => {
      req.input('IdUsuario', sql.UniqueIdentifier, id);
      req.input('MaxIntentos', sql.Int, POLITICA_BLOQUEO.MAX_INTENTOS);
      req.input('MinutosBloqueo', sql.Int, POLITICA_BLOQUEO.MINUTOS_BLOQUEO);
      bindCliente(req, cliente);
    });
    return r.recordset[0]?.Permitido === true;
  }

  async registrarLoginExitoso(id: string, cliente: InfoCliente): Promise<void> {
    await this.db.execute('auth.usp_Usuario_RegistrarLoginExitoso', (req) => {
      req.input('IdUsuario', sql.UniqueIdentifier, id);
      bindCliente(req, cliente);
    });
  }

  async registrarIntento(email: string, motivo: string, cliente: InfoCliente, idUsuario?: string): Promise<void> {
    await this.db.execute('auth.usp_HistorialLogin_Registrar', (req) => {
      req.input('IdUsuario', sql.UniqueIdentifier, idUsuario ?? null);
      req.input('Email', sql.NVarChar(254), email.slice(0, 254));
      req.input('Exitoso', sql.Bit, false);
      req.input('Motivo', sql.VarChar(40), motivo);
      bindCliente(req, cliente);
    });
  }

  async permisosEfectivos(id: string): Promise<Permiso[]> {
    const r = await this.db.execute<{ Codigo: string }>('auth.usp_Usuario_PermisosEfectivos', (req) =>
      req.input('IdUsuario', sql.UniqueIdentifier, id),
    );
    return sanearPermisos(r.recordset.map((x) => x.Codigo));
  }

  async actualizarHash(id: string, password: HashedPassword): Promise<void> {
    await this.db.execute('auth.usp_Usuario_ActualizarHash', (req) => {
      req.input('IdUsuario', sql.UniqueIdentifier, id);
      bindPassword(req, password);
    });
  }
}

function bindPassword(req: sql.Request, password: HashedPassword): void {
  req.input('PasswordHash', sql.VarBinary(64), password.hash);
  req.input('PasswordSalt', sql.VarBinary(32), password.salt);
  req.input('HashVersion', sql.TinyInt, password.version);
}
