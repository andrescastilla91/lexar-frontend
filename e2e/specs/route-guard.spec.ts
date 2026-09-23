import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { test as tenantTest } from '../shared/tenant-fixture';

base.describe('authGuard', () => {
  base('redirige a login con returnUrl cuando no hay sesión', async ({ page }) => {
    await page.goto('/clientes');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fclientes$/);
  });
});

// F41 §CAL-04 / F9: platformAdminGuard (core/guards/platform-admin.guard.ts)
// es independiente de authGuard — se basa en PlatformAdminService.isAuthenticated(),
// nunca en la sesión de tenant (AuthService). Un usuario de tenant autenticado
// (con /admin/auth/me devolviendo 403 para su cookie) sigue sin poder entrar,
// igual que un visitante anónimo — mismo patrón de redirect que arriba, solo
// que aquí el destino es /admin/login.
tenantTest.describe('platformAdminGuard', () => {
  tenantTest(
    'un usuario de tenant autenticado no puede entrar a una ruta del panel de plataforma',
    async ({ page, tenant }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
      await expect(page).toHaveURL(/\/dashboard$/);

      await page.goto('/admin/holidays');

      await expect(page).toHaveURL(/\/admin\/login\?returnUrl=%2Fadmin%2Fholidays$/);
    },
  );
});
