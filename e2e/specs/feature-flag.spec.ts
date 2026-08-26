import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

// F7 cambió chatbotFeatureGuard de flag fija de build (environment.features.chatbot)
// a entitlement del plan del tenant (ver el guard). El plan Trial — el que
// recibe cualquier tenant recién auto-registrado, único que este spec puede
// producir sin llamar a endpoints de billing — tiene chatbot: true
// (billing-plan-catalog.ts). Este spec quedó escrito para el mecanismo viejo
// ("desactivado por defecto"); se invirtió para probar lo que sí ocurre hoy.
// Ver HU-FE-E2E-1.
test.describe('chatbotFeatureGuard', () => {
  test('el menú muestra Chatbot para un tenant en el plan Trial', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.menuLink('Chatbot')).toHaveCount(1);
  });

  test('permite navegar a /chatbot sin redirigir, porque el plan lo incluye', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    await page.goto('/chatbot');

    await expect(page).toHaveURL(/\/chatbot$/);
  });
});
