/** Tokens de inyección de los casos de uso (los adaptadores dependen de abstracciones — DIP). */
export const USE_CASES = {
  REGISTRAR_PRODUCTO: Symbol('RegistrarProducto'),
  ACTUALIZAR_PRODUCTO: Symbol('ActualizarProducto'),
  ELIMINAR_PRODUCTO: Symbol('EliminarProducto'),
  OBTENER_PRODUCTO: Symbol('ObtenerProducto'),
  LISTAR_PRODUCTOS: Symbol('ListarProductos'),
  REGISTRAR_COMPRA: Symbol('RegistrarCompra'),
  LISTAR_COMPRAS: Symbol('ListarCompras'),
  OBTENER_COMPRA: Symbol('ObtenerCompra'),
  REGISTRAR_VENTA: Symbol('RegistrarVenta'),
  LISTAR_VENTAS: Symbol('ListarVentas'),
  OBTENER_VENTA: Symbol('ObtenerVenta'),
  LISTAR_KARDEX: Symbol('ListarKardex'),
  LISTAR_MOVIMIENTOS: Symbol('ListarMovimientos'),
} as const;

export const POLITICA_PRECIOS = Symbol('POLITICA_PRECIOS');
