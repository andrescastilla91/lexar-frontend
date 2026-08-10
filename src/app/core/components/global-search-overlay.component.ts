import {
  Component,
  inject,
  signal,
  ElementRef,
  viewChild,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { SearchService } from '../services/search.service';
import { GlobalSearchStateService } from '../services/global-search-state.service';
import {
  SearchResultItem,
  SearchResultType,
  SEARCH_TYPE_LABELS,
} from '../models/search.model';

interface SearchGroup {
  type: SearchResultType;
  label: string;
  items: SearchResultItem[];
}

const TYPE_ORDER: SearchResultType[] = [
  'legal_process',
  'client',
  'advisor',
  'deadline',
  'task',
  'file',
];

const TYPE_ICON: Record<SearchResultType, string> = {
  legal_process: 'm4.5 19.5 7.5-7.5 7.5 7.5M12 12V3.75',
  client: 'M3 7.5l9 4.5 9-4.5M3 15l9 4.5 9-4.5',
  advisor: 'M16.5 7.5 21 12l-4.5 4.5M8.25 7.5 3 12l5.25 4.5',
  deadline:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  task: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  file: 'M9 17.25v1.125a2.625 2.625 0 0 0 2.625 2.625h6.75A2.625 2.625 0 0 0 21 18.375V9.017a2.625 2.625 0 0 0-.769-1.856l-4.266-4.266A2.625 2.625 0 0 0 14.109 2.25H8.625A2.625 2.625 0 0 0 6 4.875v1.875',
};

/**
 * F18 — modal de búsqueda global. Se renderiza como hermano raíz en
 * main-layout (fuera del `<header>`, junto a `app-confirm-dialog` /
 * `app-toast`) para que `fixed inset-0` cubra el viewport completo — ver
 * `GlobalSearchStateService` para el porqué. El botón que lo abre vive en
 * `GlobalSearchTriggerComponent`, dentro del header.
 */
@Component({
  selector: 'app-global-search-overlay',
  standalone: true,
  template: `
    @if (searchState.isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm px-4 pt-24"
        (click)="close()"
      >
        <div
          class="w-full max-w-xl rounded-lg border border-default bg-surface shadow-raised"
          (click)="$event.stopPropagation()"
        >
          <div
            class="flex items-center gap-3 border-b border-default px-4 py-3"
          >
            <svg
              class="h-5 w-5 text-subtle"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              #searchInput
              type="text"
              [value]="query()"
              (input)="onInput($event)"
              (keydown)="onKeydown($event)"
              placeholder="Buscar procesos, clientes, asesores, plazos, tareas, documentos…"
              class="w-full border-0 bg-transparent text-sm text-text placeholder:text-subtle focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              class="text-xs text-subtle hover:text-muted"
              (click)="close()"
            >
              Esc
            </button>
          </div>

          <div class="max-h-96 overflow-y-auto p-2">
            @if (query().trim().length < 2) {
              <p class="px-3 py-6 text-center text-sm text-subtle">
                Escribe al menos 2 caracteres para buscar.
              </p>
            } @else if (loading()) {
              <p class="px-3 py-6 text-center text-sm text-subtle">Buscando…</p>
            } @else if (flatResults().length === 0) {
              <p class="px-3 py-6 text-center text-sm text-subtle">
                Sin resultados para "{{ query() }}".
              </p>
            } @else {
              @for (group of groups(); track group.type) {
                <div class="mb-2">
                  <p
                    class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-subtle"
                  >
                    {{ group.label }}
                  </p>
                  @for (item of group.items; track item.id) {
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition"
                      [class.bg-surface-muted]="isActive(item)"
                      (mouseenter)="
                        activeIndex.set(flatResults().indexOf(item))
                      "
                      (click)="select(item)"
                    >
                      <svg
                        class="h-4 w-4 shrink-0 text-subtle"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          [attr.d]="icon(item.type)"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium text-text">{{
                          item.title
                        }}</span>
                        <span class="block truncate text-xs text-subtle">{{
                          item.subtitle
                        }}</span>
                      </span>
                    </button>
                  }
                </div>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class GlobalSearchOverlayComponent {
  private readonly searchService = inject(SearchService);
  private readonly router = inject(Router);
  private readonly searchInput =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly searchState = inject(GlobalSearchStateService);

  readonly query = signal('');
  readonly loading = signal(false);
  readonly results = signal<SearchResultItem[]>([]);
  readonly activeIndex = signal(0);

  private debounceHandle: ReturnType<typeof setTimeout> | undefined;

  readonly groups = signal<SearchGroup[]>([]);
  readonly flatResults = signal<SearchResultItem[]>([]);

  constructor() {
    effect(() => {
      if (this.searchState.isOpen()) {
        queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      }
    });
  }

  close(): void {
    this.searchState.close();
    this.query.set('');
    this.results.set([]);
    this.groups.set([]);
    this.flatResults.set([]);
    this.activeIndex.set(0);
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.activeIndex.set(0);

    if (this.debounceHandle) {
      clearTimeout(this.debounceHandle);
    }

    if (value.trim().length < 2) {
      this.results.set([]);
      this.groups.set([]);
      this.flatResults.set([]);
      return;
    }

    this.debounceHandle = setTimeout(() => this.runSearch(value.trim()), 250);
  }

  private runSearch(q: string): void {
    this.loading.set(true);
    this.searchService.search(q).subscribe({
      next: (results) => {
        this.loading.set(false);
        this.results.set(results);
        this.groups.set(this.groupResults(results));
        this.flatResults.set(results);
      },
      error: () => {
        this.loading.set(false);
        this.results.set([]);
        this.groups.set([]);
        this.flatResults.set([]);
      },
    });
  }

  private groupResults(results: SearchResultItem[]): SearchGroup[] {
    return TYPE_ORDER.map((type) => ({
      type,
      label: SEARCH_TYPE_LABELS[type],
      items: results.filter((r) => r.type === type),
    })).filter((group) => group.items.length > 0);
  }

  icon(type: SearchResultType): string {
    return TYPE_ICON[type];
  }

  isActive(item: SearchResultItem): boolean {
    return (
      this.flatResults()[this.activeIndex()]?.id === item.id &&
      this.flatResults()[this.activeIndex()]?.type === item.type
    );
  }

  onKeydown(event: KeyboardEvent): void {
    const total = this.flatResults().length;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (total > 0) {
        this.activeIndex.set((this.activeIndex() + 1) % total);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (total > 0) {
        this.activeIndex.set((this.activeIndex() - 1 + total) % total);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.flatResults()[this.activeIndex()];
      if (item) {
        this.select(item);
      }
    }
  }

  select(item: SearchResultItem): void {
    this.close();
    this.router.navigateByUrl(item.linkPath);
  }
}
