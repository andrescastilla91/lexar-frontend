import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { NotificationsPage } from '../pages/notifications.page';

/**
 * E2E de F12 — campana de notificaciones (SSE en tiempo real) y preferencias
 * por canal en /perfil.
 *
 * NOTA (deuda técnica conocida): los e2e de Playwright de este repo vienen
 * fallando desde F4 por causas no atribuidas a specs concretos (ver
 * checklist de deuda técnica pre-deploy). Si este spec falla junto con los
 * demás, diagnosticar igual que los anteriores en vez de asumir que el bug
 * está en notificaciones.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Dispara una notificación real y aislada, con un solo usuario: crea una
 * tarea autoasignada al propio admin logueado. `TasksService.create()`
 * (backend) llama a `notifyAssigned()` sin excluir al creador cuando se
 * asigna a sí mismo (a diferencia de `onCompleted()`, que sí se salta al
 * creador) — así que autoasignarse una tarea dispara de forma confiable
 * `NOTIFICATION_TYPES.TASK_ASSIGNED` sin necesitar un segundo tenant/usuario.
 *
 * Se crea vía API directa (`page.request`, que comparte cookies con el
 * browser context) en vez del modal de "Nueva tarea": ese modal solo lista
 * como posibles asignados a usuarios que ya son `Advisor` (tabla aparte),
 * y un tenant recién registrado no tiene ninguno. El backend, en cambio, no
 * exige eso — `resolveAssignee()` (tasks.service.ts) solo valida que
 * `assigneeUserId` sea un `User` de la misma empresa. Ir por API evita tener
 * que convertir primero al admin en asesor solo para disparar una
 * notificación, y no acopla este spec al flujo de creación de tareas de F14
 * (ya cubierto en su propio spec).
 */
async function createSelfAssignedTask(page: Page, title: string): Promise<void> {
  const me = await page.request.get(`${E2E_API_ORIGIN}/api/auth/me`);
  if (!me.ok()) {
    throw new Error(
      `No se pudo obtener el usuario actual: ${me.status()} ${await me.text()}`,
    );
  }
  const { id: userId } = (await me.json()) as { id: string };

  const created = await page.request.post(`${E2E_API_ORIGIN}/api/tasks`, {
    data: { title, assigneeUserId: userId },
  });
  if (!created.ok()) {
    throw new Error(
      `No se pudo crear la tarea de prueba: ${created.status()} ${await created.text()}`,
    );
  }
}

test.describe('Notificaciones (F12) — campana y preferencias', () => {
  test('una tarea autoasignada llega en tiempo real a la campana y navega a la tarea al hacer click', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    // El stream SSE (`NotificationsService.connectStream()`) ya se abrió al
    // montar `MainLayoutComponent` durante el login — no hace falta recargar
    // la página para que la campana reciba el evento en vivo.
    const notificationsPage = new NotificationsPage(page);
    const taskTitle = `Tarea notif E2E ${Date.now()}`;
    await createSelfAssignedTask(page, taskTitle);

    await expect(notificationsPage.bellUnreadBadge()).toHaveText('1');

    await notificationsPage.openBell();
    const item = notificationsPage.bellItem(taskTitle);
    await expect(item).toBeVisible();

    await item.click();

    await expect(page).toHaveURL(/\/tareas/);
    // El detalle abierto por `?openId=` muestra el título como heading del
    // panel modal — un locator por rol evita el falso positivo de matchear
    // también la fila de la lista, que repite el mismo texto.
    await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();
  });

  test('desactivar el canal in-app de "Tarea asignada" en preferencias se guarda y persiste tras recargar', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    const notificationsPage = new NotificationsPage(page);
    await notificationsPage.gotoPreferences();

    const checkbox = notificationsPage.preferenceInAppCheckbox('Tarea asignada');
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();

    // Substring relativo (no prefijado con E2E_API_ORIGIN): el frontend real
    // puede llamar al backend por una URL distinta a la que usan los helpers
    // de setup por API de este mismo archivo (proxy de nginx vs. acceso
    // directo al puerto del backend) — mismo patrón que ya funciona en
    // two-factor.page.ts (`gotoAndCaptureSecret`/`confirmSetup`).
    const [patchResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/notifications/preferences') && res.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      notificationsPage.savePreferences(),
    ]);

    expect(
      patchResponse.ok(),
      `PATCH /notifications/preferences devolvió ${patchResponse.status()}: ${await patchResponse.text()}`,
    ).toBe(true);

    await expect(
      page.getByText('Preferencias de notificación actualizadas.'),
    ).toBeVisible();

    await page.reload();
    await expect(
      notificationsPage.preferenceInAppCheckbox('Tarea asignada'),
    ).not.toBeChecked();
  });
});
