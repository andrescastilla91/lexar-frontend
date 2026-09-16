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

  constructor(private readonly page: Page) {
    this.newClientButton = page.getByRole('button', { name: 'Nuevo cliente' });
    this.fullNameInput = page.locator('input[formcontrolname="fullName"]');
    this.documentTypeSelect = page.locator('select[formcontrolname="documentTypeId"]');
    this.identificationNumberInput = page.locator('input[formcontrolname="identificationNumber"]');
    this.createClientButton = page.getByRole('button', { name: /^(Crear cliente|Actualizar)$/ });

    this.portalPanel = page.locator('app-client-portal-invitations');
    this.portalInviteEmailInput = this.portalPanel.locator('input[name="portalInviteEmail"]');
    this.portalInviteButton = this.portalPanel.getByRole('button', { name: 'Invitar', exact: true });
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
}
