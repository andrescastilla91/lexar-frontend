import { Component, input, output } from '@angular/core';

/**
 * Envoltorio genérico para modales de crear/editar (header + footer + estado de envío).
 * No conoce la forma de la entidad — los campos del formulario se proyectan por <ng-content>.
 *
 * Ejemplo de uso (a migrar en A3.1+, no consumido todavía):
 *
 * <app-form-modal-shell
 *   [title]="editingRole() ? 'Editar rol' : 'Crear rol'"
 *   [isOpen]="showFormModal()"
 *   [isSubmitting]="isSubmitting()"
 *   submitLabel="Guardar rol"
 *   (cancel)="closeFormModal()"
 *   (submit)="saveRole()"
 * >
 *   <form [formGroup]="roleForm">
 *     ...campos del formulario...
 *   </form>
 * </app-form-modal-shell>
 */
@Component({
  selector: 'app-form-modal-shell',
  standalone: true,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div
          class="w-full max-w-lg overflow-y-auto rounded-lg border border-default bg-surface p-4 md:p-6 shadow-2xl"
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

          <div class="mb-6">
            <ng-content></ng-content>
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
              (click)="onSubmit()"
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
export class FormModalShellComponent {
  title = input.required<string>();
  isOpen = input(false);
  isSubmitting = input(false);
  submitLabel = input('Guardar');

  cancel = output<void>();
  submit = output<void>();

  onCancel(): void {
    this.cancel.emit();
  }

  onSubmit(): void {
    this.submit.emit();
  }
}
