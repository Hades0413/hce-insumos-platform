# 0005. Autorización por permisos con excepciones por usuario

## Contexto

Autorizar por nombre de rol es rígido: un usuario de un rol puede necesitar, de forma temporal, un
permiso adicional (o perder uno).

## Decisión

11 permisos granulares por acción. El rol solo define permisos por defecto; `auth.UsuarioPermisos` admite
excepciones GRANT/DENY (DENY gana) con motivo, vigencia y autor, registradas en una bitácora *append-only*. Los
permisos efectivos viajan firmados en el JWT. La autorización se aplica en la UI (solo experiencia de usuario), en el
gateway (`@Auth('compras.registrar')`) y en el microservicio (`AuthorizedUseCase`). Un cambio emite
`permissions-changed` y el usuario obtiene sus permisos nuevos sin cerrar sesión.

## Consecuencias

Ventajas:

- Los accesos temporales y auditables cubren casos reales (cobertura de turnos).

Desventajas:

- El JWT crece unos bytes por permiso; es despreciable con 11 permisos.
