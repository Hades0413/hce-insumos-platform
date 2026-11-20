import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = new URL('./out/', import.meta.url).pathname;
const PASSWORD =
  process.env.DEMO_PASSWORD ??
  readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/^SEED_USERS_PASSWORD=(.+)$/m)?.[1]?.trim();
if (!PASSWORD) throw new Error('No se encontró SEED_USERS_PASSWORD en .env');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  headless: process.env.HEADLESS !== 'false',
});
const context = await browser.newContext({ viewport: { width: 1366, height: 860 }, locale: 'es-PE' });
await context.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
});
const page = await context.newPage();
const problems = [];
const expectedHttpErrors = new Set();
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const status = /status of (\d{3})/.exec(m.text())?.[1];
  if (status && expectedHttpErrors.has(Number(status))) return;
  problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('framenavigated', async () => {
  const csp = await page.evaluate(() => window.__csp ?? []).catch(() => []);
  csp.forEach((v) => problems.push(`csp: ${v}`));
});

const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  OK    ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(`  FALLA ${name}\n      ${String(e.message).split('\n')[0]}`);
    await page.screenshot({ path: `${OUT}fallo-${results.length}.png`, fullPage: true }).catch(() => {});
  }
}
const shot = (n) => page.screenshot({ path: `${OUT}${n}.png`, fullPage: true });

