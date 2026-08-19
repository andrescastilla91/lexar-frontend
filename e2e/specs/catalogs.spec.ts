import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { SettingsCatalogsPage } from '../pages/settings-catalogs.page';

/**
 * E2E de la pestaña "Catálogos" en Configuración (F25 — catálogos configurables por tenant).
 *
 * NOTA (deuda técnica conocida): los e2e de Playwright de este repo (login,
 * feature-flag) ya vienen fallando desde F4 por causas no atribuidas a estos
 * specs concretos (ver checklist de deuda técnica pre-deploy). Estos tests
 * nuevos siguen el mismo patrón de fixtures/page-objects existente; si fallan,
 * se debe diagnosticar igual que los anteriores en vez de asumir que el bug
 * está en la feature de catálogos.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('Configuración > Catálogos (F25)', () => {
  test('muestra los tipos de documento sembrados por defecto para una empresa nueva', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    const catalogsPage = new SettingsCatalogsPage(page);
    await catalogsPage.goto();

    await expect(page.getByText('Cédula de Ciudadanía')).toBeVisible();
    // .first(): el ítem sembrado "NIT" tiene code="NIT" y label="NIT" —
    // ambos se renderizan como spans separados en la misma fila (ver
    // settings-catalogs.component.ts), así que el texto exacto matchea 2
    // elementos. Alcanza con confirmar que al menos uno esté visible.
    await expect(page.getByText('NIT', { exact: true }).first()).toBeVisible();
  });

  test('cambiar de tipo de catálogo muestra los niveles de riesgo por defecto', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const catalogsPage = new SettingsCatalogsPage(page);
    await catalogsPage.goto();
    await catalogsPage.selectCatalogType('Niveles de riesgo');

    await expect(page.getByText('Bajo', { exact: true })).toBeVisible();
    await expect(page.getByText('Medio', { exact: true })).toBeVisible();
    await expect(page.getByText('Alto', { exact: true })).toBeVisible();
  });

  test('crear un ítem nuevo lo hace aparecer inmediatamente en la lista', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const catalogsPage = new SettingsCatalogsPage(page);
    await catalogsPage.goto();
    await catalogsPage.selectCatalogType('Especialidades de asesor');

    const uniqueLabel = `Especialidad E2E ${Date.now()}`;
    await catalogsPage.createItem(`E2E_${Date.now()}`, uniqueLabel);

    await expect(page.getByText(uniqueLabel)).toBeVisible();
  });

  test('desactivar un ítem lo marca como inactivo sin eliminarlo', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const catalogsPage = new SettingsCatalogsPage(page);
    await catalogsPage.goto();
    await catalogsPage.selectCatalogType('Especialidades de asesor');

    const uniqueLabel = `Desactivable E2E ${Date.now()}`;
    await catalogsPage.createItem(`E2E_DESACT_${Date.now()}`, uniqueLabel);

    const row = catalogsPage.itemRow(uniqueLabel);
    await row.getByRole('button', { name: 'Desactivar' }).click();

    await expect(row.getByText('Inactivo')).toBeVisible();
    await expect(row.getByText(uniqueLabel)).toBeVisible();
  });
});
