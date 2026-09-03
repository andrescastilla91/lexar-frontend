import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component, OnInit, Type, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardWidgetsService } from '../../core/services/dashboard-widgets.service';
import { AuthService } from '../../core/services/auth.service';
import { DeadlinesService } from '../../core/services/deadlines.service';
import { TasksService } from '../../core/services/tasks.service';
import { ToastService } from '../../core/services/toast.service';
import { DashboardSummary, OnboardingChecklist } from '../../core/models/dashboard.model';
import { DeadlineResponse } from '../../core/models/deadline.model';
import { TaskResponse } from '../../core/models/task.model';
import { DashboardWidgetCatalogItem } from '../../core/models/dashboard-widgets.model';
import { DashboardStatsWidgetComponent } from './widgets/dashboard-stats-widget.component';
import { DashboardTodayDeadlinesWidgetComponent } from './widgets/dashboard-today-deadlines-widget.component';
import { DashboardTodayTasksWidgetComponent } from './widgets/dashboard-today-tasks-widget.component';
import { DashboardHighRiskProcessesWidgetComponent } from './widgets/dashboard-high-risk-processes-widget.component';
import { DashboardUpcomingHearingsWidgetComponent } from './widgets/dashboard-upcoming-hearings-widget.component';
import { DashboardRecentDocumentsWidgetComponent } from './widgets/dashboard-recent-documents-widget.component';
import { DashboardTopAdvisorsWidgetComponent } from './widgets/dashboard-top-advisors-widget.component';

interface ChecklistItemView {
  label: string;
  done: boolean;
}

// F32 PR2: si GET /dashboard/widgets falla, el dashboard no debe quedar en
// blanco — cae a este orden fijo (idéntico al defaultOrder del catálogo en
// el backend, ver dashboard-widgets.catalog.ts) en vez de un layout vacío.
const FALLBACK_WIDGET_ORDER = [
  'stats',
  'today-deadlines',
  'today-tasks',
  'high-risk-processes',
  'upcoming-hearings',
  'recent-documents',
  'top-advisors',
];

/**
 * F32 PR2 (ajuste 2026-09-03, feedback del propietario): registro
 * key → { componente, inputs } en vez de un `@switch` en la plantilla.
 * `inputs` recibe la instancia del contenedor y devuelve el objeto que se
 * pasa a `[ngComponentOutletInputs]` — un widget nuevo solo agrega una
 * entrada aquí (componente + de dónde saca sus datos); la plantilla y el
 * `@for` no cambian. Es, además, el mismo mecanismo que necesitará la
 * pantalla de configuración de PR3 para listar "todo lo disponible" sin
 * acoplarse a un template fijo.
 */
interface DashboardWidgetRegistryEntry {
  component: Type<unknown>;
  /** F32 PR3: ancho fijo por widget (no configurable por el usuario, ver
   * ficha §Alcance — "el ancho lo sigue definiendo el widget"). 'full' ocupa
   * las 2 columnas del grid, 'half' ocupa 1. Puramente visual: no afecta el
   * orden, que sigue siendo la única dimensión que el usuario controla. */
  span: 'full' | 'half';
  inputs: (host: DashboardComponent) => Record<string, unknown>;
}

const WIDGET_REGISTRY: Record<string, DashboardWidgetRegistryEntry> = {
  stats: {
    component: DashboardStatsWidgetComponent,
    span: 'full',
    inputs: (host) => ({ summary: host.summary(), isLoading: host.isLoading() }),
  },
  'today-deadlines': {
    component: DashboardTodayDeadlinesWidgetComponent,
    span: 'half',
    inputs: (host) => ({ deadlines: host.todayDeadlines(), isLoading: host.isLoadingToday() }),
  },
  'today-tasks': {
    component: DashboardTodayTasksWidgetComponent,
    span: 'half',
    inputs: (host) => ({ tasks: host.todayTasks(), isLoading: host.isLoadingTodayTasks() }),
  },
  'high-risk-processes': {
    component: DashboardHighRiskProcessesWidgetComponent,
    span: 'half',
    inputs: (host) => ({ summary: host.summary(), isLoading: host.isLoading() }),
  },
  'upcoming-hearings': {
    component: DashboardUpcomingHearingsWidgetComponent,
    span: 'half',
    inputs: (host) => ({ summary: host.summary(), isLoading: host.isLoading() }),
  },
  'recent-documents': {
    component: DashboardRecentDocumentsWidgetComponent,
    span: 'half',
    inputs: (host) => ({ summary: host.summary(), isLoading: host.isLoading() }),
  },
  'top-advisors': {
    component: DashboardTopAdvisorsWidgetComponent,
    span: 'half',
    inputs: (host) => ({ summary: host.summary(), isLoading: host.isLoading() }),
  },
};

