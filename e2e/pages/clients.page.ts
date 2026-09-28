import { Locator, Page } from '@playwright/test';

/**
 * Page object para /clientes y la ficha /clientes/:id. Cubre dos usos:
 *  - Creación de cliente (prerequisito real de otros flujos, ej. Procesos
 *    exige un clientId — ver flujo 4 de HU-FE-E2E-2).
 *  - Panel "Portal del cliente" (A3.2, F16) — F33 lo movió de un modal de
 *    edición embebido en /clientes a una pestaña propia ("Portal") dentro
 *    de la ficha del cliente (QA F33 ronda 2, 2026-09-14): invitar/reenviar
 *    acceso al portal ya no ocurre desde la lista, sino navegando a la
 *    ficha y cambiando de pestaña.
 *
 * `table tr` filtrado por texto en vez de un selector más simple: la tabla
 * de escritorio (`hidden md:block`) y las tarjetas móviles (`md:hidden`)
 * conviven en el DOM aunque el viewport solo muestre una — un link "Ver
 * ficha" por nombre de cliente sin acotar a la fila real matchearía las
 * dos versiones (violación de modo estricto). Ver el mismo gotcha
 * documentado en settings-catalogs.page.ts. Por la misma razón, para
 * comprobar que un cliente recién creado aparece en la lista conviene
 * acotar a `table tr` en vez de un `getByText` suelto sobre toda la página
 * — aunque, ojo: F33 hace que crear un cliente por UI navegue directo a su
 * ficha (`/clientes/:id`), así que `row()` solo tiene sentido ANTES de esa
 * navegación o si volviste explícitamente a `/clientes`.
 */
export class ClientsPage {
  readonly newClientButton: Locator;
  readonly fullNameInput: Locator;
  readonly documentTypeSelect: Locator;
  readonly identificationNumberInput: Locator;
  // El mismo botón sirve para crear/actualizar — el texto cambia según
  // isEditing() (ver client-form.component.ts).
  readonly createClientButton: Locator;

  readonly portalPanel: Locator;
  readonly portalInviteEmailInput: Locator;
  readonly portalInviteButton: Locator;

  // F34 §2/§4: pestaña "Asuntos" de la ficha del cliente.
  readonly mattersPanel: Locator;
  readonly addMatterButton: Locator;
  readonly matterNameInput: Locator;
  readonly matterContractTypeSelect: Locator;
  readonly matterEndDateInput: Locator;
  readonly saveMatterButton: Locator;

  constructor(private readonly page: Page) {
    this.newClientButton = page.getByRole('button', { name: 'Nuevo cliente' });
    this.fullNameInput = page.locator('input[formcontrolname="fullName"]');
    this.documentTypeSelect = page.locator('select[formcontrolname="documentTypeId"]');
    this.identificationNumberInput = page.locator('input[formcontrolname="identificationNumber"]');
    this.createClientButton = page.getByRole('button', { name: /^(Crear cliente|Actualizar)$/ });

    this.portalPanel = page.locator('app-client-portal-invitations');
    this.portalInviteEmailInput = this.portalPanel.locator('input[name="portalInviteEmail"]');
    this.portalInviteButton = this.portalPanel.getByRole('button', { name: 'Invitar', exact: true });

    this.mattersPanel = page.locator('app-client-matters-panel');
    this.addMatterButton = this.mattersPanel.getByRole('button', { name: '+ Agregar asunto' });
    // Escopados al modal del formulario (fixed inset-0), no al panel de
    // lista: name/contractTypeId no existen fuera de él.
    const matterFormScope = page.locator('app-client-matters-panel form');
    this.matterNameInput = matterFormScope.locator('input[formcontrolname="name"]');
    this.matterContractTypeSelect = matterFormScope.locator('select[formcontrolname="contractTypeId"]');
    this.matterEndDateInput = matterFormScope.locator('input[formcontrolname="endDate"]');
    this.saveMatterButton = matterFormScope.getByRole('button', { name: 'Guardar' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/clientes');
  }

  async createClient(data: {
    fullName: string;
    documentTypeLabel: string;
    identificationNumber: string;
  }): Promise<void> {
    await this.newClientButton.click();
    await this.fullNameInput.fill(data.fullName);
    await this.documentTypeSelect.selectOption({ label: data.documentTypeLabel });
    await this.identificationNumberInput.fill(data.identificationNumber);
    await this.createClientButton.click();
  }

  row(clientFullName: string): Locator {
    return this.page.locator('table tr').filter({ hasText: clientFullName });
  }

  viewFichaButton(clientFullName: string): Locator {
    return this.row(clientFullName).getByRole('link', { name: 'Ver ficha' });
  }

  /** Encabezado de la ficha del cliente (`/clientes/:id`) — sirve tanto
   * para confirmar que la navegación llegó a destino como para leer el
   * nombre mostrado. */
  fichaHeading(clientFullName: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: clientFullName });
  }

