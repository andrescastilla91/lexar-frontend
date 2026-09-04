import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AiChatService } from '../../core/services/ai-chat.service';
import { ToastService } from '../../core/services/toast.service';
import { AI_CHAT_SUGGESTED_PROMPTS, AiChatFeedback, AiChatLink, AiChatMessage } from '../../core/models/ai-chat.model';
import { parseAiListAnswer } from '../../core/utils/ai-chat-format.util';

/**
 * F20.1 — Asistente IA Nivel 0 (sin LLM). Conecta con `AiChatService`
 * (`/api/ai/chat`, `/api/ai/messages/:id/feedback`); ya no usa
 * `MockDataService`. El backend resuelve la intención con un router
 * determinista y responde solo con datos del propio tenant — este
 * componente únicamente renderiza el historial y envía mensajes.
 */
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="flex flex-col gap-6 lg:flex-row">
      <aside class="w-full rounded-3xl border border-default bg-surface p-6 shadow-[var(--shadow-card)] lg:w-80">
        <h2 class="text-lg font-semibold text-text">Asistente LexAr</h2>
        <p class="mt-2 text-sm text-text-muted">
          Pregunta por procesos, plazos, tareas, clientes o tu suscripción. El asistente solo responde con
          información de tu propia empresa.
        </p>

        <div class="mt-4 rounded-2xl border border-default bg-info-tint px-4 py-3 text-xs text-text-muted">
          Este asistente no constituye asesoría legal. Verifica siempre la información antes de actuar.
        </div>

        <div class="mt-6 space-y-3 text-sm text-text-muted">
          <h3 class="text-xs uppercase tracking-wide text-text-subtle">Preguntas sugeridas</h3>
          @for (suggestion of suggestedPrompts; track suggestion) {
            <button
              type="button"
              class="w-full rounded-2xl border border-default px-4 py-2 text-left text-sm text-text-muted transition hover:border-primary/40 hover:bg-surface-muted"
              (click)="usePrompt(suggestion)"
            >
              {{ suggestion }}
            </button>
          }
        </div>
      </aside>

      <section class="flex-1 rounded-3xl border border-default bg-surface p-6 shadow-[var(--shadow-card)]">
        <div class="flex h-[560px] flex-col">
          <header class="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-text">Conversación</p>
              <p class="text-xs text-text-subtle">{{ messages().length }} mensajes</p>
            </div>
            <span class="rounded-full bg-success-tint px-3 py-1 text-xs font-semibold text-success">Operativo</span>
          </header>

          <div #scrollContainer class="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            @if (isLoadingHistory()) {
              <p class="text-sm text-text-subtle">Cargando historial…</p>
            }

            @if (!isLoadingHistory() && messages().length === 0) {
              <p class="text-sm text-text-subtle">
                Aún no hay mensajes. Escribe una pregunta o usa una de las sugerencias.
              </p>
            }

            @for (message of messages(); track message.id) {
              <article
                class="max-w-xl rounded-3xl px-5 py-3 text-sm shadow-sm"
                [ngClass]="message.role === 'user' ? 'ml-auto bg-primary text-on-primary' : 'bg-surface-sunken text-text'"
              >
                <header class="flex items-center justify-between gap-3 text-xs">
                  <span class="font-semibold">{{ message.role === 'user' ? 'Tú' : 'Asistente LexAr' }}</span>
                  <span [ngClass]="message.role === 'user' ? 'text-on-primary/70' : 'text-text-subtle'">
                    {{ message.createdAt | date: 'HH:mm dd/MM' }}
                  </span>
                </header>

                @if (parseAnswer(message.content); as parsed) {
                  <p class="mt-2 leading-relaxed">{{ parsed.intro }}</p>
                  <ul class="mt-2 space-y-1 leading-relaxed">
                    @for (item of parsed.items; track item) {
                      <li>{{ item }}</li>
                    }
                  </ul>
                } @else {
                  <p class="mt-2 whitespace-pre-line leading-relaxed">{{ message.content }}</p>
                }

                @if (message.links.length > 0) {
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (link of message.links; track link.path) {
                      <button
                        type="button"
                        class="rounded-full px-3 py-1 text-xs font-medium underline-offset-2 hover:underline"
                        [ngClass]="message.role === 'user' ? 'bg-white/20 text-on-primary' : 'bg-surface text-primary'"
                        (click)="openLink(link)"
                      >
                        {{ link.label }}
                      </button>
                    }
                  </div>
                }

                @if (message.role === 'assistant' && !message.understood) {
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (suggestion of suggestedPrompts; track suggestion) {
                      <button
                        type="button"
                        class="rounded-full border border-default bg-surface px-3 py-1 text-xs text-primary transition hover:bg-surface-muted"
                        (click)="usePrompt(suggestion)"
                      >
                        {{ suggestion }}
                      </button>
                    }
                  </div>
                }

                @if (message.role === 'assistant') {
                  <div class="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      class="rounded-full px-2 py-1 text-xs transition"
                      [ngClass]="
                        message.feedback === 'up'
                          ? 'border-2 border-success bg-success-tint text-success'
                          : 'border border-default text-text-subtle opacity-60 hover:opacity-100 hover:bg-surface-muted'
                      "
                      (click)="rate(message, 'up')"
                      aria-label="Respuesta útil"
                      [attr.aria-pressed]="message.feedback === 'up'"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      class="rounded-full px-2 py-1 text-xs transition"
                      [ngClass]="
                        message.feedback === 'down'
                          ? 'border-2 border-danger bg-danger-tint text-danger'
                          : 'border border-default text-text-subtle opacity-60 hover:opacity-100 hover:bg-surface-muted'
                      "
                      (click)="rate(message, 'down')"
                      aria-label="Respuesta no útil"
                      [attr.aria-pressed]="message.feedback === 'down'"
                    >
                      👎
                    </button>
                    @if (message.feedback) {
                      <!-- Texto distinto al toast ("Gracias por tu feedback") a propósito:
                           el toast se auto-descarta, este indicador queda fijo junto a los
                           botones. Mismo texto en ambos lugares rompía Playwright en modo
                           estricto (2 elementos con el mismo accessible name). -->
                      <span class="text-xs text-text-subtle">Feedback registrado</span>
                    }
                  </div>
                }
              </article>
            }
            <div #scrollAnchor></div>
          </div>

          <form class="mt-4 rounded-3xl border border-default bg-surface-muted p-4" [formGroup]="messageForm" (ngSubmit)="sendMessage()">
            <label class="flex flex-col gap-3 text-sm text-text-muted">
              Escribe tu pregunta
              <textarea
                formControlName="message"
                rows="2"
                placeholder="Ej: ¿Qué plazos están por vencer? (Enter envía, Shift+Enter salto de línea)"
                class="w-full rounded-2xl border border-default bg-surface px-4 py-3 text-sm text-text shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                (keydown)="onTextareaKeydown($event)"
              ></textarea>
            </label>
            <div class="mt-3 flex items-center justify-between">
              @if (error()) {
                <p class="text-xs text-danger">{{ error() }}</p>
              } @else {
                <span></span>
              }
              <button
                type="submit"
                class="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-strong"
                [disabled]="messageForm.invalid || isSending()"
              >
                Enviar
                @if (isSending()) {
                  <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
                  </svg>
                }
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `,
})
export class ChatbotComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly aiChatService = inject(AiChatService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  @ViewChild('scrollAnchor') private scrollAnchorRef?: ElementRef<HTMLDivElement>;

  readonly suggestedPrompts = AI_CHAT_SUGGESTED_PROMPTS;

  readonly messages = signal<AiChatMessage[]>([]);
  readonly isLoadingHistory = signal(false);
  readonly isSending = signal(false);
  readonly error = signal<string | null>(null);
  private conversationId: string | undefined;

  readonly messageForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoadingHistory.set(true);
    this.aiChatService.getHistory().subscribe({
      next: (history) => {
        this.conversationId = history.conversationId ?? undefined;
        this.messages.set(history.messages);
        this.isLoadingHistory.set(false);
        this.scrollToBottom();
      },
      error: () => {
        // El historial vacío no es un error bloqueante: el usuario puede
        // simplemente empezar una conversación nueva.
        this.isLoadingHistory.set(false);
      },
    });
  }

  usePrompt(prompt: string): void {
    this.messageForm.patchValue({ message: prompt });
  }

  /** Enter envía el mensaje (estándar en chats); Shift+Enter inserta un
   * salto de línea, como cualquier otro chat. */
  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    if (this.messageForm.invalid || this.isSending()) {
      return;
    }

    const { message } = this.messageForm.getRawValue();
    this.error.set(null);
    this.isSending.set(true);

    this.aiChatService.sendMessage(message, this.conversationId).subscribe({
      next: (response) => {
        this.conversationId = response.conversationId;
        this.messages.update((current) => [...current, response.userMessage, response.assistantMessage]);
        this.messageForm.reset({ message: '' });
        this.isSending.set(false);
        this.scrollToBottom();
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.isSending.set(false);
      },
    });
  }

  rate(message: AiChatMessage, feedback: AiChatFeedback): void {
    if (message.role !== 'assistant') {
      return;
    }

    this.aiChatService.setFeedback(message.id, feedback).subscribe({
      next: () => {
        this.messages.update((current) =>
          current.map((m) => (m.id === message.id ? { ...m, feedback } : m))
        );
        this.toastService.success('Gracias por tu feedback');
      },
      error: (err: Error) => {
        this.toastService.error(err.message || 'No se pudo registrar el feedback');
      },
    });
  }

  openLink(link: AiChatLink): void {
    this.router.navigateByUrl(link.path);
  }

  parseAnswer(content: string) {
    return parseAiListAnswer(content);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.scrollAnchorRef?.nativeElement.scrollIntoView({ block: 'end' });
    });
  }
}
