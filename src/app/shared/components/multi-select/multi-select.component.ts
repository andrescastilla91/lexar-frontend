import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal } from '@angular/core';

export interface MultiSelectItem {
  id: string;
  label: string;
  description?: string;
}

// Rango Unicode de marcas diacríticas combinantes (U+0300–U+036F), construido
// por código de punto para evitar ambigüedad de codificación en el archivo
// fuente: tras normalize('NFD') una vocal con tilde queda como vocal base +
// marca combinante suelta, y esta es la que se elimina.
const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;
const COMBINING_DIACRITICS = new RegExp(
  `[\\u${COMBINING_DIACRITICS_START.toString(16).padStart(4, '0')}-\\u${COMBINING_DIACRITICS_END.toString(16).padStart(4, '0')}]`,
  'g',
);

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(COMBINING_DIACRITICS, '');
}

/**
 * BUG-06 — selector múltiple con búsqueda y chips, para listas que crecen
 * con el uso (asesores, aprobadores, usuarios…) donde una lista plana de
 * checkbox obliga a scroll ciego.
 *
 * Ajuste de UX (2026-09-03, feedback del propietario tras ver la etapa 2 ya
 * migrada en el formulario de proceso): el listado de opciones dejó de estar
 * siempre visible debajo del input — igual que un `<select>` nativo, solo se
 * despliega cuando el usuario entra al control (foco/clic), y se cierra al
 * hacer clic afuera, con Escape, o al perder el foco hacia otro elemento.
 * Los chips de seleccionados siguen siempre visibles (ocupan una sola fila
 * compacta, como el valor mostrado por un `<select>` cerrado) — lo que se
 * evita es la lista completa de opciones permanentemente abierta, que era
 * el uso real de espacio innecesario reportado.
 *
 * Funciona con listas ya cargadas en memoria. `loading` y `searchTermChange`
 * quedan reservados para una futura búsqueda contra el servidor sin tener
 * que rediseñar la API del componente (fuera de alcance de esta etapa).
 */
