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

test.describe('chatbotFeatureGuard', () => {
  test('el menú no muestra Chatbot cuando el feature flag está desactivado', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.menuLink('Chatbot')).toHaveCount(0);
  });

  test('redirige a dashboard si se navega directo a /chatbot', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    await page.goto('/chatbot');

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
