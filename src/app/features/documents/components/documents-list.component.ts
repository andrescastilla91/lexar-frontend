import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { FileModel } from '../../../core/models/file.model';

export interface DocumentRow extends FileModel {
  iconPath: string;
  entityName: string;
  entityTypeLabel: string;
  formattedDate: string;
}

@Component({
  selector: 'app-documents-list',
  standalone: true,
  imports: [HasPermissionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section *hasPermission="['files.view']" class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-default bg-surface px-4 py-3">
        <div class="flex items-center gap-2 text-sm font-medium text-text">
          <svg class="h-4 w-4 text-subtle" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <span>{{ files().length }} archivo{{ files().length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="flex gap-2">
          <select
            [value]="filterEntityType()"
            (change)="filterChange.emit($any($event.target).value)"
            class="rounded-md border border-default px-3 py-1.5 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos</option>
            <option value="legal_process">Procesos</option>
            <option value="client">Clientes</option>
          </select>

          <button
            (click)="refresh.emit()"
            class="rounded-md border border-default px-3 py-1.5 text-sm font-medium text-text transition hover:bg-surface-muted"
            title="Actualizar"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center rounded-lg border border-default bg-surface p-12">
          <svg class="h-8 w-8 animate-spin text-subtle" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4l3.5-3.5L12 1v4a7 7 0 0 0-7 7h-1z"></path>
          </svg>
        </div>
      } @else if (files().length === 0) {
        <div class="rounded-lg border border-default bg-surface p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p class="mt-4 text-sm font-medium text-text">No hay archivos</p>
          <p class="mt-1 text-sm text-subtle">Sube tu primer archivo para comenzar</p>
        </div>
      } @else {
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          @for (file of files(); track file.id) {
            <div class="flex flex-col rounded-md border border-default bg-surface p-3 shadow-card transition hover:shadow-card">
              <div class="flex h-12 w-12 items-center justify-center self-center rounded-md bg-surface-muted">
                <svg class="h-6 w-6 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path [attr.d]="file.iconPath" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>

              <h3 class="mt-2 truncate text-center text-sm font-semibold text-text" [title]="file.originalFilename">
                {{ file.originalFilename }}
              </h3>

              <span
                class="mx-auto mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-surface-muted px-2 py-0.5 text-xs text-subtle"
                [title]="file.entityName"
              >
                <svg class="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                </svg>
                <span class="truncate">{{ file.entityTypeLabel }} · {{ file.entityName }}</span>
              </span>

              <p class="mt-1 truncate text-center text-xs text-subtle" [title]="file.formattedDate">
                {{ file.formattedSize }} · {{ file.formattedDate }}
              </p>

              <div class="mt-2 flex items-center justify-center gap-1 border-t border-default pt-2">
                @if (file.isPreviewable) {
                  <button
                    (click)="previewFile.emit(file)"
                    class="rounded-lg p-2 text-primary transition hover:bg-primary-tint"
                    title="Vista previa"
                  >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </button>
                }

                <button
                  (click)="downloadFile.emit(file)"
                  class="rounded-lg p-2 text-success transition hover:bg-success-tint"
                  title="Descargar"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>

                <button
                  *hasPermission="['files.delete']"
                  (click)="deleteFile.emit(file)"
                  class="rounded-lg p-2 text-danger transition hover:bg-danger-tint"
                  title="Eliminar"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class DocumentsListComponent {
  files = input.required<DocumentRow[]>();
  isLoading = input(false);
  filterEntityType = input('');

  filterChange = output<string>();
  refresh = output<void>();
  previewFile = output<DocumentRow>();
  downloadFile = output<DocumentRow>();
  deleteFile = output<DocumentRow>();
}
