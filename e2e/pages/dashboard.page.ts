import { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly brandLabel: Locator;
  // app-user-menu solo expone "Cerrar sesión" dentro de un dropdown que
  // abre este botón — es el único <button> directo del componente antes de
  // que el menú se abra, así que no depende del nombre/rol del usuario
  // logueado (variable por tenant) para ser único (ver user-menu.component.ts).
  readonly userMenuToggle: Locator;
  readonly logoutButton: Locator;

  constructor(private readonly page: Page) {
    this.brandLabel = page.getByText('Gestión Legal');
    this.userMenuToggle = page.locator('app-user-menu button').first();
    this.logoutButton = page.getByRole('button', { name: 'Cerrar sesión' });
  }

  menuLink(label: string): Locator {
    return this.page.getByRole('link', { name: label });
  }

  async logout(): Promise<void> {
    await this.userMenuToggle.click();
    await this.logoutButton.click();
  }
}
