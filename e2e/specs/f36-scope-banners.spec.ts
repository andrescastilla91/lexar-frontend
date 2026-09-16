import { APIRequestContext, Page, request } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN, E2E_MAILPIT_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';

/**
 * F36 (ola 5, frontend): cuando un usuario no tiene el permiso ampliado
 * `<dominio>.view.all`, Procesos, Tareas y Calendario muestran un texto
 * explicativo de alcance ("Ves los X a tu cargo.") en vez de dejarlo
 * implícito — mismo patrón ya verificado en documents-scope.spec.ts (F30).
 * El filtrado real de datos ya está cubierto por la suite F1 backend
 * (rbac-matrix / tenant-isolation, olas 1-3); esto solo confirma que la UI
 * refleja correctamente el permiso que el backend ya evalúa.
 *
 * Un único usuario restringido cubre las 3 páginas (permisos base de
 * listado sin el sufijo `.view.all`) para no triplicar el costo de
 * Mailpit (registro de invitación + polling) que tiene cada usuario nuevo.
 */

async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  await loginAsUser(page, tenant.adminEmail, tenant.adminPassword);
}

async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Admin E2E' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

// Mismo patrón que documents-scope.spec.ts (setupRestrictedFilesUser) y
// tasks.spec.ts (setupNonApproverUser): rol desechable con solo los
// permisos base de listado (deliberadamente sin `.view.all`, que no
// termina en `.view`/`.list` y por lo tanto un rol armado a mano con estos
// tres códigos no lo incluye).
async function setupRestrictedScopeUser(
  adminApi: APIRequestContext,
): Promise<{ email: string; password: string }> {
  const permissionsResponse = await adminApi.get('/api/roles/permissions');
  if (!permissionsResponse.ok()) {
    throw new Error(
      `No se pudo listar los permisos: ${permissionsResponse.status()} ${await permissionsResponse.text()}`,
    );
  }
  const { permissions } = (await permissionsResponse.json()) as {
    permissions: { id: string; code: string }[];
  };
  const baseCodes = ['legal_processes.list', 'tasks.view', 'deadlines.view'];
  const permissionIds = permissions.filter((p) => baseCodes.includes(p.code)).map((p) => p.id);
  if (permissionIds.length !== baseCodes.length) {
    throw new Error(
      `Esperaba encontrar los ${baseCodes.length} permisos base (${baseCodes.join(', ')}) en el catálogo, encontré ${permissionIds.length}.`,
    );
  }

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const roleResponse = await adminApi.post('/api/roles', {
    data: { name: `Sin alcance ampliado E2E ${suffix}`, permissionIds },
  });
  if (!roleResponse.ok()) {
    throw new Error(
      `No se pudo crear el rol restringido: ${roleResponse.status()} ${await roleResponse.text()}`,
    );
  }
  const { role } = (await roleResponse.json()) as { role: { id: string } };

  const email = `f36.restricted.e2e.${suffix}@lexar-test.com`;
  const inviteResponse = await adminApi.post('/api/users', {
    data: { firstName: 'F36', lastName: 'Restringido', email },
  });
  if (!inviteResponse.ok()) {
    throw new Error(
      `No se pudo invitar al segundo usuario: ${inviteResponse.status()} ${await inviteResponse.text()}`,
    );
  }
  const { user } = (await inviteResponse.json()) as { user: { id: string } };

  const token = await readInvitationToken(email);
  const password = 'Passw0rd!E2EF36';
  const acceptApi = await request.newContext({ baseURL: E2E_API_ORIGIN });
  const acceptResponse = await acceptApi.post('/api/auth/accept-invitation', {
    data: { token, password },
  });
  await acceptApi.dispose();
  if (!acceptResponse.ok()) {
    throw new Error(
      `No se pudo activar la cuenta del segundo usuario: ${acceptResponse.status()} ${await acceptResponse.text()}`,
    );
  }

  const assignResponse = await adminApi.post(`/api/users/${user.id}/assign-roles`, {
    data: { roleIds: [role.id] },
  });
  if (!assignResponse.ok()) {
    throw new Error(
      `No se pudo asignar el rol restringido al segundo usuario: ${assignResponse.status()} ${await assignResponse.text()}`,
    );
  }

  return { email, password };
}

async function readInvitationToken(email: string): Promise<string> {
  const mailpit = await request.newContext({ baseURL: E2E_MAILPIT_ORIGIN });

  let messageId: string | undefined;
  const deadline = Date.now() + 15_000;
  while (!messageId && Date.now() < deadline) {
    const list = await mailpit.get('/api/v1/messages?limit=50');
    const body = (await list.json()) as {
      messages: { ID: string; To: { Address: string }[] }[];
    };
    messageId = body.messages.find((m) => m.To.some((to) => to.Address === email))?.ID;
    if (!messageId) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!messageId) {
    await mailpit.dispose();
    throw new Error(`No llegó correo de invitación a ${email} dentro del plazo`);
  }

  const message = await mailpit.get(`/api/v1/message/${messageId}`);
  const { Text: text } = (await message.json()) as { Text: string };
  await mailpit.dispose();

  const match = text.match(/token=([\w-]+)/);
  if (!match) {
    throw new Error(`No se encontró el token de invitación en el correo a ${email}`);
  }
  return match[1];
}

test.describe('F36: banners de alcance en Procesos, Tareas y Calendario', () => {
  test('el admin (permisos .view.all) no ve ningún banner de alcance', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    await page.goto('/procesos');
    await expect(page.getByText('Ves los procesos a tu cargo.')).not.toBeVisible();

    await page.goto('/tareas');
    await expect(page.getByText('Ves las tareas a tu cargo.')).not.toBeVisible();

    await page.goto('/calendario');
    await expect(page.getByText('Ves los plazos y audiencias a tu cargo.')).not.toBeVisible();
  });

  test('un usuario sin los permisos .view.all ve el banner en las 3 pantallas', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    const adminApi = await request.newContext({ baseURL: E2E_API_ORIGIN });
    const adminLogin = await adminApi.post('/api/auth/login', {
      data: { email: tenant.adminEmail, password: tenant.adminPassword },
    });
    if (!adminLogin.ok()) {
      throw new Error(
        `No se pudo iniciar sesión por API para preparar el segundo usuario: ${adminLogin.status()} ${await adminLogin.text()}`,
      );
    }
    const restricted = await setupRestrictedScopeUser(adminApi);
    await adminApi.dispose();

    await logout(page);
    await loginAsUser(page, restricted.email, restricted.password);

    await page.goto('/procesos');
    await expect(page.getByText('Ves los procesos a tu cargo.')).toBeVisible();

    await page.goto('/tareas');
    await expect(page.getByText('Ves las tareas a tu cargo.')).toBeVisible();

    await page.goto('/calendario');
    await expect(page.getByText('Ves los plazos y audiencias a tu cargo.')).toBeVisible();
  });
});
