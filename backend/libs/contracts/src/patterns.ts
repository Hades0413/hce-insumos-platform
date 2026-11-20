export const CONTRACT_VERSION = 'v1' as const;

export const QUEUE_GROUPS = {
  AUTH: 'auth-service',
  INVENTORY: 'inventory-service',
} as const;

export const AUTH_PATTERNS = {
  LOGIN: 'auth.v1.session.login',
  REFRESH: 'auth.v1.session.refresh',
  LOGOUT: 'auth.v1.session.logout',
  HEALTH: 'auth.v1.health',
  ADMIN_PERMISOS: 'auth.v1.admin.permisos',
  ADMIN_ROLES: 'auth.v1.admin.roles',
  ADMIN_USUARIOS: 'auth.v1.admin.usuarios',
  ADMIN_USUARIO_PERMISOS: 'auth.v1.admin.usuario-permisos',
  ADMIN_EXCEPCION_GUARDAR: 'auth.v1.admin.excepcion-guardar',
  ADMIN_EXCEPCION_ELIMINAR: 'auth.v1.admin.excepcion-eliminar',
} as const;

export const AUTH_EVENTS = {
  SESSION_REVOKED: 'auth.v1.events.session-revoked',
  PERMISSIONS_CHANGED: 'auth.v1.events.permissions-changed',
} as const;

export const INVENTORY_PATTERNS = {
  PRODUCTO_CREAR: 'inventory.v1.producto.crear',
  PRODUCTO_ACTUALIZAR: 'inventory.v1.producto.actualizar',
  PRODUCTO_ELIMINAR: 'inventory.v1.producto.eliminar',
  PRODUCTO_LISTAR: 'inventory.v1.producto.listar',
  PRODUCTO_OBTENER: 'inventory.v1.producto.obtener',
  COMPRA_REGISTRAR: 'inventory.v1.compra.registrar',
  COMPRA_LISTAR: 'inventory.v1.compra.listar',
  COMPRA_OBTENER: 'inventory.v1.compra.obtener',
  VENTA_REGISTRAR: 'inventory.v1.venta.registrar',
  VENTA_LISTAR: 'inventory.v1.venta.listar',
  VENTA_OBTENER: 'inventory.v1.venta.obtener',
  KARDEX_LISTAR: 'inventory.v1.kardex.listar',
  KARDEX_MOVIMIENTOS: 'inventory.v1.kardex.movimientos',
  HEALTH: 'inventory.v1.health',
} as const;

export const INVENTORY_EVENTS = {
  COMPRA_REGISTRADA: 'inventory.v1.events.compra-registrada',
  VENTA_REGISTRADA: 'inventory.v1.events.venta-registrada',
} as const;
