import { Component, computed, effect, input, output, signal } from '@angular/core';

export interface CatalogAssignItem {
  id: string;
  label: string;
  description?: string;
  group?: string;
}

interface CatalogAssignGroup {
  name: string;
  items: CatalogAssignItem[];
}

@Component({
  selector: 'app-catalog-assign-modal',
  standalone: true,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div
          class="w-full overflow-y-auto rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl"
          [class.max-w-sm]="!hasGroups()"
          [class.md:max-w-md]="!hasGroups()"
          [class.max-w-xl]="hasGroups()"
          [class.md:max-w-2xl]="hasGroups()"
          [class.lg:max-w-3xl]="hasGroups()"
          style="max-height: 90vh"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-text">{{ title() }}</h3>
            <button
              type="button"
              (click)="onCancel()"
              class="rounded-lg p-1 text-subtle hover:bg-surface-muted hover:text-muted"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          @if (subtitleValue()) {
            <p class="mb-4 text-sm text-muted">
              {{ subtitlePrefix() }} <strong>{{ subtitleValue() }}</strong>
            </p>
          }

          <div class="mb-6 space-y-4">
            @if (hasGroups()) {
              @for (group of groupedItems(); track group.name) {
                <div class="rounded-md border border-default p-4">
                  <h4 class="mb-3 font-semibold text-text">{{ group.name }}</h4>
                  <div class="grid gap-2 sm:grid-cols-2">
                    @for (item of group.items; track item.id) {
                      <label class="flex items-start gap-2 rounded-md border border-default p-3 transition hover:bg-surface-muted cursor-pointer">
                        <input
                          type="checkbox"
                          [checked]="isSelected(item.id)"
                          (change)="toggle(item.id)"
                          class="mt-0.5 h-4 w-4 rounded border-strong text-navy-900 focus:ring-navy-900"
                        />
                        <div class="flex-1">
                          <p class="text-sm font-medium text-text">{{ item.label }}</p>
                          @if (item.description) {
                            <p class="text-xs text-subtle">{{ item.description }}</p>
                          }
                        </div>
                      </label>
                    }
                  </div>
                </div>
              }
            } @else {
              <div class="space-y-2">
                @for (item of items(); track item.id) {
                  <label class="flex items-center gap-3 rounded-md border border-default p-3 transition hover:bg-surface-muted cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="isSelected(item.id)"
                      (change)="toggle(item.id)"
                      class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-navy-900"
                    />
                    <div class="flex-1">
                      <p class="font-medium text-text">{{ item.label }}</p>
                      @if (item.description) {
                        <p class="text-xs text-subtle">{{ item.description }}</p>
                      }
                    </div>
                  </label>
                }
              </div>
            }
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              (click)="onCancel()"
              class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="onSave()"
              [disabled]="isSubmitting()"
              class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950"
            >
              {{ submitLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CatalogAssignModalComponent {
  title = input.required<string>();
  subtitlePrefix = input('');
  subtitleValue = input<string | null>(null);
  items = input.required<CatalogAssignItem[]>();
  selectedIds = input.required<string[]>();
  isOpen = input(false);
  isSubmitting = input(false);
  submitLabel = input('Guardar');

  save = output<string[]>();
  cancel = output<void>();

  private readonly internalSelected = signal<string[]>([]);

  readonly hasGroups = computed(() => this.items().some((item) => !!item.group));

  readonly groupedItems = computed<CatalogAssignGroup[]>(() => {
    const groups = new Map<string, CatalogAssignItem[]>();
    for (const item of this.items()) {
      const key = item.group ?? '';
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([name, groupItems]) => ({ name, items: groupItems }));
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.internalSelected.set([...this.selectedIds()]);
      }
    });
  }

  isSelected(id: string): boolean {
    return this.internalSelected().includes(id);
  }

  toggle(id: string): void {
    const current = this.internalSelected();
    this.internalSelected.set(
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
    );
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    this.save.emit(this.internalSelected());
  }
}
