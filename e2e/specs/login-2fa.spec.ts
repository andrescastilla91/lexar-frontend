import { generateSync } from 'otplib';
import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { TwoFactorSetupPage } from '../pages/two-factor.page';

/**
 * F11 (S10): setup con QR + login en dos pasos + recovery code.
 *
 * El fixture `tenant` registra un tenant NUEVO por test (scope por defecto
 * de Playwright), así que cada sub-test parte de un admin sin 2FA — activar
 * el 2FA es un paso previo dentro de cada test, no un estado compartido
 * entre tests. `2fa/verify` y `login/2fa` tienen su propio @Throttle de
 * 5/60s sin relajar por THROTTLE_RELAXED_FOR_E2E (ver auth.controller.ts) —
 * este archivo hace como máximo 1 llamada a cada uno por test, muy por
 * debajo del límite.
 */
async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('Login con 2FA', () => {
  test.beforeEach(async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
  });

  test('activa 2FA con un código TOTP válido y muestra los códigos de recuperación', async ({ page }) => {
    const setupPage = new TwoFactorSetupPage(page);

    const secret = await setupPage.gotoAndCaptureSecret();
    const code = generateSync({ secret });
    const recoveryCodes = await setupPage.confirmSetup(code);

    expect(recoveryCodes).toHaveLength(10);
    await expect(page.getByText('Guarda tus códigos de recuperación')).toBeVisible();

    await setupPage.dismissRecoveryCodes();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('inicia sesión en dos pasos con un código TOTP fresco tras activar 2FA', async ({ page, tenant }) => {
    const setupPage = new TwoFactorSetupPage(page);
    const secret = await setupPage.gotoAndCaptureSecret();
    await setupPage.confirmSetup(generateSync({ secret }));
    await setupPage.dismissRecoveryCodes();

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/login$/);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);

    await expect(loginPage.twoFactorCodeInput).toBeVisible();
    await loginPage.submitTwoFactorCode(generateSync({ secret }));

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('inicia sesión en dos pasos con un código de recuperación', async ({ page, tenant }) => {
    const setupPage = new TwoFactorSetupPage(page);
    const secret = await setupPage.gotoAndCaptureSecret();
    const recoveryCodes = await setupPage.confirmSetup(generateSync({ secret }));
    await setupPage.dismissRecoveryCodes();

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/login$/);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);

    await expect(loginPage.twoFactorCodeInput).toBeVisible();
    await loginPage.submitTwoFactorCode(recoveryCodes[0]);

    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
