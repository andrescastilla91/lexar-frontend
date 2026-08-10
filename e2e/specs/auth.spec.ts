import { expect, test } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

test.describe('Flujo de autenticación', () => {
  test('inicia sesión con credenciales válidas y llega al dashboard', async ({ page, tenant }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardPage.brandLabel).toBeVisible();
  });

  test('muestra un error con credenciales inválidas', async ({ page, tenant }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(tenant.adminEmail, 'password-incorrecta');

    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.errorMessage).toBeVisible();
  });
});
