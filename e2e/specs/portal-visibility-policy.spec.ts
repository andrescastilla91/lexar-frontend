import { Page } from '@playwright/test';
import { expect, extractTokenFromMailpit, test as tenantTest, TestTenant } from '../shared/tenant-fixture';
import { test as portalTest } from '../shared/portal-tenant-fixture';
import { E2E_API_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { ClientsPage } from '../pages/clients.page';
import { ProcessesPage } from '../pages/processes.page';
import { SettingsPortalVisibilityPage } from '../pages/settings-portal-visibility.page';
import { PortalActivarCuentaPage } from '../pages/portal-activar-cuenta.page';
import { PortalLoginPage } from '../pages/portal-login.page';
import { PortalProcesosPage } from '../pages/portal-procesos.page';
import { PortalProcesoDetallePage } from '../pages/portal-proceso-detalle.page';

const PORTAL_PASSWORD = 'Passw0rd!PortalVisibilidadE2E';

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Mismo prerequisito que process-documents.spec.ts: un tenant nuevo no
 * tiene ningún Advisor, y asignar uno a un proceso (aquí, al crearlo) es lo
 * que dispara el evento ADVISOR_ASSIGNED que este spec usa para probar el
 * modo ALWAYS por defecto (DEFAULT_MODES, ver portal-visibility-policy.service.ts). */
async function makeAdminAnAdvisor(page: Page): Promise<string> {
  const me = await page.request.get(`${E2E_API_ORIGIN}/api/auth/me`);
  const { id: userId } = (await me.json()) as { id: string };

  const created = await page.request.post(`${E2E_API_ORIGIN}/api/advisors`, {
    data: { userId },
  });
  if (!created.ok()) {
    throw new Error(`No se pudo registrar al admin como asesor: ${created.status()} ${await created.text()}`);
  }

  return 'Admin E2E';
}

tenantTest.describe('F27 — política de visibilidad configurable del portal', () => {
  tenantTest(
    'ADVISOR_ASSIGNED nace visible automáticamente (modo ALWAYS por defecto) y no se puede ocultar',
    async ({ page, tenant }) => {
      await loginAsAdmin(page, tenant);

      // La política de STATUS_CHANGE/ADVISOR_ASSIGNED ya nace en ALWAYS sin
      // que el admin toque nada (DEFAULT_MODES en el backend) — se verifica
      // primero desde la propia pantalla de Configuración, antes de tocar
      // Procesos, para dejar constancia de que es el estado por defecto y no
      // algo que este test configuró.
      const visibilityPage = new SettingsPortalVisibilityPage(page);
      await visibilityPage.gotoTab();
      await expect(visibilityPage.modeSelect('Asesor asignado')).toHaveValue('ALWAYS');
      await expect(visibilityPage.modeSelect('Cambio de estado')).toHaveValue('ALWAYS');
      // ANNOTATION nunca ofrece ALWAYS (allowsAlways: false, F27 §1).
      const annotationOptions = await visibilityPage.modeSelect('Anotación').locator('option').allTextContents();
      expect(annotationOptions).not.toContain('Siempre visible');

      const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
      const advisorFullName = await makeAdminAnAdvisor(page);

      const clientsPage = new ClientsPage(page);
      await clientsPage.goto();
      const clientFullName = `Cliente Visibilidad E2E ${suffix}`;
      await clientsPage.createClient({
        fullName: clientFullName,
        email: `cliente.visibilidad.e2e.${suffix}@lexar-test.com`,
        documentTypeLabel: 'Cédula de Ciudadanía',
        identificationNumber: String(Date.now()).slice(-8),
      });
      await expect(clientsPage.row(clientFullName)).toBeVisible();

      const processesPage = new ProcessesPage(page);
      await processesPage.goto();
      const processTitle = `Proceso Visibilidad E2E ${suffix}`;
      await processesPage.createProcess({
        title: processTitle,
        clientFullName,
        stageLabel: 'Investigación',
        riskLevelLabel: 'Bajo',
        advisorFullName,
      });
      await expect(processesPage.processTitleHeading(processTitle)).toBeVisible();

      await processesPage.openHistory();
      const advisorEventDescription = `Asesor asignado: ${advisorFullName}`;
      await expect(processesPage.historyAlwaysVisibleBadge(advisorEventDescription)).toBeVisible();
      await expect(processesPage.historyVisibilityToggle(advisorEventDescription)).toHaveCount(0);
    },
  );
});

/**
 * Reabre el "ajuste de alcance 2026-08-06" de F16: activar ANNOTATION en
 * DEFAULT_ON hace que una anotación nazca visible salvo que el asesor la
 * marque como interna al crearla — y eso debe reflejarse de verdad en la
 * línea de tiempo del portal, no solo en el backoffice. Reutiliza
 * `portalTenant` (mismo fixture del flujo 1 de HU-FE-E2E-2) porque ya deja
 * listo un Client + LegalProcess vía API; la invitación/activación del
 * ClientPortalUser se hace aquí por UI, igual que en portal-cliente.spec.ts.
 */
portalTest.describe('F27 — anotaciones visibles por defecto en el portal del cliente', () => {
  portalTest(
    'con ANNOTATION en "Visible por defecto", una anotación normal se ve en el portal y una marcada interna no',
    async ({ page, portalTenant }) => {
      const portalEmail = `cliente.visibilidad.portal.e2e.${Date.now()}@lexar-test.com`;

      await loginAsAdmin(page, portalTenant);

      const visibilityPage = new SettingsPortalVisibilityPage(page);
      await visibilityPage.gotoTab();
      await visibilityPage.setMode('Anotación', 'Visible por defecto');
      // F27: activar ANNOTATION en DEFAULT_ON pide confirmación explícita
      // (ver settings-portal-visibility.component.ts) porque cambia el
      // comportamiento por defecto de toda anotación nueva del tenant.
      await page.getByRole('button', { name: 'Confirmar' }).click();
      await expect(page.getByText('Política de visibilidad actualizada correctamente.')).toBeVisible();

      // Un proceso ACTIVE es prerequisito real de "Agregar anotación" (ver
      // processes-table.component.ts) — se activa por API, vía el mismo
      // camino que process-documents.spec.ts, porque no es el foco de este
      // test.
      const me = await page.request.get(`${E2E_API_ORIGIN}/api/auth/me`);
      const { id: userId } = (await me.json()) as { id: string };
      const advisorResponse = await page.request.post(`${E2E_API_ORIGIN}/api/advisors`, { data: { userId } });
      const { advisor } = (await advisorResponse.json()) as { advisor: { id: string } };
      await page.request.put(`${E2E_API_ORIGIN}/api/legal-processes/${portalTenant.legalProcessId}`, {
        data: { advisorIds: [advisor.id] },
      });
      const statusResponse = await page.request.patch(
        `${E2E_API_ORIGIN}/api/legal-processes/${portalTenant.legalProcessId}/status`,
        { data: { status: 'ACTIVE' } },
      );
      if (!statusResponse.ok()) {
        throw new Error(
          `No se pudo activar el proceso de prueba: ${statusResponse.status()} ${await statusResponse.text()}`,
        );
      }

      const processesPage = new ProcessesPage(page);
      await processesPage.goto();
      await expect(processesPage.processTitleHeading(portalTenant.legalProcessTitle)).toBeVisible();

      const visibleAnnotation = `Nota visible para el cliente (E2E ${Date.now()})`;
      const internalAnnotation = `Nota interna, no debe verse en el portal (E2E ${Date.now()})`;
      await processesPage.addAnnotation(visibleAnnotation);
      await processesPage.addAnnotation(internalAnnotation, { markAsInternal: true });

      // Invitar y activar al cliente en el portal — mismo flujo UI que
      // portal-cliente.spec.ts (flujo 1 de HU-FE-E2E-2).
      const clientsPage = new ClientsPage(page);
      await clientsPage.goto();
      await clientsPage.openEdit(portalTenant.clientFullName);
      await clientsPage.inviteToPortal(portalEmail);
      await expect(clientsPage.invitationRow(portalEmail)).toContainText('Pendiente de activación');
      await clientsPage.closeEditPanel();

      const activationToken = await extractTokenFromMailpit(portalEmail);
      const activarCuentaPage = new PortalActivarCuentaPage(page);
      await activarCuentaPage.goto(activationToken);
      await activarCuentaPage.activate(PORTAL_PASSWORD);
      await expect(page).toHaveURL(/\/portal\/procesos$/);

      const portalProcesosPage = new PortalProcesosPage(page);
      await portalProcesosPage.logout();
      await expect(page).toHaveURL(/\/portal\/login$/);

      const portalLoginPage = new PortalLoginPage(page);
      await portalLoginPage.goto();
      await portalLoginPage.loginAs(portalEmail, PORTAL_PASSWORD);
      await expect(page).toHaveURL(/\/portal\/procesos$/);

      await portalProcesosPage.openProcess(portalTenant.legalProcessTitle);

      const procesoDetallePage = new PortalProcesoDetallePage(page);
      await expect(procesoDetallePage.timelineEntry(visibleAnnotation)).toBeVisible();
      await expect(procesoDetallePage.timelineEntry(internalAnnotation)).toHaveCount(0);
    },
  );
});
