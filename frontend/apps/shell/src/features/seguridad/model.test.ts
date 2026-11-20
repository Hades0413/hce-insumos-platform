import { describe, expect, it } from 'vitest';
import type { PermisosUsuarioDto } from '@hce/api-client';
import { agruparPorModulo, aplicarExcepcion, estadoPermiso, excepcionSchema } from './model';

const base: PermisosUsuarioDto = {
  usuario: {
    id: '1',
    email: 'f@hce.local',
    nombreCompleto: 'F',
    rol: 'FARMACEUTICO',
  },
  permisosRol: ['ventas.ver', 'ventas.registrar'],
  excepciones: [],
  efectivos: ['ventas.ver', 'ventas.registrar'],
};

describe('estadoPermiso', () => {
  it('distingue heredado por rol, otorgado, denegado y sin acceso', () => {
    const dto = aplicarExcepcion(
      aplicarExcepcion(base, 'compras.registrar', {
        tipo: 'GRANT',
        motivo: 'x',
        vigenteHasta: null,
        otorgadoPor: 'a',
      }),
      'ventas.registrar',
      {
        tipo: 'DENY',
        motivo: 'x',
        vigenteHasta: null,
        otorgadoPor: 'a',
      },
    );
    expect(estadoPermiso(dto, 'ventas.ver')).toMatchObject({
      estado: 'rol',
      efectivo: true,
    });
    expect(estadoPermiso(dto, 'compras.registrar')).toMatchObject({
      estado: 'otorgado',
      efectivo: true,
    });
    expect(estadoPermiso(dto, 'ventas.registrar')).toMatchObject({
      estado: 'denegado',
      efectivo: false,
    });
    expect(estadoPermiso(dto, 'kardex.ver')).toMatchObject({
      estado: 'sin-acceso',
      efectivo: false,
    });
  });

  it('quitar la excepción vuelve al permiso del rol', () => {
    const denegado = aplicarExcepcion(base, 'ventas.registrar', {
      tipo: 'DENY',
      motivo: 'x',
      vigenteHasta: null,
      otorgadoPor: 'a',
    });
    expect(estadoPermiso(aplicarExcepcion(denegado, 'ventas.registrar', null), 'ventas.registrar')).toMatchObject({
      estado: 'rol',
      efectivo: true,
    });
  });
});

describe('formulario de excepción', () => {
  it('exige motivo de 10+ caracteres y vigencia futura', () => {
    expect(excepcionSchema.safeParse({ motivo: 'corto' }).success).toBe(false);
    expect(
      excepcionSchema.safeParse({
        motivo: 'Cobertura de turno noche',
        vigenteHasta: '2000-01-01T00:00',
      }).success,
    ).toBe(false);
    expect(excepcionSchema.safeParse({ motivo: 'Cobertura de turno noche' }).success).toBe(true);
  });
});

it('agrupa por módulo', () => {
  expect(agruparPorModulo([{ modulo: 'A' }, { modulo: 'B' }, { modulo: 'A' }]).map(([m, l]) => [m, l.length])).toEqual([
    ['A', 2],
    ['B', 1],
  ]);
});
