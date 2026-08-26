import { APIRequestContext, Page, request } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN, E2E_MAILPIT_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { TasksPage } from '../pages/tasks.page';

/**
 * E2E del flujo 6 (HU-FE-E2E-2): tablero de tareas con drag nativo y flujo
 * de aprobación completo (F14 — espejo UI de HU-F14-V1, ya validado en el
 * backend).
 *
 * El dueño de un tenant nuevo recibe el rol ADMIN con TODOS los permisos
 * (roles.service.ts: createAdminRoleForCompany asigna `allPermissions`),
 * incluido `tasks.approve` — así que si el propio admin arrastra una tarea
 * a un estado "requiere aprobación", el backend lo deja pasar directo
 * (tasks.service.ts: `canMoveDirectly = !requiresApproval ||
 * isEligibleApprover(...)`) y nunca se genera una solicitud pendiente. Para
 * ejercitar el flujo de aprobación real hace falta un segundo usuario SIN
 * `tasks.approve` que la solicite — se crea 100% por API (invitación +
 * activación vía Mailpit + rol limitado), sin pasar por la UI de
 * invitación, tal como sugiere la HU para no complicar este spec con eso.
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

/** El tenant-fixture registra siempre al dueño con este nombre fijo (ver
 * tenant-fixture.ts: `firstName: 'Admin', lastName: 'E2E'`) — el botón que
 * abre el menú de usuario no tiene aria-label propio, así que su nombre
 * accesible es el texto visible (nombre + rol). */
const ADMIN_DISPLAY_NAME = 'Admin E2E';

async function logout(page: Page, displayName: string): Promise<void> {
  await page.getByRole('button', { name: displayName }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/**
 * Igual patrón resiliente que `SettingsCatalogsPage.selectCatalogType`
 * (ver settings-catalogs.page.ts): en viewport ancho el tab existe como
 * botón; si el tab bar no llegó a renderizar todavía, cae al `<select>`
 * mobile oculto por CSS en desktop.
 */
async function selectSettingsTab(page: Page, label: string): Promise<void> {
  const tabButton = page.getByRole('button', { name: label, exact: true });
  try {
    await tabButton.click({ timeout: 3_000 });
    return;
  } catch {
    // viewport angosto real: el tab bar no existe, cae al <select> mobile.
  }
  const mobileSelect = page.locator('select').first();
  await mobileSelect.selectOption({ label });
}

/** Crea, desde Configuración > Estados de tareas, un estado nuevo que
 * exige aprobación (sin aprobadores explícitos: decide cualquiera con el
 * permiso tasks.approve — ver settings-task-statuses.component.ts). */
async function createApprovalRequiredStatus(page: Page, label: string): Promise<void> {
  await page.goto('/configuracion');
  await selectSettingsTab(page, 'Estados de tareas');

  await page.getByRole('button', { name: 'Nuevo estado' }).click();
  await page.locator('input[formcontrolname="code"]').fill(`e2e_${Date.now()}`);
  await page.locator('input[formcontrolname="label"]').fill(label);
  await page.locator('input[formcontrolname="requiresApproval"]').check();
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('Estado creado correctamente.')).toBeVisible();
}

/** Mismo mecanismo que `verifyTenantEmail` en tenant-fixture.ts (poll a
 * Mailpit hasta que llegue el correo, extraer el token del link) pero para
 * el correo de invitación (`/activar-cuenta?token=...`) en vez del de
 * verificación (`/verificar-correo?token=...`) — no se reutiliza el de
 * tenant-fixture porque ese archivo solo exporta `test`/`expect`.
 */
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
    throw new Error(`No llegó el correo de invitación a Mailpit para ${email}.`);
  }

  const detailResponse = await mailpit.get(`/api/v1/message/${messageId}`);
  const detail = (await detailResponse.json()) as { Text: string; HTML: string };
  await mailpit.dispose();

  const tokenMatch = /token=([a-f0-9]+)/.exec(detail.HTML || detail.Text);
  if (!tokenMatch) {
    throw new Error('El correo de invitación llegó a Mailpit pero no se pudo extraer el token.');
  }
  return tokenMatch[1];
}

/**
 * Invita, activa y limita a un segundo usuario que tiene `tasks.view` y
 * `tasks.update` pero NO `tasks.approve` — así una solicitud suya sí queda
 * pendiente en vez de aplicarse directo. Todo por API, autenticado como
 * admin en `adminApi`.
 */
async function setupNonApproverUser(
  adminApi: APIRequestContext,
): Promise<{ email: string; password: string; displayName: string }> {
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
    .filter((p) => p.code === 'tasks.view' || p.code === 'tasks.update')
    .map((p) => p.id);

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const roleResponse = await adminApi.post('/api/roles', {
    data: { name: `Sin aprobación E2E ${suffix}`, permissionIds },
  });
  if (!roleResponse.ok()) {
    throw new Error(
      `No se pudo crear el rol limitado: ${roleResponse.status()} ${await roleResponse.text()}`,
    );
  }
  const { role } = (await roleResponse.json()) as { role: { id: string } };

  const email = `redactor.e2e.${suffix}@lexar-test.com`;
  const inviteResponse = await adminApi.post('/api/users', {
    data: { firstName: 'Redactor', lastName: 'E2E', email },
  });
  if (!inviteResponse.ok()) {
    throw new Error(
      `No se pudo invitar al segundo usuario: ${inviteResponse.status()} ${await inviteResponse.text()}`,
    );
  }
  const { user } = (await inviteResponse.json()) as { user: { id: string } };

  const token = await readInvitationToken(email);
  const password = 'Passw0rd!E2EB';
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
      `No se pudo asignar el rol limitado al segundo usuario: ${assignResponse.status()} ${await assignResponse.text()}`,
    );
  }

  return { email, password, displayName: 'Redactor E2E' };
}

