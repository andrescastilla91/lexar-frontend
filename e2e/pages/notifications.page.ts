import { Locator, Page } from '@playwright/test';

/**
 * Page object para F12 — la campana de notificaciones (componente de layout,
 * visible en cualquier página autenticada, NO una ruta propia) y la tarjeta
 * de preferencias que vive en /perfil (`ProfileNotificationsCardComponent`).
 */
export class NotificationsPage {
  readonly bellButton: Locator;
  readonly bellViewAllLink: Locator;
  readonly preferencesSaveButton: Locator;

  constructor(private readonly page: Page) {
    this.bellButton = page.getByRole('button', { name: 'Notificaciones' });
    this.bellViewAllLink = page.getByRole('link', { name: 'Ver todas' });
    this.preferencesSaveButton = page.getByRole('button', {
      name: 'Guardar preferencias',
    });
  }

  async openBell(): Promise<void> {
    await this.bellButton.click();
  }

  /** El badge de no leídas solo se renderiza en el DOM cuando unreadCount() > 0 —
   * si no hay notificaciones el locator no matchea ningún elemento (y eso es
   * lo esperado, no un error). */
  bellUnreadBadge(): Locator {
    return this.bellButton.locator('span');
  }

  /** El texto de cada item del dropdown es título + cuerpo concatenados
   * (sin aria-label propio) — basta un substring único del cuerpo (p. ej. el
   * título de la tarea que disparó la notificación) para ubicarlo sin
   * ambigüedad. */
  bellItem(bodyText: string): Locator {
    return this.page.getByRole('button', { name: bodyText });
  }

  async gotoPreferences(): Promise<void> {
    await this.page.goto('/perfil');
  }

  /** Fila de la tabla de preferencias para un tipo de notificación
   * (`pref.description`, p. ej. "Tarea asignada"). Las columnas van en
   * orden fijo In-app / Email / Push, así que `.first()` sobre los
   * checkboxes de la fila es siempre el canal in-app. */
  preferenceInAppCheckbox(description: string): Locator {
    return this.page
      .locator('tr')
      .filter({ hasText: description })
      .locator('input[type="checkbox"]')
      .first();
  }

  async savePreferences(): Promise<void> {
    await this.preferencesSaveButton.click();
  }
}
