import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { normalizeSearchText } from '../../utils/normalize-search-text';

export interface SelectItem {
  value: string;
  label: string;
  description?: string;
}

const TYPEAHEAD_RESET_MS = 600;
const AUTO_SEARCH_THRESHOLD = 8;

/**
 * Selector de una sola opción que reemplaza al `<select>` nativo: mismo
 * aspecto y comportamiento que `app-multi-select` (desplegable que se cierra
 * al hacer clic fuera, con Escape o al salir con Tab), con búsqueda cuando la
 * lista es larga y navegación completa por teclado.
 *
 * Se usa con formularios reactivos (`formControlName`) o suelto con
 * `[value]` + `(valueChange)`. El valor siempre es el `value` de la opción
 * (string); la opción vacía (`emptyLabel`) emite `emptyValue` (por defecto '').
 *
 * Funciona dentro de un `<label>`: el clic en el texto abre el selector.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
  template: `
    <div class="relative" (focusout)="onFocusOut($event)" (document:click)="onDocumentClick($event)">
      <button
        #trigger
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        [id]="triggerId"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="isOpen() ? listId : null"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-activedescendant]="isOpen() && !showSearch() ? activeDescendant() : null"
        [disabled]="effectivelyDisabled()"
        (click)="toggle()"
        (keydown)="onTriggerKeydown($event)"
        (keyup)="onTriggerKeyup($event)"
        class="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border bg-surface px-4 py-2.5 text-left text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle"
        [class.border-default]="!invalid()"
        [class.border-danger]="invalid()"
      >
        <span class="min-w-0 flex-1 truncate" [class.text-subtle]="!selectedOption()">
          {{ selectedOption()?.label ?? placeholder() }}
        </span>
        <svg
          class="h-4 w-4 shrink-0 text-subtle transition-transform"
          [class.rotate-180]="isOpen()"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      @if (isOpen()) {
        <div
          class="absolute z-30 mt-1 w-full rounded-md border border-default bg-surface shadow-card"
          (click)="$event.preventDefault()"
        >
          @if (showSearch()) {
            <div class="border-b border-default p-2">
              <input
                #search
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-label="Buscar"
                [attr.aria-controls]="listId"
                [attr.aria-activedescendant]="activeDescendant()"
                [placeholder]="searchPlaceholder()"
                [value]="searchTerm()"
                (input)="onSearchInput($any($event.target).value)"
                (keydown)="onListKeydown($event)"
                class="min-h-11 w-full rounded-md border border-default px-3 py-2 text-sm text-text focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </div>
          }
          <ul [id]="listId" role="listbox" class="max-h-60 overflow-y-auto py-1">
            @if (filteredOptions().length === 0) {
              <li class="px-3 py-2 text-xs text-subtle">{{ emptyStateText() }}</li>
            } @else {
              @for (option of filteredOptions(); track option.value; let i = $index) {
                <li
                  [id]="optionId(i)"
                  role="option"
                  tabindex="-1"
                  [attr.aria-selected]="isSelected(option)"
                  (click)="choose(option)"
                  (mousemove)="highlightedIndex.set(i)"
                  class="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text"
                  [class.bg-surface-muted]="i === highlightedIndex() && !isSelected(option)"
                  [class.bg-primary-tint]="isSelected(option)"
                >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate" [class.font-semibold]="isSelected(option)">{{ option.label }}</span>
                    @if (option.description) {
                      <span class="block truncate text-xs text-subtle">{{ option.description }}</span>
                    }
                  </span>
                  @if (isSelected(option)) {
                    <svg
                      class="h-4 w-4 shrink-0 text-info"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  }
                </li>
              }
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [':host { display: block; }'],
})
export class SelectComponent implements ControlValueAccessor {
  private static nextInstanceId = 0;
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  items = input.required<SelectItem[]>();
  /** Uso sin formularios: valor actual. Con `formControlName` no hace falta. */
  value = input<string | number | null | undefined>(undefined);
  placeholder = input('Selecciona…');
  /** Si se define, agrega una primera opción «vacía» (p. ej. «Sin color»). */
  emptyLabel = input<string | null>(null);
  /** Valor que emite la opción vacía (por defecto ''). */
  emptyValue = input<string | null>('');
  /** 'auto' muestra el buscador cuando hay más de 8 opciones. */
  searchable = input<boolean | 'auto'>('auto');
  searchPlaceholder = input('Buscar…');
  emptyStateText = input('Sin resultados');
  ariaLabel = input('');
  invalid = input(false);
  /** Deshabilita el selector (con formularios reactivos usa `control.disable()`). */
  isDisabled = input(false);

  valueChange = output<string | null>();

  readonly triggerId: string;
  readonly listId: string;

  readonly isOpen = signal(false);
  readonly searchTerm = signal('');
  readonly highlightedIndex = signal(-1);

  private readonly current = signal<string>('');
  private readonly formDisabled = signal(false);
  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private spaceHandled = false;
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly searchRef = viewChild<ElementRef<HTMLInputElement>>('search');

  readonly effectivelyDisabled = computed(() => this.isDisabled() || this.formDisabled());

  readonly options = computed<SelectItem[]>(() => {
    const emptyLabel = this.emptyLabel();
    return emptyLabel === null ? this.items() : [{ value: '', label: emptyLabel }, ...this.items()];
  });

  readonly selectedOption = computed(() => {
    const current = this.current();
    if (current === '' && this.emptyLabel() === null) {
      return null;
    }
    return this.options().find((option) => option.value === current) ?? null;
  });

  readonly showSearch = computed(() => {
    const searchable = this.searchable();
    return searchable === 'auto' ? this.items().length > AUTO_SEARCH_THRESHOLD : searchable;
  });

  readonly filteredOptions = computed(() => {
    const term = normalizeSearchText(this.searchTerm());
    if (!term) {
      return this.options();
    }
    return this.options().filter(
      (option) =>
        normalizeSearchText(option.label).includes(term) ||
        (option.description ? normalizeSearchText(option.description).includes(term) : false),
    );
  });

  readonly activeDescendant = computed(() =>
    this.isOpen() && this.highlightedIndex() >= 0 ? this.optionId(this.highlightedIndex()) : null,
  );

  constructor() {
    const id = SelectComponent.nextInstanceId++;
    this.triggerId = `app-select-trigger-${id}`;
    this.listId = `app-select-list-${id}`;

    effect(() => {
      const value = this.value();
      if (value !== undefined) {
        this.current.set(value === null ? '' : String(value));
      }
    });
  }

  optionId(index: number): string {
    return `${this.listId}-opt-${index}`;
  }

  isSelected(option: SelectItem): boolean {
    return option.value === this.current();
  }

  // --- ControlValueAccessor ---

  writeValue(value: unknown): void {
    this.current.set(value === null || value === undefined ? '' : String(value));
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  // --- Apertura / cierre ---

  open(): void {
    if (this.effectivelyDisabled() || this.isOpen()) {
      return;
    }
    this.searchTerm.set('');
    const options = this.filteredOptions();
    const selectedIndex = options.findIndex((option) => this.isSelected(option));
    this.highlightedIndex.set(selectedIndex >= 0 ? selectedIndex : options.length > 0 ? 0 : -1);
    this.isOpen.set(true);
    afterNextRender(
      () => {
        this.searchRef()?.nativeElement.focus();
        this.scrollHighlightedIntoView();
      },
      { injector: this.injector },
    );
  }

  close(returnFocus = false): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
    this.searchTerm.set('');
    this.onTouched();
    if (returnFocus) {
      this.triggerRef()?.nativeElement.focus();
    }
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  choose(option: SelectItem): void {
    const emitted = option.value === '' ? this.emptyValue() : option.value;
    // Con `[value]` enlazado (modo controlado) el padre decide: si cancela o falla, la selección no cambia.
    if (this.value() === undefined) {
      this.current.set(option.value);
    }
    this.onChange(emitted);
    this.valueChange.emit(emitted);
    this.close(true);
  }

  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (this.isOpen() && (!next || !this.elementRef.nativeElement.contains(next))) {
      this.close();
    }
  }

  onSearchInput(term: string): void {
    this.searchTerm.set(term);
    this.highlightedIndex.set(this.filteredOptions().length > 0 ? 0 : -1);
  }

  // --- Teclado ---

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.effectivelyDisabled()) {
      return;
    }
    if (!this.isOpen()) {
      // Enter y Espacio abren por el clic nativo del botón (también lo usan los
      // lectores de pantalla); aquí solo las flechas y la búsqueda por letra.
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.open();
      } else if (this.isTypeaheadKey(event)) {
        this.runTypeahead(event.key, false);
      }
      return;
    }
    this.onListKeydown(event);
  }

  // Con la lista abierta, Espacio elige en keydown; sin esto el keyup activaría
  // el clic nativo del botón y la volvería a abrir.
  onTriggerKeyup(event: KeyboardEvent): void {
    if (event.key === ' ' && this.spaceHandled) {
      event.preventDefault();
      this.spaceHandled = false;
    }
  }

  onListKeydown(event: KeyboardEvent): void {
    const options = this.filteredOptions();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveHighlight(1, options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveHighlight(-1, options.length);
        break;
      case 'Home':
        if (!this.showSearch()) {
          event.preventDefault();
          this.setHighlight(0, options.length);
        }
        break;
      case 'End':
        if (!this.showSearch()) {
          event.preventDefault();
          this.setHighlight(options.length - 1, options.length);
        }
        break;
      case 'Enter':
      case ' ': {
        if (event.key === ' ' && this.showSearch()) {
          break;
        }
        event.preventDefault();
        this.spaceHandled = event.key === ' ';
        const option = options[this.highlightedIndex()];
        if (option) {
          this.choose(option);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        break;
      case 'Tab':
        this.close();
        break;
      default:
        if (!this.showSearch() && this.isTypeaheadKey(event)) {
          this.runTypeahead(event.key, true);
        }
        break;
    }
  }

  private moveHighlight(delta: number, length: number): void {
    if (length === 0) {
      return;
    }
    const current = this.highlightedIndex();
    this.setHighlight(current < 0 ? 0 : current + delta, length);
  }

  private setHighlight(index: number, length: number): void {
    if (length === 0) {
      return;
    }
    this.highlightedIndex.set(Math.min(Math.max(index, 0), length - 1));
    this.scrollHighlightedIntoView();
  }

  private scrollHighlightedIntoView(): void {
    const index = this.highlightedIndex();
    if (index < 0) {
      return;
    }
    afterNextRender(
      () => {
        const element = this.elementRef.nativeElement.querySelector<HTMLElement>(`#${this.optionId(index)}`);
        element?.scrollIntoView?.({ block: 'nearest' });
      },
      { injector: this.injector },
    );
  }

  private isTypeaheadKey(event: KeyboardEvent): boolean {
    return event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  private runTypeahead(key: string, isOpen: boolean): void {
    this.typeahead += key;
    if (this.typeaheadTimer) {
      clearTimeout(this.typeaheadTimer);
    }
    this.typeaheadTimer = setTimeout(() => (this.typeahead = ''), TYPEAHEAD_RESET_MS);

    const term = normalizeSearchText(this.typeahead);
    const options = this.options();
    const index = options.findIndex((option) => normalizeSearchText(option.label).startsWith(term));
    if (index < 0) {
      return;
    }
    if (isOpen) {
      this.setHighlight(index, options.length);
    } else {
      this.choose(options[index]);
    }
  }
}