/**
 * F32 PR1 (2026-09-03) — refactor puro: el contenido de cada tarjeta pasó a
 * su propio componente de widget en `widgets/` (patrón contenedor/
 * presentacional). El hero y el bloque de onboarding quedan **fijos, fuera
 * del sistema de widgets** (decisión del propietario, ver
 * docs/05-features/F32-dashboard-widgets-configurable.md).
 *
 * F32 PR2 (2026-09-03) — el orden de los widgets ya no es fijo en la
 * plantilla: se resuelve en `GET /dashboard/widgets` (catálogo de 3 capas
 * plataforma/empresa/usuario) y se renderiza dinámicamente con
 * `NgComponentOutlet` + `WIDGET_REGISTRY` (ver más abajo) — un widget nuevo
 * agrega una entrada al registro, no una rama nueva en la plantilla.
 *
 * F32 PR3 (2026-09-03) — pantalla de personalización con drag & drop.
 * Modo vivo: los widgets se renderizan en un grid responsive de hasta 2
 * columnas (`span` de `WIDGET_REGISTRY` decide si uno ocupa ambas), en el
 * orden de `layout()`. Modo edición (`isEditingLayout()`): reemplaza el
 * grid por dos listas — activos (reordenables por arrastre nativo HTML5,
 * igual que el patrón de F28 en `settings-task-statuses.component.ts`, más
 * botones subir/bajar operables por teclado, requisito no negociable del
 * Design System capítulo 06) y disponibles (agregar). Guardado explícito:
 * `draftLayout` es una copia de trabajo que no toca `layout()` hasta que
 * el usuario confirma — si cancela, se descarta sin llamar al backend.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  // Los componentes de widget NO van aquí: se instancian en runtime vía
  // NgComponentOutlet (WIDGET_REGISTRY), no se declaran en la plantilla.
  imports: [CommonModule, RouterLink, NgComponentOutlet],
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
            <h2 class="mt-4 break-words text-2xl font-semibold sm:text-3xl">{{ heroGreeting() }}</h2>
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

      <section class="flex items-center justify-between gap-4">
        <h3 class="text-lg font-semibold text-text">Tu tablero</h3>
        @if (!isEditingLayout()) {
          <button
            type="button"
            class="flex flex-shrink-0 items-center gap-2 rounded-md border border-default px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-muted"
            (click)="enterEditMode()"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"
              />
            </svg>
            Personalizar tablero
          </button>
        }
      </section>

      @if (isEditingLayout()) {
        <section class="rounded-lg border border-default bg-surface p-6 shadow-card">
          <div class="grid gap-6 lg:grid-cols-2">
            <div class="min-w-0">
              <h4 class="text-sm font-semibold text-text">Activos ({{ draftLayout().length }})</h4>
              <p class="mt-1 text-xs text-subtle">
                Arrastra para reordenar o usa las flechas — el orden que dejes aquí es el que verás siempre.
              </p>
              <div class="mt-3 space-y-2">
                @if (draftLayout().length === 0) {
                  <p class="rounded-md border border-dashed border-default p-4 text-center text-sm text-subtle">
                    No tienes widgets activos. Agrega alguno desde "Disponibles".
                  </p>
                }
                @for (key of draftLayout(); track key; let i = $index) {
                  <div
                    draggable="true"
                    (dragstart)="onDraftDragStart($event, key)"
                    (dragover)="$event.preventDefault()"
                    (drop)="onDraftDrop($event, i)"
                    class="flex cursor-move items-center gap-3 rounded-md border border-default bg-surface-muted px-3 py-2.5"
                    [attr.aria-label]="'Widget activo: ' + widgetTitle(key)"
                  >
                    <div class="flex flex-shrink-0 flex-col" role="group" [attr.aria-label]="'Reordenar ' + widgetTitle(key)">
                      <button
                        type="button"
                        [disabled]="i === 0"
                        (click)="moveDraftWidgetUp(i)"
                        class="rounded p-0.5 text-muted transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Subir"
                        title="Subir"
                      >
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        [disabled]="i === draftLayout().length - 1"
                        (click)="moveDraftWidgetDown(i)"
                        class="rounded p-0.5 text-muted transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Bajar"
                        title="Bajar"
                      >
                        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-text">{{ widgetTitle(key) }}</p>
                      <p class="truncate text-xs text-subtle">{{ widgetDescription(key) }}</p>
                    </div>
                    <button
                      type="button"
                      (click)="removeWidgetFromDraft(key)"
                      class="flex-shrink-0 rounded-md p-1.5 text-muted transition hover:bg-danger-tint hover:text-danger"
                      aria-label="Quitar"
                      title="Quitar"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                }
              </div>
            </div>

            <div class="min-w-0">
              <h4 class="text-sm font-semibold text-text">Disponibles ({{ availableWidgets().length }})</h4>
              <p class="mt-1 text-xs text-subtle">Agrega los que quieras ver en tu tablero.</p>
              <div class="mt-3 space-y-2">
                @if (availableWidgets().length === 0) {
                  <p class="rounded-md border border-dashed border-default p-4 text-center text-sm text-subtle">
                    Ya agregaste todos los widgets disponibles.
                  </p>
                }
                @for (widget of availableWidgets(); track widget.key) {
                  <div
                    class="flex items-center gap-3 rounded-md border border-default px-3 py-2.5"
                    [attr.aria-label]="'Widget disponible: ' + widget.title"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-text">{{ widget.title }}</p>
                      <p class="truncate text-xs text-subtle">{{ widget.description }}</p>
                    </div>
                    <button
                      type="button"
                      (click)="addWidgetToDraft(widget.key)"
                      class="flex-shrink-0 rounded-md border border-default px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-surface-muted"
                    >
                      Agregar
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-3 border-t border-default pt-4">
            <button
              type="button"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              [disabled]="isSavingLayout()"
              (click)="cancelEditMode()"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950 disabled:cursor-not-allowed disabled:opacity-60"
              [disabled]="isSavingLayout()"
              (click)="saveLayoutEdits()"
            >
              {{ isSavingLayout() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </div>
        </section>
      } @else {
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
          @for (widgetKey of layout(); track widgetKey) {
            @if (widgetComponent(widgetKey); as component) {
              <div [class]="widgetGridItemClasses(widgetKey)">
                <ng-container *ngComponentOutlet="component; inputs: widgetInputs(widgetKey)" />
              </div>
            }
          }
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly dashboardWidgetsService = inject(DashboardWidgetsService);
  private readonly authService = inject(AuthService);
  private readonly deadlinesService = inject(DeadlinesService);
  private readonly tasksService = inject(TasksService);
  private readonly toast = inject(ToastService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly todayDeadlines = signal<DeadlineResponse[]>([]);
  readonly isLoadingToday = signal(true);

  readonly todayTasks = signal<TaskResponse[]>([]);
  readonly isLoadingTodayTasks = signal(true);

  /** F32 PR2: orden efectivo de widgets a renderizar (catálogo de 3 capas + layout del usuario). */
  readonly layout = signal<string[]>([]);
  /** F32 PR3: catálogo efectivo devuelto junto al layout — títulos/descripciones para la pantalla de edición. */
  readonly catalog = signal<DashboardWidgetCatalogItem[]>([]);

  // F32 PR3: `draftLayout` es una copia de trabajo de `layout()` mientras
  // se edita — nunca se lee para renderizar el tablero en vivo, así que
  // cancelar no tiene que revertir nada más que descartarla.
  readonly isEditingLayout = signal(false);
  readonly draftLayout = signal<string[]>([]);
  readonly isSavingLayout = signal(false);
  private draggedWidgetKey: string | null = null;

  /** Widgets del catálogo que todavía no están en el layout en edición. */
  readonly availableWidgets = computed(() =>
    this.catalog().filter((widget) => !this.draftLayout().includes(widget.key)),
  );

  readonly checklist = signal<OnboardingChecklist | null>(null);

  // BUG-11: el backend ya devuelve null para no-dueños, así que en la
  // práctica esta condición nunca dispara con datos reales — se deja como
  // defensa en profundidad, por si algo llega a poblar `checklist` sin
  // pasar por loadChecklist().
  readonly showChecklist = computed(() => {
    const checklist = this.checklist();
    return checklist !== null && !checklist.wizardCompleted && this.authService.currentUser()?.isOwner === true;
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

  // BUG-18: el saludo usa el nombre real del usuario (ya disponible desde
  // F4 en AuthUser.firstName) en vez de derivarlo del email — con
  // acastilla@, info@ o abogado1@ el heurístico anterior nunca daba un
  // nombre real. Sin firstName (usuario legado o sin sesión aún), el
  // saludo se muestra sin nombre (decisión del propietario) en vez de
  // volver a inventar uno desde el correo.
  readonly firstName = computed(() => {
    const user = this.authService.currentUser();
    return user?.firstName?.trim() || null;
  });

  readonly heroGreeting = computed(() => {
    const name = this.firstName();
    return name ? `Hola ${name}, listo para tu jornada legal.` : 'Hola, listo para tu jornada legal.';
  });

  ngOnInit(): void {
    this.loadSummary();
    this.loadChecklist();
    this.loadTodayDeadlines();
    this.loadTodayTasks();
    this.loadWidgets();
  }

  loadWidgets(): void {
    this.dashboardWidgetsService.getWidgets().subscribe({
      next: ({ catalog, layout }) => {
        this.catalog.set(catalog);
        this.layout.set(layout);
      },
      error: () => {
        // El layout dinámico es una mejora de UX, no una dependencia dura —
        // si falla, el dashboard se ve como siempre en vez de quedar vacío.
        this.layout.set(FALLBACK_WIDGET_ORDER);
      },
    });
  }

  /** Componente a instanciar para un widgetKey — null si el key ya no está en WIDGET_REGISTRY (defensivo ante un layout guardado con una key obsoleta). */
  widgetComponent(widgetKey: string): Type<unknown> | null {
    return WIDGET_REGISTRY[widgetKey]?.component ?? null;
  }

  widgetInputs(widgetKey: string): Record<string, unknown> {
    return WIDGET_REGISTRY[widgetKey]?.inputs(this) ?? {};
  }

  /** Clase de grid-span del widget en el tablero en vivo — 'full' ocupa las 2 columnas, 'half' (default) ocupa 1. */
  widgetGridItemClasses(widgetKey: string): string {
    return WIDGET_REGISTRY[widgetKey]?.span === 'full' ? 'md:col-span-2' : '';
  }

  widgetTitle(widgetKey: string): string {
    return this.catalog().find((widget) => widget.key === widgetKey)?.title ?? widgetKey;
  }

  widgetDescription(widgetKey: string): string {
    return this.catalog().find((widget) => widget.key === widgetKey)?.description ?? '';
  }

  // F32 PR3 — modo edición del tablero. Guardado explícito: nada de esto
  // toca `layout()` (lo que se renderiza en vivo) hasta saveLayoutEdits().

  enterEditMode(): void {
    this.draftLayout.set([...this.layout()]);
    this.isEditingLayout.set(true);
  }

  cancelEditMode(): void {
    this.isEditingLayout.set(false);
    this.draftLayout.set([]);
  }

  addWidgetToDraft(widgetKey: string): void {
    if (this.draftLayout().includes(widgetKey)) {
      return;
    }
    this.draftLayout.update((keys) => [...keys, widgetKey]);
  }

  removeWidgetFromDraft(widgetKey: string): void {
    this.draftLayout.update((keys) => keys.filter((key) => key !== widgetKey));
  }

  moveDraftWidgetUp(index: number): void {
    if (index <= 0) {
      return;
    }
    this.draftLayout.update((keys) => {
      const next = [...keys];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  moveDraftWidgetDown(index: number): void {
    this.draftLayout.update((keys) => {
      if (index >= keys.length - 1) {
        return keys;
      }
      const next = [...keys];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  // Drag & drop nativo HTML5, mismo patrón que F28
  // (settings-task-statuses.component.ts) — sin librería, con las flechas
  // subir/bajar como camino accesible por teclado (Design System cap. 06).
  onDraftDragStart(event: DragEvent, widgetKey: string): void {
    this.draggedWidgetKey = widgetKey;
    event.dataTransfer?.setData('text/plain', widgetKey);
  }

  onDraftDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    const draggedKey = this.draggedWidgetKey;
    this.draggedWidgetKey = null;
    if (!draggedKey) {
      return;
    }
    const current = this.draftLayout();
    const sourceIndex = current.indexOf(draggedKey);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      return;
    }
    const reordered = [...current];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    this.draftLayout.set(reordered);
  }

  saveLayoutEdits(): void {
    if (this.isSavingLayout()) {
      return;
    }
    this.isSavingLayout.set(true);
    this.dashboardWidgetsService.saveLayout(this.draftLayout()).subscribe({
      next: (layout) => {
        this.layout.set(layout);
        this.isSavingLayout.set(false);
        this.isEditingLayout.set(false);
        this.toast.success('Tablero personalizado guardado correctamente.');
      },
      error: (error) => {
        this.isSavingLayout.set(false);
        this.toast.error(error.message || 'No se pudo guardar el tablero.');
      },
    });
  }

  loadTodayTasks(): void {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    this.isLoadingTodayTasks.set(true);
    this.tasksService.getAll({ from: startOfDay.toISOString(), to: endOfDay.toISOString() }).subscribe({
      next: (tasks) => {
        this.todayTasks.set(
          [...tasks]
            .filter((task) => !task.status.isTerminal)
            .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')),
        );
        this.isLoadingTodayTasks.set(false);
      },
      error: () => {
        // Sección informativa — si falla, el dashboard sigue funcionando sin ella.
        this.isLoadingTodayTasks.set(false);
      },
    });
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
}
