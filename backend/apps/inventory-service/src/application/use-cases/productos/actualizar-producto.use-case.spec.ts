import { ErrorCode, RequestContext } from '@hce/contracts';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { ActualizarProductoUseCase } from './actualizar-producto.use-case';

const base = { id: 1, nombre: 'Paracetamol', nroLote: 'L-1', costo: 1, rowVersion: 'AAAAAAAAB+s=' };
const ctx = (rol: RequestContext['rol']): RequestContext => ({
  userId: 'u',
  rol,
  permisos: rol === 'ADMIN' ? ['productos.editar', 'productos.precio_manual'] : ['productos.editar'],
  requestId: 'r',
});

describe('ActualizarProductoUseCase: regla de precio (INV-PRICE-03)', () => {
  const repo = { actualizar: jest.fn() } as unknown as jest.Mocked<ProductoRepository>;
  const useCase = new ActualizarProductoUseCase(repo, PoliticaPrecios.fromRates(0.18, 0.35));

  it('sin precio manual deriva precio = costo × 1.35', async () => {
    repo.actualizar.mockResolvedValue({} as never);
    await useCase.execute(base, ctx('ALMACENERO')).catch(() => undefined);
    expect(repo.actualizar.mock.calls[0][1].precioVenta.toDecimal()).toBe(1.35);
  });

  it('precio manual: ALMACENERO no puede; ADMIN no puede vender bajo el costo', async () => {
    await expect(useCase.execute({ ...base, precioVenta: 0 }, ctx('ALMACENERO'))).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
    await expect(useCase.execute({ ...base, precioVenta: 0.5 }, ctx('ADMIN'))).rejects.toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
    });
  });
});
