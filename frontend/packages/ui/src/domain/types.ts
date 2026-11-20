export interface ProductoOption {
  id: number;
  nombre: string;
  nroLote: string;
  costo: number;
  precioVenta: number;
  stock: number;
}

export interface DocumentoLineaView {
  id: number;
  productoId: number;
  productoNombre: string;
  nroLote: string;
  cantidad: number;
  precio: number;
  subTotal: number;
  igv: number;
  total: number;
}

export interface DocumentoResumenView {
  id: number;
  fecRegistro: string;
  subTotal: number;
  igv: number;
  total: number;
  cantidadItems: number;
}

export interface DocumentoView extends DocumentoResumenView {
  detalles: DocumentoLineaView[];
}

export interface Importes {
  subTotal: number;
  igv: number;
  total: number;
}
