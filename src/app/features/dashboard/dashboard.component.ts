import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { DeadlinesService } from '../../core/services/deadlines.service';
import { DashboardSummary, OnboardingChecklist } from '../../core/models/dashboard.model';
import { DeadlineResponse } from '../../core/models/deadline.model';
import { getCatalogBadgeClasses } from '../../core/utils/catalog-badge.util';
import { getDeadlineStatusClasses, getDeadlineStatusLabel } from '../../core/utils/deadline-format.util';

interface ChecklistItemView {
  label: string;
  done: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  UNDER_REVIEW: 'En revisión',
  SUSPENDED: 'Suspendido',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  ARCHIVED: 'Archivado',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <div class="space-y-10">
      @if (showChecklist()) {
        <section class="rounded-lg border border-default bg-surface p-6 shadow-card">
          <header class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text">Primeros pasos</h3>
              <p class="text-sm text-subtle">Termina de configurar tu cuenta para sacarle el máximo provecho a LexAr.</p>
            </div>
            <a
              routerLink="/onboarding"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-muted"
            >
              Continuar
            </a>
          </header>

          <ul class="mt-4 grid gap-3 sm:grid-cols-2">
            @for (item of checklistItems(); track item.label) {
              <li class="flex items-center gap-2 text-sm" [class.text-subtle]="item.done" [class.text-text]="!item.done">
                @if (item.done) {
                  <svg class="h-4 w-4 flex-shrink-0 text-success" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                } @else {
                  <span class="h-4 w-4 flex-shrink-0 rounded-full border border-default"></span>
                }
                <span [class.line-through]="item.done">{{ item.label }}</span>
              </li>
            }
          </ul>
        </section>
      }

      <section class="rounded-lg bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 px-5 py-8 text-white shadow-card sm:px-6 md:px-8 md:py-10">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <p class="text-sm uppercase tracking-[0.3em] text-white/70">Tablero ejecutivo</p>
            <h2 class="mt-4 break-words text-2xl font-semibold sm:text-3xl">Hola {{ firstName() }}, listo para tu jornada legal.</h2>
            <p class="mt-3 max-w-xl text-sm text-white/70">
              Revisa el estado general de tu operación, audiencias próximas y los procesos que requieren atención prioritaria.
            </p>
          </div>
          <div class="grid min-w-0 grid-cols-1 gap-3 text-sm text-white/70">
            <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-lg bg-white/10 px-5 py-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15 text-2xl font-semibold tabular-data">
                @if (isLoading()) {
                  <span class="inline-block h-6 w-8 animate-pulse rounded bg-white/20"></span>
                } @else {
                  {{ summary()?.activeClients ?? 0 }}
                }
              </div>
              <div class="min-w-0">
                <p class="text-xs uppercase tracking-wide">Clientes activos</p>
                <p class="break-words text-base font-semibold text-white">Relaciones vigentes bajo tu gestión</p>
              </div>
            </div>
            <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-lg bg-white/10 px-5 py-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15 text-2xl font-semibold tabular-data">
                @if (isLoading()) {
                  <span class="inline-block h-6 w-8 animate-pulse rounded bg-white/20"></span>
                } @else {
                  {{ summary()?.totalProcesses ?? 0 }}
                }
              </div>
              <div class="min-w-0">
                <p class="text-xs uppercase tracking-wide">Procesos monitorizados</p>
                <p class="break-words text-base font-semibold text-white">Incluye litigios y trámites activos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      @if (errorMessage()) {
        <div class="flex items-center justify-between rounded-lg border border-default bg-danger-tint px-6 py-4 text-sm text-danger">
          <span>{{ errorMessage() }}</span>
          <button
            type="button"
            class="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            (click)="loadSummary()"
          >
            Reintentar
          </button>
        </div>
      }

      <!-- Hoy: plazos y audiencias del día -->
      <section class="rounded-lg border border-default bg-surface p-6 shadow-card">
        <header class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-semibold text-text">Hoy</h3>
            <p class="text-sm text-subtle">Plazos y audiencias con vencimiento el día de hoy.</p>
          </div>
          <div class="flex flex-shrink-0 items-center gap-3">
            @if (!isLoadingToday()) {
              <span class="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted tabular-data">
                {{ todayDeadlines().length }} {{ todayDeadlines().length === 1 ? 'evento' : 'eventos' }}
              </span>
            }
            <a routerLink="/calendario" class="text-xs font-semibold text-primary underline"> Ver calendario </a>
          </div>
        </header>

