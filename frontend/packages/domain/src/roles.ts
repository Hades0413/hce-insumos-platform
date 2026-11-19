export type Rol = 'ADMIN' | 'ALMACENERO' | 'FARMACEUTICO';

export type Permiso =
  | 'productos:escribir'
  | 'productos:eliminar'
  | 'compras:registrar'
  | 'ventas:registrar'
  | 'lectura';

/** Espejo de la matriz RBAC del gateway (que es la autoridad real). */
const MATRIZ: Readonly<Record<Rol, ReadonlySet<Permiso>>> = {
  ADMIN: new Set<Permiso>(['productos:escribir', 'productos:eliminar', 'compras:registrar', 'ventas:registrar', 'lectura']),
  ALMACENERO: new Set<Permiso>(['productos:escribir', 'compras:registrar', 'lectura']),
  FARMACEUTICO: new Set<Permiso>(['ventas:registrar', 'lectura']),
};

export const tienePermiso = (rol: Rol | undefined, permiso: Permiso): boolean =>
  rol !== undefined && (MATRIZ[rol]?.has(permiso) ?? false);

export type ZoneKey = 'inicio' | 'compras' | 'ventas' | 'kardex';

export interface NavItem {
  key: ZoneKey;
  label: string;
  href: string;
  roles: ReadonlyArray<Rol>;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { key: 'inicio', label: 'Inicio', href: '/', roles: ['ADMIN', 'ALMACENERO', 'FARMACEUTICO'] },
  { key: 'compras', label: 'Compras', href: '/compras', roles: ['ADMIN', 'ALMACENERO'] },
  { key: 'ventas', label: 'Ventas', href: '/ventas', roles: ['ADMIN', 'FARMACEUTICO'] },
  { key: 'kardex', label: 'Kardex', href: '/kardex', roles: ['ADMIN', 'ALMACENERO', 'FARMACEUTICO'] },
];

export const navParaRol = (rol: Rol | undefined): NavItem[] =>
  rol ? NAV_ITEMS.filter((i) => i.roles.includes(rol)) : [];

export const ROL_LABEL: Readonly<Record<Rol, string>> = {
  ADMIN: 'Administrador',
  ALMACENERO: 'Almacenero',
  FARMACEUTICO: 'Farmacéutico',
};
