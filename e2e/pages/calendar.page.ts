import { Locator, Page } from '@playwright/test';

/**
 * Page object para /calendario (F13 — calendario legal y gestión de plazos).
 * Selectores por rol/texto visible, sin test-ids, igual que el resto de
 * page objects de este proyecto (ver login.page.ts, settings-catalogs.page.ts).
 *
 * El formulario de creación y el formulario de filtros comparten el mismo
 * `formcontrolname="processId"` (ver calendar.component.ts) — hay que
 * escopar los selectores del modal de creación a su propio `<form>` (tiene
 * el heading "Nuevo plazo o audiencia") para no ambigüedad con el filtro.
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

  constructor(private readonly page: Page) {
    this.newDeadlineButton = page.getByRole('button', { name: 'Nuevo plazo' });
    this.createForm = page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: 'Nuevo plazo o audiencia' }) });
    this.createSubmitButton = this.createForm.getByRole('button', { name: 'Crear plazo' });
    this.createCancelButton = this.createForm.getByRole('button', { name: 'Cancelar' });
    this.createError = this.createForm.locator('p.text-danger');
    // Panel de detalle del plazo seleccionado — solo hay uno abierto a la
    // vez (mutuamente excluyente con el modal de creación), así que no hace
    // falta escoparlo como al `createForm`.
    this.markDoneButton = page.getByRole('button', { name: 'Marcar completado' });
    this.deleteButton = page.getByRole('button', { name: 'Eliminar' });
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
    notes?: string;
  }): Promise<void> {
    await this.createForm
      .locator('select[formcontrolname="processId"]')
      .selectOption({ label: options.processTitle });
    await this.createForm.locator('input[formcontrolname="title"]').fill(options.title);
    await this.createForm
      .locator('select[formcontrolname="typeId"]')
      .selectOption({ label: options.typeLabel });
    await this.createForm.locator('input[formcontrolname="dueAt"]').fill(options.dueAt);
    if (options.notes) {
      await this.createForm.locator('textarea[formcontrolname="notes"]').fill(options.notes);
    }
  }

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
}
