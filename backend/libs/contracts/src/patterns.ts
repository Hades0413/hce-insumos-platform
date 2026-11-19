/**
 * Contrato de mensajería NATS (subjects). Cada microservicio se suscribe con un
 * queue group => N réplicas comparten la carga (escalado horizontal sin LB extra).
 */
export const QUEUE_GROUPS = {
  AUTH: 'auth-service',
  INVENTORY: 'inventory-service',
} as const;

export const AUTH_PATTERNS = {
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  LOGOUT: 'auth.logout',
  HEALTH: 'auth.health',
} as const;

export const INVENTORY_PATTERNS = {
  PRODUCTO_CREAR: 'inventory.producto.crear',
  PRODUCTO_ACTUALIZAR: 'inventory.producto.actualizar',
  PRODUCTO_ELIMINAR: 'inventory.producto.eliminar',
  PRODUCTO_LISTAR: 'inventory.producto.listar',
  PRODUCTO_OBTENER: 'inventory.producto.obtener',
  COMPRA_REGISTRAR: 'inventory.compra.registrar',
  COMPRA_LISTAR: 'inventory.compra.listar',
  COMPRA_OBTENER: 'inventory.compra.obtener',
  VENTA_REGISTRAR: 'inventory.venta.registrar',
  VENTA_LISTAR: 'inventory.venta.listar',
  VENTA_OBTENER: 'inventory.venta.obtener',
  KARDEX_LISTAR: 'inventory.kardex.listar',
  KARDEX_MOVIMIENTOS: 'inventory.kardex.movimientos',
  HEALTH: 'inventory.health',
} as const;