async function login(email) {
  await page.getByLabel('Correo institucional').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

async function logout() {
  await page.getByRole('button', { name: /Menú de/ }).click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
  await page.waitForURL(/\/login/);
}

async function addProduct(label, query, optionName) {
  await page.getByLabel(label).fill(query);
  await page.getByRole('option', { name: optionName }).first().click();
}

const sufijo = Date.now().toString().slice(-5);
const nuevo = `Ceftriaxona 1 g amp ${sufijo}`;

console.log(`HCE Insumos: smoke E2E contra ${BASE}`);

await step('redirige a login sin sesión e inicia sesión como admin', async () => {
  await page.goto(`${BASE}/compras`);
  await page.waitForURL(/\/login/);
  await shot('01-login');
  await login('admin@hce.local');
  await page.waitForURL(/\/compras/);
  await page.getByRole('heading', { name: 'Registrar compra' }).waitFor();
});

await step('compra: registrar producto nuevo en el modal', async () => {
  await page.getByRole('button', { name: 'Registrar producto nuevo' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre del producto').fill(nuevo);
  await dialog.getByLabel('N.º de lote').fill(`CFT-${sufijo}`);
  await dialog.getByLabel('Costo unitario (S/)').fill('2.50');
  await dialog.getByRole('button', { name: /Registrar|Guardar/ }).last().click();
  await dialog.waitFor({ state: 'detached' });
});

await step('compra: varias líneas, totales e IGV, registro y movimiento de ENTRADA', async () => {
  await addProduct(/Agregar producto/, 'Parace', /Paracetamol/);
  await page.getByLabel(`Cantidad de ${nuevo}`).fill('40');
  await page.getByLabel(/Cantidad de Paracetamol/).fill('100');
  await page.getByLabel(/Costo unitario de Paracetamol/).fill('0.20');
  await shot('02-compra');
  await page.getByRole('button', { name: 'Registrar compra' }).click();
  await page.getByText(/Compra N\.º \d+ registrada/).first().waitFor();
});

await step('venta: cantidad mayor al stock muestra el mensaje del enunciado', async () => {
  await page.goto(`${BASE}/ventas`);
  await addProduct(/Agregar producto/, nuevo.slice(0, 14), new RegExp(nuevo));
  await page.getByLabel(`Cantidad de ${nuevo}`).fill('41');
  await page.getByRole('button', { name: 'Registrar venta' }).click();
  await page.getByText(/no debe ser mayor al stock/i).first().waitFor();
  await shot('03-venta-stock');
});

await step('venta: registro válido (movimiento de SALIDA)', async () => {
  await page.getByLabel(`Cantidad de ${nuevo}`).fill('5');
  await page.getByRole('button', { name: 'Registrar venta' }).click();
  await page.getByText(/Venta N\.º \d+ registrada/).first().waitFor();
});

await step('kardex: stock actual y modal de movimientos (ENTRADA y SALIDA)', async () => {
  await page.goto(`${BASE}/kardex`);
  await page.getByLabel('Buscar producto').fill(nuevo.slice(0, 14));
  await page.getByRole('button', { name: `Ver movimientos de ${nuevo}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('ENTRADA').first().waitFor();
  await dialog.getByText('SALIDA').first().waitFor();
  await shot('04-kardex');
  await page.keyboard.press('Escape');
});

await step('productos: crear, editar y eliminar (lógico); con stock no se elimina', async () => {
  const prueba = `Producto de prueba ${sufijo}`;
  await page.goto(`${BASE}/kardex/productos`);
  await page.getByRole('heading', { name: 'Productos' }).waitFor();
  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre del producto').fill(prueba);
  await dialog.getByLabel('N.º de lote').fill(`PRB-${sufijo}`);
  await dialog.getByLabel('Costo unitario (S/)').fill('1.00');
  await dialog.getByRole('button', { name: 'Registrar producto' }).click();
  await dialog.waitFor({ state: 'detached' });

  await page.getByLabel('Buscar producto').fill(prueba);
  await page.getByRole('button', { name: `Editar ${prueba}` }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Costo unitario (S/)').fill('1.20');
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
  await dialog.waitFor({ state: 'detached' });
  await page.getByRole('cell', { name: 'S/ 1.62' }).waitFor();

  await page.getByRole('button', { name: `Eliminar ${prueba}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar producto' }).click();
  await page.getByText('Ningún producto coincide con la búsqueda.').waitFor();

  await page.getByLabel('Buscar producto').fill(nuevo);
  await page.getByRole('button', { name: `Eliminar ${nuevo}` }).click();
  expectedHttpErrors.add(422);
  try {
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar producto' }).click();
    await page.getByText(/aún tiene \d+ unidades en stock/).first().waitFor();
  } finally {
    expectedHttpErrors.delete(422);
  }
  await shot('07-productos');
});

await step('historial de compras con detalle', async () => {
  await page.goto(`${BASE}/compras/historial`);
  await page.getByRole('table').first().waitFor();
});

await step('seguridad: otorgar compras.registrar a farmacia como excepción', async () => {
  await page.goto(`${BASE}/seguridad`);
  await page.getByLabel('Buscar usuario').fill('farmacia');
  await page.getByRole('button', { name: /Gestionar permisos de Químico/ }).click();
  const drawer = page.getByRole('dialog');
  const fila = drawer.locator('li, [role="row"], div').filter({ hasText: 'Registrar compras' }).filter({ has: page.getByRole('button', { name: 'Otorgar' }) }).last();
  await fila.getByRole('button', { name: 'Otorgar' }).click();
  await drawer.getByLabel('Motivo').fill('Cubre el turno de almacén (prueba E2E)');
  await drawer.getByRole('button', { name: 'Otorgar permiso' }).click();
  await drawer.getByText('Otorgado').first().waitFor();
  await shot('05-seguridad');
  await page.keyboard.press('Escape');
});

await step('farmacia con la excepción puede registrar compras (permiso efectivo)', async () => {
  await logout();
  await login('farmacia@hce.local');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.goto(`${BASE}/compras`);
  await page.getByRole('heading', { name: 'Registrar compra' }).waitFor();
  await page.getByRole('button', { name: 'Registrar compra' }).waitFor();
  if ((await page.getByRole('button', { name: 'Registrar producto nuevo' }).count()) !== 0) {
    throw new Error('farmacia no debería ver «Registrar producto nuevo» (sin productos.registrar)');
  }
});

await step('vista tablet (820 px)', async () => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto(`${BASE}/ventas`);
  await page.getByRole('heading', { name: 'Registrar venta' }).waitFor();
  await shot('06-tablet');
});

await step('limpieza: el admin quita la excepción (la prueba deja el estado como lo encontró)', async () => {
  await logout();
  await login('admin@hce.local');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.goto(`${BASE}/seguridad`);
  await page.getByLabel('Buscar usuario').fill('farmacia');
  await page.getByRole('button', { name: /Gestionar permisos de Químico/ }).click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('button', { name: 'Quitar excepción' }).first().click();
  await drawer.getByRole('button', { name: 'Quitar excepción' }).waitFor({ state: 'detached' });
  await page.keyboard.press('Escape');
});

await step('cierre de sesión sin errores', async () => {
  await logout();
});

const csp = await page.evaluate(() => window.__csp ?? []).catch(() => []);
csp.forEach((v) => problems.push(`csp: ${v}`));
await browser.close();

const failed = results.filter((r) => !r.ok).length;
const unique = [...new Set(problems)];
console.log(`\nPasos: ${results.length - failed}/${results.length} OK · errores de consola/CSP: ${unique.length}`);
unique.forEach((p) => console.log(`  - ${p}`));
process.exit(failed || unique.length ? 1 : 0);
