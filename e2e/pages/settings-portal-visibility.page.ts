import { Locator, Page } from '@playwright/test';

/**
 * Page object para la pestaña "Portal del cliente" de Configuración
 * (/configuracion?tab=portal-visibility), F27. Cada fila es un tipo de
 * evento (`getEventLabel()`, ver process-format.utils.ts) con un único
 * `<select>` — no hay formcontrolname porque no es un formulario reactivo,
 * así que se ubica por la fila (texto del label) en vez de por atributo.
 */
export class SettingsPortalVisibilityPage {
  constructor(private readonly page: Page) {}

  async gotoTab(): Promise<void> {
    await this.page.goto('/configuracion?tab=portal-visibility');
  }

  private row(eventLabel: string): Locator {
    return this.page
      .locator('div.rounded-lg.border')
      .filter({ has: this.page.getByText(eventLabel, { exact: true }) });
  }

  modeSelect(eventLabel: string): Locator {
    return this.row(eventLabel).locator('select');
  }

  async setMode(eventLabel: string, modeOptionLabel: string): Promise<void> {
    await this.modeSelect(eventLabel).selectOption({ label: modeOptionLabel });
  }
}
