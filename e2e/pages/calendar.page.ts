import { Locator, Page } from '@playwright/test';

/**
 * Page object para /calendario (F13 — calendario legal y gestión de plazos).
 * Selectores por rol/texto visible, sin test-ids, igual que el resto de
 * page objects de este proyecto (ver login.page.ts, settings-catalogs.page.ts).
 *
 * F41 (ola 4, rediseño 2026-09-23): el modal de creación se recortó a los
 * campos esenciales (Proceso, Título, Tipo, Fecha/hora, Todo el día,
 * Asignación) — Notas, Cómputo del término y Duración se movieron a la
 * ficha de edición dedicada (`/calendario/plazos/:id`, ver
 * DeadlineDetailPage) y ya no se llenan desde este modal. Al crear, la app
 * navega directo a esa ficha (mismo patrón que UserFormComponent /
 * ProcessFormComponent → ficha de detalle) en vez de quedarse en
 * /calendario, así que `submitCreate()` deja al llamador en la ficha, no
 * en el calendario.
 */
export class CalendarPage {
  readonly newDeadlineButton: Locator;
  readonly createForm: Locator;
  readonly createSubmitButton: Locator;
  readonly createCancelButton: Locator;
  readonly createError: Locator;
  readonly markDoneButton: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;
  // F41 (ola 4): botón "Editar" del panel de detalle — navega a la ficha
  // dedicada en vez de reabrir este mismo modal en modo edición (ver
  // CalendarComponent.goToEdit()).
  readonly editButton: Locator;

  constructor(private readonly page: Page) {
    this.newDeadlineButton = page.getByRole('button', { name: 'Nuevo plazo' });
    this.createForm = page
      .locator('form')
      .filter({
        has: page.getByRole('heading', {
          name: /^Nuevo (plazo o audiencia|evento general)$/,
        }),
      });
    // El texto cambia entre "Crear plazo" (con proceso) y "Crear evento"
    // (evento general) — ver DeadlineFormModalComponent.
    this.createSubmitButton = this.createForm.getByRole('button', { name: /^Crear (plazo|evento)$/ });
    this.createCancelButton = this.createForm.getByRole('button', { name: 'Cancelar' });
    this.createError = this.createForm.locator('p.text-danger');
    // Panel de detalle del plazo seleccionado (abierto al hacer click en un
    // evento de FullCalendar) — solo hay uno abierto a la vez (mutuamente
    // excluyente con el modal de creación), así que no hace falta escoparlo
    // como al `createForm`.
    this.markDoneButton = page.getByRole('button', { name: 'Marcar completado' });
    this.deleteButton = page.getByRole('button', { name: 'Eliminar' });
    this.editButton = page.getByRole('button', { name: 'Editar' });
    // app-confirm-dialog (global, montado en el layout) — deleteDeadline()
    // pasa por ConfirmDialogService antes de llamar al backend, sin
    // personalizar confirmLabel, así que el botón queda con el default
    // "Confirmar" (ver confirm-dialog.component.ts).
    this.confirmDeleteButton = page.getByRole('button', { name: 'Confirmar' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/calendario');
  }

  async openCreateModal(): Promise<void> {
    await this.newDeadlineButton.click();
  }

  async fillCreateForm(options: {
    processTitle: string;
    title: string;
    typeLabel: string;
    dueAt: string;
  }): Promise<void> {
    await this.createForm
      .locator('select[formcontrolname="processId"]')
      .selectOption({ label: options.processTitle });
    await this.createForm.locator('input[formcontrolname="title"]').fill(options.title);
    await this.createForm
      .locator('select[formcontrolname="typeId"]')
      .selectOption({ label: options.typeLabel });
    await this.createForm.locator('input[formcontrolname="dueAt"]').fill(options.dueAt);
  }

  /** Envía el modal de creación — F41 (ola 4): tras el éxito la app navega
   * a la ficha del plazo creado (`/calendario/plazos/:id`), no se queda en
   * /calendario. El llamador debe esperar esa navegación, no el cierre del
   * modal. */
  async submitCreate(): Promise<void> {
    await this.createSubmitButton.click();
  }

  /**
   * FullCalendar (v6) renderiza cada evento como `.fc-event` con el título
   * dentro — no hay forma de escoparlo por rol/label accesible porque la
   * librería no expone uno propio.
   */
  eventByTitle(title: string): Locator {
    return this.page.locator('.fc-event').filter({ hasText: title });
  }

  async openEventDetail(title: string): Promise<void> {
    await this.eventByTitle(title).click();
  }

  detailHeading(title: string): Locator {
    return this.page.getByRole('heading', { name: title, exact: true });
  }

  async markSelectedDone(): Promise<void> {
    await this.markDoneButton.click();
  }

  async deleteSelected(): Promise<void> {
    await this.deleteButton.click();
    await this.confirmDeleteButton.click();
  }

  /** Click "Editar" en el panel de detalle — navega a
   * /calendario/plazos/:id?returnTo=calendario (ver DeadlineDetailPage). */
  async editSelected(): Promise<void> {
    await this.editButton.click();
  }
}
