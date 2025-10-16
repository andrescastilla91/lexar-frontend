import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { MockDataService } from '../../core/services/mock-data.service';
import { LegalProcess } from '../../core/models/legal-process.model';

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="space-y-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-2xl font-semibold text-slate-800">Procesos judiciales y administrativos</h2>
          <p class="text-sm text-slate-500">Monitorea etapas, responsables y niveles de riesgo procesal.</p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-2xl bg-[#192033] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111728]"
          (click)="togglePanel()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo proceso
        </button>
      </header>

      <section
        class="relative grid gap-6 transition-all lg:min-h-[22rem]"
        [ngClass]="panelOpen() ? 'lg:pr-[26rem] lg:pb-6 lg:min-h-[36rem]' : ''"
      >
        <form
          class="w-full max-w-4xl lg:min-w-[48rem] grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          [formGroup]="filterForm"
        >
          <div class="grid gap-4 md:grid-cols-4">
            <label class="flex flex-col gap-2 text-sm text-slate-600 md:col-span-2">
              Búsqueda
              <input
                formControlName="search"
                type="search"
                placeholder="Nombre del proceso, corte, cliente"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-600">
              Estado
              <select
                formControlName="status"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              >
                <option value="todos">Todos</option>
                <option value="En curso">En curso</option>
                <option value="En revisión">En revisión</option>
                <option value="Finalizado">Finalizado</option>
                <option value="En riesgo">En riesgo</option>
              </select>
            </label>
            <label class="flex flex-col gap-2 text-sm text-slate-600">
              Riesgo
              <select
                formControlName="riskLevel"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              >
                <option value="todos">Todos</option>
                <option value="Alto">Alto</option>
                <option value="Medio">Medio</option>
                <option value="Bajo">Bajo</option>
              </select>
            </label>
          </div>
          <div class="grid gap-4 md:grid-cols-4">
            <label class="flex flex-col gap-2 text-sm text-slate-600">
              Etapa procesal
              <select
                formControlName="stage"
                class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
              >
                <option value="todas">Todas</option>
                <option value="Investigación">Investigación</option>
                <option value="Audiencia">Audiencia</option>
                <option value="Notificación">Notificación</option>
                <option value="Ejecución">Ejecución</option>
              </select>
            </label>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <p class="text-slate-500">Procesos activos</p>
              <p class="text-2xl font-semibold text-slate-800">{{ processes().length }}</p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <p class="text-slate-500">Riesgo alto</p>
              <p class="text-2xl font-semibold text-rose-600">{{ highRiskCount() }}</p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <p class="text-slate-500">Audiencias próximas</p>
              <p class="text-2xl font-semibold text-amber-500">{{ upcomingHearingsCount() }}</p>
            </div>
          </div>
        </form>

        @if (panelOpen()) {
          <div class="w-full lg:absolute lg:top-0 lg:right-0 lg:w-96 xl:w-[28rem] lg:z-20">
            <form class="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg lg:shadow-2xl" [formGroup]="newProcessForm" (ngSubmit)="submitProcess()">
              <h3 class="text-lg font-semibold text-slate-800">Registrar nuevo proceso</h3>
              <div class="grid gap-3">
                <label class="text-sm text-slate-600">
                  Título del proceso
                  <input
                    formControlName="title"
                    type="text"
                    placeholder="Nombre referencial del proceso"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Jurisdicción / Corte
                  <input
                    formControlName="court"
                    type="text"
                    placeholder="Entidad o despacho"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <div class="grid gap-4 md:grid-cols-2">
                  <label class="text-sm text-slate-600">
                    Cliente
                    <select
                      formControlName="clientId"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    >
                      @for (client of clients(); track client.id) {
                        <option [value]="client.id">{{ client.company }}</option>
                      }
                    </select>
                  </label>
                  <label class="text-sm text-slate-600">
                    Asesor líder
                    <select
                      formControlName="advisorId"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    >
                      @for (advisor of advisors(); track advisor.id) {
                        <option [value]="advisor.id">{{ advisor.name }}</option>
                      }
                    </select>
                  </label>
                </div>
                <div class="grid gap-4 md:grid-cols-3">
                  <label class="text-sm text-slate-600">
                    Estado
                    <select
                      formControlName="status"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    >
                      <option value="En curso">En curso</option>
                      <option value="En revisión">En revisión</option>
                      <option value="Finalizado">Finalizado</option>
                      <option value="En riesgo">En riesgo</option>
                    </select>
                  </label>
                  <label class="text-sm text-slate-600">
                    Etapa
                    <select
                      formControlName="stage"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    >
                      <option value="Investigación">Investigación</option>
                      <option value="Audiencia">Audiencia</option>
                      <option value="Notificación">Notificación</option>
                      <option value="Ejecución">Ejecución</option>
                    </select>
                  </label>
                  <label class="text-sm text-slate-600">
                    Riesgo
                    <select
                      formControlName="riskLevel"
                      class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                    >
                      <option value="Bajo">Bajo</option>
                      <option value="Medio">Medio</option>
                      <option value="Alto">Alto</option>
                    </select>
                  </label>
                </div>
                <label class="text-sm text-slate-600">
                  Próxima audiencia
                  <input
                    formControlName="nextHearingDate"
                    type="date"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
                <label class="text-sm text-slate-600">
                  Última actualización
                  <input
                    formControlName="updatedAt"
                    type="date"
                    class="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:border-[#192033] focus:outline-none focus:ring-2 focus:ring-[#192033]/30"
                  />
                </label>
              </div>
              @if (formError()) {
                <p class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{{ formError() }}</p>
              }
              <button type="submit" class="mt-2 rounded-2xl bg-[#192033] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#111728]">
                Guardar proceso
              </button>
            </form>
          </div>
        }
      </section>

      <section class="grid gap-4">
        @for (process of filteredProcesses(); track process.id) {
          <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex flex-col gap-4 md:flex-row md:justify-between">
              <div>
                <p class="text-xs uppercase tracking-wide text-slate-400">{{ process.court }}</p>
                <h3 class="text-lg font-semibold text-slate-800">{{ process.title }}</h3>
                <p class="text-sm text-slate-500">Cliente: {{ clientName(process.clientId) }}</p>
              </div>
              <div class="flex items-center gap-3 text-sm text-slate-500">
                <span class="inline-flex items-center gap-2 rounded-full px-3 py-1"
                  [ngClass]="statusClasses(process.status)">
                  <span class="h-2.5 w-2.5 rounded-full" [ngClass]="statusDot(process.status)"></span>
                  {{ process.status }}
                </span>
                <span class="inline-flex items-center gap-2 rounded-full px-3 py-1"
                  [ngClass]="riskClasses(process.riskLevel)">
                  <span class="h-2.5 w-2.5 rounded-full" [ngClass]="riskDot(process.riskLevel)"></span>
                  Riesgo {{ process.riskLevel }}
                </span>
              </div>
            </div>
            <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-slate-400">Etapa</p>
                <p class="text-base font-semibold text-slate-700">{{ process.stage }}</p>
              </div>
              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-slate-400">Próxima audiencia</p>
                <p class="text-base font-semibold text-slate-700">{{ process.nextHearingDate | date: 'dd/MM/yyyy' }}</p>
              </div>
              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-slate-400">Actualizado</p>
                <p class="text-base font-semibold text-slate-700">{{ process.updatedAt | date: 'dd/MM/yyyy' }}</p>
              </div>
              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-slate-400">Responsable</p>
                <p class="text-base font-semibold text-slate-700">{{ advisorName(process.advisorId) }}</p>
              </div>
            </div>
          </article>
        }
      </section>
    </div>
  `,
})
export class ProcessesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dataService = inject(MockDataService);

  readonly advisors = this.dataService.advisors;
  readonly clients = this.dataService.clients;
  readonly processes = this.dataService.processes;

  readonly filterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['todos'],
    riskLevel: ['todos'],
    stage: ['todas'],
  });

  readonly newProcessForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    court: ['', [Validators.required]],
    clientId: [this.clients()[0]?.id ?? '', Validators.required],
    advisorId: [this.advisors()[0]?.id ?? '', Validators.required],
    status: ['En curso', Validators.required],
    stage: ['Investigación', Validators.required],
    riskLevel: ['Medio', Validators.required],
    nextHearingDate: [new Date().toISOString().slice(0, 10), Validators.required],
    updatedAt: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  private readonly filterValue = toSignal(
    this.filterForm.valueChanges.pipe(startWith(this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() }
  );

  readonly filteredProcesses = computed(() => {
    const filter = this.filterValue() ?? { search: '', status: 'todos', riskLevel: 'todos', stage: 'todas' };
    const term = (filter.search ?? '').toLowerCase();
    const status = filter.status ?? 'todos';
    const risk = filter.riskLevel ?? 'todos';
    const stage = filter.stage ?? 'todas';

    return this.processes().filter((process) => {
      const matchesTerm = [process.title, process.court, this.clientName(process.clientId)]
        .some((value) => value.toLowerCase().includes(term));
      const matchesStatus = status === 'todos' || process.status === status;
      const matchesRisk = risk === 'todos' || process.riskLevel === risk;
      const matchesStage = stage === 'todas' || process.stage === stage;
      return matchesTerm && matchesStatus && matchesRisk && matchesStage;
    });
  });

  readonly highRiskCount = computed(() => this.processes().filter((process) => process.riskLevel === 'Alto').length);

  readonly upcomingHearingsCount = computed(() =>
    this.processes().filter((process) => {
      const hearingDate = new Date(process.nextHearingDate);
      const now = new Date();
      const diff = hearingDate.getTime() - now.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    }).length
  );

  readonly panelOpen = signal(false);
  readonly formError = signal<string | null>(null);

  togglePanel(): void {
    this.panelOpen.update((value) => !value);
  }

  submitProcess(): void {
    if (this.newProcessForm.invalid) {
      this.newProcessForm.markAllAsTouched();
      this.formError.set('Completa los campos obligatorios.');
      return;
    }

    this.formError.set(null);
    const value = this.newProcessForm.getRawValue() as Omit<LegalProcess, 'id'>;
    this.dataService.addProcess(value);
    this.newProcessForm.reset({
      title: '',
      court: '',
      clientId: this.clients()[0]?.id ?? '',
      advisorId: this.advisors()[0]?.id ?? '',
      status: 'En curso',
      stage: 'Investigación',
      riskLevel: 'Medio',
      nextHearingDate: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    this.panelOpen.set(false);
  }

  advisorName(advisorId: string): string {
    return this.dataService.findAdvisorById(advisorId)?.name ?? 'No asignado';
  }

  clientName(clientId: string): string {
    return this.dataService.findClientById(clientId)?.company ?? 'Cliente sin asignar';
  }

  statusClasses(status: LegalProcess['status']): string {
    switch (status) {
      case 'En curso':
        return 'bg-blue-100 text-blue-700';
      case 'En riesgo':
        return 'bg-rose-100 text-rose-700';
      case 'En revisión':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  }

  statusDot(status: LegalProcess['status']): string {
    switch (status) {
      case 'En curso':
        return 'bg-blue-500';
      case 'En riesgo':
        return 'bg-rose-500';
      case 'En revisión':
        return 'bg-amber-500';
      default:
        return 'bg-emerald-500';
    }
  }

  riskClasses(risk: LegalProcess['riskLevel']): string {
    switch (risk) {
      case 'Alto':
        return 'bg-rose-100 text-rose-700';
      case 'Medio':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  }

  riskDot(risk: LegalProcess['riskLevel']): string {
    switch (risk) {
      case 'Alto':
        return 'bg-rose-500';
      case 'Medio':
        return 'bg-amber-500';
      default:
        return 'bg-emerald-500';
    }
  }
}
