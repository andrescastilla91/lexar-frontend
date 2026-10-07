import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { TasksPage } from '../pages/tasks.page';
import { TaskRecurrencesPage } from '../pages/task-recurrences.page';

/**
 * E2E de F42 — TAR-03 (tareas recurrentes): crear una serie desde "Nueva
 * tarea → Repetir esta tarea", ver que genera solo la primera ocurrencia,
 * consultarla en /tareas/recurrentes, editarla y detenerla sin perder la
 * tarea ya generada. La generación de las siguientes ocurrencias (scheduler)
 * se prueba en el e2e del backend, donde se puede adelantar el reloj.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Mañana a las 10:00, en el formato del input `datetime-local`. */
function tomorrowAtTen(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T10:00`;
}

test.describe('F42 — tareas recurrentes', () => {
  test('crear una serie genera la primera tarea; la serie se puede editar, detener, reanudar y finalizar sin perderla', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();

    const title = `Revisión recurrente E2E ${Date.now()}`;
    await tasksPage.openCreateModal();
    await tasksPage.fillCreateForm({ title });
    await tasksPage.fillDueAt(tomorrowAtTen());
    await tasksPage.enableRepeat('WEEKLY');
    await tasksPage.submitCreate();

    await expect(
      page.getByText('Tarea recurrente creada. La primera tarea ya está en tu lista.'),
    ).toBeVisible();
    await expect(tasksPage.listTaskRow(title)).toBeVisible();
    await expect(tasksPage.listTaskRow(title)).toContainText('Recurrente #1');

    await page.getByRole('link', { name: 'Tareas recurrentes' }).click();
    await expect(page).toHaveURL(/\/tareas\/recurrentes$/);

    const recurrencesPage = new TaskRecurrencesPage(page);
    await expect(recurrencesPage.heading).toBeVisible();
    const card = recurrencesPage.card(title);
    await expect(card).toBeVisible();
    await expect(card).toContainText('Semanal');
    await expect(card).toContainText('Activa');
    await expect(card).toContainText('1 ocurrencia generada');

    await card.getByRole('button', { name: 'Ver ocurrencias' }).click();
    await expect(card).toContainText('Ocurrencia 1');

    await card.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(recurrencesPage.editModal).toBeVisible();
    await recurrencesPage.editModal.locator('select[formcontrolname="frequency"]').selectOption('MONTHLY');
    await recurrencesPage.editModal.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Tarea recurrente actualizada correctamente.')).toBeVisible();
    await expect(card).toContainText('Mensual');

    await card.getByRole('button', { name: 'Detener', exact: true }).click();
    await recurrencesPage.confirmStop();
    await expect(
      page.getByText('Tarea recurrente detenida. Las ocurrencias existentes se conservan.'),
    ).toBeVisible();
    await expect(card).toHaveCount(0);

    await recurrencesPage.filterByStatus('Detenidas');
    await expect(recurrencesPage.card(title)).toContainText('Detenida');
    // Detenida es una pausa: se puede reanudar.
    await recurrencesPage
      .card(title)
      .getByRole('button', { name: 'Reanudar', exact: true })
      .click();
    await expect(
      page.getByText('Tarea recurrente reanudada. Continúa desde su próxima fecha.'),
    ).toBeVisible();

    await recurrencesPage.filterByStatus('Activas');
    await expect(recurrencesPage.card(title)).toContainText('Activa');

    // Finalizar es el cierre manual y definitivo.
    await recurrencesPage
      .card(title)
      .getByRole('button', { name: 'Finalizar', exact: true })
      .click();
    await recurrencesPage.confirmFinalize();
    await expect(
      page.getByText('Tarea recurrente finalizada. Las ocurrencias existentes se conservan.'),
    ).toBeVisible();

    await recurrencesPage.filterByStatus('Finalizadas');
    const finalized = recurrencesPage.card(title);
    await expect(finalized).toContainText('Finalizada');
    await expect(finalized.getByRole('button', { name: 'Reanudar', exact: true })).toHaveCount(0);
    await expect(finalized.getByRole('button', { name: 'Finalizar', exact: true })).toHaveCount(0);

    await tasksPage.goto();
    await expect(tasksPage.listTaskRow(title)).toBeVisible();
  });

  test('repetir sin fecha de vencimiento avisa y no crea la serie', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const tasksPage = new TasksPage(page);
    await tasksPage.goto();

    await tasksPage.openCreateModal();
    await tasksPage.fillCreateForm({ title: `Sin fecha E2E ${Date.now()}` });
    await tasksPage.enableRepeat('MONTHLY');
    await tasksPage.submitCreate();

    await expect(tasksPage.createForm).toContainText('primer vencimiento');
    await expect(page.getByText('Tarea recurrente creada.')).toHaveCount(0);
  });
});
