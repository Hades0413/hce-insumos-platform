# Cómo levantar el proyecto

Guía paso a paso para levantar HCE Insumos en un equipo local con Docker.

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Docker y Docker Compose | Docker 24+ y Compose 2.24+ | Levantar todos los servicios |
| make | cualquiera | Comandos cortos (`make dev`, `make prod`) |
| openssl | cualquiera | Generar secretos y certificados la primera vez |
| Node.js y pnpm | Node 24 y pnpm 11 | Solo para `make dev` y para correr las pruebas |

Memoria libre recomendada: 4 GB para `make prod` y 6 GB para `make dev`. SQL Server usa 2 GB.

## 2. Primera vez

```bash
git clone <url-del-repo> hce-insumos
cd hce-insumos
make prod
```

`make prod` hace todo lo necesario:

1. Ejecuta `scripts/setup.sh`, que crea el archivo `.env` con contraseñas aleatorias, las claves del JWT y los
   certificados TLS internos (`secrets/tls/`). Si `.env` ya existe, no lo toca.
2. Construye las imágenes de los 3 microservicios y los 4 microfrontends.
3. Levanta SQL Server, crea las bases y carga los datos demo.
4. Levanta NATS, el backend y el frontend.

La primera vez tarda unos 5 minutos. Para ver si terminó:

```bash
make ps
```

Todos los servicios deben decir `healthy`. `certs-init` y `db-init` aparecen como terminados: solo corren al
arrancar.

## 3. Entrar al sistema

| Qué | Dirección |
|---|---|
| Aplicación | http://localhost:3000 |
| Swagger (documentación de la API) | http://localhost:4000/api/docs |
| Estado de los servicios | http://localhost:4000/api/v1/health |

Usuarios demo (todos con la misma contraseña):

| Usuario | Rol |
|---|---|
| `admin@hce.local` | Administrador |
| `almacen@hce.local`, `jefe.almacen@hce.local` | Almacenero |
| `farmacia@hce.local`, `tecnico.farmacia@hce.local` | Químico farmacéutico |

La contraseña la muestra `scripts/setup.sh` al terminar y queda guardada en `.env`, en la variable
`SEED_USERS_PASSWORD`:

```bash
grep SEED_USERS_PASSWORD .env
```

## 4. Modo producción y modo desarrollo

| Comando | Qué hace | Cuándo usarlo |
|---|---|---|
| `make prod` | Construye las imágenes optimizadas y levanta todo | Revisar o presentar el sistema tal como se entrega |
| `make dev` | Levanta todo con el código montado: al guardar un archivo, el backend se recompila y el front se actualiza | Hacer cambios y verlos al instante, sin reconstruir imágenes |

Detalles de `make dev`:

- Instala las dependencias con `pnpm install` si no están (`backend/node_modules`, `frontend/node_modules`).
- La primera compilación tarda 1 a 2 minutos. El avance se ve con `make logs`.
- Para volver a las imágenes de producción basta con ejecutar `make prod`.

Los dos modos usan la misma base de datos, así que se puede pasar de uno a otro sin perder datos.

## 5. Comandos del día a día

| Comando | Qué hace |
|---|---|
| `make dev` | Levanta en modo desarrollo |
| `make prod` | Levanta en modo producción |
| `make ps` | Estado de los contenedores |
| `make logs` | Logs de todos los servicios (Ctrl+C para salir) |
| `make stop` | Detiene los contenedores sin quitarlos |
| `make down` | Quita los contenedores; los datos se conservan |
| `make clean` | Quita contenedores y datos; al volver a levantar se recarga la base demo |
| `make help` | Lista todos los comandos |

Para ver los logs de un solo servicio:

```bash
docker compose logs -f api-gateway
```

## 6. Conectarse a la base de datos (DBeaver)

`make dev` y `make prod` publican SQL Server en `127.0.0.1:1433`, solo accesible desde el propio equipo.

| Parámetro | Valor |
|---|---|
| Host / puerto | `localhost` / `1433` |
| Usuario | `sa` |
| Contraseña | `MSSQL_SA_PASSWORD` en `.env` |
| Bases de datos | `HCE_Insumos` y `HCE_Auth` |
| Driver properties | `encrypt=true` y `trustServerCertificate=true` |

En DBeaver, en la pestaña Main, marcar "Show all databases" para ver las dos bases.

También se puede abrir una consola SQL sin instalar nada:

```bash
make db-shell
```

## 7. Pruebas

| Comando | Qué prueba |
|---|---|
| `make test` | Lint, tipos y tests de backend y frontend |
| `make test-browser` | Recorre el sistema en Chrome (13 pasos). Requiere el sistema levantado |
| `make test-api` | Ejecuta la colección de Postman contra la API. Requiere el sistema levantado |

La prueba en navegador y la de Postman crean registros. Para volver a los datos demo limpios:

```bash
make clean
make prod
```

## 8. Problemas comunes

| Síntoma | Solución |
|---|---|
| `port is already allocated` (3000, 4000 o 1433) | Otro programa usa el puerto. Cerrarlo o detener el otro contenedor (`docker ps`) |
| `Falta secrets/tls: ejecuta ./scripts/setup.sh` | Ejecutar `make prod` o `./scripts/setup.sh` |
| Un servicio queda en `starting` mucho tiempo | Revisar sus logs con `docker compose logs <servicio>`. En `make dev` la primera compilación tarda más |
| No se puede iniciar sesión | Revisar la contraseña con `grep SEED_USERS_PASSWORD .env` |
| Se quiere empezar de cero | `make clean` y luego `make prod` o `make dev` |
| Se regeneró `.env` con `./scripts/setup.sh --force` | Las contraseñas de la base cambian: ejecutar `make clean` antes de volver a levantar |
