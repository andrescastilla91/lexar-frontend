import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { GlobalSearchPage } from '../pages/global-search.page';

/**
 * E2E de F18 — overlay de búsqueda global (Ctrl+K).
 *
 * NOTA (deuda técnica conocida): los e2e de Playwright de este repo vienen
 * fallando desde F4 por causas no atribuidas a specs concretos (ver
 * checklist de deuda técnica pre-deploy). Si este spec falla junto con los
 * demás, diagnosticar igual que los anteriores en vez de asumir que el bug
 * está en la búsqueda global.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Crea un cliente real y único vía API directa (`page.request`, comparte
 * cookies con el browser context) en vez del formulario de "Nuevo cliente":
 * ese formulario tiene bastantes más campos que el mínimo necesario para
 * este spec, y el CRUD completo de clientes no es lo que se prueba aquí.
 * `fullName` es el único campo requerido de `CreateClientDto` (backend),
 * pero `email` e `identificationNumber` también hay que enviarlos: las
 * columnas `clients.email` y `clients.identification_number` en BD tienen
 * NOT NULL aunque el DTO los marca opcionales (deuda de esquema, Bug 14 —
 * ver BACKLOG-BUGS.md) — la UI real nunca choca con esto porque el
 * formulario ya exige ambos campos (Validators.required en
 * client-form.component.ts).
 */
async function createClient(page: Page, fullName: string, email: string): Promise<void> {
  const created = await page.request.post(`${E2E_API_ORIGIN}/api/clients`, {
    data: { fullName, email, identificationNumber: `${Date.now()}${Math.floor(Math.random() * 10_000)}` },
  });
  if (!created.ok()) {
    throw new Error(
      `No se pudo crear el cliente de prueba: ${created.status()} ${await created.text()}`,
    );
  }
}

test.describe('Búsqueda global (F18)', () => {
  test('Ctrl+K abre el overlay, encuentra un cliente recién creado y navega a su detalle al hacer click', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    const uniqueSuffix = Date.now();
    const uniqueName = `Cliente Búsqueda E2E ${uniqueSuffix}`;
    await createClient(page, uniqueName, `cliente.busqueda.e2e.${uniqueSuffix}@lexar-test.com`);

    const searchPage = new GlobalSearchPage(page);
    await searchPage.openWithShortcut();
    await expect(searchPage.searchInput).toBeVisible();

    await searchPage.search(uniqueName);

    const result = searchPage.resultItem(uniqueName);
    await expect(result).toBeVisible();
    await result.click();

    // El detalle del cliente abre como panel de edición (no una vista
    // aparte) — la URL vuelve a /clientes (el `?openId=` se limpia con
    // `replaceUrl` apenas se usa) y el formulario queda precargado con los
    // datos del cliente encontrado.
    await expect(page).toHaveURL(/\/clientes$/);
    await expect(
      page.locator('input[formcontrolname="fullName"]'),
    ).toHaveValue(uniqueName);
  });
});
