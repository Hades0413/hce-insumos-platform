export const USE_CASES = {
  LOGIN: Symbol('Login'),
  REFRESH_SESSION: Symbol('RefreshSession'),
  LOGOUT: Symbol('Logout'),
  LISTAR_PERMISOS: Symbol('ListarPermisos'),
  LISTAR_ROLES: Symbol('ListarRoles'),
  LISTAR_USUARIOS: Symbol('ListarUsuarios'),
  OBTENER_PERMISOS_USUARIO: Symbol('ObtenerPermisosUsuario'),
  GUARDAR_EXCEPCION: Symbol('GuardarExcepcion'),
  ELIMINAR_EXCEPCION: Symbol('EliminarExcepcion'),
} as const;
