import { Page, request } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { CalendarPage } from '../pages/calendar.page';

/**
 * E2E del flujo 5 (HU-FE-E2E-2): Calendario/plazos con recordatorio visible (F13).
 *
 * El backend no expone ningún "recordatorio" configurable desde la UI (el
 * memory del proyecto confirma que los escalones de recordatorio no son
 * configurables por catálogo) — no hay campo de anticipación en
 * calendar.component.ts. Lo "visible" que puede verificar un e2e de UI es:
 * el plazo aparece como evento en el calendario apenas se crea, y su estado
 * (Pendiente / Completado) se refleja como badge visible en el panel de
 * detalle y como estilo del evento (tachado al completarse).
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * El formulario de creación de plazos exige un proceso legal existente
 * (calendar.component.ts: `processes().length === 0` bloquea el flujo). Se
 * crea vía API directa, autenticada con las mismas credenciales del tenant
 * — evita construir page objects de clients/processes solo para este setup
 * (ver HU-FE-E2E-2, flujo 5, nota de la instrucción original sobre
 * "APIRequestContext autenticado").
 */
async function createLegalProcessViaApi(
  tenant: TestTenant,
): Promise<{ processTitle: string }> {
  const api = await request.newContext({ baseURL: E2E_API_ORIGIN });

  const loginResponse = await api.post('/api/auth/login', {
    data: { email: tenant.adminEmail, password: tenant.adminPassword },
  });
  if (!loginResponse.ok()) {
    throw new Error(
      `No se pudo iniciar sesión por API para preparar el proceso: ${loginResponse.status()} ${await loginResponse.text()}`,
    );
  }

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  // `email` e `identificationNumber` son opcionales en CreateClientDto pero
  // las columnas `clients.email` y `clients.identification_number` en BD
  // tienen NOT NULL (deuda de esquema — Bug 14, ver BACKLOG-BUGS.md). La UI
  // real nunca expone el hueco porque el formulario marca ambos como
  // requeridos (Validators.required en client-form.component.ts), así que
  // enviarlos aquí también refleja el único payload que la app realmente
  // produce.
  const clientResponse = await api.post('/api/clients', {
    data: {
      fullName: `Cliente E2E ${suffix}`,
      email: `cliente.e2e.${suffix}@lexar-test.com`,
      identificationNumber: suffix,
    },
  });
  if (!clientResponse.ok()) {
    throw new Error(
      `No se pudo crear el cliente de prueba: ${clientResponse.status()} ${await clientResponse.text()}`,
    );
  }
  const clientBody = (await clientResponse.json()) as { client: { id: string } };

  const processTitle = `Proceso E2E Calendario ${suffix}`;
  const processResponse = await api.post('/api/legal-processes', {
    data: { title: processTitle, clientId: clientBody.client.id },
  });
  if (!processResponse.ok()) {
    throw new Error(
      `No se pudo crear el proceso de prueba: ${processResponse.status()} ${await processResponse.text()}`,
    );
  }

  await api.dispose();
  return { processTitle };
}

/** Fecha/hora futura en el formato `datetime-local` que espera el input
 * (mismo cálculo que `toLocalDateTimeInput` en calendar.component.ts). */
function futureDateTimeLocal(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test.describe('Calendario / plazos con recordatorio visible (F13)', () => {
  test('crear un plazo lo muestra de inmediato en el calendario con estado "Pendiente" visible', async ({
    page,
    tenant,
  }) => {
    const { processTitle } = await createLegalProcessViaApi(tenant);
    await loginAsAdmin(page, tenant);

    const calendarPage = new CalendarPage(page);
    await calendarPage.goto();

    const deadlineTitle = `Audiencia E2E ${Date.now()}`;
    await calendarPage.openCreateModal();
    await calendarPage.fillCreateForm({
      processTitle,
      title: deadlineTitle,
      typeLabel: 'Audiencia',
      dueAt: futureDateTimeLocal(1),
      notes: 'Creado por Playwright (flujo 5, HU-FE-E2E-2)',
    });
    await calendarPage.submitCreate();

    await expect(page.getByText('Plazo creado correctamente.')).toBeVisible();
    await expect(calendarPage.eventByTitle(deadlineTitle)).toBeVisible();

    await calendarPage.openEventDetail(deadlineTitle);
    await expect(calendarPage.detailHeading(deadlineTitle)).toBeVisible();
    await expect(page.getByText('Pendiente', { exact: true })).toBeVisible();
  });

  test('marcar un plazo como completado actualiza su estado visible y lo tacha en el calendario', async ({
    page,
    tenant,
  }) => {
    const { processTitle } = await createLegalProcessViaApi(tenant);
    await loginAsAdmin(page, tenant);

    const calendarPage = new CalendarPage(page);
    await calendarPage.goto();

    const deadlineTitle = `Vencimiento E2E ${Date.now()}`;
    await calendarPage.openCreateModal();
    await calendarPage.fillCreateForm({
      processTitle,
      title: deadlineTitle,
      typeLabel: 'Vencimiento de término',
      dueAt: futureDateTimeLocal(2),
    });
    await calendarPage.submitCreate();
    await expect(page.getByText('Plazo creado correctamente.')).toBeVisible();

    await calendarPage.openEventDetail(deadlineTitle);
    await calendarPage.markSelectedDone();

    await expect(page.getByText('Plazo marcado como completado.')).toBeVisible();
    // El evento sigue visible en el calendario pero con las clases de
    // "completado" (opacity-60 + line-through) que le pone
    // `toEventInput()` — ver calendar.component.ts.
    await expect(calendarPage.eventByTitle(deadlineTitle)).toHaveClass(/opacity-60/);

    await calendarPage.openEventDetail(deadlineTitle);
    await expect(page.getByText('Completado', { exact: true })).toBeVisible();
  });

  test('eliminar un plazo lo quita del calendario', async ({ page, tenant }) => {
    const { processTitle } = await createLegalProcessViaApi(tenant);
    await loginAsAdmin(page, tenant);

    const calendarPage = new CalendarPage(page);
    await calendarPage.goto();

    const deadlineTitle = `Plazo a eliminar E2E ${Date.now()}`;
    await calendarPage.openCreateModal();
    await calendarPage.fillCreateForm({
      processTitle,
      title: deadlineTitle,
      typeLabel: 'Audiencia',
      dueAt: futureDateTimeLocal(3),
    });
    await calendarPage.submitCreate();
    await expect(page.getByText('Plazo creado correctamente.')).toBeVisible();
    await expect(calendarPage.eventByTitle(deadlineTitle)).toBeVisible();

    await calendarPage.openEventDetail(deadlineTitle);
    await calendarPage.deleteSelected();

    await expect(page.getByText('Plazo eliminado correctamente.')).toBeVisible();
    await expect(calendarPage.eventByTitle(deadlineTitle)).toHaveCount(0);
  });
});
