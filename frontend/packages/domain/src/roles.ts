export type Rol = 'ADMIN' | 'ALMACENERO' | 'FARMACEUTICO';

export const PERMISOS = [
  'productos.ver',
  'productos.registrar',
  'productos.editar',
  'productos.eliminar',
  'productos.precio_manual',
  'compras.ver',
  'compras.registrar',
  'ventas.ver',
  'ventas.registrar',
  'kardex.ver',
  'seguridad.administrar',
] as const;

export type Permiso = (typeof PERMISOS)[number];

const PERMISO_SET: ReadonlySet<string> = new Set(PERMISOS);
export const esPermiso = (value: unknown): value is Permiso => typeof value === 'string' && PERMISO_SET.has(value);

export const PERMISOS_POR_ROL: Readonly<Record<Rol, ReadonlyArray<Permiso>>> = {
  ADMIN: PERMISOS,
  ALMACENERO: [
    'productos.ver',
    'productos.registrar',
    'productos.editar',
    'compras.ver',
    'compras.registrar',
    'ventas.ver',
    'kardex.ver',
  ],
  FARMACEUTICO: ['productos.ver', 'ventas.ver', 'ventas.registrar', 'compras.ver', 'kardex.ver'],
};

export function permisosEfectivos(
  user: { rol: Rol; permisos?: ReadonlyArray<string> } | undefined,
): ReadonlyArray<Permiso> {
  if (!user) return [];
  if (Array.isArray(user.permisos)) return user.permisos.filter(esPermiso);
  return PERMISOS_POR_ROL[user.rol] ?? [];
}

export function tienePermiso(permisos: ReadonlyArray<string> | undefined, permiso: Permiso): boolean {
  return Array.isArray(permisos) && permisos.includes(permiso);
}

export type ZoneKey = 'inicio' | 'compras' | 'ventas' | 'kardex' | 'seguridad';

export interface NavItem {
  key: ZoneKey;
  label: string;
  href: string;
  permiso?: Permiso;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { key: 'inicio', label: 'Inicio', href: '/' },
  {
    key: 'compras',
    label: 'Compras',
    href: '/compras',
    permiso: 'compras.ver',
  },
  { key: 'ventas', label: 'Ventas', href: '/ventas', permiso: 'ventas.ver' },
  { key: 'kardex', label: 'Kardex', href: '/kardex', permiso: 'kardex.ver' },
  {
    key: 'seguridad',
    label: 'Usuarios y permisos',
    href: '/seguridad',
    permiso: 'seguridad.administrar',
  },
];

export function filtrarPorPermiso<T extends { permiso?: Permiso }>(
  items: ReadonlyArray<T>,
  permisos: ReadonlyArray<string> | undefined,
): T[] {
  return items.filter((i) => !i.permiso || tienePermiso(permisos, i.permiso));
}

export const navParaPermisos = (permisos: ReadonlyArray<string> | undefined): NavItem[] =>
  permisos === undefined ? [] : filtrarPorPermiso(NAV_ITEMS, permisos);

export interface ZoneTab {
  href: string;
  label: string;
  permiso: Permiso;
}

export const ZONE_TABS: Readonly<Partial<Record<ZoneKey, ReadonlyArray<ZoneTab>>>> = {
  compras: [
    { href: '/', label: 'Registrar compra', permiso: 'compras.registrar' },
    {
      href: '/historial',
      label: 'Historial de compras',
      permiso: 'compras.ver',
    },
  ],
  ventas: [
    { href: '/', label: 'Registrar venta', permiso: 'ventas.registrar' },
    { href: '/historial', label: 'Historial de ventas', permiso: 'ventas.ver' },
  ],
  kardex: [
    { href: '/', label: 'Kardex', permiso: 'kardex.ver' },
    { href: '/productos', label: 'Productos', permiso: 'productos.ver' },
  ],
};

export const ROL_LABEL: Readonly<Record<Rol, string>> = {
  ADMIN: 'Administrador',
  ALMACENERO: 'Almacenero',
  FARMACEUTICO: 'Químico farmacéutico',
};

export const PERMISO_LABEL: Readonly<Record<Permiso, string>> = {
  'productos.ver': 'Ver productos',
  'productos.registrar': 'Registrar productos',
  'productos.editar': 'Editar productos',
  'productos.eliminar': 'Eliminar productos',
  'productos.precio_manual': 'Fijar precio de venta manual',
  'compras.ver': 'Ver compras',
  'compras.registrar': 'Registrar compras',
  'ventas.ver': 'Ver ventas',
  'ventas.registrar': 'Registrar ventas',
  'kardex.ver': 'Ver kardex',
  'seguridad.administrar': 'Administrar usuarios y permisos',
};
