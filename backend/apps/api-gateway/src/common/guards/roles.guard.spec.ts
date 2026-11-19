import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '@hce/contracts';
import { RolesGuard } from './roles.guard';

const ctxFor = (rol?: Rol) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: rol ? { rol } : undefined }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
  const guard = new RolesGuard(reflector);

  it('permite sin roles requeridos', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctxFor('FARMACEUTICO'))).toBe(true);
  });

  it('ADMIN accede a todo; los demás solo a sus roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['ALMACENERO']);
    expect(guard.canActivate(ctxFor('ADMIN'))).toBe(true);
    expect(guard.canActivate(ctxFor('ALMACENERO'))).toBe(true);
    expect(() => guard.canActivate(ctxFor('FARMACEUTICO'))).toThrow();
  });
});
