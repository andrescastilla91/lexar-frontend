import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { CatalogItem, CatalogType } from '../../../core/models/catalog-backend.model';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { FormModalShellComponent } from '../../../core/components/form-modal-shell.component';
import { getCatalogBadgeClasses } from '../../../core/utils/catalog-badge.util';
import { PlanUpgradeService } from '../../../core/services/plan-upgrade.service';

const CATALOG_TABS: { id: CatalogType; label: string }[] = [
  { id: 'document_type', label: 'Tipos de documento' },
  { id: 'risk_level', label: 'Niveles de riesgo' },
  { id: 'process_stage', label: 'Etapas de proceso' },
  { id: 'advisor_specialty', label: 'Especialidades de asesor' },
  { id: 'deadline_type', label: 'Tipos de plazo' },
];

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
  imports: [ReactiveFormsModule, HasPermissionDirective, FormModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="border-b border-default">
        <nav class="hidden gap-6 sm:flex" aria-label="Tipos de catálogo">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              (click)="selectType(tab.id)"
              class="border-b-2 px-1 pb-3 text-sm font-medium transition"
              [class.border-navy-900]="activeType() === tab.id"
              [class.text-text]="activeType() === tab.id"
              [class.border-transparent]="activeType() !== tab.id"
              [class.text-subtle]="activeType() !== tab.id"
            >
              {{ tab.label }}
            </button>
          }
        </nav>
        <div class="pb-3 sm:hidden">
          <select
            class="w-full rounded-md border border-default bg-surface px-3 py-2 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
            [value]="activeType()"
            (change)="onTypeSelect($event)"
          >
            @for (tab of tabs; track tab.id) {
              <option [value]="tab.id">{{ tab.label }}</option>
            }
          </select>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <p class="text-sm text-subtle">
          Estos valores aparecen en los formularios de clientes, procesos y asesores. Los ítems predeterminados
          <span class="font-semibold text-text">(sistema)</span> no se pueden eliminar, pero sí renombrar o desactivar.
        </p>
        <button
          *hasPermission="'catalogs.manage'"
          type="button"
          class="flex flex-shrink-0 items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-navy-950"
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
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <p class="text-subtle">No hay ítems en este catálogo</p>
        </div>
      } @else {
        <div class="rounded-lg border border-default bg-surface shadow-card overflow-hidden">
          <div class="divide-y divide-default">
            @for (item of items(); track item.id; let i = $index) {
              <div class="flex flex-col gap-3 px-4 py-3 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-6">
                <div class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:contents">
                  <div class="flex gap-1 sm:flex-col">
                    <button
                      *hasPermission="'catalogs.manage'"
                      type="button"
                      class="rounded p-0.5 text-subtle hover:bg-surface-muted hover:text-text disabled:opacity-30"
                      [disabled]="i === 0"
                      (click)="moveItem(item, -1)"
                      title="Subir"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      *hasPermission="'catalogs.manage'"
                      type="button"
                      class="rounded p-0.5 text-subtle hover:bg-surface-muted hover:text-text disabled:opacity-30"
                      [disabled]="i === items().length - 1"
                      (click)="moveItem(item, 1)"
                      title="Bajar"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold" [class]="getCatalogBadgeClasses(item.color)">
                        {{ item.label }}
                      </span>
                      <span class="font-mono text-xs text-subtle">{{ item.code }}</span>
                      @if (item.isSystem) {
                        <span class="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                          Sistema
                        </span>
                      }
                      @if (!item.isActive) {
                        <span class="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                          Inactivo
                        </span>
                      }
                    </div>
                    @if (item.usageCount) {
                      <p class="mt-1 text-xs text-subtle">Usado en {{ item.usageCount }} registro(s)</p>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 border-t border-default pt-3 sm:flex sm:justify-end sm:border-0 sm:pt-0">
                  <button
                    *hasPermission="'catalogs.manage'"
                    type="button"
                    (click)="openEditModal(item)"
                    class="rounded-md border border-default px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-muted"
                  >
                    Editar
                  </button>
                  <button
                    *hasPermission="'catalogs.manage'"
                    type="button"
                    (click)="toggleActive(item)"
                    class="rounded-md border px-3 py-1.5 text-xs font-medium transition"
                    [class]="item.isActive ? 'border-warning text-warning hover:bg-warning-tint' : 'border-success text-success hover:bg-success-tint'"
                  >
                    {{ item.isActive ? 'Desactivar' : 'Activar' }}
                  </button>
                  @if (!item.isSystem) {
                    <button
                      *hasPermission="'catalogs.manage'"
                      type="button"
                      (click)="deleteItem(item)"
                      class="rounded-md border border-danger px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger-tint"
                      [disabled]="!!item.usageCount"
                      [title]="item.usageCount ? 'No se puede eliminar: está en uso' : 'Eliminar'"
                    >
                      Eliminar
                    </button>
                  }
                </div>
              </div>
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
        </form>
        @if (formError()) {
          <p class="mt-3 rounded-md border border-danger bg-danger-tint px-3 py-2 text-sm text-danger">{{ formError() }}</p>
        }
      </app-form-modal-shell>
    </div>
  `,
})
export class SettingsCatalogsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalogsService = inject(CatalogsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly planUpgrade = inject(PlanUpgradeService);

  readonly tabs = CATALOG_TABS;
  readonly colorOptions = COLOR_OPTIONS;

  readonly activeType = signal<CatalogType>('document_type');
  readonly allItems = signal<CatalogItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly modalOpen = signal(false);
  readonly editingItem = signal<CatalogItem | null>(null);

  readonly items = computed(() => [...this.allItems()].sort((a, b) => a.sortOrder - b.sortOrder));

  readonly itemForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    label: ['', [Validators.required, Validators.maxLength(100)]],
    color: [''],
  });

  ngOnInit(): void {
    this.loadItems();
  }

  selectType(type: CatalogType): void {
    if (this.activeType() === type) {
      return;
    }
    this.activeType.set(type);
    this.loadItems();
  }

  onTypeSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as CatalogType;
    this.selectType(value);
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
    this.itemForm.reset({ code: '', label: '', color: '' });
    this.itemForm.get('code')?.enable();
    this.formError.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(item: CatalogItem): void {
    this.editingItem.set(item);
    this.itemForm.reset({ code: item.code, label: item.label, color: item.color ?? '' });
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

    const request = editing
      ? this.catalogsService.updateItem(this.activeType(), editing.id, {
          label: value.label,
          color: value.color || undefined,
        })
      : this.catalogsService.createItem(this.activeType(), {
          code: value.code,
          label: value.label,
          color: value.color || undefined,
        });

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toast.success(editing ? 'Ítem actualizado correctamente.' : 'Ítem creado correctamente.');
        this.closeModal();
        this.loadItems();
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
        this.loadItems();
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
        this.loadItems();
      },
      error: (error) => {
        if (this.planUpgrade.isPlanGateError(error)) {
          return;
        }
        this.toast.error(error.message || 'No se pudo eliminar el ítem.');
      },
    });
  }

  protected readonly getCatalogBadgeClasses = getCatalogBadgeClasses;
}
