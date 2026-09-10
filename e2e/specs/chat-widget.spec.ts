import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { ChatWidgetPage } from '../pages/chat-widget.page';
import { ChatbotPage } from '../pages/chatbot.page';

/**
 * E2E del widget flotante global del asistente (HU-F20-1-b) — pedido por
 * el propietario durante la revisión de F20.1 (2026-09-04) como mejora
 * adicional, no como parte del chat de la pantalla dedicada. Reutiliza
 * el mismo `AiChatPanelComponent` que /chatbot (ver
 * ai-chat-panel.component.ts) — este spec verifica el flujo completo de
 * UI: abrir desde otra pantalla sin perder el contexto, enviar, cerrar,
 * reabrir y ver el historial, y que la misma conversación aparece en
 * /chatbot.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('Widget flotante del asistente (HU-F20-1-b)', () => {
  test('se abre desde una pantalla distinta a /chatbot sin salir de ella', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    const widget = new ChatWidgetPage(page);

    await expect(widget.openButton).toBeVisible();
    await widget.open();

    await widget.ask('¿qué puedes hacer?');
    await expect(widget.lastMessage()).toContainText('procesos activos');

    // Sigue en /dashboard — el widget no navega a otra pantalla.
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('cerrar y reabrir el widget conserva el historial de la conversación', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    const widget = new ChatWidgetPage(page);
    await widget.open();
    await widget.ask('¿qué puedes hacer?');
    await expect(widget.lastMessage()).toContainText('procesos activos');

    await widget.closeButton.click();
    await expect(widget.textarea).toBeHidden();

    await widget.open();

    await expect(widget.lastMessage()).toContainText('procesos activos');
  });

  test('la conversación del widget es la misma que la de la pantalla /chatbot', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    const widget = new ChatWidgetPage(page);
    await widget.open();
    await widget.ask('¿qué puedes hacer?');
    await expect(widget.lastMessage()).toContainText('procesos activos');
    await widget.minimizeButton.click();

    const chatbot = new ChatbotPage(page);
    await chatbot.goto();

    await expect(chatbot.lastMessage()).toContainText('procesos activos');
  });

  test('el botón flotante no se muestra en /chatbot (evita UI duplicada)', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    const chatbot = new ChatbotPage(page);
    await chatbot.goto();

    const widget = new ChatWidgetPage(page);
    await expect(widget.openButton).toBeHidden();
  });
});
