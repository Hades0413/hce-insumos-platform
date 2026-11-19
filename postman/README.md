# Colección Postman — HCE Insumos

1. Importar `hce-insumos.postman_collection.json` y `hce-insumos.local.postman_environment.json`.
2. Seleccionar el entorno **HCE Insumos - local**.
3. Ejecutar en orden: **Auth › CSRF token** → **Auth › Login (admin)** → resto.

- La sesión viaja en cookies **HttpOnly** (`hce_at`, `hce_rt`) que Postman guarda en su cookie jar.
- Toda escritura envía `X-CSRF-Token: {{csrfToken}}` (un script de colección lo obtiene si falta).
- `POST /compras` y `POST /ventas` generan `Idempotency-Key` automáticamente; la petición
  "Reintento misma Idempotency-Key" demuestra que un reintento no duplica el documento.
- Cada request incluye tests (status, reglas de negocio). Se puede correr completa con el
  **Collection Runner** o por CLI: `npx newman run hce-insumos.postman_collection.json -e hce-insumos.local.postman_environment.json`.
