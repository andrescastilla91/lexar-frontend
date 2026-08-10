import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalProcessesService } from '../../../core/services/portal-processes.service';
import { PortalProcessListItem } from '../../../core/models/portal.model';

@Component({
  selector: 'app-portal-procesos',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-semibold text-text">Mis procesos</h1>
    <p class="mt-1 text-sm text-subtle">Estado y documentos que tu despacho compartió contigo.</p>

    @if (isLoading()) {
      <p class="mt-8 text-sm text-subtle">Cargando...</p>
    } @else if (errorMessage()) {
      <div class="mt-8 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
        {{ errorMessage() }}
      </div>
    } @else if (processes().length === 0) {
      <div class="mt-8 rounded-md border border-default bg-white/80 px-4 py-6 text-center text-sm text-subtle">
        Todavía no tienes procesos visibles en tu portal.
      </div>
    } @else {
      <div class="mt-8 grid gap-4">
        @for (process of processes(); track process.id) {
          <a
            [routerLink]="['/portal/procesos', process.id]"
            class="block rounded-lg border border-default bg-white/80 p-5 shadow-card transition hover:border-navy-900/40 hover:shadow-raised"
          >
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-base font-semibold text-text">{{ process.title }}</h2>
              <span class="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {{ process.statusLabel }}
              </span>
            </div>
            <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-subtle">
              @if (process.stage) {
                <div><dt class="inline text-muted">Etapa: </dt><dd class="inline">{{ process.stage }}</dd></div>
              }
              @if (process.caseNumber) {
                <div><dt class="inline text-muted">Radicado: </dt><dd class="inline">{{ process.caseNumber }}</dd></div>
              }
              @if (process.court) {
                <div><dt class="inline text-muted">Despacho: </dt><dd class="inline">{{ process.court }}</dd></div>
              }
              @if (process.advisors.length > 0) {
                <div>
                  <dt class="inline text-muted">Abogado: </dt>
                  <dd class="inline">{{ process.advisors[0].name }}</dd>
                </div>
              }
            </dl>
          </a>
        }
      </div>
    }
  `,
})
export class PortalProcesosComponent implements OnInit {
  private readonly portalProcessesService = inject(PortalProcessesService);

  readonly processes = signal<PortalProcessListItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.portalProcessesService.findProcesses().subscribe({
      next: (processes) => {
        this.processes.set(processes);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message ?? 'No se pudieron cargar tus procesos.');
        this.isLoading.set(false);
      },
    });
  }
}
