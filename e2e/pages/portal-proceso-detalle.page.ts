import { Locator, Page } from '@playwright/test';

export class PortalProcesoDetallePage {
  readonly logoutButton: Locator;
  readonly documentsEmptyState: Locator;

  constructor(private readonly page: Page) {
    this.logoutButton = page.getByRole('button', { name: 'Cerrar sesión' });
    this.documentsEmptyState = page.getByText('Sin documentos compartidos todavía.');
  }

  documentRow(filename: string): Locator {
    return this.page.locator('li').filter({ hasText: filename });
  }

  downloadButton(filename: string): Locator {
    return this.documentRow(filename).getByRole('button', { name: 'Descargar' });
  }

  timelineEntry(description: string | RegExp): Locator {
    return this.page.locator('ol > li').filter({ hasText: description });
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
