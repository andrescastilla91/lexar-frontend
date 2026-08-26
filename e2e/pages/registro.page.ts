import { Locator, Page } from '@playwright/test';

/**
 * Page object para /registro (F5 — registro simplificado). Campos según
 * register.component.ts: datos del administrador + datos mínimos de la
 * empresa (razón social y NIT/RUT); el resto de datos de empresa se
 * completa después desde Configuración.
 */
export class RegistroPage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly legalNameInput: Locator;
  readonly taxIdInput: Locator;
  readonly submitButton: Locator;
  // El mensaje de error del servidor es el último ".text-danger" del form
  // (los anteriores son validaciones de campo) — mismo patrón que
  // LoginPage.errorMessage.
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.firstNameInput = page.locator('#firstName');
    this.lastNameInput = page.locator('#lastName');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.legalNameInput = page.locator('#legalName');
    this.taxIdInput = page.locator('#taxId');
    this.submitButton = page.getByRole('button', { name: 'Crear cuenta' });
    this.errorMessage = page.locator('.text-danger').last();
  }

  async goto(): Promise<void> {
    await this.page.goto('/registro');
  }

  async fillAndSubmit(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    legalName: string;
    taxId: string;
  }): Promise<void> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);
    await this.legalNameInput.fill(data.legalName);
    await this.taxIdInput.fill(data.taxId);
    await this.submitButton.click();
  }
}
