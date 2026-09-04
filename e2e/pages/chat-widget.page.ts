import { Locator, Page } from '@playwright/test';

/**
 * Page object del widget flotante global del asistente (HU-F20-1-b).
 * Selectores por rol/texto visible, igual que el resto de page objects
 * de este proyecto (sin test-ids). El botón flotante y el botón de
 * cerrar del panel usan accessible names distintos a propósito
 * ("Minimizar asistente" vs "Cerrar asistente") para no repetir el bug
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
    this.openButton = page.getByRole('button', { name: 'Abrir asistente LexAr' });
    this.minimizeButton = page.getByRole('button', { name: 'Minimizar asistente' });
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
