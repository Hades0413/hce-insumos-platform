import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  PERMISOS,
  Paginated,
  Permiso,
  PermisoCatalogoDto,
  RequestContext,
  RolDto,
  UsuarioAdminDto,
  UsuarioPermisosDto,
} from '@hce/contracts';
import { ApiProblemResponses } from '../common/decorators/api-problem.decorator';
import { ReqContext } from '../common/decorators/current-user.decorator';
import { Auth } from '../common/decorators/roles.decorator';
import { SearchQueryDto } from '../common/dto/pagination.dto';
import { AuthFacade } from '../auth/auth.facade';
import { GuardarExcepcionDto } from './admin.dto';

const PermisoPipe = new ParseEnumPipe(Object.fromEntries(PERMISOS.map((p) => [p, p])));

@ApiTags('Seguridad')
@Auth('seguridad.administrar')
@Controller('admin')
export class AdminController {
  constructor(private readonly auth: AuthFacade) {}

  @Get('permisos')
  @ApiOperation({ summary: 'Catálogo de permisos' })
  @ApiOkResponse({ description: 'PermisoCatalogoDto[]' })
  permisos(@ReqContext() ctx: RequestContext): Promise<PermisoCatalogoDto[]> {
    return this.auth.admin<PermisoCatalogoDto[]>('ADMIN_PERMISOS', {}, ctx);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Roles y sus permisos por defecto' })
  roles(@ReqContext() ctx: RequestContext): Promise<RolDto[]> {
    return this.auth.admin<RolDto[]>('ADMIN_ROLES', {}, ctx);
  }

  @Get('usuarios')
  @ApiOperation({ summary: 'Usuarios (búsqueda por nombre o email)' })
  @ApiQuery({ name: 'search', required: false, example: 'farmacia' })
  usuarios(@Query() query: SearchQueryDto, @ReqContext() ctx: RequestContext): Promise<Paginated<UsuarioAdminDto>> {
    return this.auth.admin('ADMIN_USUARIOS', query, ctx);
  }

  @Get('usuarios/:id/permisos')
  @ApiParam({ name: 'id', description: 'Id del usuario (cópialo de GET /admin/usuarios)' })
  @ApiOperation({ summary: 'Permisos del usuario: por rol, excepciones vigentes y efectivos' })
  @ApiProblemResponses(404)
  usuarioPermisos(
    @Param('id', new ParseUUIDPipe()) usuarioId: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<UsuarioPermisosDto> {
    return this.auth.admin('ADMIN_USUARIO_PERMISOS', { usuarioId }, ctx);
  }

  @Put('usuarios/:id/excepciones/:permiso')
  @ApiParam({ name: 'id', description: 'Id del usuario (cópialo de GET /admin/usuarios)' })
  @ApiParam({ name: 'permiso', enum: PERMISOS, example: 'compras.registrar' })
  @ApiOperation({ summary: 'Otorga (GRANT) o deniega (DENY) un permiso a un usuario, con motivo y vigencia' })
  @ApiProblemResponses(400, 404, 422)
  guardar(
    @Param('id', new ParseUUIDPipe()) usuarioId: string,
    @Param('permiso', PermisoPipe) permiso: Permiso,
    @Body() dto: GuardarExcepcionDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<UsuarioPermisosDto> {
    return this.auth.admin('ADMIN_EXCEPCION_GUARDAR', { usuarioId, permiso, ...dto }, ctx);
  }

  @Delete('usuarios/:id/excepciones/:permiso')
  @ApiParam({ name: 'id', description: 'Id del usuario (cópialo de GET /admin/usuarios)' })
  @ApiParam({ name: 'permiso', enum: PERMISOS, example: 'compras.registrar' })
  @ApiOperation({ summary: 'Elimina la excepción (vuelve a lo definido por el rol)' })
  @ApiProblemResponses(404)
  eliminar(
    @Param('id', new ParseUUIDPipe()) usuarioId: string,
    @Param('permiso', PermisoPipe) permiso: Permiso,
    @ReqContext() ctx: RequestContext,
  ): Promise<UsuarioPermisosDto> {
    return this.auth.admin('ADMIN_EXCEPCION_ELIMINAR', { usuarioId, permiso }, ctx);
  }
}
