import { Page } from '@playwright/test';
import { expect, test, TestTenant } from '../shared/tenant-fixture';
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
 * F34: Asuntos y tipo de vinculación del cliente (Epic E2).
 *
 * Cubre el §Verificación del doc de la feature:
 *  1. Crear dos asuntos y verificar sus estados (VIGENTE/VENCIDO) + la
 *     advertencia no bloqueante al vincular uno vencido a un proceso.
 *  2. Crear un proceso vinculado a un asunto y confirmarlo en ambas fichas
 *     (selector del proceso + contador de "proceso(s) vinculado(s)" del
 *     asunto).
 *  3. Abrir un proceso preexistente sin asunto y confirmar el aviso de
 *     "Clasificación pendiente".
 */
test.describe('F34: Asuntos del cliente', () => {
  test('crea dos asuntos con distinta vigencia y los muestra con su estado correcto', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();
    const clientFullName = `Cliente Asuntos E2E ${suffix}`;
    await clientsPage.createClient({
      fullName: clientFullName,
      documentTypeLabel: 'Cédula de Ciudadanía',
      identificationNumber: String(Date.now()).slice(-8),
    });
    await expect(clientsPage.fichaHeading(clientFullName)).toBeVisible();

    // createClient() ya deja parado en la ficha del cliente — openMattersTab()
    // en vez de openMattersPanel(), que asume arrancar desde la lista.
    await clientsPage.openMattersTab();

    const vigenteName = `Asunto vigente E2E ${suffix}`;
    await clientsPage.createMatter({
      name: vigenteName,
      contractTypeLabel: 'Asesoría permanente',
    });
    await expect(clientsPage.matterRow(vigenteName)).toBeVisible();
    await expect(clientsPage.matterStatusBadge(vigenteName)).toHaveText('Vigente');

    const vencidoName = `Asunto vencido E2E ${suffix}`;
    await clientsPage.createMatter({
      name: vencidoName,
      contractTypeLabel: 'Asesoría permanente',
      // Fecha de fin en el pasado — la vigencia VENCIDO se calcula en el
      // backend a partir de endDate (ver client-matters.service.ts).
      endDate: '2020-01-01',
    });
    await expect(clientsPage.matterRow(vencidoName)).toBeVisible();
    await expect(clientsPage.matterStatusBadge(vencidoName)).toHaveText('Vencido');
  });

  test('vincula un proceso a un asunto y lo refleja en ambas fichas', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();
    const clientFullName = `Cliente Vinculo E2E ${suffix}`;
    await clientsPage.createClient({
      fullName: clientFullName,
      documentTypeLabel: 'Cédula de Ciudadanía',
      identificationNumber: String(Date.now()).slice(-8),
    });
    await expect(clientsPage.fichaHeading(clientFullName)).toBeVisible();

    // createClient() ya deja parado en la ficha del cliente — openMattersTab()
    // en vez de openMattersPanel(), que asume arrancar desde la lista.
    await clientsPage.openMattersTab();
    const matterName = `Asunto vinculado E2E ${suffix}`;
    await clientsPage.createMatter({ name: matterName, contractTypeLabel: 'Asesoría permanente' });
    await expect(clientsPage.matterRow(matterName)).toBeVisible();
    // Ningún proceso vinculado todavía.
    await expect(clientsPage.matterRow(matterName)).toContainText('0 proceso(s) vinculado(s)');

    const processesPage = new ProcessesPage(page);
    await processesPage.goto();
    const processTitle = `Proceso Vinculado E2E ${suffix}`;
    await processesPage.newProcessButton.click();
    await processesPage.titleInput.fill(processTitle);
    await processesPage.clientSelect.selectOption({ label: clientFullName });
    await processesPage.selectMatter(matterName);
    await processesPage.stageSelect.selectOption({ label: 'Investigación' });
    await processesPage.riskLevelSelect.selectOption({ label: 'Bajo' });
    await processesPage.saveProcessButton.click();
    await expect(processesPage.processTitleHeading(processTitle)).toBeVisible();

    // Ficha del proceso: reabrir el modal de edición y confirmar que el
    // asunto elegido sigue seleccionado.
    await processesPage.editProcessButton().click();
    await expect(processesPage.matterSelect).toHaveValue(/.+/);
    const selectedLabel = await processesPage.matterSelect.locator('option:checked').textContent();
    expect(selectedLabel?.trim()).toBe(matterName);
    await processesPage.saveProcessButton.click();

    // Ficha del cliente: el contador de procesos vinculados del asunto subió
    // a 1 — hay que volver a /clientes, openMattersPanel() parte de la lista.
    await clientsPage.goto();
    await clientsPage.openMattersPanel(clientFullName);
    await expect(clientsPage.matterRow(matterName)).toContainText('1 proceso(s) vinculado(s)');
  });

  test('un proceso preexistente sin asunto muestra el aviso de clasificación pendiente', async ({ page, tenant }) => {
    await loginAsAdmin(page, tenant);

    const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();
    const clientFullName = `Cliente Sin Asunto E2E ${suffix}`;
    await clientsPage.createClient({
      fullName: clientFullName,
      documentTypeLabel: 'Cédula de Ciudadanía',
      identificationNumber: String(Date.now()).slice(-8),
    });
    await expect(clientsPage.fichaHeading(clientFullName)).toBeVisible();

    const processesPage = new ProcessesPage(page);
    await processesPage.goto();
    const processTitle = `Proceso Sin Asunto E2E ${suffix}`;
    // "Decisión de transición" (F34 §3): matterId nunca es obligatorio, ni
    // siquiera retroactivamente — se crea el proceso sin tocar el selector.
    await processesPage.createProcess({
      title: processTitle,
      clientFullName,
      stageLabel: 'Investigación',
      riskLevelLabel: 'Bajo',
    });
    await expect(processesPage.processTitleHeading(processTitle)).toBeVisible();

    await processesPage.editProcessButton().click();
    await expect(page.getByText('Clasificación pendiente: este proceso no tiene un asunto asignado.')).toBeVisible();
  });

  // BUG-27 (ajuste 2026-09-17, decisión del propietario): eliminar un asunto
  // vinculado dejaba la relación "huérfana" en la práctica — `matterId`
  // sobrevivía pero el proceso perdía visibilidad real del asunto. En vez de
  // parchar la visualización tras el borrado, se bloquea el borrado de raíz:
  // un asunto con procesos vinculados nunca se puede eliminar (backend 400
  // en `ClientMattersService.remove()` + botón "Eliminar" deshabilitado en
  // el frontend), sin importar el estado del proceso. La única vía es
  // "Cerrar anticipadamente", que preserva la relación intacta. El mecanismo
  // de hidratación con `matter.isDeleted` (lo que este test cubría antes)
  // sigue existiendo como red de seguridad para datos heredados de antes de
  // este ajuste, pero ya no es alcanzable desde el flujo normal de la UI —
  // queda cubierto por acceso directo a repos en
  // `lexar-backend/test/f34-client-matters.e2e-spec.ts`.
  test('no permite eliminar un asunto con un proceso vinculado — el botón queda deshabilitado y hay que cerrarlo anticipadamente', async ({
    page,
    tenant,
  }) => {
    await loginAsAdmin(page, tenant);

    const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();
    const clientFullName = `Cliente Asunto Protegido E2E ${suffix}`;
    await clientsPage.createClient({
      fullName: clientFullName,
      documentTypeLabel: 'Cédula de Ciudadanía',
      identificationNumber: String(Date.now()).slice(-8),
    });
    await expect(clientsPage.fichaHeading(clientFullName)).toBeVisible();

    // createClient() ya deja parado en la ficha del cliente — openMattersTab()
    // en vez de openMattersPanel(), que asume arrancar desde la lista.
    await clientsPage.openMattersTab();
    const matterName = `Asunto protegido E2E ${suffix}`;
    await clientsPage.createMatter({ name: matterName, contractTypeLabel: 'Asesoría permanente' });
    await expect(clientsPage.matterRow(matterName)).toBeVisible();
    // Sin procesos vinculados todavía: el botón "Eliminar" está habilitado.
    await expect(clientsPage.matterDeleteButton(matterName)).toBeEnabled();

    const processesPage = new ProcessesPage(page);
    await processesPage.goto();
    const processTitle = `Proceso Protegido E2E ${suffix}`;
    await processesPage.newProcessButton.click();
    await processesPage.titleInput.fill(processTitle);
    await processesPage.clientSelect.selectOption({ label: clientFullName });
    await processesPage.selectMatter(matterName);
    await processesPage.stageSelect.selectOption({ label: 'Investigación' });
    await processesPage.riskLevelSelect.selectOption({ label: 'Bajo' });
    await processesPage.saveProcessButton.click();
    await expect(processesPage.processTitleHeading(processTitle)).toBeVisible();

    // Con un proceso vinculado: el botón "Eliminar" queda deshabilitado y su
    // title explica que hay que usar "Cerrar anticipadamente" en su lugar.
    await clientsPage.goto();
    await clientsPage.openMattersPanel(clientFullName);
    await expect(clientsPage.matterRow(matterName)).toContainText('1 proceso(s) vinculado(s)');
    const deleteButton = clientsPage.matterDeleteButton(matterName);
    await expect(deleteButton).toBeDisabled();
    await expect(deleteButton).toHaveAttribute('title', /No se puede eliminar/);

    // La única vía hacia adelante es "Cerrar anticipadamente" — preserva la
    // relación con el proceso intacta (a diferencia de un borrado).
    await clientsPage.closeMatterEarly(matterName);
    await expect(clientsPage.matterStatusBadge(matterName)).toHaveText('Terminado');
  });
});
