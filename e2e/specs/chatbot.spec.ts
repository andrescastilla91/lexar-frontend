import { Page, request } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { ChatbotPage } from '../pages/chatbot.page';

/**
 * E2E del asistente IA Nivel 0 (F20.1, sin LLM) + ajustes de UX pedidos por
 * el propietario tras la primera entrega (2026-09-04): Enter para enviar,
 * chips de sugerencia, feedback visible, y el bug de links que desaparecían
 * al recargar el historial (ya cubierto también a nivel backend en
 * ai-chat.e2e-spec.ts — aquí se verifica el flujo completo de UI).
 *
 * El tenant de este fixture (plan Trial, sin datos sembrados) solo permite
 * probar sin depender de datos reales el intent `que_puedes_hacer` y el
 * camino de "no entendido" (T7) — ninguno requiere procesos/clientes. El
 * único test que sí necesita un dato real (para validar el link) crea un
 * proceso legal vía API, igual que calendar.spec.ts.
 */

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function createLegalProcessViaApi(tenant: TestTenant): Promise<{ processTitle: string }> {
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
      fullName: `Cliente E2E Chat ${suffix}`,
      email: `cliente.e2e.chat.${suffix}@lexar-test.com`,
      identificationNumber: suffix,
    },
  });
  if (!clientResponse.ok()) {
    throw new Error(
      `No se pudo crear el cliente de prueba: ${clientResponse.status()} ${await clientResponse.text()}`,
    );
  }
  const clientBody = (await clientResponse.json()) as { client: { id: string } };

  const processTitle = `Proceso E2E Chat ${suffix}`;
  const processResponse = await api.post('/api/legal-processes', {
    // status explícito: el default de la entidad es DRAFT, no ACTIVE —
    // sin esto, procesos_activos (findActiveProcesses) nunca lo devuelve
    // y el link jamás aparece en el chat (causa real del timeout).
    data: { title: processTitle, clientId: clientBody.client.id, status: 'ACTIVE' },
  });
  if (!processResponse.ok()) {
    throw new Error(
      `No se pudo crear el proceso de prueba: ${processResponse.status()} ${await processResponse.text()}`,
    );
  }

  await api.dispose();
  return { processTitle };
}

test.describe('Asistente IA — Nivel 0 sin LLM (F20.1)', () => {
  test('responde "¿qué puedes hacer?" con el catálogo de capacidades, sin datos sembrados', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    const chatbot = new ChatbotPage(page);
    await chatbot.goto();

    await chatbot.ask('¿qué puedes hacer?');

    await expect(chatbot.lastMessage()).toContainText('procesos activos');
  });

  test('un chip de pregunta sugerida coloca el texto en el campo y se puede enviar', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    const chatbot = new ChatbotPage(page);
    await chatbot.goto();

    await chatbot.suggestedPromptChip('¿Qué puedes hacer?').click();
    await expect(chatbot.textarea).toHaveValue('¿Qué puedes hacer?');

    await chatbot.sendButton.click();
    await expect(chatbot.lastMessage()).toContainText('procesos activos');
  });

  test('Enter sin Shift envía el mensaje (estándar de chat)', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    const chatbot = new ChatbotPage(page);
    await chatbot.goto();

    await chatbot.askWithEnter('¿qué puedes hacer?');

    await expect(chatbot.lastMessage()).toContainText('procesos activos');
    await expect(chatbot.textarea).toHaveValue('');
  });

  test('una pregunta fuera de catálogo responde honestamente y ofrece chips de sugerencia', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);
    const chatbot = new ChatbotPage(page);
    await chatbot.goto();

    await chatbot.ask('cuéntame un chiste sobre abogados');

    await expect(chatbot.lastMessage()).toContainText(/no sé responder|no la tengo/);
    // Las sugerencias inline son chips clicables, no solo texto — se
    // renderizan como botones dentro del mismo mensaje.
    await expect(chatbot.lastMessage().getByRole('button')).not.toHaveCount(0);
  });

  test('dar 👍 muestra confirmación y queda visualmente marcado', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    const chatbot = new ChatbotPage(page);
    await chatbot.goto();
    await chatbot.ask('¿qué puedes hacer?');

    const thumbsUp = chatbot.thumbsUpButtons.last();
    await thumbsUp.click();

    await expect(page.getByText('Gracias por tu feedback')).toBeVisible();
    await expect(thumbsUp).toHaveAttribute('aria-pressed', 'true');
  });

  test('el historial persiste al recargar la página', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);
    const chatbot = new ChatbotPage(page);
    await chatbot.goto();
    await chatbot.ask('¿qué puedes hacer?');
    await expect(chatbot.lastMessage()).toContainText('procesos activos');

    await page.reload();

    await expect(chatbot.lastMessage()).toContainText('procesos activos');
  });

  test('bug corregido: el link de una respuesta sigue presente y funcional tras recargar', async ({
    page,
    tenant,
  }) => {
    const { processTitle } = await createLegalProcessViaApi(tenant);
    await loginAsAdmin(page, tenant);
    const chatbot = new ChatbotPage(page);
    await chatbot.goto();

    await chatbot.ask('¿cuántos procesos activos tengo?');
    const processLink = chatbot.lastMessage().getByRole('button', { name: processTitle });
    await expect(processLink).toBeVisible();

    await page.reload();

    // Antes del fix, el link desaparecía al recargar porque no se
    // persistía — este es el caso que reprodujo el propietario.
    await expect(chatbot.lastMessage().getByRole('button', { name: processTitle })).toBeVisible();

    await chatbot.lastMessage().getByRole('button', { name: processTitle }).click();

    // El panel de edición abre igual que en global-search.spec.ts (mismo
    // patrón F18, ProcessesComponent.openFromQueryParam): consume ?openId=
    // y limpia la URL de inmediato con replaceUrl, así que la URL final es
    // /procesos sin query — el link "funcional" se valida con el proceso
    // correcto precargado en el formulario, no con el query string transitorio.
    await expect(page).toHaveURL(/\/procesos$/);
    await expect(page.locator('input[formcontrolname="title"]')).toHaveValue(processTitle);
  });
});
