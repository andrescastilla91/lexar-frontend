import { Page } from '@playwright/test';
import { expect, test } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

/**
 * F32 PR3 — personalización del tablero (agregar/quitar/reordenar
 * widgets). La resolución de capas (plataforma/empresa/usuario) y la
 * "regla de oro" (la app nunca modifica el layout guardado) ya están
 * cubiertas a nivel unitario (dashboard-widgets.service.spec.ts) y en la
 * suite F1 del backend; aquí solo se ejercita el flujo de UI real: que
 * quitar/agregar y reordenar persistan de verdad contra el backend, no
 * solo en el signal local del componente.
 *
 * Un tenant recién sembrado nunca guardó layout propio, así que arranca
 * siempre en el orden por defecto del catálogo: stats, today-deadlines,
 * today-tasks, high-risk-processes, upcoming-hearings, recent-documents,
 * top-advisors (ver dashboard-widgets.catalog.ts en el backend).
 */

async function loginAsAdmin(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * `enterEditMode()` (dashboard.component.ts) es síncrono: copia lo que
 * `layout()` tenga EN ESE INSTANTE a `draftLayout` y no vuelve a mirar
 * `layout()` después. Si "Personalizar tablero" se clickea antes de que
 * resuelva `GET /dashboard/widgets` (que llena `layout()`/`catalog()` en
 * `ngOnInit`), el draft queda vacío para siempre en esa sesión de edición
 * — no es que tarde, nunca llega. Por eso cada test espera a que un widget
 * en vivo esté visible (señal de que la carga inicial ya resolvió) antes
 * de tocar "Personalizar tablero", igual tras cada `page.reload()`.
 */
async function waitForDashboardReady(page: Page, dashboardPage: DashboardPage): Promise<void> {
  await expect(dashboardPage.liveWidget('app-dashboard-stats-widget')).toBeVisible();
}

test.describe('F32 PR3 — personalización del tablero con drag & drop', () => {
  test('quitar un widget desde "Personalizar tablero" persiste tras recargar', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant.adminEmail, tenant.adminPassword);

    const dashboardPage = new DashboardPage(page);
    await waitForDashboardReady(page, dashboardPage);
    await expect(dashboardPage.liveWidget('app-dashboard-top-advisors-widget')).toBeVisible();

    await dashboardPage.personalizeButton.click();
    await expect(dashboardPage.activeWidgetRow('Asesores destacados')).toBeVisible();

    await dashboardPage.removeActiveWidget('Asesores destacados');
    await expect(dashboardPage.activeWidgetRow('Asesores destacados')).toHaveCount(0);
    await expect(dashboardPage.availableWidgetRow('Asesores destacados')).toBeVisible();

    await dashboardPage.saveLayoutButton.click();
    await expect(page.getByText('Tablero personalizado guardado correctamente.')).toBeVisible();

    // Recargar confirma que el PUT /dashboard/widgets/layout persistió en
    // el backend (UserDashboardLayout), no solo en el signal local.
    await page.reload();
    await waitForDashboardReady(page, dashboardPage);
    await expect(dashboardPage.liveWidget('app-dashboard-top-advisors-widget')).toHaveCount(0);
  });

  test('agregar de vuelta un widget quitado lo devuelve al tablero en vivo', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant.adminEmail, tenant.adminPassword);

    const dashboardPage = new DashboardPage(page);
    await waitForDashboardReady(page, dashboardPage);

    await dashboardPage.personalizeButton.click();
    await expect(dashboardPage.activeWidgetRow('Asesores destacados')).toBeVisible();
    await dashboardPage.removeActiveWidget('Asesores destacados');
    await dashboardPage.saveLayoutButton.click();
    await expect(page.getByText('Tablero personalizado guardado correctamente.')).toBeVisible();
    await expect(dashboardPage.liveWidget('app-dashboard-top-advisors-widget')).toHaveCount(0);

    await dashboardPage.personalizeButton.click();
    await expect(dashboardPage.availableWidgetRow('Asesores destacados')).toBeVisible();
    await dashboardPage.addAvailableWidget('Asesores destacados');
    await dashboardPage.saveLayoutButton.click();
    await expect(page.getByText('Tablero personalizado guardado correctamente.')).toBeVisible();

    await page.reload();
    await waitForDashboardReady(page, dashboardPage);
    await expect(dashboardPage.liveWidget('app-dashboard-top-advisors-widget')).toBeVisible();
  });

  test('reordenar widgets con las flechas persiste tras recargar', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant.adminEmail, tenant.adminPassword);

    const dashboardPage = new DashboardPage(page);
    await waitForDashboardReady(page, dashboardPage);

    await dashboardPage.personalizeButton.click();
    await expect(dashboardPage.activeWidgetRow('Indicadores clave')).toBeVisible();

    // "Indicadores clave" (stats) es el primero en el orden por defecto —
    // bajarlo una vez lo deja detrás de "Hoy" (today-deadlines).
    await dashboardPage.moveActiveWidgetDown('Indicadores clave');
    await dashboardPage.saveLayoutButton.click();
    await expect(page.getByText('Tablero personalizado guardado correctamente.')).toBeVisible();

    // Recargar confirma que el orden nuevo se lee de GET /dashboard/widgets
    // (el layout guardado), no del orden fijo con el que arrancó la página.
    // `evaluateAll` no espera nada por sí solo (a diferencia de `toBeVisible`)
    // — hay que esperar el render antes de leer el DOM.
    await page.reload();
    await waitForDashboardReady(page, dashboardPage);
    await expect(dashboardPage.liveWidget('app-dashboard-today-deadlines-widget')).toBeVisible();
    const tags = await page
      .locator('app-dashboard-stats-widget, app-dashboard-today-deadlines-widget')
      .evaluateAll((elements) => elements.map((el) => el.tagName.toLowerCase()));

    expect(tags).toEqual(['app-dashboard-today-deadlines-widget', 'app-dashboard-stats-widget']);
  });

  test('cancelar el modo edición descarta los cambios sin llamar al backend', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant.adminEmail, tenant.adminPassword);

    const dashboardPage = new DashboardPage(page);
    await waitForDashboardReady(page, dashboardPage);

    await dashboardPage.personalizeButton.click();
    await expect(dashboardPage.activeWidgetRow('Asesores destacados')).toBeVisible();
    await dashboardPage.removeActiveWidget('Asesores destacados');

    await dashboardPage.cancelLayoutButton.click();

    // Sin guardar: el widget sigue en el tablero en vivo, sin tocar el backend.
    await expect(dashboardPage.liveWidget('app-dashboard-top-advisors-widget')).toBeVisible();
    await expect(dashboardPage.personalizeButton).toBeVisible();
  });
});