  /** Navega de la lista a la ficha del cliente y abre la pestaña "Portal"
   * (QA F33 ronda 2 la sacó del modal de edición). Reemplaza al antiguo
   * `openEdit()`. */
  async openPortalPanel(clientFullName: string): Promise<void> {
    await this.viewFichaButton(clientFullName).click();
    await this.fichaHeading(clientFullName).waitFor();
    await this.page.getByRole('button', { name: 'Portal', exact: true }).click();
    await this.portalPanel.waitFor();
  }

  invitationRow(email: string): Locator {
    return this.portalPanel.locator('li').filter({ hasText: email });
  }

  async inviteToPortal(email: string): Promise<void> {
    await this.portalInviteEmailInput.fill(email);
    await this.portalInviteButton.click();
  }

  // F34 §2/§4: navega de la lista a la ficha del cliente y abre la pestaña
  // "Asuntos" — mismo patrón que openPortalPanel(). Requiere estar en
  // /clientes (la lista) antes de llamarlo — ver openMattersTab() para el
  // caso en que ya estás en la ficha (p. ej. justo después de
  // createClient(), que navega directo ahí — ver comentario de la clase).
  async openMattersPanel(clientFullName: string): Promise<void> {
    await this.viewFichaButton(clientFullName).click();
    await this.fichaHeading(clientFullName).waitFor();
    await this.openMattersTab();
  }

  // BUG QA 2026-09-17 (fallo real de e2e, no del código de producto):
  // openMattersPanel() asume que arranca desde /clientes y hace clic en
  // "Ver ficha" — pero createClient() ya deja al usuario parado en la ficha
  // (/clientes/:id), así que llamar a openMattersPanel() justo después de
  // crear un cliente busca un link "Ver ficha" que no existe en esa página
  // y el test cuelga hasta el timeout. Este helper asume que YA estás en la
  // ficha y solo cambia de pestaña.
  async openMattersTab(): Promise<void> {
    await this.page.getByRole('button', { name: 'Asuntos', exact: true }).click();
    await this.mattersPanel.waitFor();
  }

  async createMatter(data: { name: string; contractTypeLabel?: string; endDate?: string }): Promise<void> {
    await this.addMatterButton.click();
    await this.matterNameInput.fill(data.name);
    if (data.contractTypeLabel) {
      await this.matterContractTypeSelect.selectOption({ label: data.contractTypeLabel });
    }
    if (data.endDate) {
      await this.matterEndDateInput.fill(data.endDate);
    }
    await this.saveMatterButton.click();
  }

  matterRow(matterName: string): Locator {
    return this.mattersPanel.locator('li').filter({ hasText: matterName });
  }

  matterStatusBadge(matterName: string): Locator {
    return this.matterRow(matterName).locator('span.rounded-full');
  }

  // BUG-27 (ajuste 2026-09-17): el `title` del botón "Eliminar" cambia según
  // si el asunto tiene procesos vinculados o no — "Eliminar" cuando puede
  // borrarse, "No se puede eliminar: ..." cuando está bloqueado (ver
  // client-matters-panel.component.ts). Este locator matchea ambos casos
  // (case-insensitive sobre "liminar") para poder comprobar el estado
  // `disabled` sin depender del texto exacto del title.
  matterDeleteButton(matterName: string): Locator {
    return this.matterRow(matterName).locator('button[title*="liminar" i]');
  }

  matterCloseEarlyButton(matterName: string): Locator {
    return this.matterRow(matterName).locator('button[title="Cerrar anticipadamente"]');
  }

  // BUG QA 2026-09-17 (F34): elimina (soft delete) el asunto de la fila —
  // el botón es un icon-button sin texto visible, su accessible name viene
  // del `title="Eliminar"` (ver client-matters-panel.component.ts). El
  // ConfirmDialogComponent global personaliza confirmLabel a "Eliminar"
  // también (mismo texto), así que hay que escopar el botón del modal a
  // `app-confirm-dialog` para no ambigüedad con el botón de la fila.
  // Solo funciona sobre un asunto SIN procesos vinculados — desde el ajuste
  // de BUG-27 el botón queda deshabilitado en cualquier otro caso.
  async removeMatter(matterName: string): Promise<void> {
    await this.matterRow(matterName).locator('button[title="Eliminar"]').click();
    await this.page
      .locator('app-confirm-dialog')
      .getByRole('button', { name: 'Eliminar' })
      .click();
  }

  // BUG-27 (ajuste 2026-09-17): vía alternativa para un asunto con procesos
  // vinculados — preserva la relación intacta en vez de eliminarla.
  async closeMatterEarly(matterName: string): Promise<void> {
    await this.matterCloseEarlyButton(matterName).click();
    await this.page
      .locator('app-confirm-dialog')
      .getByRole('button', { name: 'Cerrar asunto' })
      .click();
  }
}
