import { Locator, Page } from '@playwright/test';

export class PortalActivarCuentaPage {
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(private readonly page: Page) {
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.submitButton = page.getByRole('button', { name: 'Activar mi acceso' });
    this.errorMessage = page.locator('.text-danger').last();
    this.successMessage = page.getByText('Tu acceso fue activado');
  }

  async goto(token: string): Promise<void> {
    await this.page.goto(`/portal/activar-cuenta?token=${token}`);
  }

  async activate(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
  }
}
