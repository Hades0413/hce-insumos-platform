import { Injectable } from '@nestjs/common';
import { MssqlExecutor } from '@hce/common';
import {
  EliminarExcepcionRequest,
  ExcepcionPermisoDto,
  GuardarExcepcionRequest,
  Paginated,
  PermisoCatalogoDto,
  RolDto,
  SearchQuery,
  UsuarioAdminDto,
  UsuarioPermisosDto,
  esPermiso,
  sanearPermisos,
} from '@hce/contracts';
import * as sql from 'mssql';
import { PermisosRepository } from '../../domain/permisos/permisos.repository.port';

interface UsuarioRow {
  Id: string;
  Email: string;
  NombreCompleto: string;
  Rol: string;
}
interface ExcepcionRow {
  CodigoPermiso: string;
  Tipo: 'GRANT' | 'DENY';
  Motivo: string;
  VigenteHasta: Date | null;
  OtorgadoPor: string;
  FecRegistro: Date;
}

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);

function toUsuarioPermisos(sets: unknown): UsuarioPermisosDto | null {
  const [usuario, rol, excepciones, efectivos] = sets as [
    UsuarioRow[],
    { Codigo: string }[],
    ExcepcionRow[],
    { Codigo: string }[],
  ];
  const u = usuario?.[0];
  if (!u) return null;
  return {
    usuario: { id: u.Id.toLowerCase(), email: u.Email, nombreCompleto: u.NombreCompleto, rol: u.Rol },
    permisosRol: sanearPermisos(rol.map((r) => r.Codigo)),
    excepciones: excepciones
      .filter((e) => esPermiso(e.CodigoPermiso))
      .map((e): ExcepcionPermisoDto => ({
        permiso: e.CodigoPermiso as ExcepcionPermisoDto['permiso'],
        tipo: e.Tipo.trim() as ExcepcionPermisoDto['tipo'],
        motivo: e.Motivo,
        vigenteHasta: iso(e.VigenteHasta),
        otorgadoPor: e.OtorgadoPor,
        fecRegistro: iso(e.FecRegistro) ?? '',
      })),
    efectivos: sanearPermisos(efectivos.map((r) => r.Codigo)),
  };
}

@Injectable()
export class MssqlPermisosRepository implements PermisosRepository {
  constructor(private readonly db: MssqlExecutor) {}

  async catalogo(): Promise<PermisoCatalogoDto[]> {
    const r = await this.db.execute<{ Codigo: string; Modulo: string; Descripcion: string }>(
      'auth.usp_Admin_Permisos_Listar',
    );
    return r.recordset
      .filter((p) => esPermiso(p.Codigo))
      .map((p) => ({ codigo: p.Codigo as PermisoCatalogoDto['codigo'], modulo: p.Modulo, descripcion: p.Descripcion }));
  }

  async roles(): Promise<RolDto[]> {
    const r = await this.db.execute<{ Codigo: string; Nombre: string; PermisosJson: string | null }>(
      'auth.usp_Admin_Roles_Listar',
    );
    return r.recordset.map((x) => ({
      codigo: x.Codigo,
      nombre: x.Nombre,
      permisos: sanearPermisos(
        x.PermisosJson ? (JSON.parse(x.PermisosJson) as { Codigo: string }[]).map((p) => p.Codigo) : [],
      ),
    }));
  }

  async usuarios(query: SearchQuery): Promise<Paginated<UsuarioAdminDto>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const r = await this.db.execute('auth.usp_Admin_Usuarios_Listar', (req) => {
      req.input('Search', sql.NVarChar(100), query.search?.slice(0, 100) ?? null);
      req.input('Page', sql.Int, page);
      req.input('PageSize', sql.Int, pageSize);
    });
    const [total, rows] = r.recordsets as unknown as [
      { Total: number }[],
      (UsuarioRow & { Activo: boolean; Excepciones: number })[],
    ];
    return {
      items: rows.map((u) => ({
        id: u.Id.toLowerCase(),
        email: u.Email,
        nombreCompleto: u.NombreCompleto,
        rol: u.Rol,
        activo: Boolean(u.Activo),
        excepciones: Number(u.Excepciones),
      })),
      total: Number(total[0]?.Total ?? 0),
      page,
      pageSize,
    };
  }

  async permisosDeUsuario(usuarioId: string): Promise<UsuarioPermisosDto | null> {
    const r = await this.db.execute('auth.usp_Admin_Usuario_Permisos', (req) =>
      req.input('IdUsuario', sql.UniqueIdentifier, usuarioId),
    );
    return toUsuarioPermisos(r.recordsets);
  }

  async guardarExcepcion(
    req: GuardarExcepcionRequest,
    actorId: string,
    requestId: string,
  ): Promise<UsuarioPermisosDto> {
    const r = await this.db.execute('auth.usp_Admin_Excepcion_Guardar', (q) => {
      q.input('IdUsuario', sql.UniqueIdentifier, req.usuarioId);
      q.input('CodigoPermiso', sql.VarChar(50), req.permiso);
      q.input('Tipo', sql.Char(5), req.tipo);
      q.input('Motivo', sql.NVarChar(300), req.motivo);
      q.input('VigenteHasta', sql.DateTime2(3), req.vigenteHasta ? new Date(req.vigenteHasta) : null);
      q.input('Actor', sql.UniqueIdentifier, actorId);
      q.input('RequestId', sql.NVarChar(64), requestId.slice(0, 64));
    });
    return toUsuarioPermisos(r.recordsets)!;
  }

  async eliminarExcepcion(
    req: EliminarExcepcionRequest,
    actorId: string,
    requestId: string,
  ): Promise<UsuarioPermisosDto> {
    const r = await this.db.execute('auth.usp_Admin_Excepcion_Eliminar', (q) => {
      q.input('IdUsuario', sql.UniqueIdentifier, req.usuarioId);
      q.input('CodigoPermiso', sql.VarChar(50), req.permiso);
      q.input('Actor', sql.UniqueIdentifier, actorId);
      q.input('RequestId', sql.NVarChar(64), requestId.slice(0, 64));
    });
    return toUsuarioPermisos(r.recordsets)!;
  }
}
