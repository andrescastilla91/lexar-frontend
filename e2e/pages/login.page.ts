import { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  // Segundo paso (F11/S10): mismo componente /login, sin ruta propia — ver
  // login.component.ts (awaitingTwoFactor). El input de código comparte
  // id="code" con nada más de la pantalla, así que no colisiona con el resto.
  readonly twoFactorCodeInput: Locator;
  readonly twoFactorSubmitButton: Locator;
  readonly twoFactorError: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: 'Iniciar sesión' });
    this.errorMessage = page.locator('.text-danger').last();
    this.twoFactorCodeInput = page.locator('#code');
    this.twoFactorSubmitButton = page.getByRole('button', { name: 'Verificar' });
    this.twoFactorError = page.locator('.text-danger').last();
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async loginAs(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async submitTwoFactorCode(code: string): Promise<void> {
    await this.twoFactorCodeInput.fill(code);
    await this.twoFactorSubmitButton.click();
  }
}
