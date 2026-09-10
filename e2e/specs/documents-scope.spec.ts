import { APIRequestContext, Page, request } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN, E2E_MAILPIT_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';

/**
 * F30 (frontend): el menú Documentos refleja el alcance de visibilidad del
 * usuario. Un usuario con `files.view.all` (el admin sembrado por
 * tenant-fixture, que recibe TODOS los permisos — roles.service.ts:
 * createAdminRoleForCompany) ve el filtro "Todos / Solo los míos". Un
 * usuario con `files.view` pero sin `files.view.all` ve en cambio el texto
 * explicativo del alcance y no el filtro — el backend ya lo impone (F30),
 * esto solo verifica que la UI no muestre un control que no tendría efecto
 * real para ese perfil.
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

// Mismo patrón que tasks.spec.ts (setupNonApproverUser): invita un segundo
// usuario del tenant con un rol desechable de solo `files.view`, activa la
// cuenta por token de Mailpit (Mailpit solo aplica a e2e) y confirma que
// NO recibe `files.view.all` (ese permiso no termina en `.view`/`.list`, así
// que un rol armado a mano con únicamente `files.view` no lo incluye).
async function setupRestrictedFilesUser(
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
  const permissionIds = permissions
    .filter((p) => p.code === 'files.view')
    .map((p) => p.id);

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const roleResponse = await adminApi.post('/api/roles', {
    data: { name: `Solo archivos propios E2E ${suffix}`, permissionIds },
  });
  if (!roleResponse.ok()) {
    throw new Error(
      `No se pudo crear el rol restringido: ${roleResponse.status()} ${await roleResponse.text()}`,
    );
  }
  const { role } = (await roleResponse.json()) as { role: { id: string } };

  const email = `f30.restricted.e2e.${suffix}@lexar-test.com`;
  const inviteResponse = await adminApi.post('/api/users', {
    data: { firstName: 'F30', lastName: 'Restringido', email },
  });
  if (!inviteResponse.ok()) {
    throw new Error(
      `No se pudo invitar al segundo usuario: ${inviteResponse.status()} ${await inviteResponse.text()}`,
    );
  }
  const { user } = (await inviteResponse.json()) as { user: { id: string } };

  const token = await readInvitationToken(email);
  const password = 'Passw0rd!E2EF30';
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

test.describe('F30: alcance del menú Documentos', () => {
  test('el admin (files.view.all) ve el filtro Todos/Solo los míos y puede alternarlo', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    await page.goto('/documentos');

    await expect(page.getByText(/\d+ archivo/)).toBeVisible();

    const selects = page.locator('select');
    // el primero es el de Todos/Solo los míos (solo se renderiza con
    // files.view.all); el segundo es el filtro por tipo de entidad.
    const onlyMineSelect = selects.first();
    await expect(onlyMineSelect).toHaveValue('all');

    // Verifica la petición real disparada por el toggle, no solo el estado
    // del <select> — es la prueba de que la UI efectivamente le pide al
    // backend el parámetro onlyMine=true (el backend ya está cubierto en
    // f30-file-scope.e2e-spec.ts; esto solo confirma el cableado front→API).
    const [listResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/files?') && res.url().includes('onlyMine=true'),
      ),
      onlyMineSelect.selectOption('mine'),
    ]);
    expect(listResponse.ok()).toBe(true);
    await expect(onlyMineSelect).toHaveValue('mine');

    await expect(
      page.getByText('Ves los documentos de los procesos y clientes a tu cargo.'),
    ).not.toBeVisible();
  });

  test('un usuario sin files.view.all ve el texto explicativo y no el filtro', async ({
    page,
    tenant,
  }) => {
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
    const restricted = await setupRestrictedFilesUser(adminApi);
    await adminApi.dispose();

    await page.getByRole('button', { name: 'Admin E2E' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await loginAsUser(page, restricted.email, restricted.password);
    await page.goto('/documentos');

    await expect(
      page.getByText('Ves los documentos de los procesos y clientes a tu cargo.'),
    ).toBeVisible();

    // el select de Todos/Solo los míos no debe renderizarse: solo queda el
    // de filtro por tipo de entidad.
    await expect(page.locator('select')).toHaveCount(1);
  });
});
