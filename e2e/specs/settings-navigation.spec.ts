import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';

/**
 * Navegación de Configuración (/configuracion) en distintos anchos: selector
 * desplegable en móvil y layout usable del detalle de Catálogos en 1024 px
 * (el menú de secciones y la lista de catálogos no deben aplastar el detalle).
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('Configuración: navegación responsive', () => {
  test('en móvil las secciones están detrás de un botón (sin select nativo) y cambian la URL', async ({
    page,
    tenant,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await loginAsAdmin(page, tenant);
    await page.goto('/configuracion');

    const sectionNav = page.locator('nav[aria-label="Secciones de configuración"]');
    const toggle = page.getByRole('button', { name: /^Sección:/ });
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText('Datos legales');
    await expect(sectionNav).toBeHidden();
    await expect(page.locator('select')).toHaveCount(0);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await sectionNav.getByRole('button', { name: 'Seguridad', exact: true }).click();

    await expect(page).toHaveURL(/tab=security/);
    await expect(toggle).toContainText('Seguridad');
    await expect(sectionNav).toBeHidden();
  });

  test('en 1024 px el detalle de Catálogos conserva ancho útil y su botón no se corta', async ({ page, tenant }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAsAdmin(page, tenant);
    await page.goto('/configuracion?tab=catalogs&tipo=risk_level');

    const heading = page.getByRole('heading', { name: 'Niveles de riesgo', level: 3 });
    const newItem = page.getByRole('button', { name: 'Nuevo ítem' });
    await expect(heading).toBeVisible();
    await expect(newItem).toBeVisible();

    await expect(page.getByRole('button', { name: /^Catálogo:/ })).toBeVisible();
    await expect(page.locator('nav[aria-label="Catálogos disponibles"]')).toBeHidden();

    const headingBox = await heading.boundingBox();
    const buttonBox = await newItem.boundingBox();
    expect(headingBox!.width).toBeGreaterThan(150);
    expect(headingBox!.height).toBeLessThan(40);
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(1024);
  });

  test('en pantallas amplias la lista de catálogos y el detalle conviven', async ({ page, tenant }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await loginAsAdmin(page, tenant);
    await page.goto('/configuracion?tab=catalogs&tipo=risk_level');

    await expect(page.locator('nav[aria-label="Catálogos disponibles"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Catálogo:/ })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Niveles de riesgo', level: 3 })).toBeVisible();
  });
});
