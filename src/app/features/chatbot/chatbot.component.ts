import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { MockDataService } from '../../core/services/mock-data.service';
import { ChatMessage } from '../../core/models/chat-message.model';
import { createId } from '../../core/utils/id.util';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="flex flex-col gap-6 lg:flex-row">
      <aside class="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:w-80">
        <h2 class="text-lg font-semibold text-slate-800">Asistente LexAr</h2>
        <p class="mt-2 text-sm text-slate-500">
          Solicita resúmenes, identifica riesgos y genera recordatorios en tiempo real.
        </p>

        <form class="mt-6 space-y-4" [formGroup]="filterForm">
          <label class="flex flex-col gap-2 text-sm text-slate-600">
            Filtrar por proceso
            <select
              formControlName="processId"
              class="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
            >
              <option value="todos">Todas las conversaciones</option>
              @for (process of processes(); track process.id) {
                <option [value]="process.id">{{ process.title }}</option>
              }
            </select>
          </label>
        </form>

        <div class="mt-8 space-y-3 text-sm text-slate-500">
          <h3 class="text-xs uppercase tracking-wide text-slate-400">Sugerencias rápidas</h3>
          @for (suggestion of quickPrompts; track suggestion) {
            <button
              type="button"
              class="w-full rounded-2xl border border-slate-200 px-4 py-2 text-left text-sm text-slate-600 transition hover:border-[#192033]/40 hover:bg-slate-50"
              (click)="usePrompt(suggestion)"
            >
              {{ suggestion }}
            </button>
          }
        </div>
      </aside>

      <section class="flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex h-[520px] flex-col">
          <header class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-slate-700">Historial de interacción</p>
              <p class="text-xs text-slate-500">{{ filteredMessages().length }} mensajes registrados</p>
            </div>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Operativo</span>
          </header>

          <div class="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            @for (message of filteredMessages(); track message.id) {
              <article
                class="max-w-xl rounded-3xl px-5 py-3 text-sm shadow-sm"
                [ngClass]="message.author === 'usuario' ? 'ml-auto bg-[#192033] text-white' : 'bg-slate-100 text-slate-700'"
              >
                <header class="flex items-center justify-between gap-3 text-xs">
                  <span class="font-semibold">{{ authorLabel(message.author) }}</span>
                  <span class="text-slate-400">{{ message.timestamp | date: 'HH:mm dd/MM' }}</span>
                </header>
                <p class="mt-2 leading-relaxed">{{ message.content }}</p>
                @if (message.relatedProcessId) {
                  <p class="mt-3 rounded-2xl bg-white/20 px-3 py-2 text-xs" [ngClass]="message.author === 'usuario' ? 'text-white/80' : 'text-slate-500'">
                    Proceso: {{ processName(message.relatedProcessId) }}
                  </p>
                }
                @if (message.sentiment) {
                  <span class="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" [ngClass]="sentimentClasses(message.sentiment)">
                    <span class="h-2.5 w-2.5 rounded-full" [ngClass]="sentimentDot(message.sentiment)"></span>
                    Tonalidad {{ message.sentiment }}
                  </span>
                }
              </article>
            }
          </div>

          <form class="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4" [formGroup]="messageForm" (ngSubmit)="sendMessage()">
            <label class="flex flex-col gap-3 text-sm text-slate-600">
              Escribe tu solicitud
              <textarea
                formControlName="message"
                rows="3"
                placeholder="Ej: Genera un resumen ejecutivo del proceso con mayor riesgo."
                class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              ></textarea>
            </label>
            <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label class="flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" formControlName="includeSummary" class="h-4 w-4 rounded border-slate-300 text-[#192033]" />
                Solicitar resumen ejecutivo
              </label>
              <button
                type="submit"
                class="inline-flex items-center gap-2 rounded-2xl bg-[#192033] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#111728] disabled:cursor-not-allowed disabled:bg-slate-400"
                [disabled]="messageForm.invalid || isProcessing()"
              >
                Enviar
                @if (isProcessing()) {
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
export class ChatbotComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dataService = inject(MockDataService);

  readonly processes = this.dataService.processes;
  readonly chatHistory = this.dataService.chatHistory;

  readonly filterForm = this.fb.nonNullable.group({
    processId: ['todos'],
  });

  readonly messageForm = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.minLength(5)]],
    includeSummary: [false],
  });

  readonly isProcessing = signal(false);
  private readonly filterValue = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() }
  );

  readonly quickPrompts: string[] = [
    '¿Qué procesos tienen audiencias esta semana?',
    'Genera alertas de vencimiento para documentos pendientes.',
    'Dame un resumen de riesgos por cliente.',
  ];

  readonly filteredMessages = computed(() => {
    const filter = this.filterValue() ?? { processId: 'todos' };
    return this.chatHistory().filter(
      (message) => filter.processId === 'todos' || message.relatedProcessId === filter.processId
    );
  });

  usePrompt(prompt: string): void {
    this.messageForm.patchValue({ message: prompt });
  }

  sendMessage(): void {
    if (this.messageForm.invalid || this.isProcessing()) {
      return;
    }

  const { message, includeSummary } = this.messageForm.getRawValue();
  const processId = this.filterValue()?.processId ?? 'todos';

    const userMessage: ChatMessage = {
      id: createId(),
      author: 'usuario',
      content: message,
      timestamp: new Date().toISOString(),
      relatedProcessId: processId === 'todos' ? undefined : processId,
    };

    this.dataService.addChatMessage(userMessage);
    this.isProcessing.set(true);
    this.messageForm.reset({ message: '', includeSummary: includeSummary });

    setTimeout(() => {
      const response: ChatMessage = {
        id: createId(),
        author: 'asistente',
        content: this.generateResponse(message, includeSummary, processId),
        timestamp: new Date().toISOString(),
        relatedProcessId: processId === 'todos' ? undefined : processId,
        sentiment: this.detectSentiment(message),
      };

      this.dataService.addChatMessage(response);
      this.isProcessing.set(false);
    }, 800);
  }

  authorLabel(author: ChatMessage['author']): string {
    return author === 'usuario' ? 'Tú' : 'Asistente LexAr';
  }

  sentimentClasses(sentiment: NonNullable<ChatMessage['sentiment']>): string {
    switch (sentiment) {
      case 'positivo':
        return 'bg-emerald-100 text-emerald-700';
      case 'alerta':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-slate-200 text-slate-600';
    }
  }

  sentimentDot(sentiment: NonNullable<ChatMessage['sentiment']>): string {
    switch (sentiment) {
      case 'positivo':
        return 'bg-emerald-500';
      case 'alerta':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  }

  processName(processId: string): string {
    return this.dataService.findProcessById(processId)?.title ?? 'Proceso no identificado';
  }

  private generateResponse(message: string, includeSummary: boolean, processId: string): string {
    const base = includeSummary
      ? 'He preparado un resumen ejecutivo considerando las últimas actualizaciones y métricas clave. '
      : '';

    if (processId !== 'todos') {
      const process = this.dataService.findProcessById(processId);
      if (process) {
        return (
          base +
          `El proceso "${process.title}" se encuentra en etapa ${process.stage.toLowerCase()} con audiencia programada para ${new Date(
            process.nextHearingDate
          ).toLocaleDateString()}. Riesgo ${process.riskLevel.toLowerCase()} y responsable ${this.processOwnerName(
            process.advisorId
          )}.`
        );
      }
    }

    if (message.toLowerCase().includes('riesgo')) {
      return (
        base +
        'Actualmente hay ' +
        this.dataService.dashboardSnapshot().highRiskProcesses.length +
        ' procesos clasificados en riesgo alto. Recomiendo reuniones preventivas con los responsables asignados.'
      );
    }

    if (message.toLowerCase().includes('audiencia')) {
      const hearings = this.dataService.dashboardSnapshot().hearingsThisMonth.length;
      return base + `Se registran ${hearings} audiencias programadas este mes. El detalle completo está disponible en el tablero.`;
    }

    return (
      base +
      'He actualizado el registro y notificaré al equipo correspondiente. ¿Deseas que programe un recordatorio o prepare un informe?' 
    );
  }

  private detectSentiment(message: string): ChatMessage['sentiment'] {
    if (message.toLowerCase().includes('riesgo') || message.toLowerCase().includes('alerta')) {
      return 'alerta';
    }
    if (message.toLowerCase().includes('gracias') || message.toLowerCase().includes('excelente')) {
      return 'positivo';
    }
    return 'neutral';
  }

  private processOwnerName(advisorId: string): string {
    return this.dataService.findAdvisorById(advisorId)?.name ?? 'Equipo legal';
  }
}
