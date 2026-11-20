# 0004. JWT ES256 de 30 min en cookies HttpOnly + refresh rotativo

## Contexto

El examen exige JWT de 30 minutos e idealmente cookies HttpOnly. Guardar tokens en `localStorage` los
expone a XSS.

## Decisión

- Access token: JWT ES256 (la clave privada solo vive en auth-service), 30 min, cookie `HttpOnly; SameSite=Strict; Secure` y host-only.
- Refresh token: opaco y rotativo, con detección de reuso (revoca la familia) y vida absoluta de 12 h.
- CSRF: *signed double-submit* atado a la sesión.
- Revocación inmediata: el JWT lleva `sid` y los gateways reciben eventos de revocación. El front usa interceptores Axios (refresh *single-flight*).

## Consecuencias

Ventajas:

- El JavaScript nunca ve tokens; un logout o un robo detectado invalida el access token al instante.

Desventajas:

- Las listas de revocación viven en memoria por réplica; la ventana máxima es de 30 min si una réplica arranca después del evento.
