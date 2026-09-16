import { Locator, Page } from '@playwright/test';

/**
 * Page object para /usuarios/:id (ficha de usuario, F35 rediseño 2026-09-15).
 * Selectores por rol/texto visible, sin test-ids, igual que el resto de
 * page objects de este proyecto (ver login.page.ts, calendar.page.ts).
 *
 * El checkbox "Es asesor legal" (user-detail.component.ts) usa el patrón de
 * toggle visual `class="peer sr-only"` — el `<input>` real queda clip-eado a
 * 0x0 por Tailwind (accesible para lectores de pantalla, invisible en
 * pantalla). Playwright puede marcarlo como no-actionable pese a que el
 * usuario real sí lo activa (hace click en el `<span>` del toggle, que
 * también togglea el input por estar dentro del mismo `<label>`); por eso
 * `toggleIsAdvisor()` usa `force: true` en vez de esperar visibilidad.
 */
export class UserDetailPage {
  readonly advisorBadge: Locator;
  readonly profileTab: Locator;
  readonly isAdvisorCheckbox: Locator;
  readonly saveButton: Locator;
  readonly errorBanner: Locator;
  // app-confirm-dialog (global, montado en el layout) — saveUser() personaliza
  // confirmLabel a "Quitar perfil de asesor" cuando se destilda "Es asesor
  // legal" (ver user-detail.component.ts); cancelLabel queda con el default
  // "Cancelar" (ver confirm-dialog.component.ts).
  readonly confirmDialogHeading: Locator;
  readonly confirmRemoveButton: Locator;
  readonly cancelRemoveButton: Locator;

  constructor(private readonly page: Page) {
    this.advisorBadge = page.getByText('Asesor', { exact: true });
    this.profileTab = page.getByRole('button', { name: 'Perfil profesional' });
    this.isAdvisorCheckbox = page.locator('input[formcontrolname="isAdvisor"]');
    this.saveButton = page.getByRole('button', { name: 'Guardar cambios' });
    this.errorBanner = page.locator('.text-danger').last();
    this.confirmDialogHeading = page.getByRole('heading', { name: 'Quitar perfil de asesor legal' });
    this.confirmRemoveButton = page.getByRole('button', { name: 'Quitar perfil de asesor' });
    this.cancelRemoveButton = page.getByRole('button', { name: 'Cancelar' });
  }

  async goto(userId: string): Promise<void> {
    await this.page.goto(`/usuarios/${userId}`);
  }

  async openProfileTab(): Promise<void> {
    await this.profileTab.click();
  }

  async uncheckIsAdvisor(): Promise<void> {
    await this.isAdvisorCheckbox.uncheck({ force: true });
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
