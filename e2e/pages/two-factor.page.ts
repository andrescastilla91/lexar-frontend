import { Locator, Page } from '@playwright/test';

interface TwoFactorSetupResponse {
  otpauthUri: string;
  secret: string;
}

interface TwoFactorVerifyResponse {
  recoveryCodes: string[];
}

/**
 * Page object para /activar-2fa (two-factor-required.component.ts). El
 * setup (POST /auth/2fa/setup) se dispara solo, desde el constructor del
 * componente, apenas la pantalla carga — no hay botón "iniciar" que
 * clickear. Por eso `gotoAndCaptureSecret` intercepta esa respuesta con
 * `waitForResponse` en vez de leer el secreto del DOM (evita depender del
 * QR/parseo del `otpauthUri`, y el backend ya lo entrega en texto plano
 * para justo este caso — ver auth.controller.ts).
 */
export class TwoFactorSetupPage {
  readonly codeInput: Locator;
  readonly confirmButton: Locator;
  readonly verifyError: Locator;
  readonly dismissRecoveryCodesButton: Locator;

  constructor(private readonly page: Page) {
    this.codeInput = page.getByLabel('Código de 6 dígitos');
    this.confirmButton = page.getByRole('button', { name: 'Confirmar y activar' });
    this.verifyError = page.locator('.text-danger').last();
    this.dismissRecoveryCodesButton = page.getByRole('button', { name: 'Ya los guardé' });
  }

  async gotoAndCaptureSecret(): Promise<string> {
    const [setupResponse] = await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url().includes('/auth/2fa/setup') && response.request().method() === 'POST',
      ),
      this.page.goto('/activar-2fa'),
    ]);

    const body = (await setupResponse.json()) as TwoFactorSetupResponse;
    return body.secret;
  }

  /** Envía el código de confirmación y devuelve los códigos de recuperación (se muestran una sola vez). */
  async confirmSetup(code: string): Promise<string[]> {
    await this.codeInput.fill(code);

    const [verifyResponse] = await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.url().includes('/auth/2fa/verify') && response.request().method() === 'POST',
      ),
      this.confirmButton.click(),
    ]);

    // Si el backend rechaza el código (TOTP fuera de ventana, throttle,
    // etc.), la pantalla de recovery codes nunca se muestra y el siguiente
    // paso (dismissRecoveryCodes, esperando "Ya los guardé") se queda 30s
    // en un timeout sin explicación — falla aquí con el motivo real.
    if (!verifyResponse.ok()) {
      throw new Error(
        `POST /auth/2fa/verify devolvió ${verifyResponse.status()}: ${await verifyResponse.text()}`,
      );
    }

    const body = (await verifyResponse.json()) as TwoFactorVerifyResponse;
    return body.recoveryCodes;
  }

  async dismissRecoveryCodes(): Promise<void> {
    await this.dismissRecoveryCodesButton.click();
  }
}
