import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MockDataService } from '../../core/services/mock-data.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="space-y-10">
      <section class="rounded-3xl bg-gradient-to-br from-[#192033] via-[#1f2740] to-[#192033] px-8 py-10 text-white shadow-xl">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-sm uppercase tracking-[0.3em] text-white/70">Tablero ejecutivo</p>
            <h2 class="mt-4 text-3xl font-semibold">Hola {{ firstName() }}, listo para tu jornada legal.</h2>
            <p class="mt-3 max-w-xl text-sm text-white/70">
              Revisa el estado general de tu operación, audiencias próximas y los procesos que requieren atención prioritaria.
            </p>
          </div>
          <div class="grid gap-3 text-sm text-white/70">
            <div class="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold">
                {{ snapshot().totalClients }}
              </div>
              <div>
                <p class="text-xs uppercase tracking-wide">Clientes activos</p>
                <p class="text-base font-semibold text-white">Relaciones vigentes bajo tu gestión</p>
              </div>
            </div>
            <div class="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold">
                {{ snapshot().totalProcesses }}
              </div>
              <div>
                <p class="text-xs uppercase tracking-wide">Procesos monitorizados</p>
                <p class="text-base font-semibold text-white">Incluye litigios y trámites activos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-4">
        @for (card of statCards(); track card.title) {
          <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-slate-600">{{ card.title }}</h3>
              <span class="text-xs font-semibold" [class]="card.trendClass">{{ card.trend }}</span>
            </div>
            <p class="mt-4 text-3xl font-semibold text-slate-900">{{ card.value }}</p>
            <p class="mt-2 text-sm text-slate-500">{{ card.description }}</p>
          </article>
        }
      </section>

      <section class="grid gap-6 lg:grid-cols-5">
        <article class="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-slate-800">Procesos con riesgo alto</h3>
              <p class="text-sm text-slate-500">Prioriza tareas preventivas para mitigar contingencias.</p>
            </div>
            <span class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
              {{ highRiskProcesses().length }} activos
            </span>
          </header>
          <div class="space-y-4">
            @for (process of highRiskProcesses(); track process.id) {
              <div class="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p class="text-base font-semibold text-rose-700">{{ process.title }}</p>
                    <p class="text-xs uppercase tracking-wide text-rose-500">{{ process.court }}</p>
                  </div>
                  <div class="flex gap-6 text-xs text-rose-600/90">
                    <span class="flex items-center gap-2">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
                      </svg>
                      Audiencia {{ process.nextHearingDate | date: 'longDate' }}
                    </span>
                    <span class="flex items-center gap-2">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m12 6 7.5 12h-15L12 6z" />
                      </svg>
                      Riesgo {{ process.riskLevel }}
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        </article>

        <article class="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-slate-800">Próximas audiencias</h3>
              <p class="text-sm text-slate-500">Agenda semanal con responsables asignados.</p>
            </div>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {{ upcomingHearings().length }} eventos
            </span>
          </header>
          <div class="space-y-4">
            @for (hearing of upcomingHearings(); track hearing.id) {
              <div class="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <div>
                  <p class="text-base font-semibold text-slate-800">{{ hearing.title }}</p>
                  <p class="text-xs uppercase tracking-wide text-slate-500">{{ hearing.court }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ advisorInitials(hearing.advisorId) }} • {{ clientName(hearing.clientId) }}</p>
                </div>
                <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {{ hearing.nextHearingDate | date: 'dd/MM' }}
                </span>
              </div>
            }
          </div>
        </article>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-slate-800">Documentos recientes</h3>
              <p class="text-sm text-slate-500">Archivos subidos durante los últimos 10 días.</p>
            </div>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {{ recentDocuments().length }} cargados
            </span>
          </header>
          <div class="space-y-4">
            @for (document of recentDocuments(); track document.id) {
              <div class="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <div>
                  <p class="font-semibold text-slate-800">{{ document.title }}</p>
                  <p class="text-xs text-slate-500">{{ document.category }} • {{ document.uploadedBy }}</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {{ document.uploadedAt | date: 'dd/MM' }}
                </span>
              </div>
            }
          </div>
        </article>

        <article class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-slate-800">Asesores destacados</h3>
              <p class="text-sm text-slate-500">Tiempo de respuesta y satisfacción promedio.</p>
            </div>
            <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {{ topAdvisors().length }} perfiles
            </span>
          </header>
          <div class="space-y-4">
            @for (advisor of topAdvisors(); track advisor.id) {
              <div class="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <div>
                  <p class="font-semibold text-slate-800">{{ advisor.name }}</p>
                  <p class="text-xs text-slate-500">{{ advisor.specialty }}</p>
                </div>
                <div class="flex items-center gap-3 text-xs text-slate-500">
                  <span class="flex items-center gap-1 text-amber-500">
                    <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="m10 15.27 5.18 3.05-1.64-5.81L18 8.97l-6-.21L10 3l-2 5.76-6 .21 4.46 3.54L6.82 18z" />
                    </svg>
                    {{ advisor.rating }}
                  </span>
                  <span>{{ advisor.experienceYears }} años exp.</span>
                </div>
              </div>
            }
          </div>
        </article>
      </section>
    </div>
  `,
})
export class DashboardComponent {
  private readonly dataService = inject(MockDataService);
  private readonly authService = inject(AuthService);

  readonly snapshot = this.dataService.dashboardSnapshot;
  readonly documents = this.dataService.documents;
  readonly advisors = this.dataService.advisors;
  readonly processes = this.dataService.processes;
  readonly clients = this.dataService.clients;

  readonly firstName = computed(() => {
    const fullName = this.authService.currentUser()?.fullName ?? 'Equipo';
    return fullName.split(' ')[0];
  });

  readonly statCards = computed(() => {
    const snapshot = this.snapshot();
    const urgencies = snapshot.highRiskProcesses.length;
    const hearings = snapshot.hearingsThisMonth.length;

    return [
      {
        title: 'Procesos activos',
        value: snapshot.totalProcesses,
        description: 'Casos en curso across todas las áreas jurídicas.',
        trend: '+12% eficiencia',
        trendClass: 'text-xs font-semibold text-emerald-600',
      },
      {
        title: 'Clientes corporativos',
        value: snapshot.totalClients,
        description: 'Cuentas activas con planes estratégicos vigentes.',
        trend: '+3 nuevas cuentas',
        trendClass: 'text-xs font-semibold text-sky-600',
      },
      {
        title: 'Audiencias del mes',
        value: hearings,
        description: 'Eventos confirmados con agenda y responsables.',
        trend: 'Semana crítica',
        trendClass: 'text-xs font-semibold text-amber-600',
      },
      {
        title: 'Alertas de riesgo',
        value: urgencies,
        description: 'Procesos que requieren acciones preventivas inmediatas.',
        trend: 'Prioriza hoy',
        trendClass: 'text-xs font-semibold text-rose-600',
      },
    ];
  });

  readonly highRiskProcesses = computed(() => this.snapshot().highRiskProcesses);

  readonly upcomingHearings = computed(() =>
    this.snapshot()
      .hearingsThisMonth.slice()
      .sort((a, b) => new Date(a.nextHearingDate).getTime() - new Date(b.nextHearingDate).getTime())
  );

  readonly recentDocuments = computed(() =>
    this.documents()
      .slice()
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 4)
  );

  readonly topAdvisors = computed(() =>
    this.advisors()
      .slice()
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4)
  );

  advisorInitials(advisorId: string): string {
    const advisor = this.dataService.findAdvisorById(advisorId);
    return advisor ? advisor.name.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase() : 'NA';
  }

  clientName(clientId: string): string {
    return this.dataService.findClientById(clientId)?.company ?? 'Cliente sin asignar';
  }
}
