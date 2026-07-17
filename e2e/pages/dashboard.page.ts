import { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly brandLabel: Locator;

  constructor(private readonly page: Page) {
    this.brandLabel = page.getByText('Gestión Legal');
  }

  menuLink(label: string): Locator {
    return this.page.getByRole('link', { name: label });
  }
}
