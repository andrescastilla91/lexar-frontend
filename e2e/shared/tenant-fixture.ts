import { APIRequestContext, request, test as base } from '@playwright/test';
import { E2E_API_ORIGIN } from './environment';

export interface TestTenant {
  adminEmail: string;
  adminPassword: string;
  companyName: string;
}

function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
}

async function registerTenant(api: APIRequestContext): Promise<TestTenant> {
  const suffix = uniqueSuffix();
  const adminEmail = `admin.e2e.${suffix}@lexar-test.com`;
  const adminPassword = 'Passw0rd!E2E';
  const companyName = `Bufete Playwright ${suffix}`;

  const response = await api.post('/api/auth/register', {
    data: {
      firstName: 'Admin',
      lastName: 'E2E',
      email: adminEmail,
      password: adminPassword,
      company: {
        legalName: companyName,
        taxId: `TAXID-E2E-${suffix}`,
        email: `contacto.e2e.${suffix}@lexar-test.com`,
        address: 'Calle Falsa 123',
        legalRepresentative: 'Representante E2E',
      },
    },
  });

  if (!response.ok()) {
    throw new Error(
      `No se pudo registrar el tenant de prueba: ${response.status()} ${await response.text()}`,
    );
  }

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
