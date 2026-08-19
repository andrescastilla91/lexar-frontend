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
    // click() auto-espera a que el botón exista y sea clickeable, a
    // diferencia de isVisible() (que no espera nada y puede dar falso
    // negativo justo después de goto()/catalogsTab.click(), cuando el tab
    // bar de tipos de catálogo aún no terminó de renderizar) — eso hacía
    // caer al <select> mobile, oculto por CSS en viewport desktop (30s de
    // timeout esperando un elemento invisible). Ver HU-FE-E2E-1.
    const tabButton = this.page.getByRole('button', { name: label, exact: true });
    try {
      await tabButton.click({ timeout: 3_000 });
      return;
    } catch {
      // Viewport angosto real: el tab bar no existe, cae al <select> mobile.
    }
    const mobileSelect = this.page.locator('select').first();
    await mobileSelect.selectOption({ label });
  }

  itemRow(label: string): Locator {
    // Ni .first() ni .last() sobre `div.filter({hasText})` dan la fila
    // exacta: el contenedor de la lista completa y la card externa también
    // "contienen" el texto de cualquier fila (así que .first() agarra TODAS
    // las filas), y el span del label anidado también matchea por sí solo
    // (.last() agarra solo eso, sin los botones). Los divs hijos directos de
    // `.divide-y.divide-default` sí son uno por fila — ver
    // settings-catalogs.component.ts.
    return this.page.locator('.divide-y.divide-default > div').filter({ hasText: label });
  }

  async createItem(code: string, label: string): Promise<void> {
    await this.newItemButton.click();
    await this.codeInput.fill(code);
    await this.labelInput.fill(label);
    await this.saveButton.click();
  }
}
