import { Page, request } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { CalendarPage } from '../pages/calendar.page';
import { DeadlineDetailPage } from '../pages/deadline-detail.page';
import { ProcessesPage } from '../pages/processes.page';

/**
 * E2E propio del rediseño F41 (ola 4, 2026-09-23): modal de alta único
 * (compartido entre Calendario y la pestaña "Plazos" de Procesos) + ficha
 * de edición dedicada en /calendario/plazos/:id, con retorno al origen vía
 * `returnTo`/`processId`/`tab`. Motivado por el rechazo del usuario al
 * primer rediseño (formulario con campos que aparecían/desaparecían y se
 * movían de lugar, y un bug de foco al escribir Notas dentro de
 * CalendarComponent). Notas terminó como <textarea> plano, no ngx-editor
 * (decisión 2026-09-23): el mismo bug de foco reapareció incluso en la
 * ficha nueva sin FullCalendar, así que se abandonó el texto enriquecido
 * para no bloquear el resto de la feature — ver DeadlineDetailComponent.
 *
 * Estos tests verifican justo lo que calendar.spec.ts no cubre: la ficha
 * en sí (Notas persiste al guardar), y los dos orígenes posibles
 * (Calendario y Procesos) volviendo cada uno a su lugar.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Mismo helper que calendar.spec.ts (crea cliente + proceso por API,
 * autenticado con las credenciales del tenant) — duplicado a propósito,
 * mismo patrón que el resto de specs de este proyecto (cada spec es
 * autocontenido, ver tasks.spec.ts/documents-scope.spec.ts). */
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
  const clientResponse = await api.post('/api/clients', {
    data: {
      fullName: `Cliente E2E ${suffix}`,
      identificationNumber: suffix,
    },
  });
  if (!clientResponse.ok()) {
    throw new Error(
      `No se pudo crear el cliente de prueba: ${clientResponse.status()} ${await clientResponse.text()}`,
    );
  }
  const clientBody = (await clientResponse.json()) as { client: { id: string } };

  const processTitle = `Proceso E2E F41 ${suffix}`;
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

/** Fecha/hora futura en el formato `datetime-local` (mismo cálculo que
 * `toLocalDateTimeInput` en calendar.component.ts / deadline-detail.component.ts). */
function futureDateTimeLocal(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test.describe('F41 (ola 4, rediseño 2026-09-23): ficha dedicada de plazo/evento', () => {
  test('crear→navegar→editar Notas→volver: el texto se guarda completo y el plazo sigue en el calendario', async ({
    page,
    tenant,
  }) => {
    const { processTitle } = await createLegalProcessViaApi(tenant);
    await loginAsAdmin(page, tenant);

    const calendarPage = new CalendarPage(page);
    const deadlineDetailPage = new DeadlineDetailPage(page);
    await calendarPage.goto();

    const deadlineTitle = `Audiencia F41 ${Date.now()}`;
    await calendarPage.openCreateModal();
    await calendarPage.fillCreateForm({
      processTitle,
      title: deadlineTitle,
      typeLabel: 'Audiencia',
      dueAt: futureDateTimeLocal(1),
    });
    await calendarPage.submitCreate();
    await expect(page.getByText('Plazo creado correctamente.')).toBeVisible();
    await expect(page).toHaveURL(/\/calendario\/plazos\/[^/]+\?returnTo=calendario$/);
    await expect(deadlineDetailPage.heading).toHaveText(deadlineTitle);

    // Notas es un <textarea> plano (2026-09-23: se intentó con ngx-editor,
    // incluso en esta ficha sin FullCalendar, y el mismo bug de foco
    // reapareció igual — ver DeadlineDetailComponent). Este test verifica
    // que el campo persiste de verdad, no que "existe".
    const notes = 'Notas escritas por Playwright (F41).';
    await deadlineDetailPage.fillNotes(notes);
    await deadlineDetailPage.save();
    await expect(page.getByText('Plazo actualizado correctamente.')).toBeVisible();
    // Recargar confirma que el backend persistió el texto, no solo que el
    // DOM local lo mostraba.
    await page.reload();
    await expect(deadlineDetailPage.notesTextarea).toHaveValue(notes);

    await deadlineDetailPage.goBack();
    await expect(page).toHaveURL(/\/calendario$/);
    await expect(calendarPage.eventByTitle(deadlineTitle)).toBeVisible();
  });

  test('abrir el detalle de un plazo en el calendario y pulsar Editar navega a su ficha; Volver regresa al calendario', async ({
    page,
    tenant,
  }) => {
    const { processTitle } = await createLegalProcessViaApi(tenant);
    await loginAsAdmin(page, tenant);

    const calendarPage = new CalendarPage(page);
    const deadlineDetailPage = new DeadlineDetailPage(page);
    await calendarPage.goto();

    const deadlineTitle = `Vencimiento F41 ${Date.now()}`;
    await calendarPage.openCreateModal();
    await calendarPage.fillCreateForm({
      processTitle,
      title: deadlineTitle,
      typeLabel: 'Vencimiento de término',
      dueAt: futureDateTimeLocal(2),
    });
    await calendarPage.submitCreate();
    await expect(page.getByText('Plazo creado correctamente.')).toBeVisible();
    await deadlineDetailPage.goBack();
    await expect(page).toHaveURL(/\/calendario$/);

    await calendarPage.openEventDetail(deadlineTitle);
    await calendarPage.editSelected();

    await expect(page).toHaveURL(/\/calendario\/plazos\/[^/]+\?returnTo=calendario$/);
    await expect(deadlineDetailPage.heading).toHaveText(deadlineTitle);

    await deadlineDetailPage.goBack();
    await expect(page).toHaveURL(/\/calendario$/);
    await expect(calendarPage.eventByTitle(deadlineTitle)).toBeVisible();
  });

  test('crear un plazo desde la pestaña "Plazos" de un proceso navega a su ficha, y Volver reabre esa pestaña con el plazo listado', async ({
    page,
    tenant,
  }) => {
    const { processTitle } = await createLegalProcessViaApi(tenant);
    await loginAsAdmin(page, tenant);

    const processesPage = new ProcessesPage(page);
    const deadlineDetailPage = new DeadlineDetailPage(page);
    await processesPage.goto();
    await processesPage.openProcessDetail(processTitle);
    await processesPage.openPlazosTab();

    const deadlineTitle = `Plazo desde Proceso F41 ${Date.now()}`;
    await processesPage.createPlazo({
      title: deadlineTitle,
      typeLabel: 'Audiencia',
      dueAt: futureDateTimeLocal(3),
    });
    await expect(page.getByText('Plazo creado correctamente.')).toBeVisible();
    // F41 (ola 4): mismo modal/ficha compartidos con Calendario — pero acá
    // el origen queda marcado como "proceso" para que "Volver" regrese a
    // la pestaña Plazos de ESTE proceso, no a /calendario.
    await expect(page).toHaveURL(/\/calendario\/plazos\/[^/]+\?returnTo=proceso&processId=[^&]+&tab=plazos$/);
    await expect(deadlineDetailPage.heading).toHaveText(deadlineTitle);

    await deadlineDetailPage.goBack();
    await expect(page).toHaveURL(/\/procesos\/[^/]+\?tab=plazos$/);
    await expect(processesPage.processTitleHeading(processTitle)).toBeVisible();
    await expect(processesPage.deadlineRow(deadlineTitle)).toBeVisible();
  });
});
