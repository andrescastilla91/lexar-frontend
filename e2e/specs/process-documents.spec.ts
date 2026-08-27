import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
import { E2E_API_ORIGIN } from '../shared/environment';
import { LoginPage } from '../pages/login.page';
import { ClientsPage } from '../pages/clients.page';
import { ProcessesPage } from '../pages/processes.page';

async function loginAsAdmin(page: Page, tenant: TestTenant): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAs(tenant.adminEmail, tenant.adminPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
}

/**
 * Un proceso ACTIVE exige al menos un asesor asignado (backend,
 * legal-processes.service.ts: "No se puede activar un proceso sin al menos
 * un asesor asignado."), pero un tenant recién registrado no tiene ningún
 * `Advisor` — ni siquiera el propio admin (no se auto-inscribe como asesor
 * al registrarse). Se registra al admin como Advisor de sí mismo vía API
 * directa (`page.request`, comparte cookies de sesión) para poder marcarlo
 * en el checkbox del formulario de proceso. Devuelve "Admin E2E" — el
 * `firstName`+`lastName` fijo que usa `registerTenant()` (tenant-fixture.ts)
 * para cualquier tenant de prueba.
 */
async function makeAdminAnAdvisor(page: Page): Promise<string> {
  const me = await page.request.get(`${E2E_API_ORIGIN}/api/auth/me`);
  if (!me.ok()) {
    throw new Error(`No se pudo obtener el usuario actual: ${me.status()} ${await me.text()}`);
  }
  const { id: userId } = (await me.json()) as { id: string };

  const created = await page.request.post(`${E2E_API_ORIGIN}/api/advisors`, {
    data: { userId },
  });
  if (!created.ok()) {
    throw new Error(`No se pudo registrar al admin como asesor: ${created.status()} ${await created.text()}`);
  }

  return 'Admin E2E';
}

/**
 * Flujo 4 (HU-FE-E2E-2): CRUD de proceso con documentos.
 *
 * Alcance real de "des-compartir documento" en este flujo: NO se incluye.
 * Los documentos de un proceso solo se adjuntan a través de una anotación
 * (HU-16), y el toggle "compartir con cliente" que expone el historial
 * (HU-17) es a nivel de evento y el propio template lo oculta para eventos
 * de tipo ANNOTATION — el backend además lo rechaza explícitamente para ese
 * tipo de evento (ver comentario en ProcessEventsService.setEventVisibility
 * y el `@if` correspondiente en process-history-modal.component.ts). Es
 * decir: hoy no existe un camino de UI para des-compartir un documento
 * adjunto a un proceso — el toggle por archivo (FilesService.setVisibility)
 * solo está cableado en `EntityFilesComponent`, que Procesos no usa (sí lo
 * usa Clientes, vía client-form.component.ts). Ver e2e/pages/processes.page.ts
 * para el detalle completo de esta decisión.
 */
test.describe('CRUD de proceso con documentos', () => {
  test('crea, edita, sube y descarga un documento adjunto a un proceso', async ({ page, tenant }) => {
    // BUG-13 (hallazgo post-cierre, 2026-08-26): el <iframe> de previsualización
    // (file-preview-modal.component.ts) quedó bloqueado por CSP (frame-src
    // ausente cae a default-src 'self') — la descarga en pestaña nueva no lo
    // detectaba porque esa no es una carga enmarcada. Se escucha la consola
    // durante todo el flujo para que cualquier violación de CSP futura falle
    // el test explícitamente, no solo se pierda como warning silencioso.
    const cspViolations: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    await loginAsAdmin(page, tenant);

    const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;

    // Prerequisito real: el proceso se va a promover a ACTIVE más abajo, lo
    // que exige al menos un asesor asignado.
    const advisorFullName = await makeAdminAnAdvisor(page);

    // Prerequisito real: todo proceso exige un cliente existente (clientId
    // es obligatorio en processForm) — no es el foco de este spec, se crea
    // con el mínimo de datos requeridos.
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();
    const clientFullName = `Cliente Proceso E2E ${suffix}`;
    await clientsPage.createClient({
      fullName: clientFullName,
      email: `cliente.proceso.e2e.${suffix}@lexar-test.com`,
      documentTypeLabel: 'Cédula de Ciudadanía',
      identificationNumber: String(Date.now()).slice(-8),
    });
    await expect(clientsPage.row(clientFullName)).toBeVisible();

    const processesPage = new ProcessesPage(page);
    await processesPage.goto();

    const processTitle = `Proceso E2E ${suffix}`;
    await processesPage.createProcess({
      title: processTitle,
      clientFullName,
      stageLabel: 'Investigación',
      riskLevelLabel: 'Bajo',
      advisorFullName,
    });
    await expect(processesPage.processTitleHeading(processTitle)).toBeVisible();

    // Editar: un proceso recién creado queda en DRAFT, que es editable (ver
    // isProcessEditable en process-format.utils.ts).
    const updatedCaseNumber = `EXP-E2E-${suffix}`;
    await processesPage.editCaseNumber(updatedCaseNumber);
    await expect(processesPage.processCard(processTitle).getByText(updatedCaseNumber)).toBeVisible();

    // Subir documentos solo está disponible para procesos ACTIVE (el botón
    // "Agregar anotación" ni se renderiza en otro estado, ver
    // processes-table.component.ts) — hay que promoverlo primero. Que el
    // botón aparezca ya es en sí la prueba de que el cambio de estado surtió
    // efecto (evita otro getByText('Activo') ambiguo entre card de
    // escritorio y mobile).
    await processesPage.changeStatusTo('Activo');
    await expect(processesPage.annotateButton()).toBeVisible();

    // `.pdf`, no `.txt`: el backend valida el contentType contra un allowlist
    // (HU-SEC-2, ver ALLOWED_UPLOAD_CONTENT_TYPES en
    // allowed-upload-content-types.ts) y rechaza `text/plain` con un 400 que
    // deja el modal de anotación abierto mostrando el error — el contenido
    // no necesita ser un PDF válido de verdad, Playwright deriva el
    // contentType del archivo por su extensión (mismo patrón que
    // portal-tenant-fixture.ts, que ya sube un "PDF" con ese mismo truco).
    const fileName = `lexar-e2e-doc-${suffix}.pdf`;
    const tmpFilePath = path.join(os.tmpdir(), fileName);
    fs.writeFileSync(tmpFilePath, '%PDF-1.4 Documento de prueba generado por el e2e de LexAr.');

    try {
      await processesPage.addAnnotationWithFile('Anotación con documento adjunto (E2E)', tmpFilePath);

      await processesPage.openHistory();
      await expect(page.getByText(fileName)).toBeVisible();

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        processesPage.downloadAttachmentButton().click(),
      ]);
      expect(download.suggestedFilename()).not.toBe('');

      // BUG-13: a diferencia de la descarga, esto sí enmarca la URL
      // prefirmada en un <iframe> — es el camino que CSP bloqueaba.
      await processesPage.previewFileButton().click();
      await expect(processesPage.previewModalIframe()).toBeVisible();
      await processesPage.closePreviewButton().click();
      expect(cspViolations, `violaciones de CSP durante el flujo: ${cspViolations.join(' | ')}`).toHaveLength(0);
    } finally {
      fs.unlinkSync(tmpFilePath);
    }
  });
});
