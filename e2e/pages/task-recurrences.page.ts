import { Locator, Page } from '@playwright/test';

/**
 * Page object de /tareas/recurrentes (F42 — TAR-03): listado de series con su
 * estado, ocurrencias, edición y ciclo de vida (detener, reanudar,
 * finalizar). Selectores por rol/texto visible, igual que el resto de page
 * objects.
 */
export class TaskRecurrencesPage {
  readonly heading: Locator;
  readonly statusFilter: Locator;
  readonly stopDialog: Locator;
  readonly finalizeDialog: Locator;
  readonly editModal: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Tareas recurrentes', level: 2 });
    this.statusFilter = page.locator('select').first();
    this.stopDialog = page
      .locator('div.fixed.inset-0')
      .filter({ has: page.getByRole('heading', { name: 'Detener tarea recurrente' }) });
    this.finalizeDialog = page
      .locator('div.fixed.inset-0')
      .filter({ has: page.getByRole('heading', { name: 'Finalizar tarea recurrente' }) });
    this.editModal = page
      .locator('div.fixed.inset-0')
      .filter({ has: page.getByRole('heading', { name: 'Editar tarea recurrente' }) });
  }

  async goto(): Promise<void> {
    await this.page.goto('/tareas/recurrentes');
  }

  /** Tarjeta de una serie (el `<li>` que contiene su título). */
  card(title: string): Locator {
    return this.page.locator('li').filter({ has: this.page.getByRole('heading', { name: title }) });
  }

  async filterByStatus(label: string): Promise<void> {
    await this.statusFilter.selectOption({ label });
  }

  async confirmStop(): Promise<void> {
    await this.stopDialog.getByRole('button', { name: 'Detener' }).click();
  }

  async confirmFinalize(): Promise<void> {
    await this.finalizeDialog.getByRole('button', { name: 'Finalizar' }).click();
  }
}
