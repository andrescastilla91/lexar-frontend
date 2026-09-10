import { Locator, Page } from '@playwright/test';

/**
 * Page object para la pestaña "Plan y facturación" de Configuración
 * (/configuracion?tab=plan), F7-R3. Cada columna se localiza por su botón
 * "Actualizar a <plan>" (único por columna) en vez del nombre del plan a
 * secas: la card "Plan actual" de arriba también muestra el nombre del plan
 * vigente y colisionaría con un locator por texto simple.
 */
export class SettingsPlanPage {
  constructor(private readonly page: Page) {}

  async gotoPlanTab(): Promise<void> {
    await this.page.goto('/configuracion?tab=plan');
  }

  planCard(planName: string): Locator {
    return this.page
      .locator('div.shadow-card')
      .filter({ has: this.page.getByRole('button', { name: `Actualizar a ${planName}` }) });
  }
}
