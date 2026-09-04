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
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path
                          d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        ></path>
                      </svg>
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
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path
                          d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 0 1-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54m.023-8.25H16.48a4.5 4.5 0 0 1-1.423-.23l-3.114-1.04a4.5 4.5 0 0 0-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 0 0 2.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.5a2.25 2.25 0 0 0 2.25 2.25.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        ></path>
                      </svg>
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
