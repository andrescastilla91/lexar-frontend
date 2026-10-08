import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { SettingsPlanPage } from '../pages/settings-plan.page';
import { openSettingsSection } from '../pages/settings-nav';
import { chooseSelectOption } from '../pages/app-select';

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Entra a una sección de Configuración y espera a que llegue la empresa: el
 * formulario se rellena con `patchValue` al cargarla y pisaría lo que el test
 * ya hubiera escrito.
 */
async function gotoSettingsTab(page: Page, tab: string): Promise<void> {
  const loaded = page.waitForResponse(
    (response) => response.request().method() === 'GET' && new URL(response.url()).pathname.endsWith('/company'),
  );
  await page.goto(`/configuracion?tab=${tab}`);
  await loaded;
}

const banner = (page: Page) => page.locator('[data-test="billing-incomplete"]');
const missingBox = (page: Page) => page.locator('[data-test="readiness-missing"]');

// F45: los datos de facturación son requisito del primer plan de pago. Lo que
// el e2e de UI no cubre (subir el RUT a S3 y completar un NIT con dígito
// válido) lo cubre test/f45-billing-data.e2e-spec.ts del backend.
test.describe('Datos de facturación antes de contratar (F45)', () => {
  test('en Trial la pantalla de planes avisa qué falta y lleva a Facturación', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    await new SettingsPlanPage(page).gotoPlanTab();

    await expect(banner(page)).toBeVisible();
    await expect(banner(page)).toContainText('rut cargado');

    await banner(page).getByRole('button', { name: 'Completar datos de facturación' }).click();

    await expect(page).toHaveURL(/tab=billing/);
    await expect(page.getByRole('heading', { name: 'Documentos de la empresa' })).toBeVisible();
    await expect(missingBox(page)).toContainText('RUT cargado');
  });

  test('elegir un plan de pago con datos incompletos no abre la pasarela: avisa y lleva a Facturación', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    await new SettingsPlanPage(page).gotoPlanTab();

    await page.getByRole('button', { name: 'Actualizar a Estudio' }).click();

    await expect(
      page.getByText('Completa los datos de facturación de tu empresa para contratar un plan de pago.'),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/tab=billing/);
  });

  test('los datos fiscales se guardan, sobreviven a recargar y salen de la lista de pendientes', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    await gotoSettingsTab(page, 'billing');

    await expect(missingBox(page)).toContainText('Tipo de persona');
    await expect(missingBox(page)).toContainText('Departamento');
    await expect(missingBox(page)).toContainText('Régimen tributario');

    await chooseSelectOption(page, page.getByRole('combobox', { name: 'Tipo de persona' }), 'Persona jurídica');
    await page.getByRole('checkbox', { name: /O-13/ }).check();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('Datos de facturación guardados correctamente.')).toBeVisible();
    await expect(missingBox(page)).not.toContainText('Tipo de persona');
    // Departamento, ciudad y régimen son datos legales: se completan en esa sección.
    await expect(missingBox(page)).toContainText('Departamento');
    await expect(missingBox(page)).toContainText('RUT cargado');

    await page.reload();

    await expect(page.getByRole('combobox', { name: 'Tipo de persona' })).toContainText('Persona jurídica');
    await expect(page.getByRole('checkbox', { name: /O-13/ })).toBeChecked();
  });

  test('departamento y ciudad salen del listado oficial y el régimen es una lista cerrada', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    await gotoSettingsTab(page, 'legal');

    const department = page.locator('[data-test="department"] button[role="combobox"]');
    const city = page.locator('[data-test="city"] button[role="combobox"]');

    // La ciudad espera al departamento.
    await expect(city).toBeDisabled();

    await chooseSelectOption(page, department, 'Cundinamarca', 'cundina');
    await expect(city).toBeEnabled();
    await chooseSelectOption(page, city, 'Zipaquirá', 'zipaquira');

    // Cambiar de departamento limpia una ciudad que ya no le pertenece.
    await chooseSelectOption(page, department, 'Antioquia', 'antioq');
    await expect(city).toContainText('Selecciona la ciudad');

    await chooseSelectOption(page, city, 'Medellín', 'medellin');
    await chooseSelectOption(
      page,
      page.locator('[data-test="tax-regime"] button[role="combobox"]'),
      'No responsable de IVA',
    );
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Datos legales guardados correctamente.')).toBeVisible();

    await page.reload();
    await expect(department).toContainText('Antioquia');
    await expect(city).toContainText('Medellín');
    await expect(page.locator('[data-test="tax-regime"] button[role="combobox"]')).toContainText(
      'No responsable de IVA',
    );
  });

  test('los correos de facturación y de contacto inválidos se avisan y no dejan guardar', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    await gotoSettingsTab(page, 'billing');
    await page.locator('[data-test="billing-email"]').fill('facturas@empresa');
    await page.locator('[data-test="billing-email"]').blur();
    await expect(page.locator('[data-test="billing-email-error"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await page.locator('[data-test="billing-email"]').fill('facturas@empresa.com');
    await expect(page.locator('[data-test="billing-email-error"]')).toHaveCount(0);

    await gotoSettingsTab(page, 'legal');
    await page.locator('[data-test="contact-email"]').fill('no-es-correo');
    await page.locator('[data-test="contact-email"]').blur();
    await expect(page.locator('[data-test="contact-email-error"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  test('un dígito de verificación de más de un número no se puede guardar', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    await gotoSettingsTab(page, 'billing');

    await page.locator('[data-test="check-digit"]').evaluate((input: HTMLInputElement) => {
      input.removeAttribute('maxlength');
    });
    await page.locator('[data-test="check-digit"]').fill('12');

    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  test('los documentos: el RUT se marca requerido y la cámara de comercio pide la fecha antes del archivo', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    await page.goto('/configuracion');
    await openSettingsSection(page, 'Facturación');

    const rut = page.locator('[data-document-type="RUT"]');
    const chamber = page.locator('[data-document-type="CHAMBER_OF_COMMERCE"]');
    await expect(rut).toContainText('Requerido para contratar');
    await expect(chamber).not.toContainText('Requerido para contratar');
    await expect(page.locator('[data-document-type="LEGAL_REP_ID"]')).toBeVisible();

    await expect(chamber.locator('input[type="file"]')).toBeDisabled();
    await chamber.locator('[data-test="issue-date"]').fill('2026-09-01');
    await expect(chamber.locator('input[type="file"]')).toBeEnabled();
  });
});
