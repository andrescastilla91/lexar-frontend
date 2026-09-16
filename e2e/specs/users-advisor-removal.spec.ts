import { APIRequestContext, Page, request } from '@playwright/test';
import { expect, test, TestTenant, uniqueSuffix } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { UserDetailPage } from '../pages/user-detail.page';

/**
 * E2e del flujo de confirmación al quitar el perfil de asesor legal
 * (BUG 2026-09-15: se podía destildar "Es asesor legal" sin advertencia ni
 * trazabilidad aunque el asesor estuviera asignado a un proceso activo).
 *
 * El backend (advisors.service.ts, `guardAndLogAdvisorRemoval`) ya tiene
 * cobertura e2e completa en f35-unify-users-advisors.e2e-spec.ts (bloqueo
 * 400, permiso con co-asesor, registro ADVISOR_REMOVED en el timeline). Lo
 * que faltaba y cubre este archivo es la capa de UI que ese bug realmente
 * reportó: el `ConfirmDialogComponent` que ahora antecede al guardado
 * (user-detail.component.ts `saveUser()`), en sus 3 desenlaces posibles:
 * cancelar, confirmar con éxito (co-asesor), y confirmar mostrando el error
 * del backend (único asesor de un proceso activo).
 *
 * Cada test registra su propio tenant vía el fixture `tenant` (igual que
 * calendar.spec.ts) — aislamiento simple, sin compartir `describe`/app.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

interface AdvisorFixture {
  userId: string;
  advisorId: string;
}

/**
 * Crea un usuario nuevo + su perfil de Advisor por API, autenticado con las
 * credenciales del tenant — mismo patrón que `createLegalProcessViaApi()` en
 * calendar.spec.ts: evita construir un page object de Usuarios solo para
 * preparar datos de setup.
 */
async function createAdvisorViaApi(
  api: APIRequestContext,
  label: string,
): Promise<AdvisorFixture> {
  const suffix = `${uniqueSuffix()}`;

  const userResponse = await api.post('/api/users', {
    data: {
      firstName: label,
      lastName: 'E2E',
      email: `advisor-e2e-${label.toLowerCase()}-${suffix}@lexar-test.com`,
    },
  });
  if (!userResponse.ok()) {
    throw new Error(
      `No se pudo crear el usuario de prueba: ${userResponse.status()} ${await userResponse.text()}`,
    );
  }
  const userBody = (await userResponse.json()) as { user: { id: string } };
  const userId = userBody.user.id;

  // La especialidad concreta no importa para este flujo — se toma la primera
  // del catálogo activo del tenant (siempre tiene al menos una por el seed
  // por defecto de F25, ver catalogs.controller.ts GET /catalogs/:type).
  const catalogResponse = await api.get('/api/catalogs/advisor_specialty');
  if (!catalogResponse.ok()) {
    throw new Error(
      `No se pudo leer el catálogo de especialidades: ${catalogResponse.status()} ${await catalogResponse.text()}`,
    );
  }
  const catalogBody = (await catalogResponse.json()) as { items: { id: string }[] };
  if (catalogBody.items.length === 0) {
    throw new Error('El catálogo advisor_specialty del tenant de prueba está vacío');
  }
  const specialtyId = catalogBody.items[0].id;

  const advisorResponse = await api.post('/api/advisors', {
    data: { userId, specialtyIds: [specialtyId] },
  });
  if (!advisorResponse.ok()) {
    throw new Error(
      `No se pudo crear el asesor de prueba: ${advisorResponse.status()} ${await advisorResponse.text()}`,
    );
  }
  const advisorBody = (await advisorResponse.json()) as { advisor: { id: string } };

  return { userId, advisorId: advisorBody.advisor.id };
}

/** Crea un cliente + un proceso legal ACTIVE con los asesores dados —
 * `status` no es ACTIVE por defecto (el default de la entidad es DRAFT), así
 * que se envía explícito para que el guard de BUG-25 sea aplicable. */
async function createActiveProcessViaApi(
  api: APIRequestContext,
  advisorIds: string[],
): Promise<{ processTitle: string }> {
  const suffix = `${uniqueSuffix()}`;

  const clientResponse = await api.post('/api/clients', {
    data: {
      fullName: `Cliente E2E Asesor ${suffix}`,
      identificationNumber: suffix,
    },
  });
  if (!clientResponse.ok()) {
    throw new Error(
      `No se pudo crear el cliente de prueba: ${clientResponse.status()} ${await clientResponse.text()}`,
    );
  }
  const clientBody = (await clientResponse.json()) as { client: { id: string } };

  const processTitle = `Proceso E2E Remoción Asesor ${suffix}`;
  const processResponse = await api.post('/api/legal-processes', {
    data: {
      title: processTitle,
      clientId: clientBody.client.id,
      status: 'ACTIVE',
      advisorIds,
    },
  });
  if (!processResponse.ok()) {
    throw new Error(
      `No se pudo crear el proceso de prueba: ${processResponse.status()} ${await processResponse.text()}`,
    );
  }

  return { processTitle };
}