        @if (isLoadingToday()) {
          <div class="space-y-3">
            @for (i of [1, 2]; track i) {
              <div class="h-14 animate-pulse rounded-lg bg-surface-sunken"></div>
            }
          </div>
        } @else if (todayDeadlines().length === 0) {
          <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
            No tienes plazos ni audiencias programadas para hoy.
          </p>
        } @else {
          <div class="space-y-3">
            @for (deadline of todayDeadlines(); track deadline.id) {
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-default bg-surface-muted px-4 py-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="truncate text-sm font-semibold text-text">{{ deadline.title }}</p>
                    @if (deadline.type) {
                      <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getCatalogBadgeClasses(deadline.type.color)">
                        {{ deadline.type.label }}
                      </span>
                    }
                    <span class="rounded-full px-2 py-0.5 text-xs font-semibold" [class]="getDeadlineStatusClasses(deadline.status)">
                      {{ getDeadlineStatusLabel(deadline.status) }}
                    </span>
                  </div>
                  <p class="truncate text-xs text-subtle">{{ deadline.process?.title }}</p>
                </div>
                <span class="flex-shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted tabular-data">
                  {{ deadline.dueAt | date: 'HH:mm' }}
                </span>
              </div>
            }
          </div>
        }
      </section>

      @if (!isLoading() && summary()?.processesByStatus?.length) {
        <section class="flex flex-wrap gap-3">
          @for (item of summary()!.processesByStatus; track item.status) {
            <span class="rounded-md border border-default bg-surface px-4 py-2 text-xs font-semibold text-muted">
              {{ statusLabel(item.status) }}
              <span class="ml-1 tabular-data text-text">{{ item.count }}</span>
            </span>
          }
        </section>
      }

      <section class="grid gap-6 lg:grid-cols-4">
        @if (isLoading()) {
          @for (i of [1, 2, 3, 4]; track i) {
            <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
              <div class="h-4 w-24 animate-pulse rounded bg-surface-sunken"></div>
              <div class="mt-4 h-8 w-16 animate-pulse rounded bg-surface-sunken"></div>
              <div class="mt-3 h-3 w-32 animate-pulse rounded bg-surface-sunken"></div>
            </article>
          }
        } @else {
          @for (card of statCards(); track card.title) {
            <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-muted">{{ card.title }}</h3>
                <span class="text-xs font-semibold" [class]="card.trendClass">{{ card.trend }}</span>
              </div>
              <p class="mt-4 text-3xl font-semibold text-text tabular-data">{{ card.value }}</p>
              <p class="mt-2 text-sm text-subtle">{{ card.description }}</p>
            </article>
          }
        }
      </section>

      <section class="grid gap-6 lg:grid-cols-5">
        <article class="lg:col-span-3 rounded-lg border border-default bg-surface p-6 shadow-card">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text">Procesos con riesgo alto</h3>
              <p class="text-sm text-subtle">Prioriza tareas preventivas para mitigar contingencias.</p>
            </div>
            @if (!isLoading()) {
              <span class="rounded-full bg-danger-tint px-3 py-1 text-xs font-semibold text-danger tabular-data">
                {{ summary()?.highRiskProcessesCount ?? 0 }} activos
              </span>
            }
          </header>

