import { Locator, Page } from '@playwright/test';

/**
 * Page object para F18 — overlay de búsqueda global. NO es una ruta: el
 * botón (`GlobalSearchTriggerComponent`, atajo Ctrl+K vía
 * `@HostListener('window:keydown')`) y el modal (`GlobalSearchOverlayComponent`)
 * viven como hermanos en `main-layout.component.ts`, montados en cualquier
 * página autenticada.
 */
export class GlobalSearchPage {
  readonly triggerButton: Locator;
  readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.triggerButton = page.getByRole('button', { name: 'Buscar' });
    this.searchInput = page.getByPlaceholder(
      'Buscar procesos, clientes, asesores, plazos, tareas, documentos…',
    );
  }

  /** El listener del atajo está en `window`, pero un click previo en el
   * body evita que el foco quede en un input de otro overlay que pudiera
   * capturar el evento antes de que llegue a window. */
  async openWithShortcut(): Promise<void> {
    await this.page.locator('body').click();
    await this.page.keyboard.press('Control+K');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  /** El botón de cada resultado no tiene aria-label propio — su nombre
   * accesible es título + subtítulo concatenados, así que un substring del
   * título (idealmente único, p. ej. con timestamp) alcanza para ubicarlo. */
  resultItem(title: string): Locator {
    return this.page.getByRole('button', { name: title });
  }
}
