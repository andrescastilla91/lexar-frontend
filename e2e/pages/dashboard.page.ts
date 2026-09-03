import { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly brandLabel: Locator;
  // app-user-menu solo expone "Cerrar sesión" dentro de un dropdown que
  // abre este botón — es el único <button> directo del componente antes de
  // que el menú se abra, así que no depende del nombre/rol del usuario
  // logueado (variable por tenant) para ser único (ver user-menu.component.ts).
  readonly userMenuToggle: Locator;
  readonly logoutButton: Locator;

  // F32 PR3 — personalización del tablero.
  readonly personalizeButton: Locator;
  readonly saveLayoutButton: Locator;
  readonly cancelLayoutButton: Locator;

  constructor(private readonly page: Page) {
    this.brandLabel = page.getByText('Gestión Legal');
    this.userMenuToggle = page.locator('app-user-menu button').first();
    this.logoutButton = page.getByRole('button', { name: 'Cerrar sesión' });
    this.personalizeButton = page.getByRole('button', { name: 'Personalizar tablero' });
    this.saveLayoutButton = page.getByRole('button', { name: 'Guardar cambios' });
    this.cancelLayoutButton = page.getByRole('button', { name: 'Cancelar' });
  }

  menuLink(label: string): Locator {
    return this.page.getByRole('link', { name: label });
  }

  async logout(): Promise<void> {
    await this.userMenuToggle.click();
    await this.logoutButton.click();
  }

  /** Fila del widget en la lista "Activos" del modo edición — ver aria-label en dashboard.component.ts. */
  activeWidgetRow(title: string): Locator {
    return this.page.getByLabel(`Widget activo: ${title}`);
  }

  /** Fila del widget en la lista "Disponibles" del modo edición. */
  availableWidgetRow(title: string): Locator {
    return this.page.getByLabel(`Widget disponible: ${title}`);
  }

  async removeActiveWidget(title: string): Promise<void> {
    await this.activeWidgetRow(title).getByRole('button', { name: 'Quitar' }).click();
  }

  async addAvailableWidget(title: string): Promise<void> {
    await this.availableWidgetRow(title).getByRole('button', { name: 'Agregar' }).click();
  }

  async moveActiveWidgetDown(title: string): Promise<void> {
    await this.activeWidgetRow(title).getByRole('button', { name: 'Bajar' }).click();
  }

  /** Widgets en vivo (fuera del modo edición) — por el selector de cada componente de widget. */
  liveWidget(selector: string): Locator {
    return this.page.locator(selector);
  }
}
