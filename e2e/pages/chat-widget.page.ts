import { Locator, Page } from '@playwright/test';

/**
 * Page object del widget flotante global del asistente (HU-F20-1-b).
 * Selectores por rol/texto visible, igual que el resto de page objects
 * de este proyecto (sin test-ids). El botón flotante y el botón de
 * cerrar del panel usan accessible names distintos a propósito
 * ("Minimizar a Lexi" vs "Cerrar asistente") para no repetir el bug
 * de texto duplicado en modo estricto ya visto en chatbot.spec.ts
 * ("Gracias por tu feedback").
 */
export class ChatWidgetPage {
  readonly openButton: Locator;
  readonly minimizeButton: Locator;
  readonly closeButton: Locator;
  readonly textarea: Locator;
  readonly sendButton: Locator;
  /** Cada mensaje (usuario o asistente) es un `<article>` — igual que en
   * la pantalla dedicada /chatbot (mismo `AiChatPanelComponent`). */
  readonly messages: Locator;

  constructor(private readonly page: Page) {
    // F20.3: el botón flotante se renombró a "Lexi" — mismo botón alterna
    // entre "Abrir a Lexi" (cerrado) y "Minimizar a Lexi" (abierto).
    this.openButton = page.getByRole('button', { name: 'Abrir a Lexi' });
    this.minimizeButton = page.getByRole('button', { name: 'Minimizar a Lexi' });
    this.closeButton = page.getByRole('button', { name: 'Cerrar asistente' });
    this.textarea = page.locator('textarea[formcontrolname="message"]');
    this.sendButton = page.getByRole('button', { name: 'Enviar' });
    this.messages = page.locator('article');
  }

  async open(): Promise<void> {
    await this.openButton.click();
  }

  async ask(message: string): Promise<void> {
    await this.textarea.fill(message);
    await this.sendButton.click();
  }

  lastMessage(): Locator {
    return this.messages.last();
  }
}