          @if (isLoading()) {
            <div class="space-y-4">
              @for (i of [1, 2, 3]; track i) {
                <div class="h-16 animate-pulse rounded-lg bg-surface-sunken"></div>
              }
            </div>
          } @else if (!summary()?.highRiskProcesses?.length) {
            <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
              No hay procesos de riesgo alto en este momento.
            </p>
          } @else {
            <div class="space-y-4">
              @for (process of summary()!.highRiskProcesses; track process.id) {
                <div class="rounded-lg bg-danger-tint px-4 py-4 text-sm text-danger">
                  <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div class="min-w-0">
                      <p class="truncate text-base font-semibold text-danger">{{ process.title }}</p>
                      <p class="truncate text-xs uppercase tracking-wide text-danger/80">{{ process.court || 'Sin jurisdicción asignada' }}</p>
                    </div>
                    <div class="flex flex-wrap gap-4 text-xs text-danger/90 sm:gap-6">
                      @if (process.nextHearingDate) {
                        <span class="flex items-center gap-2">
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
                          </svg>
                          Audiencia {{ process.nextHearingDate | date: 'longDate' }}
                        </span>
                      }
                      <span class="flex items-center gap-2">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m12 6 7.5 12h-15L12 6z" />
                        </svg>
                        Riesgo {{ process.riskLevel?.label || 'N/A' }}
                      </span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </article>

        <article class="lg:col-span-2 rounded-lg border border-default bg-surface p-6 shadow-card">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text">Próximas audiencias</h3>
              <p class="text-sm text-subtle">Agenda de los próximos 30 días.</p>
            </div>
            @if (!isLoading()) {
              <span class="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted tabular-data">
                {{ summary()?.upcomingHearingsCount ?? 0 }} eventos
              </span>
            }
          </header>

          @if (isLoading()) {
            <div class="space-y-4">
              @for (i of [1, 2, 3]; track i) {
                <div class="h-16 animate-pulse rounded-lg bg-surface-sunken"></div>
              }
            </div>
          } @else if (!summary()?.upcomingHearings?.length) {
            <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
              No hay audiencias programadas en los próximos 30 días.
            </p>
          } @else {
            <div class="space-y-4">
              @for (hearing of summary()!.upcomingHearings; track hearing.id) {
                <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-default bg-surface-muted px-4 py-4 text-sm text-muted">
                  <div class="min-w-0">
                    <p class="truncate text-base font-semibold text-text">{{ hearing.title }}</p>
                    <p class="truncate text-xs uppercase tracking-wide text-subtle">{{ hearing.court || 'Sin jurisdicción asignada' }}</p>
                    <p class="mt-1 truncate text-xs text-subtle">{{ advisorInitials(hearing.advisors) }} • {{ hearing.client?.fullName ?? 'Cliente sin asignar' }}</p>
                  </div>
                  @if (hearing.nextHearingDate) {
                    <span class="flex-shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted tabular-data">
                      {{ hearing.nextHearingDate | date: 'dd/MM' }}
                    </span>
                  }
                </div>
              }
            </div>
          }
        </article>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text">Documentos recientes</h3>
              <p class="text-sm text-subtle">{{ summary()?.documentsThisMonth ?? 0 }} archivos subidos este mes.</p>
            </div>
            @if (!isLoading()) {
              <span class="rounded-full bg-success-tint px-3 py-1 text-xs font-semibold text-success tabular-data">
                {{ summary()?.documentsThisMonth ?? 0 }} este mes
              </span>
            }
          </header>

          @if (isLoading()) {
            <div class="space-y-4">
              @for (i of [1, 2, 3]; track i) {
                <div class="h-12 animate-pulse rounded-lg bg-surface-sunken"></div>
              }
            </div>
          } @else if (!summary()?.recentDocuments?.length) {
            <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
              Aún no se han subido documentos.
            </p>
          } @else {
            <div class="space-y-4">
              @for (document of summary()!.recentDocuments; track document.id) {
                <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-default px-4 py-3 text-sm text-muted">
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-text">{{ document.filename }}</p>
                    <p class="truncate text-xs text-subtle">{{ document.entityType }} • {{ document.uploadedBy }}</p>
                  </div>
                  <span class="flex-shrink-0 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted tabular-data">
                    {{ document.createdAt | date: 'dd/MM' }}
                  </span>
                </div>
              }
            </div>
          }
        </article>

        <article class="rounded-lg border border-default bg-surface p-6 shadow-card">
          <header class="mb-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text">Asesores destacados</h3>
              <p class="text-sm text-subtle">Calificación y experiencia de tu equipo activo.</p>
            </div>
            @if (!isLoading()) {
              <span class="rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent tabular-data">
                {{ summary()?.topAdvisors?.length ?? 0 }} perfiles
              </span>
            }
          </header>

          @if (isLoading()) {
            <div class="space-y-4">
              @for (i of [1, 2, 3]; track i) {
                <div class="h-12 animate-pulse rounded-lg bg-surface-sunken"></div>
              }
            </div>
          } @else if (!summary()?.topAdvisors?.length) {
            <p class="rounded-lg border border-default bg-surface-muted px-4 py-6 text-center text-sm text-subtle">
              No hay asesores activos registrados.
            </p>
          } @else {
            <div class="space-y-4">
              @for (advisor of summary()!.topAdvisors; track advisor.id) {
                <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-default px-4 py-3 text-sm text-muted">
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-text">{{ advisor.name }}</p>
                    <p class="truncate text-xs text-subtle">{{ advisor.specialty?.label || 'N/A' }}</p>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-subtle">
                    <span class="flex items-center gap-1 text-accent">
                      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="m10 15.27 5.18 3.05-1.64-5.81L18 8.97l-6-.21L10 3l-2 5.76-6 .21 4.46 3.54L6.82 18z" />
                      </svg>
                      <span class="tabular-data">{{ advisor.rating }}</span>
                    </span>
                    <span class="tabular-data">{{ advisor.experienceYears }} años exp.</span>
                  </div>
                </div>
              }
            </div>
          }
        </article>
      </section>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly deadlinesService = inject(DeadlinesService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly todayDeadlines = signal<DeadlineResponse[]>([]);
  readonly isLoadingToday = signal(true);

  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
  protected readonly getDeadlineStatusClasses = getDeadlineStatusClasses;
  protected readonly getDeadlineStatusLabel = getDeadlineStatusLabel;

  readonly checklist = signal<OnboardingChecklist | null>(null);

  readonly showChecklist = computed(() => {
    const checklist = this.checklist();
    return checklist !== null && !checklist.wizardCompleted;
  });

  readonly checklistItems = computed<ChecklistItemView[]>(() => {
    const checklist = this.checklist();
    if (!checklist) {
      return [];
    }

    return [
      { label: 'Verifica tu correo electrónico', done: checklist.emailVerified },
      { label: 'Completa los datos de tu empresa', done: checklist.companyProfileComplete },
      { label: 'Invita a tu equipo', done: checklist.teamInvited },
      { label: 'Crea tu primer cliente', done: checklist.firstClientCreated },
      { label: 'Crea tu primer proceso', done: checklist.firstProcessCreated },
      { label: 'Sube tu primer documento', done: checklist.firstDocumentUploaded },
    ];
  });

  readonly firstName = computed(() => {
    const user = this.authService.currentUser();
    if (!user) {
      return 'Equipo';
    }

    const emailPart = user.email.split('@')[0];
    const parts = emailPart.split('.');
    if (parts.length > 0) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }

    return 'Usuario';
  });

  readonly statCards = computed(() => {
    const summary = this.summary();
    if (!summary) {
      return [];
    }

    return [
      {
        title: 'Procesos totales',
        value: summary.totalProcesses,
        description: 'Casos monitorizados en todas las áreas jurídicas.',
        trend: 'Actualizado',
        trendClass: 'text-xs font-semibold text-success',
      },
      {
        title: 'Clientes activos',
        value: summary.activeClients,
        description: 'Cuentas activas con relación vigente.',
        trend: 'En gestión',
        trendClass: 'text-xs font-semibold text-info',
      },
      {
        title: 'Audiencias próximas',
        value: summary.upcomingHearingsCount,
        description: 'Eventos confirmados en los próximos 30 días.',
        trend: summary.upcomingHearingsCount > 0 ? 'Agenda activa' : 'Sin eventos',
        trendClass: 'text-xs font-semibold text-warning',
      },
      {
        title: 'Alertas de riesgo',
        value: summary.highRiskProcessesCount,
        description: 'Procesos que requieren acciones preventivas.',
        trend: summary.highRiskProcessesCount > 0 ? 'Prioriza hoy' : 'Sin alertas',
        trendClass: 'text-xs font-semibold text-danger',
      },
    ];
  });

  ngOnInit(): void {
    this.loadSummary();
    this.loadChecklist();
    this.loadTodayDeadlines();
  }

  loadTodayDeadlines(): void {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    this.isLoadingToday.set(true);
    this.deadlinesService.getAll({ from: startOfDay.toISOString(), to: endOfDay.toISOString() }).subscribe({
      next: (deadlines) => {
        this.todayDeadlines.set(
          [...deadlines].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
        );
        this.isLoadingToday.set(false);
      },
      error: () => {
        // Sección informativa — si falla, el dashboard sigue funcionando sin ella.
        this.isLoadingToday.set(false);
      },
    });
  }

  loadChecklist(): void {
    this.dashboardService.getOnboardingChecklist().subscribe({
      next: (checklist) => this.checklist.set(checklist),
      error: () => {
        // El checklist es un extra informativo — si falla, el dashboard sigue funcionando sin él.
      },
    });
  }

  loadSummary(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'No se pudo cargar el tablero');
        this.isLoading.set(false);
      },
    });
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  advisorInitials(advisors: { firstName: string; lastName: string }[]): string {
    if (!advisors.length) {
      return 'NA';
    }
    const advisor = advisors[0];
    return `${advisor.firstName.charAt(0)}${advisor.lastName.charAt(0)}`.toUpperCase();
  }
}