test.describe('Tareas: tablero drag y flujo de aprobación (F14)', () => {
  test('el tablero muestra las columnas por estado y permite crear una tarea general', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();

    const taskTitle = `Tarea lista E2E ${Date.now()}`;
    await tasksPage.openCreateModal();
    await tasksPage.fillCreateForm({ title: taskTitle, description: 'Creada por Playwright' });
    await tasksPage.submitCreate();

    await expect(page.getByText('Tarea creada correctamente.')).toBeVisible();
    await expect(tasksPage.listTaskRow(taskTitle)).toBeVisible();

    await tasksPage.switchToBoardView();
    await expect(tasksPage.statusColumn('Por hacer').getByText(taskTitle)).toBeVisible();
  });

  test('arrastrar una tarjeta a otra columna sin aprobación mueve la tarea de inmediato', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();

    const taskTitle = `Tarea drag E2E ${Date.now()}`;
    await tasksPage.openCreateModal();
    await tasksPage.fillCreateForm({ title: taskTitle });
    await tasksPage.submitCreate();
    await expect(page.getByText('Tarea creada correctamente.')).toBeVisible();

    await tasksPage.switchToBoardView();
    await expect(tasksPage.statusColumn('Por hacer').getByText(taskTitle)).toBeVisible();

    // "Por hacer" -> "En progreso": ambos estados por defecto tienen
    // requiresApproval=false y requiresNote=false (task-statuses.service.ts,
    // DEFAULT_STATUSES), así que el drag debe reflejar el cambio directo.
    await tasksPage.dragTaskToColumn(taskTitle, 'En progreso');

    await expect(page.getByText('Tarea actualizada correctamente.')).toBeVisible();
    await expect(tasksPage.statusColumn('En progreso').getByText(taskTitle)).toBeVisible();
    await expect(tasksPage.statusColumn('Por hacer').getByText(taskTitle)).toHaveCount(0);
  });

  test('mover una tarea a un estado que requiere aprobación queda pendiente hasta que un aprobador decide', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    const statusLabel = `Revisión E2E ${Date.now()}`;
    await createApprovalRequiredStatus(page, statusLabel);

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    const taskTitle = `Tarea aprobación E2E ${Date.now()}`;
    await tasksPage.openCreateModal();
    await tasksPage.fillCreateForm({ title: taskTitle });
    await tasksPage.submitCreate();
    await expect(page.getByText('Tarea creada correctamente.')).toBeVisible();

    const adminApi = await request.newContext({ baseURL: E2E_API_ORIGIN });
    const adminLogin = await adminApi.post('/api/auth/login', {
      data: { email: tenant.adminEmail, password: tenant.adminPassword },
    });
    if (!adminLogin.ok()) {
      throw new Error(
        `No se pudo iniciar sesión por API para preparar el segundo usuario: ${adminLogin.status()} ${await adminLogin.text()}`,
      );
    }
    const requester = await setupNonApproverUser(adminApi);
    await adminApi.dispose();

    // El segundo usuario (sin tasks.approve) intenta mover la tarea al
    // estado restringido: el backend la deja "a la espera" en vez de
    // aplicar el cambio (tasks.service.ts: canMoveDirectly === false).
    await logout(page, ADMIN_DISPLAY_NAME);
    await loginAsUser(page, requester.email, requester.password);

    const tasksPageAsRequester = new TasksPage(page);
    await tasksPageAsRequester.goto();
    await tasksPageAsRequester.switchToBoardView();
    await tasksPageAsRequester.dragTaskToColumn(taskTitle, statusLabel);

    await expect(page.getByText(/Cambio enviado a aprobación/)).toBeVisible();
    await expect(
      tasksPageAsRequester.anyBoardCard(taskTitle).getByText(`En revisión → ${statusLabel}`),
    ).toBeVisible();
    // La tarea sigue en "Por hacer": la solicitud no la movió todavía.
    await expect(tasksPageAsRequester.statusColumn('Por hacer').getByText(taskTitle)).toBeVisible();

    // El admin (con tasks.approve) decide la solicitud desde la bandeja.
    await logout(page, requester.displayName);
    await loginAsAdmin(page, tenant);

    const tasksPageAsAdmin = new TasksPage(page);
    await tasksPageAsAdmin.goto();
    await tasksPageAsAdmin.openApprovalsInbox();
    await tasksPageAsAdmin.approveRequestFor(taskTitle);

    await expect(page.getByText('Solicitud aprobada correctamente.')).toBeVisible();

    await tasksPageAsAdmin.switchToBoardView();
    await expect(tasksPageAsAdmin.statusColumn(statusLabel).getByText(taskTitle)).toBeVisible();
  });
});
