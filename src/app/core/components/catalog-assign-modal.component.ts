import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

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

// F31: quita acentos y pasa a minúsculas para una búsqueda insensible a
// mayúsculas/tildes (un despacho colombiano escribe "asignacion" sin
// tilde). NFD + strip de diacríticos, sin dependencias externas.
// Marcas diacríticas combinantes Unicode U+0300-U+036F (acentos, tildes,
// diéresis) tal como las deja String.normalize('NFD'). Construido con
// String.fromCharCode (no como literal en el regex) para que el código
// fuente de este archivo quede en ASCII puro y no dependa de cómo cada
// editor/encoding represente el caracter combinante.
const DIACRITIC_RANGE_START = 0x0300;
const DIACRITIC_RANGE_END = 0x036f;
const COMBINING_DIACRITICS_RANGE = new RegExp(
  '[' + String.fromCharCode(DIACRITIC_RANGE_START) + '-' + String.fromCharCode(DIACRITIC_RANGE_END) + ']',
  'g',
);

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS_RANGE, '')
    .toLowerCase()
    .trim();
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

          @if (searchable()) {
            <div class="mb-4 space-y-1.5">
              <label for="catalog-assign-search" class="sr-only">Buscar</label>
              <div class="relative">
                <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.2-5.2m1.7-5.3a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
                <input
                  #searchInput
                  id="catalog-assign-search"
                  type="text"
                  [value]="searchTerm()"
                  (input)="onSearchInput($event)"
                  (keydown.escape)="onSearchEscape($event)"
                  placeholder="Buscar por nombre o grupo…"
                  class="w-full rounded-md border border-default bg-surface py-2 pl-9 pr-3 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
              </div>
              <p class="text-xs text-subtle" aria-live="polite">
                {{ selectedCount() }} {{ selectedCount() === 1 ? 'permiso seleccionado' : 'permisos seleccionados' }}
              </p>
            </div>
          }

          <div class="mb-6 space-y-4">
            @if (hasGroups()) {
              @if (filteredGroupedItems().length === 0) {
                <p class="rounded-md border border-dashed border-default p-4 text-center text-sm text-subtle">
                  Sin resultados para "{{ searchTerm() }}".
                  <button type="button" (click)="clearSearch()" class="ml-1 font-medium text-navy-900 hover:underline">
                    Limpiar búsqueda
                  </button>
                </p>
              } @else {
                @for (group of filteredGroupedItems(); track group.name) {
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
              }
            } @else {
              @if (searchable() && filteredItems().length === 0) {
                <p class="rounded-md border border-dashed border-default p-4 text-center text-sm text-subtle">
                  Sin resultados para "{{ searchTerm() }}".
                  <button type="button" (click)="clearSearch()" class="ml-1 font-medium text-navy-900 hover:underline">
                    Limpiar búsqueda
                  </button>
                </p>
              } @else {
                <div class="space-y-2">
                  @for (item of filteredItems(); track item.id) {
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
  // F31: opt-in — apagado por defecto para no alterar a los consumidores
  // actuales del modal (catálogos, otras asignaciones).
  searchable = input(false);

  save = output<string[]>();
  cancel = output<void>();

  private readonly internalSelected = signal<string[]>([]);
  private readonly searchTermSignal = signal('');
  private readonly searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly searchTerm = this.searchTermSignal.asReadonly();
  readonly selectedCount = computed(() => this.internalSelected().length);

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

  private readonly normalizedSearch = computed(() => normalizeSearchText(this.searchTermSignal()));

  private matchesSearch(item: CatalogAssignItem): boolean {
    const term = this.normalizedSearch();
    if (!term) {
      return true;
    }
    const haystack = normalizeSearchText(`${item.label} ${item.description ?? ''} ${item.group ?? ''}`);
    return haystack.includes(term);
  }

  // F31: filtrar es una operación de vista — nunca toca `internalSelected`.
  // Un ítem seleccionado que queda fuera del filtro sigue seleccionado.
  readonly filteredItems = computed<CatalogAssignItem[]>(() => {
    if (!this.searchable()) {
      return this.items();
    }
    return this.items().filter((item) => this.matchesSearch(item));
  });

  readonly filteredGroupedItems = computed<CatalogAssignGroup[]>(() => {
    if (!this.searchable()) {
      return this.groupedItems();
    }
    return this.groupedItems()
      .map((group) => ({
        name: group.name,
        items: group.items.filter((item) => this.matchesSearch(item)),
      }))
      .filter((group) => group.items.length > 0);
  });

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.internalSelected.set([...this.selectedIds()]);
        this.searchTermSignal.set('');
        if (this.searchable()) {
          queueMicrotask(() => this.searchInputRef()?.nativeElement.focus());
        }
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

  onSearchInput(event: Event): void {
    this.searchTermSignal.set((event.target as HTMLInputElement).value);
  }

  onSearchEscape(event: Event): void {
    event.stopPropagation();
    this.clearSearch();
  }

  clearSearch(): void {
    this.searchTermSignal.set('');
    this.searchInputRef()?.nativeElement.focus();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    this.save.emit(this.internalSelected());
  }
}
