import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
const PASSWORD =
  process.env.DEMO_PASSWORD ??
  readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/^SEED_USERS_PASSWORD=(.+)$/m)?.[1]?.trim();
if (!PASSWORD) throw new Error('No se encontró SEED_USERS_PASSWORD en .env');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: 'es-PE',
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const shot = async (name, { keepFocus = false } = {}) => {
  if (!keepFocus) await page.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());
  if (!keepFocus) await page.mouse.move(2, page.viewportSize().height - 2);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`  ${name}.png`);
};
const addProduct = async (query, option) => {
  const input = page.getByLabel(/Agregar producto/);
  await input.click();
  await input.pressSequentially(query, { delay: 30 });
  await page.getByRole('option', { name: option }).first().click();
};

console.log(`Capturas contra ${BASE} -> docs/screenshots/`);

await page.goto(`${BASE}/login`);
await page.getByLabel('Correo institucional').fill('admin@hce.local');
await page.getByLabel('Contraseña').fill(PASSWORD);
await shot('login');
await page.getByRole('button', { name: 'Ingresar' }).click();
await page.waitForURL((u) => !u.pathname.startsWith('/login'));

await page.goto(`${BASE}/`);
await page.getByRole('heading', { level: 1 }).waitFor();
await shot('inicio');

await page.getByRole('button', { name: /Menú de/ }).click();
await page.getByRole('menuitem', { name: 'Cerrar sesión' }).waitFor();
await shot('menu-usuario', { keepFocus: true });
await page.keyboard.press('Escape');

await page.goto(`${BASE}/compras`);
await page.getByRole('heading', { name: 'Registrar compra' }).waitFor();
await addProduct('Parace', /Paracetamol/);
await addProduct('Amoxi', /Amoxicilina/);
await page.getByLabel(/Cantidad de Paracetamol/).fill('500');
await page.getByLabel(/Costo unitario de Paracetamol/).fill('0.16');
await page.getByLabel(/Cantidad de Amoxicilina/).fill('200');
await page.getByLabel(/Costo unitario de Amoxicilina/).fill('0.44');
await shot('compra');

await page.getByRole('button', { name: 'Registrar producto nuevo' }).click();
const modal = page.getByRole('dialog');
await modal.getByLabel('Nombre del producto').fill('Diclofenaco 75 mg/3 ml amp');
await modal.getByLabel('N.º de lote').fill('DCF-2611-305');
await modal.getByLabel('Costo unitario (S/)').fill('0.95');
await shot('modal-producto');
await page.keyboard.press('Escape');

await page.goto(`${BASE}/ventas`);
await page.getByRole('heading', { name: 'Registrar venta' }).waitFor();
await addProduct('Omepra', /Omeprazol/);
await addProduct('Salbu', /Salbutamol/);
await page.getByLabel(/Cantidad de Omeprazol/).fill('20');
await page.getByLabel(/Cantidad de Salbutamol/).fill('999');
await page.getByRole('button', { name: 'Registrar venta' }).click();
await page.getByText(/no debe ser mayor al stock/i).first().waitFor();
await shot('venta-stock');

await page.goto(`${BASE}/kardex`);
await page.getByRole('table').first().waitFor();
await shot('kardex');

await page.getByLabel('Buscar producto').fill('Paracetamol');
await page.getByRole('button', { name: /Ver movimientos de Paracetamol/ }).first().click();
await page.getByRole('dialog').getByText('ENTRADA').first().waitFor();
await shot('kardex-movimientos');
await page.keyboard.press('Escape');

await page.goto(`${BASE}/kardex/productos`);
await page.getByRole('heading', { name: 'Productos' }).waitFor();
await page.getByRole('table').first().waitFor();
await shot('productos');

await page.getByLabel('Buscar producto').fill('Paracetamol');
await page.getByRole('button', { name: /Editar Paracetamol/ }).first().click();
await page.getByRole('dialog').waitFor();
await shot('producto-editar');
await page.keyboard.press('Escape');

await page.goto(`${BASE}/seguridad`);
await page.getByLabel('Buscar usuario').fill('farmacia');
await page.getByRole('button', { name: /Gestionar permisos de Químico/ }).click();
await page.getByRole('dialog').waitFor();
await shot('seguridad');
await page.keyboard.press('Escape');

await page.setViewportSize({ width: 820, height: 1180 });
await page.goto(`${BASE}/ventas`);
await page.getByRole('heading', { name: 'Registrar venta' }).waitFor();
await addProduct('Parace', /Paracetamol/);
await page.getByLabel(/Cantidad de Paracetamol/).fill('30');
await shot('tablet-ventas');

await browser.close();
console.log('Listo.');
