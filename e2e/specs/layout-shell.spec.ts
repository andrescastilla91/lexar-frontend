import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

/**
 * E2E de regresión para el shell principal (`MainLayoutComponent`).
 *
 * Bug corregido 2026-08-05: en viewports de escritorio angostos (~1222px,
 * por encima del breakpoint `md` que activa vistas anchas como la tabla de
 * asesores), el contenedor de contenido no tenía `min-w-0` y el `<aside>`
 * no tenía `shrink-0` — el navegador encogía el sidebar en vez de dejar que
 * el contenido generara su propio scroll horizontal contenido.
 *
 * NOTA (deuda técnica conocida): los e2e de Playwright de este repo vienen
 * fallando desde F4 por causas no atribuidas a specs concretos (ver
 * checklist de deuda técnica pre-deploy). Si este spec falla junto con los
 * demás, diagnosticar igual que los anteriores en vez de asumir que el bug
 * está en el shell.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('Shell principal — ancho del sidebar en escritorio angosto', () => {
  test('el aside no se encoge y el contenedor de contenido puede hacerlo, en un viewport de ~1222px', async ({
    page,
    tenant,
  }) => {
    await page.setViewportSize({ width: 1222, height: 800 });
    await loginAsAdmin(page, tenant);

    const aside = page.locator('aside');
    await expect(aside).toBeVisible();

    const asideStyles = await aside.evaluate((el) => {
      const style = getComputedStyle(el);
      return { flexShrink: style.flexShrink, widthPx: el.getBoundingClientRect().width };
    });

    // w-72 = 18rem = 288px. Con shrink-0 el aside nunca debe bajar de ese ancho.
    expect(asideStyles.flexShrink).toBe('0');
    expect(asideStyles.widthPx).toBeGreaterThanOrEqual(287);

    const contentColumn = page.locator('aside + div');
    const contentStyles = await contentColumn.evaluate((el) => getComputedStyle(el).minWidth);
    expect(contentStyles).toBe('0px');

    // El documento no debe generar scroll horizontal a nivel de página —
    // el overflow, si lo hay, queda contenido dentro de los wrappers
    // `overflow-x-auto` de cada vista, no empujando el layout completo.
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
