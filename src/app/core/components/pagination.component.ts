import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between rounded-lg border border-default bg-surface px-6 py-4">
      <p class="text-sm text-muted">
        Mostrando {{ currentItems() }} de {{ total() }} {{ itemLabel() }}
      </p>
      <div class="flex items-center gap-4">
        <span class="text-sm text-muted">
          Página {{ currentPage() }} de {{ totalPages() }}
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            (click)="onPreviousPage()"
            [disabled]="currentPage() === 1"
            class="rounded-lg border border-default px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            (click)="onNextPage()"
            [disabled]="currentPage() >= totalPages()"
            class="rounded-lg border border-default px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PaginationComponent {
  /** Número total de items */
  total = input.required<number>();
  
  /** Página actual (1-based) */
  currentPage = input.required<number>();
  
  /** Cantidad de items por página */
  pageSize = input.required<number>();
  
  /** Número de items actualmente mostrados */
  currentItems = input.required<number>();
  
  /** Total de páginas */
  totalPages = input.required<number>();
  
  /** Label para los items (ej: 'usuarios', 'clientes') */
  itemLabel = input<string>('items');
  
  /** Evento cuando se va a la página siguiente */
  nextPage = output<void>();
  
  /** Evento cuando se va a la página anterior */
  previousPage = output<void>();
  
  onNextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.nextPage.emit();
    }
  }
  
  onPreviousPage(): void {
    if (this.currentPage() > 1) {
      this.previousPage.emit();
    }
  }
}
