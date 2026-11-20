import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MssqlExecutor } from '@hce/common';
import { Rol } from '@hce/contracts';
import * as sql from 'mssql';
import { NuevaSesion, ResultadoRotacion, SesionRepository } from '../../domain/sesion/sesion.repository.port';
import { InfoCliente } from '../../domain/usuario/info-cliente';
import { bindCliente } from './mssql-usuario.repository';

interface RotacionRow {
  Id?: string;
  IdUsuario?: string;
  FamiliaId?: string;
  Email?: string;
  NombreCompleto?: string;
  Rol?: Rol;
  ExpiraEn?: Date;
}

@Injectable()
export class MssqlSesionRepository implements SesionRepository {
  private readonly maxHorasFamilia: number;

  constructor(
    private readonly db: MssqlExecutor,
    config: ConfigService,
  ) {
    this.maxHorasFamilia = Number(config.get('SESSION_MAX_HOURS', 12));
  }

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
    const r = await this.db.execute<RotacionRow>('auth.usp_Sesion_Rotar', (req) => {
      req.input('TokenHashActual', sql.VarBinary(32), tokenHashActual);
      req.input('NuevoId', sql.UniqueIdentifier, nueva.id);
      req.input('NuevoTokenHash', sql.VarBinary(32), nueva.tokenHash);
      req.input('NuevoExpiraEn', sql.DateTime2(3), nueva.expiraEn);
      req.input('MaxHorasFamilia', sql.Int, this.maxHorasFamilia);
      req.input('GraciaSegundos', sql.Int, 10);
      bindCliente(req, cliente);
      req.output('Resultado', sql.VarChar(20));
    });
    const resultado = r.output.Resultado as string;
    const row = r.recordset?.[0];
    const familiaId = row?.FamiliaId?.toLowerCase();
    switch (resultado) {
      case 'OK':
        if (!row?.Id || !row.Email || !row.NombreCompleto || !row.Rol || !familiaId || !row.ExpiraEn) {
          return { tipo: 'INVALIDO' };
        }
        return {
          tipo: 'OK',
          familiaId,
          expiraEn: row.ExpiraEn,
          usuario: {
            id: row.Id.toLowerCase(),
            email: row.Email,
            nombreCompleto: row.NombreCompleto,
            rol: row.Rol,
            activo: true,
          },
        };
      case 'REUTILIZADO':
      case 'EXPIRADO':
      case 'USUARIO_INACTIVO':
      case 'CONCURRENTE':
        return { tipo: resultado, familiaId, idUsuario: row?.IdUsuario?.toLowerCase() };
      default:
        return { tipo: 'INVALIDO' };
    }
  }

  async revocarPorToken(tokenHash: Buffer): Promise<string | null> {
    const r = await this.db.execute<{ FamiliaId: string }>('auth.usp_Sesion_RevocarPorToken', (req) =>
      req.input('TokenHash', sql.VarBinary(32), tokenHash),
    );
    return r.recordset?.[0]?.FamiliaId?.toLowerCase() ?? null;
  }

  async purgarExpiradas(): Promise<number> {
    const r = await this.db.execute<{ Eliminadas: number }>('auth.usp_Sesion_Purgar');
    return Number(r.recordset[0]?.Eliminadas ?? 0);
  }
}
