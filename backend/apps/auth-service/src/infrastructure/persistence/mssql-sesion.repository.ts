import { Injectable } from '@nestjs/common';
import { MssqlExecutor } from '@hce/common';
import { Rol } from '@hce/contracts';
import * as sql from 'mssql';
import { InfoCliente, NuevaSesion, ResultadoRotacion, SesionRepository } from '../../domain/ports';
import { bindCliente } from './mssql-usuario.repository';

@Injectable()
export class MssqlSesionRepository implements SesionRepository {
  constructor(private readonly db: MssqlExecutor) {}

  async crear(s: NuevaSesion, cliente: InfoCliente): Promise<void> {
    await this.db.execute('auth.usp_Sesion_Crear', (r) => {
      r.input('Id', sql.UniqueIdentifier, s.id);
      r.input('IdUsuario', sql.UniqueIdentifier, s.idUsuario);
      r.input('FamiliaId', sql.UniqueIdentifier, s.familiaId);
      r.input('TokenHash', sql.VarBinary(32), s.tokenHash);
      r.input('ExpiraEn', sql.DateTime2(3), s.expiraEn);
      bindCliente(r, cliente);
    });
  }

  async rotar(
    tokenHashActual: Buffer,
    nueva: Omit<NuevaSesion, 'idUsuario' | 'familiaId'>,
    cliente: InfoCliente,
  ): Promise<ResultadoRotacion> {
    const r = await this.db.execute<{
      Id?: string;
      IdUsuario?: string;
      Email?: string;
      NombreCompleto?: string;
      Rol?: Rol;
      Activo?: boolean;
    }>('auth.usp_Sesion_Rotar', (req) => {
      req.input('TokenHashActual', sql.VarBinary(32), tokenHashActual);
      req.input('NuevoId', sql.UniqueIdentifier, nueva.id);
      req.input('NuevoTokenHash', sql.VarBinary(32), nueva.tokenHash);
      req.input('NuevoExpiraEn', sql.DateTime2(3), nueva.expiraEn);
      bindCliente(req, cliente);
      req.output('Resultado', sql.VarChar(20));
    });
    const resultado = r.output.Resultado as string;
    const row = r.recordset?.[0];
    switch (resultado) {
      case 'OK':
        if (!row?.Id || !row.Email || !row.NombreCompleto || !row.Rol) return { tipo: 'INVALIDO' };
        return {
          tipo: 'OK',
          usuario: {
            id: row.Id.toLowerCase(),
            email: row.Email,
            nombreCompleto: row.NombreCompleto,
            rol: row.Rol,
            activo: true,
          },
        };
      case 'REUTILIZADO':
        return { tipo: 'REUTILIZADO', idUsuario: row?.IdUsuario?.toLowerCase() };
      case 'EXPIRADO':
      case 'USUARIO_INACTIVO':
        return { tipo: resultado };
      default:
        return { tipo: 'INVALIDO' };
    }
  }

  async revocarPorToken(tokenHash: Buffer): Promise<void> {
    await this.db.execute('auth.usp_Sesion_RevocarPorToken', (r) => r.input('TokenHash', sql.VarBinary(32), tokenHash));
  }

  async purgarExpiradas(): Promise<number> {
    const r = await this.db.execute<{ Eliminadas: number }>('auth.usp_Sesion_Purgar');
    return Number(r.recordset[0]?.Eliminadas ?? 0);
  }
}
