import { expect, test } from '@playwright/test';

test.describe('authGuard', () => {
  test('redirige a login con returnUrl cuando no hay sesión', async ({ page }) => {
    await page.goto('/clientes');

    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fclientes12$/);
  });
});
