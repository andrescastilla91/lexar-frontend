import { Locator, Page } from '@playwright/test';

/**
 * Page object para la pestaña "Portal del cliente" de Configuración
 * (/configuracion?tab=portal-visibility), F27. Cada fila es un tipo de
 * evento (`getEventLabel()`, ver process-format.utils.ts) con un único
 * selector (`app-select`, combobox) — no hay formcontrolname porque no es un
 * formulario reactivo, así que se ubica por la fila (texto del label).
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
    return this.row(eventLabel).getByRole('combobox');
  }

  async optionLabels(eventLabel: string): Promise<string[]> {
    await this.modeSelect(eventLabel).click();
    const labels = await this.row(eventLabel).getByRole('option').allTextContents();
    await this.page.keyboard.press('Escape');
    return labels.map((label) => label.trim());
  }

  async setMode(eventLabel: string, modeOptionLabel: string): Promise<void> {
    await this.modeSelect(eventLabel).click();
    await this.row(eventLabel).getByRole('option', { name: modeOptionLabel, exact: true }).click();
  }
}