async function apiContextFor(tenant: TestTenant): Promise<APIRequestContext> {
  const api = await request.newContext({ baseURL: E2E_API_ORIGIN });
  const loginResponse = await api.post('/api/auth/login', {
    data: { email: tenant.adminEmail, password: tenant.adminPassword },
  });
  if (!loginResponse.ok()) {
    throw new Error(
      `No se pudo iniciar sesión por API para preparar el escenario: ${loginResponse.status()} ${await loginResponse.text()}`,
    );
  }
  return api;
}

test.describe('Ficha de usuario: confirmación al quitar el perfil de asesor legal', () => {
  test('cancelar el diálogo de confirmación no quita el perfil de asesor', async ({
    page,
    tenant,
  }) => {
    const api = await apiContextFor(tenant);
    const advisor = await createAdvisorViaApi(api, 'Cancela');
    await api.dispose();

    await loginAsAdmin(page, tenant);

    const userDetailPage = new UserDetailPage(page);
    await userDetailPage.goto(advisor.userId);
    await expect(userDetailPage.advisorBadge).toBeVisible();

    await userDetailPage.openProfileTab();
    await userDetailPage.uncheckIsAdvisor();
    await userDetailPage.save();

    await expect(userDetailPage.confirmDialogHeading).toBeVisible();
    await userDetailPage.cancelRemoveButton.click();

    await expect(userDetailPage.confirmDialogHeading).not.toBeVisible();
    // Sin guardado real: el badge "Asesor" del encabezado (viene de `user()`,
    // que no se tocó) sigue visible.
    await expect(userDetailPage.advisorBadge).toBeVisible();
  });

  test('confirmar el diálogo remueve el perfil de asesor cuando el proceso activo conserva co-asesores', async ({
    page,
    tenant,
  }) => {
    const api = await apiContextFor(tenant);
    const advisor = await createAdvisorViaApi(api, 'Principal');
    const coAdvisor = await createAdvisorViaApi(api, 'Coasesor');
    await createActiveProcessViaApi(api, [advisor.advisorId, coAdvisor.advisorId]);
    await api.dispose();

    await loginAsAdmin(page, tenant);

    const userDetailPage = new UserDetailPage(page);
    await userDetailPage.goto(advisor.userId);
    await expect(userDetailPage.advisorBadge).toBeVisible();

    await userDetailPage.openProfileTab();
    await userDetailPage.uncheckIsAdvisor();
    await userDetailPage.save();

    await expect(userDetailPage.confirmDialogHeading).toBeVisible();
    await userDetailPage.confirmRemoveButton.click();

    await expect(page.getByText('Usuario actualizado exitosamente')).toBeVisible();
    await expect(userDetailPage.advisorBadge).not.toBeVisible();
  });

  test('confirmar el diálogo pero el backend bloquea la remoción si el asesor es el único asignado a un proceso activo', async ({
    page,
    tenant,
  }) => {
    const api = await apiContextFor(tenant);
    const advisor = await createAdvisorViaApi(api, 'Unico');
    await createActiveProcessViaApi(api, [advisor.advisorId]);
    await api.dispose();

    await loginAsAdmin(page, tenant);

    const userDetailPage = new UserDetailPage(page);
    await userDetailPage.goto(advisor.userId);
    await expect(userDetailPage.advisorBadge).toBeVisible();

    await userDetailPage.openProfileTab();
    await userDetailPage.uncheckIsAdvisor();
    await userDetailPage.save();

    await expect(userDetailPage.confirmDialogHeading).toBeVisible();
    await userDetailPage.confirmRemoveButton.click();

    // Mensaje real del guard backend (advisors.service.ts,
    // `guardAndLogAdvisorRemoval`) — se verifica solo el prefijo estable, el
    // título del proceso varía por test. saveUser() muestra el mismo mensaje
    // dos veces (toast.error() + el banner inline `errorMessage()` de la
    // pestaña "Perfil profesional"), así que el locator matchea 2 elementos
    // — con que uno esté visible ya confirma el error, de ahí `.first()`.
    await expect(
      page.getByText('No se puede quitar el perfil de asesor', { exact: false }).first(),
    ).toBeVisible();
    // El guardado falló: el badge "Asesor" (de `user()`, no tocado) sigue
    // visible — la remoción quedó efectivamente bloqueada.
    await expect(userDetailPage.advisorBadge).toBeVisible();
  });
});
