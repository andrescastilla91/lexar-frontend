import { Locator, Page } from '@playwright/test';

/**
 * Page object para la pestaña "Catálogos" de Configuración (/configuracion), F25.
 * Los selectores se basan en roles/texto visible siguiendo la convención de este
 * proyecto (ver login.page.ts, dashboard.page.ts) en vez de test-ids, porque el
 * resto de la app tampoco los usa todavía.
 */
export class SettingsCatalogsPage {
  readonly catalogsTab: Locator;
  readonly newItemButton: Locator;
  readonly codeInput: Locator;
  readonly labelInput: Locator;
  readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    this.catalogsTab = page.getByRole('button', { name: 'Catálogos', exact: true });
    this.newItemButton = page.getByRole('button', { name: 'Nuevo ítem' });
    this.codeInput = page.locator('input[formcontrolname="code"]');
    this.labelInput = page.locator('input[formcontrolname="label"]');
    this.saveButton = page.getByRole('button', { name: 'Guardar' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/configuracion');
    await this.catalogsTab.click();
  }

  async selectCatalogType(label: string): Promise<void> {
    // Tabs de tipo de catálogo en desktop
    const tabButton = this.page.getByRole('button', { name: label, exact: true });
    if (await tabButton.isVisible().catch(() => false)) {
      await tabButton.click();
      return;
    }
    // Fallback mobile: <select> de tipo de catálogo
    const mobileSelect = this.page.locator('select').first();
    await mobileSelect.selectOption({ label });
  }

  itemRow(label: string): Locator {
    return this.page.locator('div').filter({ hasText: label }).last();
  }

  async createItem(code: string, label: string): Promise<void> {
    await this.newItemButton.click();
    await this.codeInput.fill(code);
    await this.labelInput.fill(label);
    await this.saveButton.click();
  }
}
