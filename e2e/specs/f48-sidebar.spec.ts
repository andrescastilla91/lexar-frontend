import { Page } from '@playwright/test';
import { expect, test } from '../shared/tenant-fixture';
import { createRestrictedUser } from '../shared/restricted-user';
import { LoginPage } from '../pages/login.page';

/**
 * F48 — menú lateral: grupos por dominio, Configuración en la navegación
 * principal y rail colapsable con preferencia persistente.
 */

async function login(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
}

const sidebar = (page: Page) => page.getByRole('complementary', { name: 'Navegación principal' });
const sectionHeadings = (page: Page) => sidebar(page).locator('nav p');

test.describe('Menú lateral (F48)', () => {
  test('el administrador ve los grupos por dominio y llega a Configuración desde el menú', async ({ page, tenant }) => {
    await login(page, tenant.adminEmail, tenant.adminPassword);

    await expect(sectionHeadings(page)).toHaveText(['Trabajo', 'Asistencia', 'Administración']);

    await sidebar(page).getByRole('link', { name: 'Configuración' }).click();
    await expect(page).toHaveURL(/\/configuracion/);
    await expect(sidebar(page).getByRole('link', { name: 'Configuración' })).toHaveAttribute('aria-current', 'page');
  });

  test('la sección activa se marca con aria-current', async ({ page, tenant }) => {
    await login(page, tenant.adminEmail, tenant.adminPassword);

    await sidebar(page).getByRole('link', { name: 'Clientes' }).click();

    await expect(page).toHaveURL(/\/clientes/);
    await expect(sidebar(page).getByRole('link', { name: 'Clientes' })).toHaveAttribute('aria-current', 'page');
    await expect(sidebar(page).getByRole('link', { name: 'Procesos' })).not.toHaveAttribute('aria-current', 'page');
  });

  test('el menú completo cabe sin scroll en 1366×768', async ({ page, tenant }) => {
    await page.setViewportSize({ width: 1366, height: 650 });
    await login(page, tenant.adminEmail, tenant.adminPassword);

    const nav = sidebar(page).locator('nav');
    const fits = await nav.evaluate((element) => element.scrollHeight <= element.clientHeight);
    expect(fits).toBe(true);
  });

  test('colapsar a rail se conserva al recargar y se puede expandir de nuevo', async ({ page, tenant }) => {
    await login(page, tenant.adminEmail, tenant.adminPassword);

    await sidebar(page).getByRole('button', { name: 'Contraer menú' }).click();
    await expect(sidebar(page)).toHaveClass(/lg:w-16/);
    expect((await sidebar(page).boundingBox())?.width).toBe(64);

    await page.reload();
    await expect(sidebar(page)).toHaveClass(/lg:w-16/);
    await expect(sidebar(page).getByRole('link', { name: 'Clientes' })).toBeVisible();

    await sidebar(page).getByRole('button', { name: 'Expandir menú' }).click();
    await expect(sidebar(page)).toHaveClass(/lg:w-72/);
    await page.reload();
    await expect(sidebar(page)).toHaveClass(/lg:w-72/);
  });

  test('en el rail el tooltip aparece al enfocar un ítem con el teclado', async ({ page, tenant }) => {
    await login(page, tenant.adminEmail, tenant.adminPassword);
    await sidebar(page).getByRole('button', { name: 'Contraer menú' }).click();

    const link = sidebar(page).locator('a[data-menu-route="/clientes"]');
    await link.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');

    await expect(link.locator('[data-menu-tooltip]')).toBeVisible();
    await expect(link.locator('[data-menu-tooltip]')).toContainText('Portafolio y riesgos asociados');
  });

  test('un rol sin permisos administrativos no ve el grupo Administración ni su encabezado', async ({ page, tenant }) => {
    const restricted = await createRestrictedUser(tenant, ['clients.list', 'tasks.view'], 'Solo trabajo');
    await login(page, restricted.email, restricted.password);

    await expect(sectionHeadings(page)).toHaveText(['Trabajo', 'Asistencia']);
    await expect(sidebar(page).getByRole('link', { name: 'Clientes' })).toBeVisible();
    await expect(sidebar(page).getByRole('link', { name: 'Tareas' })).toBeVisible();
    await expect(sidebar(page).getByRole('link', { name: 'Configuración' })).toHaveCount(0);
    await expect(sidebar(page).getByRole('link', { name: 'Usuarios' })).toHaveCount(0);
  });

  test('la preferencia de colapsar es por usuario', async ({ page, tenant }) => {
    const other = await createRestrictedUser(tenant, ['clients.list'], 'Otro usuario');
    await login(page, tenant.adminEmail, tenant.adminPassword);
    await sidebar(page).getByRole('button', { name: 'Contraer menú' }).click();
    await expect(sidebar(page)).toHaveClass(/lg:w-16/);

    await page.getByRole('button', { name: 'Admin E2E' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, other.email, other.password);

    await expect(sidebar(page)).toHaveClass(/lg:w-72/);
  });

  test('el encabezado muestra el grupo de la sección y ya no dice «Panel central»', async ({ page, tenant }) => {
    await login(page, tenant.adminEmail, tenant.adminPassword);
    await sidebar(page).getByRole('link', { name: 'Usuarios' }).click();
    await expect(page).toHaveURL(/\/usuarios/);

    const header = page.locator('header');
    await expect(header.getByText('Administración', { exact: true })).toBeVisible();
    await expect(header.getByText('Usuarios', { exact: true })).toBeVisible();
    await expect(header.getByText('Panel central')).toHaveCount(0);
  });

  test('en móvil el título del encabezado queda en una sola línea', async ({ page, tenant }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await login(page, tenant.adminEmail, tenant.adminPassword);
    await page.goto('/usuarios');

    const title = page.locator('header').getByText('Usuarios', { exact: true });
    await expect(title).toBeVisible();
    const box = await title.boundingBox();
    expect(box!.height).toBeLessThan(30);
    await expect(page.locator('header').getByText('Administración', { exact: true })).toBeHidden();
  });
});
