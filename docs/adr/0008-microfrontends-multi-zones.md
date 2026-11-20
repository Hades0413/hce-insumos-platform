# 0008. Microfrontends con Next.js Multi-Zones

## Contexto

El examen pide un frontend Next.js con enfoque de microfrontends.

## Decisión

- Zonas: `shell` (login, inicio, seguridad) + `mf-compras`, `mf-ventas` y `mf-kardex` como apps Next independientes, unidas por *rewrites* bajo un solo origen.
- Paquetes compartidos: `@hce/ui` (solo presentación), `@hce/features` (contenedores con datos), `@hce/api-client` (Axios con interceptores) y `@hce/domain` (reglas puras).

## Consecuencias

Ventajas:

- Cada zona se construye y despliega por separado; un solo origen simplifica cookies, CORS y CSP.

Desventajas:

- Al pasar de una zona a otra el navegador carga la página completa.
