import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';

export interface FilePreviewInfo {
  originalFilename: string;
  isImage: boolean;
  isPdf: boolean;
}

@Component({
  selector: 'app-file-preview-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (file()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        (click)="close.emit()"
      >
        <div
          class="relative flex max-h-[90vh] max-w-4xl w-full flex-col overflow-hidden rounded-lg bg-surface"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between border-b border-default px-6 py-4">
            <h3 class="text-lg font-semibold text-text">{{ file()!.originalFilename }}</h3>
            <button (click)="close.emit()" class="rounded-lg p-2 text-subtle hover:bg-surface-muted">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-auto p-6">
            @if (file()!.isImage) {
              <img [src]="url()!" [alt]="file()!.originalFilename" class="mx-auto max-w-full rounded-md" />
            } @else if (file()!.isPdf) {
              <iframe [src]="url()!" class="h-[70vh] w-full rounded-md border"></iframe>
            } @else {
              <div class="flex flex-col items-center justify-center py-12">
                <svg class="h-16 w-16 text-subtle" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p class="mt-4 text-sm text-subtle">Vista previa no disponible para este tipo de archivo</p>
              </div>
            }
          </div>

          <div class="flex justify-end gap-2 border-t border-default p-4">
            <button
              (click)="download.emit()"
              class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Descargar
            </button>
            <button
              (click)="close.emit()"
              class="rounded-md border border-default px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-muted"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FilePreviewModalComponent {
  file = input<FilePreviewInfo | null>(null);
  url = input<SafeResourceUrl | null>(null);

  close = output<void>();
  download = output<void>();
}
