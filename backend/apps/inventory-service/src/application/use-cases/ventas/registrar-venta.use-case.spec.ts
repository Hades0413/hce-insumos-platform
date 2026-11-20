import { ErrorCode, RequestContext } from '@hce/contracts';
import { Producto } from '../../../domain/producto/producto';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { Money } from '../../../domain/shared/money';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { VentaRepository } from '../../../domain/venta/venta.repository.port';
import { hashItems } from '../../request-hash';
import { RegistrarVentaUseCase } from './registrar-venta.use-case';

const ctx: RequestContext = { userId: 'u1', rol: 'FARMACEUTICO', permisos: [], requestId: 'req-1' };
const IDEMPOTENCY_UUID = crypto.randomUUID();
const producto = (precio: number, stock = 10) =>
  Producto.rehidratar({
    id: 1,
    nombre: 'P1',
    nroLote: 'L',
    fecRegistro: new Date(),
    costo: Money.ZERO,
    precioVenta: Money.fromDecimal(precio),
    stock,
    rowVersion: 'AAAAAAAAB+s=',
  });

function setup() {
  const productos = { obtenerPorIds: jest.fn() } as unknown as jest.Mocked<ProductoRepository>;
  const ventas = {
    registrar: jest.fn(),
    obtener: jest.fn(),
    listar: jest.fn(),
    buscarPorIdempotencia: jest.fn().mockResolvedValue(null),
  } as unknown as jest.Mocked<VentaRepository>;
  const useCase = new RegistrarVentaUseCase(productos, ventas, PoliticaPrecios.fromRates(0.18, 0.35));
  return { productos, ventas, useCase };
}

describe('RegistrarVentaUseCase', () => {
  it('reintenta con precios frescos si el precio cambió durante la transacción', async () => {
    const { productos, ventas, useCase } = setup();
    productos.obtenerPorIds.mockResolvedValueOnce([producto(1)]).mockResolvedValueOnce([producto(2)]);
    ventas.registrar
      .mockResolvedValueOnce({ tipo: 'PRECIO_CAMBIADO' })
      .mockResolvedValueOnce({ tipo: 'REGISTRADA', id: 7 });
    ventas.obtener.mockResolvedValue({ id: 7 } as never);

    await expect(
      useCase.execute({ idempotencyKey: IDEMPOTENCY_UUID, items: [{ productoId: 1, cantidad: 1 }] }, ctx),
    ).resolves.toEqual({ id: 7 });
    expect(ventas.registrar).toHaveBeenCalledTimes(2);
    const segundaVenta = ventas.registrar.mock.calls[1][0];
    expect(segundaVenta.lineas[0].precio.toDecimal()).toBe(2);
  });

  it('traduce el conflicto de stock detectado bajo lock en la BD', async () => {
    const { productos, ventas, useCase } = setup();
    productos.obtenerPorIds.mockResolvedValue([producto(1, 5)]);
    ventas.registrar.mockResolvedValue({
      tipo: 'STOCK_INSUFICIENTE',
      conflictos: [{ productoId: 1, stockDisponible: 0, cantidadSolicitada: 5 }],
    });
    await expect(
      useCase.execute({ idempotencyKey: IDEMPOTENCY_UUID, items: [{ productoId: 1, cantidad: 5 }] }, ctx),
    ).rejects.toMatchObject({
      code: ErrorCode.STOCK_INSUFICIENTE,
      details: [expect.objectContaining({ field: 'items[0].cantidad', stockDisponible: 0 })],
    });
  });

  it('reintento con la misma key devuelve la venta original aunque ya no haya stock (INV-IDEM-01)', async () => {
    const { productos, ventas, useCase } = setup();
    const items = [{ productoId: 1, cantidad: 5 }];
    ventas.buscarPorIdempotencia.mockResolvedValue({ id: 3, requestHash: hashItems(items, ctx.userId) });
    ventas.obtener.mockResolvedValue({ id: 3 } as never);
    await expect(useCase.execute({ idempotencyKey: IDEMPOTENCY_UUID, items }, ctx)).resolves.toEqual({ id: 3 });
    expect(productos.obtenerPorIds).not.toHaveBeenCalled();
    expect(ventas.registrar).not.toHaveBeenCalled();
  });

  it('la misma key usada por OTRO usuario es conflicto (no devuelve documentos ajenos)', async () => {
    const { ventas, useCase } = setup();
    const items = [{ productoId: 1, cantidad: 5 }];
    ventas.buscarPorIdempotencia.mockResolvedValue({ id: 3, requestHash: hashItems(items, 'otro-usuario') });
    await expect(useCase.execute({ idempotencyKey: IDEMPOTENCY_UUID, items }, ctx)).rejects.toMatchObject({
      code: ErrorCode.IDEMPOTENCY_CONFLICT,
    });
  });

  it('exige Idempotency-Key UUID', async () => {
    const { useCase } = setup();
    await expect(useCase.execute({ idempotencyKey: 'x', items: [] }, ctx)).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
  });
});
