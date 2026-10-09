import { Locator, Page } from '@playwright/test';
import { openSettingsSection } from './settings-nav';

/**
 * Page object para la pestaña "Catálogos" de Configuración (/configuracion), F25.
 * Los selectores se basan en roles/texto visible siguiendo la convención de este
 * proyecto (ver login.page.ts, dashboard.page.ts) en vez de test-ids, porque el
 * resto de la app tampoco los usa todavía.
 */
export class SettingsCatalogsPage {
  readonly newItemButton: Locator;
  readonly codeInput: Locator;
  readonly labelInput: Locator;
  readonly saveButton: Locator;

  constructor(private readonly page: Page) {
    this.newItemButton = page.getByRole('button', { name: 'Nuevo ítem' });
    this.codeInput = page.locator('input[formcontrolname="code"]');
    this.labelInput = page.locator('input[formcontrolname="label"]');
    this.saveButton = page.getByRole('button', { name: 'Guardar' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/configuracion');
    await openSettingsSection(this.page, 'Catálogos');
  }

  /**
   * F47: la navegación entre catálogos es una lista (no pestañas). En viewport
   * ancho las entradas se ven siempre; por debajo de `md` están detrás del
   * botón "Catálogo: …", que se abre solo si hace falta. Se localiza con CSS y
   * no con getByRole porque este ignora lo oculto y, en móvil cerrado, la
   * entrada existe pero no es visible. El texto de cada entrada es su etiqueta
   * seguida (a veces) de su contador, de ahí el patrón: evita que
   * "Tipos de documento" también atrape "Tipos de documento (archivos)".
   */
  catalogEntry(label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page
      .locator('nav[aria-label="Catálogos disponibles"] button[data-catalog-type]')
      .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*(\\d+\\s*)?$`) });
  }

  private async openMobilePanelIfHidden(target: Locator): Promise<void> {
    await target.waitFor({ state: 'attached' });
    if (!(await target.isVisible())) {
      await this.page.getByRole('button', { name: /^Catálogo:/ }).click();
    }
  }

  get navToggle(): Locator {
    return this.page.getByRole('button', { name: /^Catálogo:/ });
  }

  async revealNav(): Promise<void> {
    const nav = this.page.locator('nav[aria-label="Catálogos disponibles"]');
    await nav.waitFor({ state: 'attached' });
    if (!(await nav.isVisible())) {
      await this.navToggle.click();
    }
  }

  async selectCatalogType(label: string): Promise<void> {
    const entry = this.catalogEntry(label);
    await this.openMobilePanelIfHidden(entry);
    await entry.click();
  }

  async searchCatalog(text: string): Promise<void> {
    const search = this.page.locator('input[type="search"][placeholder^="Buscar catálogo"]');
    await this.openMobilePanelIfHidden(search);
    await search.fill(text);
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
