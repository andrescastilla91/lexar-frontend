import { request } from '@playwright/test';
import { E2E_MAILPIT_ORIGIN } from './environment';

interface MailpitMessageSummary {
  ID: string;
  To: { Address: string }[];
}
interface MailpitMessagesResponse {
  messages: MailpitMessageSummary[];
}
interface MailpitMessageDetail {
  Text: string;
  HTML: string;
}

/**
 * Busca en Mailpit el correo más reciente dirigido a `email` y devuelve el
 * token crudo (?token=...) que trae el link. Duplica a propósito el polling
 * de `verifyTenantEmail` en tenant-fixture.ts: ese helper llama al endpoint
 * de verificación directamente vía API (le basta con que el tenant quede
 * verificado para poder loguear), mientras que los specs de UI de
 * registro/onboarding necesitan el token para navegar el link ellos mismos,
 * como lo haría un usuario real haciendo click desde su bandeja de entrada.
 */
export async function fetchVerificationToken(email: string): Promise<string> {
  const mailpit = await request.newContext({ baseURL: E2E_MAILPIT_ORIGIN });
  let messageId: string | undefined;
  const deadline = Date.now() + 15_000;
  while (!messageId && Date.now() < deadline) {
    const list = await mailpit.get('/api/v1/messages?limit=50');
    const body = (await list.json()) as MailpitMessagesResponse;
    messageId = body.messages.find((m) => m.To.some((to) => to.Address === email))?.ID;
    if (!messageId) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!messageId) {
    await mailpit.dispose();
    throw new Error(`No llegó el correo de verificación a Mailpit (${E2E_MAILPIT_ORIGIN}) para ${email}.`);
  }

  const detailResponse = await mailpit.get(`/api/v1/message/${messageId}`);
  const detail = (await detailResponse.json()) as MailpitMessageDetail;
  await mailpit.dispose();

  const tokenMatch = /token=([a-f0-9]+)/.exec(detail.HTML || detail.Text);
  if (!tokenMatch) {
    throw new Error('El correo de verificación llegó a Mailpit pero no se pudo extraer el token del enlace.');
  }
  return tokenMatch[1];
}
