import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marca un endpoint como accesible sin sesión (deny-by-default para todo lo demás). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
