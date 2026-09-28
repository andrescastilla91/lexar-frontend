import { Locator, Page } from '@playwright/test';

/**
 * Page object para /calendario/plazos/:id — ficha de edición de un plazo o
 * evento (F41, ola 4, rediseño 2026-09-23). Nueva: antes no existía, todo
 * vivía en modales.
 *
 * Notas es un `<textarea>` plano (decisión 2026-09-23): se intentó con
 * ngx-editor, incluso en esta vista dedicada sin FullCalendar (la
 * hipótesis de que el bug dependía de convivir con `<full-calendar>` no se
 * sostuvo — el mismo problema de foco reapareció aquí también), y se
 * decidió no bloquear la feature por eso — ver DeadlineDetailComponent.
 *
 * Compartida por el flujo de Calendario y el de la pestaña "Plazos" de un
 * Proceso: "Volver" resuelve el origen vía query params
 * (returnTo=calendario|proceso[&processId=...][&tab=plazos]).
 */
export class DeadlineDetailPage {
  readonly heading: Locator;
  readonly backLink: Locator;
  readonly notesTextarea: Locator;
  readonly saveButton: Locator;
  readonly markDoneButton: Locator;
  readonly deleteButton: Locator;

  constructor(private readonly page: Page) {
    const scope = page.locator('app-deadline-detail');
    this.heading = scope.locator('h2');
    this.backLink = scope.locator('header a');
    this.notesTextarea = scope.locator('textarea[formcontrolname="notes"]');
    this.saveButton = scope.getByRole('button', { name: 'Guardar cambios' });
    this.markDoneButton = scope.getByRole('button', { name: 'Marcar como completado' });
    this.deleteButton = scope.getByRole('button', { name: 'Eliminar' });
  }

  async fillNotes(notes: string): Promise<void> {
    await this.notesTextarea.fill(notes);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async markDone(): Promise<void> {
    await this.markDoneButton.click();
  }

  async goBack(): Promise<void> {
    await this.backLink.click();
  }
}
