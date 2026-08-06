import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PortalProcessesService } from '../../../core/services/portal-processes.service';
import {
  PortalDocumentItem,
  PortalTimelineItem,
} from '../../../core/models/portal.model';

const EVENT_TYPE_LABELS: Record<string, string> = {
  STATUS_CHANGE: 'Cambio de estado',
  ADVISOR_ASSIGNED: 'Asesor asignado',
  ADVISOR_REMOVED: 'Asesor removido',
  PROCESS_CREATED: 'Proceso creado',
  PROCESS_UPDATED: 'Proceso actualizado',
  CLIENT_CHANGED: 'Cliente actualizado',
  DOCUMENT_UPLOADED: 'Documento cargado',
};

@Component({
  selector: 'app-portal-proceso-detalle',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <a routerLink="/portal/procesos" class="text-sm font-medium text-navy-900 hover:underline">&larr; Mis procesos</a>

    @if (isLoading()) {
      <p class="mt-6 text-sm text-subtle">Cargando...</p>
    } @else if (errorMessage()) {
      <div class="mt-6 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
        {{ errorMessage() }}
      </div>
    } @else {
      <div class="mt-4 grid gap-8 lg:grid-cols-3">
        <section class="lg:col-span-2">
          <h1 class="text-xl font-semibold text-text">Línea de tiempo</h1>
          @if (timeline().length === 0) {
            <div class="mt-4 rounded-md border border-default bg-white/80 px-4 py-6 text-center text-sm text-subtle">
              Todavía no hay novedades compartidas para este proceso.
            </div>
          } @else {
            <ol class="mt-4 space-y-4">
              @for (event of timeline(); track event.id) {
                <li class="rounded-lg border border-default bg-white/80 p-4 shadow-card">
                  <div class="flex items-center justify-between gap-4">
                    <span class="text-xs font-semibold uppercase tracking-wide text-navy-900">
                      {{ eventTypeLabel(event.type) }}
                    </span>
                    <span class="text-xs text-subtle">{{ event.createdAt | date: 'd MMM y, h:mm a' }}</span>
                  </div>
                  <p class="mt-2 text-sm text-text">{{ event.description }}</p>
                </li>
              }
            </ol>
          }
        </section>

        <section>
          <h2 class="text-xl font-semibold text-text">Documentos</h2>
          @if (documents().length === 0) {
            <div class="mt-4 rounded-md border border-default bg-white/80 px-4 py-6 text-center text-sm text-subtle">
              Sin documentos compartidos todavía.
            </div>
          } @else {
            <ul class="mt-4 space-y-3">
              @for (doc of documents(); track doc.id) {
                <li class="flex items-center justify-between gap-3 rounded-md border border-default bg-white/80 p-3 text-sm">
                  <div class="min-w-0">
                    <p class="truncate font-medium text-text">{{ doc.originalFilename }}</p>
                    <p class="text-xs text-subtle">{{ doc.formattedSize }}</p>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded-md border border-navy-900 px-3 py-1.5 text-xs font-semibold text-navy-900 transition hover:bg-navy-900 hover:text-white"
                    [disabled]="downloadingId() === doc.id"
                    (click)="onDownload(doc.id)"
                  >
                    Descargar
                  </button>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
})
export class PortalProcesoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly portalProcessesService = inject(PortalProcessesService);

  readonly timeline = signal<PortalTimelineItem[]>([]);
  readonly documents = signal<PortalDocumentItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly downloadingId = signal<string | null>(null);

  private processId = '';

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.processId) {
      this.errorMessage.set('Proceso no encontrado.');
      this.isLoading.set(false);
      return;
    }

    forkJoin({
      timeline: this.portalProcessesService.findTimeline(this.processId),
      documents: this.portalProcessesService.findDocuments(this.processId),
    }).subscribe({
      next: ({ timeline, documents }) => {
        this.timeline.set(timeline);
        this.documents.set(documents);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message ?? 'No se pudo cargar el proceso.');
        this.isLoading.set(false);
      },
    });
  }

  eventTypeLabel(type: string): string {
    return EVENT_TYPE_LABELS[type] ?? type;
  }

  onDownload(fileId: string): void {
    if (this.downloadingId()) {
      return;
    }

    this.downloadingId.set(fileId);
    this.portalProcessesService.getDownloadUrl(this.processId, fileId).subscribe({
      next: (response) => {
        window.open(response.url, '_blank', 'noopener');
        this.downloadingId.set(null);
      },
      error: () => {
        this.downloadingId.set(null);
      },
    });
  }
}
