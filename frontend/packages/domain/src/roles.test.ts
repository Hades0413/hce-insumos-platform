import { describe, expect, it } from 'vitest';
import {
  filtrarPorPermiso,
  navParaPermisos,
  permisosEfectivos,
  PERMISOS_POR_ROL,
  tienePermiso,
  ZONE_TABS,
} from './roles';

describe('tienePermiso', () => {
  it('solo concede permisos presentes en el conjunto efectivo', () => {
    expect(tienePermiso(['ventas.ver', 'ventas.registrar'], 'ventas.registrar')).toBe(true);
    expect(tienePermiso(['ventas.ver'], 'ventas.registrar')).toBe(false);
  });

  it('sin sesión o conjunto inválido => nunca concede', () => {
    expect(tienePermiso(undefined, 'kardex.ver')).toBe(false);
    expect(tienePermiso([], 'kardex.ver')).toBe(false);
  });
});

describe('permisosEfectivos', () => {
  it('usa los del servidor (incluye excepciones) y descarta códigos desconocidos', () => {
    expect(
      permisosEfectivos({
        rol: 'FARMACEUTICO',
        permisos: ['ventas.ver', 'compras.registrar', 'hack.total'],
      }),
    ).toEqual(['ventas.ver', 'compras.registrar']);
  });

  it('respaldo: permisos por defecto del rol si la sesión no los trae', () => {
    expect(permisosEfectivos({ rol: 'ALMACENERO' })).toEqual(PERMISOS_POR_ROL.ALMACENERO);
  });

  it('un DENY del servidor gana sobre el rol (lista vacía no cae al rol)', () => {
    expect(permisosEfectivos({ rol: 'ADMIN', permisos: [] })).toEqual([]);
  });
});

describe('navegación por permisos', () => {
  it('farmacéutico: ventas, compras (solo ver) y kardex; sin seguridad', () => {
    expect(navParaPermisos(PERMISOS_POR_ROL.FARMACEUTICO).map((n) => n.key)).toEqual([
      'inicio',
      'compras',
      'ventas',
      'kardex',
    ]);
  });

  it('solo el administrador ve "Usuarios y permisos"', () => {
    expect(navParaPermisos(PERMISOS_POR_ROL.ADMIN).some((n) => n.key === 'seguridad')).toBe(true);
    expect(navParaPermisos(PERMISOS_POR_ROL.ALMACENERO).some((n) => n.key === 'seguridad')).toBe(false);
  });

  it('pestañas: sin compras.registrar no aparece "Registrar compra"', () => {
    const tabs = filtrarPorPermiso(ZONE_TABS.compras!, PERMISOS_POR_ROL.FARMACEUTICO).map((t) => t.label);
    expect(tabs).toEqual(['Historial de compras']);
  });

  it('una excepción GRANT habilita la pestaña', () => {
    const tabs = filtrarPorPermiso(ZONE_TABS.compras!, [...PERMISOS_POR_ROL.FARMACEUTICO, 'compras.registrar']);
    expect(tabs).toHaveLength(2);
  });
});
