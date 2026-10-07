import { APIRequestContext, request } from '@playwright/test';
import { E2E_API_ORIGIN } from './environment';
import { TestTenant, extractTokenFromMailpit, uniqueSuffix } from './tenant-fixture';

export interface RestrictedUser {
  email: string;
  password: string;
}

async function expectOk(response: Awaited<ReturnType<APIRequestContext['get']>>, what: string): Promise<void> {
  if (!response.ok()) {
    throw new Error(`${what}: ${response.status()} ${await response.text()}`);
  }
}

/**
 * Crea, por API, un usuario del tenant con un rol desechable que tiene solo
 * los permisos indicados, y deja su cuenta activada. Mismo patrón que usan
 * f36-scope-banners.spec.ts y tasks.spec.ts, pero reutilizable.
 */
export async function createRestrictedUser(
  tenant: TestTenant,
  permissionCodes: string[],
  label: string,
): Promise<RestrictedUser> {
  const adminApi = await request.newContext({ baseURL: E2E_API_ORIGIN });
  const acceptApi = await request.newContext({ baseURL: E2E_API_ORIGIN });
  try {
    await expectOk(
      await adminApi.post('/api/auth/login', { data: { email: tenant.adminEmail, password: tenant.adminPassword } }),
      'No se pudo iniciar sesión por API como admin',
    );

    const permissionsResponse = await adminApi.get('/api/roles/permissions');
    await expectOk(permissionsResponse, 'No se pudo listar los permisos');
    const { permissions } = (await permissionsResponse.json()) as { permissions: { id: string; code: string }[] };
    const permissionIds = permissions.filter((p) => permissionCodes.includes(p.code)).map((p) => p.id);
    if (permissionIds.length !== permissionCodes.length) {
      throw new Error(`Faltan permisos en el catálogo: se pidieron ${permissionCodes.join(', ')}`);
    }

    const suffix = uniqueSuffix();
    const roleResponse = await adminApi.post('/api/roles', {
      data: { name: `${label} E2E ${suffix}`, permissionIds },
    });
    await expectOk(roleResponse, 'No se pudo crear el rol restringido');
    const { role } = (await roleResponse.json()) as { role: { id: string } };

    const email = `${label.toLowerCase().replace(/\W+/g, '.')}.e2e.${suffix}@lexar-test.com`;
    const inviteResponse = await adminApi.post('/api/users', { data: { firstName: label, lastName: 'Restringido', email } });
    await expectOk(inviteResponse, 'No se pudo invitar al usuario restringido');
    const { user } = (await inviteResponse.json()) as { user: { id: string } };

    const password = 'Passw0rd!E2ERestricted';
    const token = await extractTokenFromMailpit(email);
    await expectOk(
      await acceptApi.post('/api/auth/accept-invitation', { data: { token, password } }),
      'No se pudo activar la cuenta restringida',
    );
    await expectOk(
      await adminApi.post(`/api/users/${user.id}/assign-roles`, { data: { roleIds: [role.id] } }),
      'No se pudo asignar el rol restringido',
    );

    return { email, password };
  } finally {
    await adminApi.dispose();
    await acceptApi.dispose();
  }
}
