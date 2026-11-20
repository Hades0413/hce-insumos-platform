import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

const DESCRIPTION = `
API REST del sistema de control de medicamentos e insumos (compras, ventas y kardex).

## Primeros pasos (3 clics)
1. **Auth → POST /auth/login** → *Try it out* → *Execute* (el ejemplo ya trae un usuario demo).
2. Listo: la sesión queda en cookies **HttpOnly** del navegador; no hay que copiar tokens.
3. Prueba cualquier endpoint. Esta página agrega sola el token **CSRF** y, en compras/ventas,
   una **Idempotency-Key** nueva por ejecución.

| Usuario demo | Permisos principales |
|---|---|
| \`admin@hce.local\` | Todo (incluida *Seguridad*) |
| \`almacen@hce.local\` | Productos y compras |
| \`farmacia@hce.local\` | Ventas |

La contraseña demo la imprime \`./scripts/setup.sh\` (variable \`SEED_USERS_PASSWORD\` del \`.env\`).

## Convenciones
- **Autorización por permisos** (\`x-permisos\` en cada operación); los roles solo definen permisos por defecto.
- **Errores** en formato RFC 7807 (\`application/problem+json\`) con \`code\` estable y \`requestId\` para soporte.
- **Montos** con 2 decimales; IGV = 18% del subtotal; precio de venta = costo × 1.35.
`;

export function setupSwagger(app: INestApplication, demoPassword?: string): void {
  const config = new DocumentBuilder()
    .setTitle('HCE Insumos API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0.0')
    .addCookieAuth('hce_at', { type: 'apiKey', in: 'cookie', name: 'hce_at' }, 'hce_at')
    .addTag('Auth', 'Inicio y cierre de sesión (cookies HttpOnly, CSRF)')
    .addTag('Productos', 'Medicamentos e insumos por lote')
    .addTag('Compras', 'Entradas al kardex; actualizan costo y precio de venta')
    .addTag('Ventas', 'Salidas del kardex con validación de stock')
    .addTag('Kardex', 'Stock actual y movimientos por producto')
    .addTag('Seguridad', 'Usuarios, roles y excepciones de permisos')
    .addTag('Health', 'Estado de los servicios')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  addExamples(document, demoPassword);

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'HCE Insumos API',
    jsonDocumentUrl: 'api/docs-json',
    customCss:
      '.swagger-ui .topbar{display:none}.swagger-ui .info .title{color:#0b6e4f}' +
      '.swagger-ui .opblock-tag{font-size:1.1rem}.swagger-ui .scheme-container{box-shadow:none}',
    swaggerOptions: {
      withCredentials: true,
      persistAuthorization: false,
      tryItOutEnabled: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      defaultModelsExpandDepth: 0,
      requestInterceptor: (req: { url: string; method?: string; headers: Record<string, string> }) => {
        const method = (req.method ?? 'GET').toUpperCase();
        if (['GET', 'HEAD', 'OPTIONS'].includes(method) || req.url.includes('/auth/csrf')) return req;
        const path = new URL(req.url, (globalThis as unknown as { location: { href: string } }).location.href).pathname;
        if (/\/(compras|ventas)$/.test(path) && !req.headers['Idempotency-Key']) {
          req.headers['Idempotency-Key'] = crypto.randomUUID();
        }
        return fetch('/api/v1/auth/csrf', { credentials: 'same-origin' })
          .then((r) => r.json() as Promise<{ csrfToken: string }>)
          .then((d) => {
            req.headers['X-CSRF-Token'] = d.csrfToken;
            return req;
          });
      },
    },
  });
}

function addExamples(document: OpenAPIObject, demoPassword?: string): void {
  const schemas = (document.components?.schemas ?? {}) as Record<
    string,
    { properties?: Record<string, { example?: unknown }> }
  >;
  const login = schemas.LoginDto?.properties;
  if (login) {
    login.email.example = 'admin@hce.local';
    login.password.example = demoPassword || 'contraseña impresa por setup.sh';
  }
  schemas.ProblemDetails = {
    type: 'object',
    properties: {
      type: { example: 'about:blank' },
      title: { example: 'Unprocessable Entity' },
      status: { example: 422 },
      code: { example: 'STOCK_INSUFICIENTE' },
      detail: { example: 'La cantidad no debe ser mayor al stock' },
      instance: { example: '/api/v1/ventas' },
      requestId: { example: '6a1f3c2e-8b1d-4c9e-9f0a-2d3e4f5a6b7c' },
      errors: {
        example: [
          { field: 'items[0].cantidad', message: 'La cantidad no debe ser mayor al stock (stock disponible: 5).' },
        ],
      },
    },
  } as never;
  document.components = { ...document.components, schemas: schemas };
}
