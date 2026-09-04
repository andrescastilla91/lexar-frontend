import { Component, ViewChild } from '@angular/core';
import { AI_CHAT_SUGGESTED_PROMPTS } from '../../core/models/ai-chat.model';
import { AiChatPanelComponent } from '../../core/components/ai-chat-panel.component';

/**
 * F20.1 — pantalla dedicada del asistente IA Nivel 0 (sin LLM). Desde
 * F20.1-b, toda la lógica de conversación (historial, envío, feedback,
 * links) vive en `AiChatPanelComponent` (`core/components/`), compartida
 * con el widget flotante global (`ChatWidgetComponent`) — este
 * contenedor solo aporta el layout de página (sidebar de contexto +
 * disclaimer) y delega los chips de sugerencia al panel vía `ViewChild`
 * en vez de duplicar el estado del formulario.
 */
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [AiChatPanelComponent],
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
              (click)="panel.usePrompt(suggestion)"
            >
              {{ suggestion }}
            </button>
          }
        </div>
      </aside>

      <section class="flex-1 rounded-3xl border border-default bg-surface p-6 shadow-[var(--shadow-card)]">
        <div class="h-[560px]">
          <app-ai-chat-panel #panel />
        </div>
      </section>
    </div>
  `,
})
export class ChatbotComponent {
  @ViewChild('panel') panel!: AiChatPanelComponent;

  readonly suggestedPrompts = AI_CHAT_SUGGESTED_PROMPTS;
}
