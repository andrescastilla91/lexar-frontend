import { Locator, Page } from '@playwright/test';

export class PortalProcesosPage {
  readonly logoutButton: Locator;
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.logoutButton = page.getByRole('button', { name: 'Cerrar sesión' });
    this.emptyState = page.getByText('Todavía no tienes procesos visibles en tu portal.');
  }

  processLink(title: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(title) });
  }

  async openProcess(title: string): Promise<void> {
    await this.processLink(title).click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
