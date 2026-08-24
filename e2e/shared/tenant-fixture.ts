import { APIRequestContext, request, test as base } from '@playwright/test';
import { E2E_API_ORIGIN, E2E_MAILPIT_ORIGIN } from './environment';

export interface TestTenant {
  adminEmail: string;
  adminPassword: string;
  companyName: string;
}

export function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
}

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

// El dueño de una empresa recién registrada queda bloqueado por
// EmailVerificationInterceptor (backend) / emailVerifiedGuard (frontend)
// hasta verificar su correo — no hay endpoint de bypass para tests. El
// token es aleatorio y solo viaja en el cuerpo del correo enviado
// (auth.service.ts: verifyUrl = frontendUrl/verificar-correo?token=...), así
// que hay que leerlo de Mailpit. Esto SOLO funciona si el backend de
// docker-compose corre con MAIL_PROVIDER=smtp — por defecto `.env` local usa
// `resend` (correo real, para pruebas manuales). Ver
// infra/docker-compose.e2e.override.yml y HU-FE-E2E-1.
//
// Exportada porque el mismo patrón (leer un enlace `...?token=<hex>` de un
// correo real) lo necesita cualquier flujo con correo transaccional, no solo
// el registro — ver portal-tenant-fixture.ts (invitación al portal, HU-FE-E2E-2).
export async function extractTokenFromMailpit(email: string): Promise<string> {
  const mailpit = await request.newContext({ baseURL: E2E_MAILPIT_ORIGIN });

  let messageId: string | undefined;
  const deadline = Date.now() + 15_000;

  while (!messageId && Date.now() < deadline) {
    const list = await mailpit.get('/api/v1/messages?limit=50');
    const body = (await list.json()) as MailpitMessagesResponse;
    messageId = body.messages.find((m) =>
      m.To.some((to) => to.Address === email),
    )?.ID;

    if (!messageId) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!messageId) {
    await mailpit.dispose();
    throw new Error(
      `No llegó el correo a Mailpit (${E2E_MAILPIT_ORIGIN}) para ${email}. ` +
        'Verifica que el backend de docker-compose corra con MAIL_PROVIDER=smtp ' +
        '(docker compose -f docker-compose.yml -f docker-compose.e2e.override.yml up -d --build).',
    );
  }

  const detailResponse = await mailpit.get(`/api/v1/message/${messageId}`);
  const detail = (await detailResponse.json()) as MailpitMessageDetail;
  await mailpit.dispose();

  const tokenMatch = /token=([a-f0-9]+)/.exec(detail.HTML || detail.Text);
  if (!tokenMatch) {
    throw new Error(
      'El correo llegó a Mailpit pero no se pudo extraer el token del enlace.',
    );
  }

  return tokenMatch[1];
}

async function verifyTenantEmail(
  api: APIRequestContext,
  email: string,
): Promise<void> {
  const token = await extractTokenFromMailpit(email);

  const verifyResponse = await api.post('/api/auth/verify-email', {
    data: { token },
  });

  if (!verifyResponse.ok()) {
    throw new Error(
      `No se pudo verificar el correo de prueba: ${verifyResponse.status()} ${await verifyResponse.text()}`,
    );
  }
}

export async function registerTenant(api: APIRequestContext): Promise<TestTenant> {
  const suffix = uniqueSuffix();
  const adminEmail = `admin.e2e.${suffix}@lexar-test.com`;
  const adminPassword = 'Passw0rd!E2E';
  const companyName = `Bufete Playwright ${suffix}`;

  const response = await api.post('/api/auth/register', {
    // `CompanyRegistrationDto` (backend) solo acepta legalName/taxId desde
    // el commit 8baf71c (2026-07-21, "remove unused fields from company
    // registration") — este fixture seguía enviando email/address/
    // legalRepresentative desde su creación (2026-07-17), 4 días antes. Con
    // `forbidNonWhitelisted: true` en el ValidationPipe global, cada
    // llamada devolvía 400 y `registerTenant()` lanzaba — causa raíz real
    // del rojo "desde F4" en los specs que usan este fixture (auth,
    // catalogs, feature-flag, layout-shell; route-guard no lo usa y por
    // eso era el único que no fallaba). Ver HU-FE-E2E-1.
    data: {
      firstName: 'Admin',
      lastName: 'E2E',
      email: adminEmail,
      password: adminPassword,
      company: {
        legalName: companyName,
        taxId: `TAXID-E2E-${suffix}`,
      },
    },
  });

  if (!response.ok()) {
    throw new Error(
      `No se pudo registrar el tenant de prueba: ${response.status()} ${await response.text()}`,
    );
  }

  await verifyTenantEmail(api, adminEmail);

  return { adminEmail, adminPassword, companyName };
}

export const test = base.extend<{ tenant: TestTenant }>({
  tenant: async ({}, use) => {
    const api = await request.newContext({ baseURL: E2E_API_ORIGIN });
    const tenant = await registerTenant(api);
    await api.dispose();
    await use(tenant);
  },
});

export { expect } from '@playwright/test';