@Component({
  selector: 'app-multi-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2" (focusout)="onFocusOut($event)" (document:click)="onDocumentClick($event)">
      @if (label()) {
        <label [for]="inputId" class="text-xs font-semibold text-muted">{{ label() }}</label>
      }

      @if (selectedItems().length > 0) {
        <ul class="flex flex-wrap gap-2" aria-label="Seleccionados">
          @for (item of selectedItems(); track item.id) {
            <li class="flex items-center gap-1 rounded-full bg-navy-900/10 px-3 py-1 text-xs font-medium text-navy-900">
              {{ item.label }}
              <button
                type="button"
                (click)="removeChip(item.id)"
                [disabled]="disabled()"
                class="flex h-5 w-5 items-center justify-center rounded-full text-navy-900 hover:bg-navy-900/20 focus:outline-none focus:ring-2 focus:ring-navy-900/40"
                [attr.aria-label]="'Quitar ' + item.label"
              >
                ×
              </button>
            </li>
          }
        </ul>
      }

      <div class="relative">
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          [attr.aria-expanded]="isOpen()"
          [attr.aria-controls]="listId"
          [attr.aria-activedescendant]="isOpen() && highlightedIndex() >= 0 ? listId + '-opt-' + highlightedIndex() : null"
          [id]="inputId"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [value]="searchTerm()"
          (focus)="open()"
          (click)="open()"
          (input)="onSearchInput($any($event.target).value)"
          (keydown)="onSearchKeydown($event)"
          class="min-h-[44px] w-full rounded-md border border-default px-3 py-2 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
        />

        @if (loading()) {
          <p class="mt-1 text-xs text-subtle" aria-live="polite">Cargando…</p>
        }

        @if (isOpen()) {
          <ul
            [id]="listId"
            role="listbox"
            aria-multiselectable="true"
            class="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-default bg-surface shadow-card"
          >
            @if (filteredItems().length === 0) {
              <li class="px-3 py-2 text-xs text-subtle">{{ emptyStateText() }}</li>
            } @else {
              @for (item of filteredItems(); track item.id; let i = $index) {
                <li [id]="listId + '-opt-' + i" role="option" [attr.aria-selected]="isSelected(item.id)">
                  <label
                    class="flex min-h-[44px] cursor-pointer items-center gap-2 px-3 py-2 text-sm transition"
                    [class.bg-surface-muted]="i === highlightedIndex()"
                  >
                    <input
                      type="checkbox"
                      [checked]="isSelected(item.id)"
                      (change)="toggle(item.id)"
                      [disabled]="disabled()"
                      class="h-4 w-4 rounded border-strong text-navy-900 focus:ring-navy-900"
                    />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate font-medium text-text">{{ item.label }}</span>
                      @if (item.description) {
                        <span class="block truncate text-xs text-subtle">{{ item.description }}</span>
                      }
                    </span>
                  </label>
                </li>
              }
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class MultiSelectComponent {
  private static nextInstanceId = 0;
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  items = input.required<MultiSelectItem[]>();
  selectedIds = input<string[]>([]);
  label = input('');
  placeholder = input('Buscar…');
  emptyStateText = input('Sin resultados');
  disabled = input(false);
  /** Reservado para búsqueda contra el servidor — sin uso en esta etapa. */
  loading = input(false);

  selectionChange = output<string[]>();
  /** Reservado para búsqueda contra el servidor — sin uso en esta etapa. */
  searchTermChange = output<string>();

  readonly inputId: string;
  readonly listId: string;

  readonly searchTerm = signal('');
  readonly highlightedIndex = signal(-1);
  // Ajuste 2026-09-03: la lista de opciones ya no está siempre montada —
  // isOpen() controla si se renderiza, igual que el desplegable de un
  // `<select>` nativo.
  readonly isOpen = signal(false);
  private readonly internalSelected = signal<string[]>([]);

  readonly selectedItems = computed(() => {
    const ids = new Set(this.internalSelected());
    return this.items().filter((item) => ids.has(item.id));
  });

  readonly filteredItems = computed(() => {
    const term = normalize(this.searchTerm().trim());
    if (!term) {
      return this.items();
    }
    return this.items().filter(
      (item) => normalize(item.label).includes(term) || (item.description && normalize(item.description).includes(term)),
    );
  });

  constructor() {
    const id = MultiSelectComponent.nextInstanceId++;
    this.inputId = `multi-select-search-${id}`;
    this.listId = `multi-select-list-${id}`;

    // Espeja el input controlado (patrón contenedor/presentacional): el
    // consumidor sigue siendo la fuente de verdad de la selección.
    effect(() => {
      this.internalSelected.set([...this.selectedIds()]);
    });
  }

  isSelected(id: string): boolean {
    return this.internalSelected().includes(id);
  }

  toggle(id: string): void {
    const current = this.internalSelected();
    const next = current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id];
    this.internalSelected.set(next);
    this.selectionChange.emit(next);
  }

  removeChip(id: string): void {
    this.toggle(id);
  }

  open(): void {
    if (!this.disabled()) {
      this.isOpen.set(true);
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  // Cierra al hacer clic fuera del control (input o listbox). Se escucha en
  // el document en vez de en el input porque un clic en un checkbox de la
  // lista no debe cerrarla — necesitamos saber si el destino del clic sigue
  // dentro de elementRef, no si el input perdió el foco.
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  // Complementa a onDocumentClick para el caso de navegación por teclado
  // (Tab hacia otro control): si el nuevo elemento enfocado ya no está
  // dentro de este componente, se cierra la lista.
  onFocusOut(event: FocusEvent): void {
    const nextFocusTarget = event.relatedTarget as Node | null;
    if (!nextFocusTarget || !this.elementRef.nativeElement.contains(nextFocusTarget)) {
      this.close();
    }
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.highlightedIndex.set(-1);
    this.isOpen.set(true);
    this.searchTermChange.emit(value);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const items = this.filteredItems();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open();
        if (items.length > 0) {
          this.highlightedIndex.update((current) => Math.min(current + 1, items.length - 1));
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open();
        if (items.length > 0) {
          this.highlightedIndex.update((current) => Math.max(current - 1, 0));
        }
        break;
      case 'Enter': {
        const index = this.highlightedIndex();
        if (index >= 0 && index < items.length) {
          event.preventDefault();
          this.toggle(items[index].id);
        }
        break;
      }
      case 'Escape':
        if (this.searchTerm()) {
          event.preventDefault();
          event.stopPropagation();
          this.searchTerm.set('');
          this.highlightedIndex.set(-1);
        } else if (this.isOpen()) {
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }
        break;
      case 'Backspace': {
        const selected = this.internalSelected();
        if (!this.searchTerm() && selected.length > 0) {
          this.toggle(selected[selected.length - 1]);
        }
        break;
      }
      default:
        break;
    }
  }
}
