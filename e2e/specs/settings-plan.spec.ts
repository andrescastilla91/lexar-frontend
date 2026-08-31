import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { SettingsPlanPage } from '../pages/settings-plan.page';

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

// F7-R3: cubre lo que los specs de componente (con mocks) no pueden — el
// endpoint real de catálogo (GET /subscription/plans), el ActivatedRoute
// real leyendo ?tab=/?suggested= y el contenedor + presentacional
// ensamblados juntos.
//
// No cubre el loop completo "toco un gate -> toast -> navego -> plan
// resaltado": el tenant de este fixture nace siempre en TRIAL
// (registerTenant(), ver tenant-fixture.ts) y TRIAL no tiene ningún gate
// real — todos los flags en true, todos los límites en null
// (billing-plan-catalog.ts) — no hay forma de tropezar un
// FEATURE_NOT_IN_PLAN/LIMIT_REACHED real sin infraestructura de seed que
// baje el plan del tenant, que este fixture no tiene todavía. Esa rama ya
// está cubierta con mocks en error.interceptor.spec.ts y en los specs de
// componente de F7-R3 (settings.component, settings-catalogs.component,
// settings-task-statuses.component, client-portal-invitations.component).
test.describe('Pantalla de planes (F7-R3)', () => {
  test('la pestaña de planes muestra las tres columnas con Estudio recomendado', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const plansPage = new SettingsPlanPage(page);
    await plansPage.gotoPlanTab();

    await expect(plansPage.planCard('Independiente')).toBeVisible();
    await expect(plansPage.planCard('Estudio')).toBeVisible();
    await expect(plansPage.planCard('Firma')).toBeVisible();
    await expect(plansPage.planCard('Estudio').getByText('Recomendado')).toBeVisible();
  });

  test('?suggested=ESTUDIO resalta Estudio como plan sugerido', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    await page.goto('/configuracion?tab=plan&suggested=ESTUDIO');

    const plansPage = new SettingsPlanPage(page);
    await expect(plansPage.planCard('Estudio').getByText('Plan sugerido para ti')).toBeVisible();
  });
});
