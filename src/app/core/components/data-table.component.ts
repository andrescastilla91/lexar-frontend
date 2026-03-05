import { Component, input, output, contentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from './pagination.component';

/**
 * Configuración de una columna de la tabla
 */
export interface TableColumn<T> {
  /** Clave única de la columna */
  key: string;
  /** Título de la columna en el header */
  header: string;
  /** Si la columna debe ocultarse en móvil (default: false) */
  hideOnMobile?: boolean;
  /** Alignment del contenido (default: 'left') */
  align?: 'left' | 'center' | 'right';
  /** Función para obtener el valor a mostrar */
  value?: (item: T) => string | number | null;
  /** Ancho fijo de la columna (CSS) */
  width?: string;
}

/**
 * Configuración de una acción de la tabla
 */
export interface TableAction<T> {
  /** Icono SVG path */
  icon: string;
  /** Tooltip/title del botón */
  title: string;
  /** Handler al hacer clic */
  handler: (item: T) => void;
  /** Clase CSS para el botón */
  class?: string;
  /** Permisos necesarios (opcional) */
  permission?: string | string[];
  /** Si la acción debe mostrarse condicionalmente */
  show?: (item: T) => boolean;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  template: `
    @if (isLoading()) {
      <div class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#192033]"></div>
      </div>
    } @else if (data().length === 0) {
      <div class="rounded-3xl border border-slate-200 bg-white p-12 text-center">
        <p class="text-slate-500">{{ emptyMessage() }}</p>
      </div>
    } @else {
      <!-- Vista Desktop: Tabla -->
      <div class="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:block">
        <table class="w-full">
          <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              @for (column of columns(); track column.key) {
                <th 
                  class="px-6 py-4"
                  [class.text-center]="column.align === 'center'"
                  [class.text-right]="column.align === 'right'"
                  [style.width]="column.width"
                >
                  {{ column.header }}
                </th>
              }
              @if (hasActions()) {
                <th class="px-6 py-4 text-right">Acciones</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            @for (item of data(); track trackBy()(item)) {
              <tr class="transition hover:bg-slate-50">
                @for (column of columns(); track column.key) {
                  <td 
                    class="px-6 py-4"
                    [class.text-center]="column.align === 'center'"
                    [class.text-right]="column.align === 'right'"
                  >
                    <!-- Template personalizado o valor por defecto -->
                    <ng-container *ngTemplateOutlet="
                      getCellTemplate(column.key);
                      context: { $implicit: item, column: column }
                    ">
                    </ng-container>
                    
                    @if (!getCellTemplate(column.key)) {
                      <span class="text-sm text-slate-800">
                        {{ column.value ? column.value(item) : getNestedValue(item, column.key) }}
                      </span>
                    }
                  </td>
                }
                @if (hasActions()) {
                  <td class="px-6 py-4">
                    <div class="flex justify-end gap-2">
                      <ng-container *ngTemplateOutlet="
                        actionsTemplate() || null;
                        context: { $implicit: item }
                      ">
                      </ng-container>
                    </div>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Vista Mobile: Cards -->
      <div class="grid gap-4 md:hidden">
        @for (item of data(); track trackBy()(item)) {
          <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <ng-container *ngTemplateOutlet="
              mobileCardTemplate() || defaultMobileCard;
              context: { $implicit: item }
            ">
            </ng-container>
            
            <!-- Template por defecto para mobile -->
            <ng-template #defaultMobileCard>
              <div class="space-y-3">
                @for (column of columns(); track column.key) {
                  @if (!column.hideOnMobile) {
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-xs font-medium text-slate-500">{{ column.header }}:</span>
                      <ng-container *ngTemplateOutlet="
                        getCellTemplate(column.key);
                        context: { $implicit: item, column: column }
                      ">
                      </ng-container>
                      
                      @if (!getCellTemplate(column.key)) {
                        <span class="text-xs text-slate-800">
                          {{ column.value ? column.value(item) : getNestedValue(item, column.key) }}
                        </span>
                      }
                    </div>
                  }
                }
                
                @if (hasActions()) {
                  <div class="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                    <ng-container *ngTemplateOutlet="
                      mobileActionsTemplate() || actionsTemplate() || null;
                      context: { $implicit: item }
                    ">
                    </ng-container>
                  </div>
                }
              </div>
            </ng-template>
          </div>
        }
      </div>

      <!-- Paginación -->
      @if (enablePagination() && total() > 0) {
        <app-pagination
          [total]="total()"
          [currentPage]="currentPage()"
          [pageSize]="pageSize()"
          [currentItems]="data().length"
          [totalPages]="totalPages()"
          [itemLabel]="itemLabel()"
          (nextPage)="nextPage.emit()"
          (previousPage)="previousPage.emit()"
        />
      }
    }
  `,
})
export class DataTableComponent<T = any> {
  /** Datos a mostrar en la tabla */
  data = input.required<T[]>();
  
  /** Configuración de columnas */
  columns = input.required<TableColumn<T>[]>();
  
  /** Si está cargando */
  isLoading = input<boolean>(false);
  
  /** Mensaje cuando no hay datos */
  emptyMessage = input<string>('No se encontraron resultados');
  
  /** Función para trackear items (performance) */
  trackBy = input<(item: T) => any>((item: any) => item.id || item);
  
  /** Habilitar paginación */
  enablePagination = input<boolean>(true);
  
  /** Total de items (para paginación) */
  total = input<number>(0);
  
  /** Página actual */
  currentPage = input<number>(1);
  
  /** Items por página */
  pageSize = input<number>(10);
  
  /** Total de páginas */
  totalPages = input<number>(1);
  
  /** Label de items para paginación */
  itemLabel = input<string>('items');
  
  /** Template personalizado para acciones en desktop */
  actionsTemplate = contentChild<TemplateRef<any>>('actions');
  
  /** Template personalizado para acciones en mobile */
  mobileActionsTemplate = contentChild<TemplateRef<any>>('mobileActions');
  
  /** Template personalizado para card mobile completo */
  mobileCardTemplate = contentChild<TemplateRef<any>>('mobileCard');
  
  /** Templates personalizados para celdas específicas */
  private readonly cellTemplates = new Map<string, TemplateRef<any>>();
  
  /** Evento al ir a la siguiente página */
  nextPage = output<void>();
  
  /** Evento al ir a la página anterior */
  previousPage = output<void>();
  
  /**
   * Verifica si hay acciones configuradas
   */
  hasActions(): boolean {
    return !!this.actionsTemplate() || !!this.mobileActionsTemplate();
  }
  
  /**
   * Obtiene el template de una celda específica
   */
  getCellTemplate(key: string): TemplateRef<any> | null {
    return this.cellTemplates.get(key) || null;
  }
  
  /**
   * Registra un template personalizado para una celda
   */
  registerCellTemplate(key: string, template: TemplateRef<any>): void {
    this.cellTemplates.set(key, template);
  }
  
  /**
   * Obtiene un valor anidado de un objeto usando notación de punto
   */
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? 'N/A';
  }
}
