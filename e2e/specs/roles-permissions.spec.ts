import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';

/**
 * E2E de F31 — Gestión de permisos legible: el modal "Gestionar permisos"
 * nunca muestra el code técnico del permiso, y el buscador nuevo filtra sin
 * perder la selección de ítems que quedan fuera de la vista filtrada.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('F31 — Gestión de permisos legible', () => {
  test('el modal de permisos no muestra códigos técnicos y el buscador filtra sin perder la selección', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    await page.goto('/roles');

    // Crear un rol nuevo, sin permisos, para partir de una selección vacía
    // y poder demostrar la preservación de selección al filtrar.
    const roleName = `Rol E2E Permisos ${Date.now()}`;
    await page.getByRole('button', { name: 'Nuevo rol' }).click();
    await page.getByPlaceholder('Ej: Coordinador Legal').fill(roleName);
    await page.getByRole('button', { name: 'Crear rol' }).click();

    const roleCard = page.locator('article', { hasText: roleName });
    await expect(roleCard).toBeVisible();

    await roleCard.getByRole('button', { name: 'Permisos' }).click();

    const modal = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Gestionar permisos' }) }).first();
    await expect(modal).toBeVisible();

    // Criterio de aceptación: ningún code técnico visible.
    await expect(modal.getByText('users.create', { exact: true })).toHaveCount(0);
    await expect(modal.getByText('roles.edit', { exact: true })).toHaveCount(0);
    await expect(modal.getByText('Crear usuarios')).toBeVisible();

    // Seleccionar un permiso y confirmar el contador.
    const usersCreateRow = modal.locator('label', { hasText: 'Crear usuarios' });
    await usersCreateRow.locator('input[type="checkbox"]').check();
    await expect(modal.getByText('1 permiso seleccionado')).toBeVisible();

    // Buscar un término que excluya "Crear usuarios" de la vista filtrada.
    const searchInput = modal.getByPlaceholder('Buscar por nombre o grupo…');
    await searchInput.fill('clientes');
    await expect(modal.getByText('Crear usuarios')).toHaveCount(0);
    // La selección no se pierde por filtrar: el contador sigue en 1.
    await expect(modal.getByText('1 permiso seleccionado')).toBeVisible();

    // Limpiar la búsqueda: el ítem filtrado reaparece y sigue marcado.
    await searchInput.fill('');
    await expect(modal.getByText('Crear usuarios')).toBeVisible();
    await expect(usersCreateRow.locator('input[type="checkbox"]')).toBeChecked();

    await modal.getByRole('button', { name: 'Guardar permisos' }).click();
    await expect(modal).toBeHidden();

    await expect(roleCard.getByText('1', { exact: true })).toBeVisible();
  });
});
