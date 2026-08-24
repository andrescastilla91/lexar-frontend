import { expect, test } from '../shared/portal-tenant-fixture';
import { extractTokenFromMailpit } from '../shared/tenant-fixture';
import { LoginPage } from '../pages/login.page';
import { ClientsPage } from '../pages/clients.page';
import { PortalLoginPage } from '../pages/portal-login.page';
import { PortalActivarCuentaPage } from '../pages/portal-activar-cuenta.page';
import { PortalProcesosPage } from '../pages/portal-procesos.page';
import { PortalProcesoDetallePage } from '../pages/portal-proceso-detalle.page';

const PORTAL_PASSWORD = 'Passw0rd!PortalE2E';

/**
 * Flujo 1 de HU-FE-E2E-2 (mandato H6 del reporte 02: superficie externa,
 * primero en prioridad). `portalTenant` (portal-tenant-fixture.ts) ya deja
 * listo, vía API, un Client con un LegalProcess que tiene un evento y un
 * documento visibles en el portal — la invitación y activación del
 * ClientPortalUser las hace este spec por UI, que es la superficie real que
 * este flujo debe probar (F16, actor separado `ClientPortalUser`).
 */
test.describe('Portal del cliente end-to-end', () => {
  test('invitación → activación → consulta de proceso/documento → descarga → logout', async ({
    page,
    portalTenant,
  }) => {
    const portalEmail = `cliente.e2e.${Date.now()}@lexar-test.com`;

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(portalTenant.adminEmail, portalTenant.adminPassword);
    await expect(page).toHaveURL(/\/dashboard$/);

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

    // La activación ya deja sesión iniciada — cerramos sesión y volvemos a
    // entrar por /portal/login para probar también ese camino real (no solo
    // la sesión que deja accept-invitation).
    const portalProcesosPage = new PortalProcesosPage(page);
    await portalProcesosPage.logout();
    await expect(page).toHaveURL(/\/portal\/login$/);

    const portalLoginPage = new PortalLoginPage(page);
    await portalLoginPage.goto();
    await portalLoginPage.loginAs(portalEmail, PORTAL_PASSWORD);
    await expect(page).toHaveURL(/\/portal\/procesos$/);

    await expect(portalProcesosPage.processLink(portalTenant.legalProcessTitle)).toBeVisible();
    await portalProcesosPage.openProcess(portalTenant.legalProcessTitle);

    const procesoDetallePage = new PortalProcesoDetallePage(page);
    await expect(
      page.getByText(`Proceso creado: ${portalTenant.legalProcessTitle}`),
    ).toBeVisible();
    await expect(procesoDetallePage.documentRow(portalTenant.documentFilename)).toBeVisible();

    // No asumir si el PDF firmado termina renderizándose, descargándose, o
    // si la popup se cierra sola apenas dispara la descarga — ya se
    // intentaron `downloadPopup.url()` (queda en un estado intermedio) y
    // esperar un evento `download` en la popup (no siempre se dispara ahí,
    // depende del build de Chromium y si trae visor de PDF). Lo único
    // garantizado en cualquier escenario es que el navegador emite una
    // petición de red a la URL firmada — se espera esa petición a nivel de
    // BrowserContext (no de una página puntual) para no depender de en qué
    // page termina resolviéndose.
    const [signedRequest] = await Promise.all([
      page.context().waitForEvent('request', {
        predicate: (req) => req.url().includes('contrato-e2e'),
        timeout: 15_000,
      }),
      procesoDetallePage.downloadButton(portalTenant.documentFilename).click(),
    ]);
    expect(signedRequest.url()).toContain('contrato-e2e');

    await procesoDetallePage.logout();
    await expect(page).toHaveURL(/\/portal\/login$/);
  });
});
