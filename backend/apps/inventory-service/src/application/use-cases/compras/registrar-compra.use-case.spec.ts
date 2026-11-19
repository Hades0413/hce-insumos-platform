import { ErrorCode, RequestContext } from '@hce/contracts';
import { CompraRepository } from '../../../domain/compra/compra.repository.port';
import { ProductoRepository } from '../../../domain/producto/producto.repository.port';
import { PoliticaPrecios } from '../../../domain/shared/politica-precios';
import { RegistrarCompraUseCase } from './registrar-compra.use-case';

const ctx: RequestContext = { userId: 'u1', rol: 'ALMACENERO', requestId: 'req-1' };
const IDEMPOTENCY_UUID = crypto.randomUUID();

describe('RegistrarCompraUseCase', () => {
  it('no registra si algún producto no existe (sugiere registrarlo antes)', async () => {
    const productos = { obtenerPorIds: jest.fn().mockResolvedValue([]) } as unknown as ProductoRepository;
    const compras = { registrar: jest.fn() } as unknown as jest.Mocked<CompraRepository>;
    const useCase = new RegistrarCompraUseCase(productos, compras, PoliticaPrecios.fromRates(0.18, 0.35));

    await expect(
      useCase.execute(
        { idempotencyKey: IDEMPOTENCY_UUID, items: [{ productoId: 5, cantidad: 1, costoUnitario: 1 }] },
        ctx,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    expect(compras.registrar).not.toHaveBeenCalled();
  });
});
