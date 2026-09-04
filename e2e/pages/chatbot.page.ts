import { Locator, Page } from '@playwright/test';

/**
 * Page object para /chatbot (F20.1 — asistente IA Nivel 0, sin LLM).
 * Selectores por rol/texto visible y por `formcontrolname`, igual que el
 * resto de page objects de este proyecto (sin test-ids).
 */
export class ChatbotPage {
  readonly textarea: Locator;
  readonly sendButton: Locator;
  /** Cada mensaje (usuario o asistente) es un `<article>` — ver
   * chatbot.component.ts. `.last()` siempre apunta al más reciente. */
  readonly messages: Locator;
  readonly thumbsUpButtons: Locator;
  readonly thumbsDownButtons: Locator;

  constructor(private readonly page: Page) {
    this.textarea = page.locator('textarea[formcontrolname="message"]');
    this.sendButton = page.getByRole('button', { name: 'Enviar' });
    this.messages = page.locator('article');
    this.thumbsUpButtons = page.getByRole('button', { name: 'Respuesta útil' });
    this.thumbsDownButtons = page.getByRole('button', { name: 'Respuesta no útil' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/chatbot');
  }

  async ask(message: string): Promise<void> {
    await this.textarea.fill(message);
    await this.sendButton.click();
  }

  /** F20.1 ajuste UX: Enter (sin Shift) envía, igual que cualquier chat. */
  async askWithEnter(message: string): Promise<void> {
    await this.textarea.fill(message);
    await this.textarea.press('Enter');
  }

  /** Chip de pregunta sugerida — vive tanto en el panel lateral como,
   * cuando el asistente no entiende, dentro de esa respuesta. `.first()`
   * desambigua cuando el mismo texto aparece en ambos lugares. */
  suggestedPromptChip(label: string): Locator {
    return this.page.getByRole('button', { name: label, exact: true }).first();
  }

  lastMessage(): Locator {
    return this.messages.last();
  }
}
