import { Component, HostListener, inject } from '@angular/core';
import { GlobalSearchStateService } from '../services/global-search-state.service';

/**
 * F18 — botón "Buscar…" del header (main-layout). El modal en sí vive en
 * `GlobalSearchOverlayComponent`, renderizado fuera del header — ver el
 * comentario en `GlobalSearchStateService` sobre por qué.
 */
@Component({
  selector: 'app-global-search-trigger',
  standalone: true,
  template: `
    <button
      type="button"
      class="flex items-center gap-2 rounded-md border border-default px-3 py-2 text-sm text-muted transition hover:bg-surface-muted"
      (click)="searchState.open()"
      aria-label="Buscar"
    >
      <svg
        class="h-4 w-4"
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
      <span class="hidden sm:inline">Buscar…</span>
      <kbd
        class="hidden rounded border border-default bg-surface-muted px-1.5 py-0.5 text-xs text-subtle sm:inline"
        >Ctrl K</kbd
      >
    </button>
  `,
})
export class GlobalSearchTriggerComponent {
  protected readonly searchState = inject(GlobalSearchStateService);

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchState.toggle();
    }
  }
}
