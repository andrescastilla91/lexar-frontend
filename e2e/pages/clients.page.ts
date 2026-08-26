import { Locator, Page } from '@playwright/test';

/**
 * Page object para /clientes. Cubre dos usos:
 *  - Creación de cliente (prerequisito real de otros flujos, ej. Procesos
 *    exige un clientId — ver flujo 4 de HU-FE-E2E-2).
 *  - Panel "Portal del cliente" (A3.2, F16) embebido en el modal de
 *    edición — invitar/reenviar acceso al portal desde el detalle del
 *    cliente.
 *
 * `table tr` filtrado por texto en vez de un selector más simple: la tabla
 * de escritorio (`hidden md:block`) y las tarjetas móviles (`md:hidden`)
 * conviven en el DOM aunque el viewport solo muestre una — un botón
 * "Editar" por nombre de cliente sin acotar a la fila real matchearía las
 * dos versiones (violación de modo estricto). Ver el mismo gotcha
 * documentado en settings-catalogs.page.ts. Por la misma razón, para
 * comprobar que un cliente recién creado aparece en la lista conviene
 * acotar a `table tr` en vez de un `getByText` suelto sobre toda la página.
 */
export class ClientsPage {
  readonly newClientButton: Locator;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly documentTypeSelect: Locator;
  readonly identificationNumberInput: Locator;
  // El mismo botón sirve para crear/actualizar — el texto cambia según
  // isEditing() (ver client-form.component.ts).
  readonly createClientButton: Locator;

  readonly portalPanel: Locator;
  readonly portalInviteEmailInput: Locator;
  readonly portalInviteButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.newClientButton = page.getByRole('button', { name: 'Nuevo cliente' });
    this.fullNameInput = page.locator('input[formcontrolname="fullName"]');
    this.emailInput = page.locator('input[formcontrolname="email"]');
    this.documentTypeSelect = page.locator('select[formcontrolname="documentTypeId"]');
    this.identificationNumberInput = page.locator('input[formcontrolname="identificationNumber"]');
    this.createClientButton = page.getByRole('button', { name: /^(Crear cliente|Actualizar)$/ });

    this.portalPanel = page.locator('app-client-portal-invitations');
    this.portalInviteEmailInput = this.portalPanel.locator('input[name="portalInviteEmail"]');
    this.portalInviteButton = this.portalPanel.getByRole('button', { name: 'Invitar', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancelar' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/clientes');
  }

  async createClient(data: {
    fullName: string;
    email: string;
    documentTypeLabel: string;
    identificationNumber: string;
  }): Promise<void> {
    await this.newClientButton.click();
    await this.fullNameInput.fill(data.fullName);
    await this.emailInput.fill(data.email);
    await this.documentTypeSelect.selectOption({ label: data.documentTypeLabel });
    await this.identificationNumberInput.fill(data.identificationNumber);
    await this.createClientButton.click();
  }

  row(clientFullName: string): Locator {
    return this.page.locator('table tr').filter({ hasText: clientFullName });
  }

  editButton(clientFullName: string): Locator {
    return this.row(clientFullName).getByRole('button', { name: 'Editar' });
  }

  async openEdit(clientFullName: string): Promise<void> {
    await this.editButton(clientFullName).click();
  }

  invitationRow(email: string): Locator {
    return this.portalPanel.locator('li').filter({ hasText: email });
  }

  async inviteToPortal(email: string): Promise<void> {
    await this.portalInviteEmailInput.fill(email);
    await this.portalInviteButton.click();
  }

  async closeEditPanel(): Promise<void> {
    await this.cancelButton.click();
  }
}
