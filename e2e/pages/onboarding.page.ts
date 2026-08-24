import { Locator, Page } from '@playwright/test';

/**
 * Page object para /onboarding (wizard de 3 pasos: datos legales, invitar
 * equipo, crear primer cliente/proceso — ver onboarding.component.ts). Cada
 * paso se puede "saltar" con confirmación; este page object cubre el camino
 * de saltar los 3 pasos hasta terminar, que es el que ejercita el cruce de
 * guards real (email verificado, sin 2FA obligatorio) sin acoplarse a los
 * formularios de datos legales / invitación (ya cubiertos por sus propios
 * specs de configuración/usuarios).
 */
export class OnboardingPage {
  readonly finishButton: Locator;

  constructor(private readonly page: Page) {
    this.finishButton = this.page.getByRole('button', { name: 'Terminar', exact: true });
  }

  private skipInlineButton(): Locator {
    return this.page.getByRole('button', { name: 'Saltar por ahora' });
  }

  // ConfirmDialogComponent reutiliza como confirmLabel el mismo texto del
  // botón que lo dispara ("Saltar por ahora" / "Terminar de todas formas"),
  // así que hay que acotar la búsqueda al contenedor del modal (shadow-2xl)
  // para no matchear el botón de fondo que sigue montado detrás del overlay.
  private confirmDialogButton(label: string): Locator {
    return this.page.locator('.shadow-2xl').getByRole('button', { name: label, exact: true });
  }

  async skipStep(): Promise<void> {
    await this.skipInlineButton().click();
    await this.confirmDialogButton('Saltar por ahora').click();
    // Sin esto, un segundo `skipStep()` (paso 2) puede arrancar mientras el
    // diálogo del paso 1 todavía no terminó de ocultarse — el nuevo botón
    // inline del paso 2 y el diálogo saliente del paso 1 coinciden
    // brevemente y `getByRole('button', {name: 'Saltar por ahora'})` viola
    // modo estricto al resolver a los dos. `<app-confirm-dialog>` es un
    // componente montado una sola vez a nivel raíz (igual que `<app-toast>`)
    // que alterna su contenido con `@if (dialog(); as current)` — el tag
    // nunca se desmonta del DOM, solo su contenido queda oculto, así que hay
    // que esperar 'hidden' (no 'detached', que nunca ocurre — confirmado en
    // la corrida real: "locator resolved to hidden <app-confirm-dialog>"
    // repetido hasta agotar el timeout).
    await this.page.locator('app-confirm-dialog').waitFor({ state: 'hidden' });
  }

  async finishWithConfirmation(): Promise<void> {
    await this.finishButton.click();
    await this.confirmDialogButton('Terminar de todas formas').click();
  }
}
