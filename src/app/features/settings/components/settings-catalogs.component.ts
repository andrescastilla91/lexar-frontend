import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { CatalogItem, CatalogSummaryItem, CatalogType } from '../../../core/models/catalog-backend.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { FormModalShellComponent } from '../../../core/components/form-modal-shell.component';
import { PlanUpgradeService } from '../../../core/services/plan-upgrade.service';
import { CatalogNavComponent } from './catalog-nav.component';
import { CatalogItemRowComponent } from './catalog-item-row.component';
import { CATALOG_META, DEFAULT_CATALOG_TYPE, isCatalogType } from '../utils/catalog-registry';

const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: 'primary', label: 'Primario' },
  { value: 'accent', label: 'Acento' },
  { value: 'success', label: 'Éxito' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'danger', label: 'Peligro' },
  { value: 'info', label: 'Información' },
];

@Component({
  selector: 'app-settings-catalogs',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HasPermissionDirective,
    FormModalShellComponent,
    CatalogNavComponent,
    CatalogItemRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="@container">
    <div class="grid gap-4 @min-[44rem]:grid-cols-[260px_minmax(0,1fr)] @min-[44rem]:items-start @min-[44rem]:gap-6">
      <app-catalog-nav
        class="@min-[44rem]:sticky @min-[44rem]:top-4"
        [activeType]="activeType()"
        [summary]="summary()"
        (selected)="selectType($event)"
      />

      <section class="@container min-w-0 space-y-6" [attr.aria-label]="activeMeta().label">
        <div class="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
          <div class="min-w-0">
            <h3 class="text-lg font-semibold text-text">{{ activeMeta().label }}</h3>
            <p class="mt-1 text-sm text-subtle">
              {{ activeMeta().description }}
              Los ítems predeterminados
              <span class="font-semibold text-text">(sistema)</span> no se pueden eliminar, pero sí renombrar o desactivar.
            </p>
          </div>
          <button
            *hasPermission="'catalogs.manage'"
            type="button"
            class="flex min-h-11 flex-shrink-0 items-center justify-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950 @lg:min-h-0"
            (click)="openCreateModal()"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo ítem
          </button>
        </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-default border-t-navy-900"></div>
        </div>
      } @else if (items().length === 0) {
        <div class="rounded-lg border border-dashed border-default bg-surface p-8 text-center">
          <p class="font-medium text-text">Aún no hay ítems en {{ activeMeta().label }}</p>
          <p class="mx-auto mt-1 max-w-md text-sm text-subtle">{{ activeMeta().description }}</p>
          <button
            *hasPermission="'catalogs.manage'"
            type="button"
            class="mt-4 min-h-11 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
            (click)="openCreateModal()"
          >
            Crear el primer ítem
          </button>
        </div>
      } @else {
        <div class="overflow-hidden rounded-lg border border-default bg-surface shadow-card">
          <div class="divide-y divide-default">
            @for (item of items(); track item.id; let i = $index) {
              <div
                app-catalog-item-row
                [item]="item"
                [isFirst]="i === 0"
                [isLast]="i === items().length - 1"
                (move)="moveItem(item, $event)"
                (edit)="openEditModal(item)"
                (toggle)="toggleActive(item)"
                (remove)="deleteItem(item)"
              ></div>
            }
          </div>
        </div>
      }

      <app-form-modal-shell
        [title]="editingItem() ? 'Editar ítem de catálogo' : 'Nuevo ítem de catálogo'"
        [isOpen]="modalOpen()"
        [isSubmitting]="isSubmitting()"
        submitLabel="Guardar"
        (cancel)="closeModal()"
        (submit)="submitItem()"
      >
        <form [formGroup]="itemForm" class="grid gap-4">
          @if (!editingItem()) {
            <label class="text-sm text-muted">
              Código *
              <input
                formControlName="code"
                type="text"
                placeholder="Ej: URGENTE (mayúsculas, sin espacios)"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
              <p class="mt-1 text-xs text-subtle">Identificador interno, estable. No podrá cambiarse luego.</p>
              @if (itemForm.get('code')?.touched && itemForm.get('code')?.invalid) {
                <p class="mt-1 text-xs text-danger">Solo mayúsculas, números y guion bajo</p>
              }
            </label>
          }
          <label class="text-sm text-muted">
            Etiqueta *
            <input
              formControlName="label"
              type="text"
              placeholder="Texto visible en la app"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            />
          </label>
          <label class="text-sm text-muted">
            Color
            <select
              formControlName="color"
              class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            >
              <option value="">Sin color</option>
              @for (color of colorOptions; track color.value) {
                <option [value]="color.value">{{ color.label }}</option>
              }
            </select>
          </label>
          <!-- F40 §PRO-03: solo relevante para el catálogo "Etapas de proceso" —
               a qué tipo de proceso aplica esta etapa. null = aplica a todos. -->
          @if (activeType() === 'process_stage') {
            <label class="text-sm text-muted">
              Aplica a tipo de proceso
              <select
                formControlName="processTypeScope"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              >
                <option [value]="null">Todos los tipos</option>
                @for (processType of processTypeOptions(); track processType.id) {
                  <option [value]="processType.id">{{ processType.label }}</option>
                }
              </select>
            </label>
          }
        </form>
        @if (formError()) {
          <p class="mt-3 rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ formError() }}</p>
        }
      </app-form-modal-shell>
      </section>
    </div>
    </div>
  `,
})
export class SettingsCatalogsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalogsService = inject(CatalogsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly planUpgrade = inject(PlanUpgradeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly colorOptions = COLOR_OPTIONS;

  /** F47: el catálogo abierto viene del enlace profundo (`?tipo=`) y, si no es válido, es el primero. */
  readonly activeType = signal<CatalogType>(DEFAULT_CATALOG_TYPE);
  readonly activeMeta = computed(() => CATALOG_META[this.activeType()]);
  /** F47: conteo por catálogo para la navegación; `null` si no ha cargado o falló. */
  readonly summary = signal<CatalogSummaryItem[] | null>(null);
  readonly allItems = signal<CatalogItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly modalOpen = signal(false);
  readonly editingItem = signal<CatalogItem | null>(null);
  /** F40 §PRO-03: opciones para el selector "Aplica a tipo de proceso" en la
   * pestaña de etapas — se carga una sola vez, independiente de activeType(). */
  readonly processTypeOptions = signal<CatalogItem[]>([]);

  readonly items = computed(() => [...this.allItems()].sort((a, b) => a.sortOrder - b.sortOrder));

  readonly itemForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    label: ['', [Validators.required, Validators.maxLength(100)]],
    color: [''],
    processTypeScope: [null as string | null], // F40 §PRO-03
  });

  ngOnInit(): void {
    const requested = this.route.snapshot.queryParamMap.get('tipo');
    if (isCatalogType(requested)) {
      this.activeType.set(requested);
    }
    this.loadItems();
    this.loadSummary();
    // F40 §PRO-03: independiente de la pestaña activa, se necesita para el
    // selector "Aplica a tipo de proceso" en cuanto el usuario abre la
    // pestaña de etapas.
    this.catalogsService.getCatalog('process_type').subscribe({
      next: (items) => this.processTypeOptions.set(items),
      error: () => this.processTypeOptions.set([]),
    });
  }

  selectType(type: CatalogType): void {
    if (this.activeType() === type) {
      return;
    }
    this.activeType.set(type);
    this.loadItems();
    this.syncUrl(type);
  }

  /**
   * Deja el catálogo abierto en la URL para poder compartirlo y para que un
   * recargue lo conserve. `tab=catalogs` también va, porque Configuración abre
   * por defecto en otra sección. `replaceUrl`: cambiar de catálogo no debe
   * llenar el historial del navegador.
   */
  private syncUrl(type: CatalogType): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'catalogs', tipo: type },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Los contadores son un adorno de la navegación: si fallan no se interrumpe al usuario. */
  private loadSummary(): void {
    this.catalogsService.getSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
  }

  /** Tras crear/activar/eliminar cambian la lista y los contadores de la navegación. */
  private reload(): void {
    this.loadItems();
    this.loadSummary();
  }

  private loadItems(): void {
    this.isLoading.set(true);
    this.catalogsService.getCatalog(this.activeType()).subscribe({
      next: (items) => {
        this.allItems.set(items);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.toast.error(error.message || 'Error al cargar el catálogo');
        this.allItems.set([]);
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingItem.set(null);
    this.itemForm.reset({ code: '', label: '', color: '', processTypeScope: null });
    this.itemForm.get('code')?.enable();
    this.formError.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(item: CatalogItem): void {
    this.editingItem.set(item);
    this.itemForm.reset({
      code: item.code,
      label: item.label,
      color: item.color ?? '',
      processTypeScope: item.processTypeScope ?? null,
    });
    this.itemForm.get('code')?.disable();
    this.formError.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingItem.set(null);
    this.formError.set(null);
  }

  submitItem(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.formError.set(null);
    const value = this.itemForm.getRawValue();
    const editing = this.editingItem();

    // F40 §PRO-03: processTypeScope solo es relevante para `process_stage` —
    // en cualquier otra pestaña se omite del payload (undefined no viaja en
    // el JSON), nunca se envía un valor sin sentido para ese catálogo.
    const processTypeScopePayload =
      this.activeType() === 'process_stage'
        ? { processTypeScope: value.processTypeScope || null }
        : {};

    const request = editing
      ? this.catalogsService.updateItem(this.activeType(), editing.id, {
          label: value.label,
          color: value.color || undefined,
          ...processTypeScopePayload,
        })
      : this.catalogsService.createItem(this.activeType(), {
          code: value.code,
          label: value.label,
          color: value.color || undefined,
          ...processTypeScopePayload,
        });

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success(editing ? 'Ítem actualizado correctamente.' : 'Ítem creado correctamente.');
        this.closeModal();
        this.reload();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        // F7-R3: el toast+CTA de upgrade ya lo dispara error.interceptor.ts
        // de forma centralizada — aquí solo hace falta la limpieza local
        // (cerrar el modal) para no dejarlo abierto sobre un error de plan.
        if (this.planUpgrade.isPlanGateError(error)) {
          this.closeModal();
          return;
        }
        this.formError.set(error.message || 'No se pudo guardar el ítem de catálogo.');
      },
    });
  }

  toggleActive(item: CatalogItem): void {
    this.catalogsService.updateItem(this.activeType(), item.id, { isActive: !item.isActive }).subscribe({
      next: () => {
        this.toast.success(item.isActive ? 'Ítem desactivado.' : 'Ítem activado.');
        this.reload();
      },
      error: (error) => {
        if (this.planUpgrade.isPlanGateError(error)) {
          return;
        }
        this.toast.error(error.message || 'No se pudo cambiar el estado del ítem.');
      },
    });
  }

  moveItem(item: CatalogItem, direction: -1 | 1): void {
    const ordered = this.items();
    const index = ordered.findIndex((i) => i.id === item.id);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= ordered.length) {
      return;
    }
    const swapWith = ordered[swapIndex];

    this.catalogsService.updateItem(this.activeType(), item.id, { sortOrder: swapWith.sortOrder }).subscribe({
      next: () => {
        this.catalogsService.updateItem(this.activeType(), swapWith.id, { sortOrder: item.sortOrder }).subscribe({
          next: () => this.loadItems(),
          error: () => this.loadItems(),
        });
      },
      error: (error) => {
        if (this.planUpgrade.isPlanGateError(error)) {
          return;
        }
        this.toast.error(error.message || 'No se pudo reordenar el catálogo.');
      },
    });
  }

  async deleteItem(item: CatalogItem): Promise<void> {
    if (item.usageCount) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Eliminar ítem de catálogo',
      message: `¿Estás seguro de eliminar "${item.label}"? Esta acción no se puede deshacer.`,
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    this.catalogsService.deleteItem(this.activeType(), item.id).subscribe({
      next: () => {
        this.toast.success('Ítem eliminado correctamente.');
        this.reload();
      },
      error: (error) => {
        if (this.planUpgrade.isPlanGateError(error)) {
          return;
        }
        this.toast.error(error.message || 'No se pudo eliminar el ítem.');
      },
    });
  }

}
