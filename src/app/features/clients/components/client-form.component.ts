import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EntityFilesComponent } from '../../../core/components/entity-files.component';
import { ClientPortalInvitationsComponent } from '../../../core/components/client-portal-invitations.component';
import { CatalogItem } from '../../../core/models/catalog-backend.model';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule, EntityFilesComponent, ClientPortalInvitationsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div
          class="w-full max-w-xl md:max-w-4xl lg:max-w-5xl overflow-y-auto rounded-lg border border-default bg-surface shadow-2xl"
          style="max-height: 90vh"
        >
          <div class="grid gap-6 {{ isEditing() ? 'md:grid-cols-[1fr_320px]' : 'md:grid-cols-1' }}">
            <form
              class="p-4 md:p-6"
              [formGroup]="form()"
              (ngSubmit)="submit.emit()"
            >
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-text">
                  {{ isEditing() ? 'Editar cliente' : 'Nuevo cliente' }}
                </h3>
                <button
                  type="button"
                  (click)="cancel.emit()"
                  class="rounded-lg p-1 text-subtle hover:bg-surface-muted hover:text-muted"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="grid gap-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="text-sm text-muted">
                    Nombre completo *
                    <input
                      formControlName="fullName"
                      type="text"
                      placeholder="Ej: María González Rodríguez"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                    @if (form().get('fullName')?.touched && form().get('fullName')?.invalid) {
                      <p class="mt-1 text-xs text-danger">Campo requerido</p>
                    }
                  </label>
                  <label class="text-sm text-muted">
                    Empresa
                    <input
                      formControlName="companyName"
                      type="text"
                      placeholder="Ej: Corporación Legal S.A.S."
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                  </label>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="text-sm text-muted">
                    Email *
                    <input
                      formControlName="email"
                      type="email"
                      autocomplete="off"
                      placeholder="contacto@empresa.com.co"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                    @if (form().get('email')?.touched && form().get('email')?.invalid) {
                      <p class="mt-1 text-xs text-danger">Email inválido</p>
                    }
                  </label>
                  <label class="text-sm text-muted">
                    Teléfono
                    <input
                      formControlName="phone"
                      type="tel"
                      placeholder="+57 300 123 4567"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                  </label>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="text-sm text-muted">
                    Tipo de documento *
                    <select
                      formControlName="documentTypeId"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    >
                      @for (documentType of documentTypes(); track documentType.id) {
                        <option [value]="documentType.id">{{ documentType.label }}</option>
                      }
                    </select>
                  </label>
                  <label class="text-sm text-muted">
                    Número de identificación *
                    <input
                      formControlName="identificationNumber"
                      type="text"
                      placeholder="Cédula, NIT, Pasaporte"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    />
                    @if (form().get('identificationNumber')?.touched && form().get('identificationNumber')?.invalid) {
                      <p class="mt-1 text-xs text-danger">Campo requerido</p>
                    }
                    @if (form().errors?.['invalidNit']) {
                      <p class="mt-1 text-xs text-danger">{{ form().errors?.['invalidNit'] }}</p>
                    }
                    @if (form().errors?.['invalidCedula']) {
                      <p class="mt-1 text-xs text-danger">{{ form().errors?.['invalidCedula'] }}</p>
                    }
                    @if (form().errors?.['invalidIdentification']) {
                      <p class="mt-1 text-xs text-danger">{{ form().errors?.['invalidIdentification'] }}</p>
                    }
                  </label>
                  <label class="text-sm text-muted">
                    Nivel de riesgo
                    <select
                      formControlName="riskLevelId"
                      class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                    >
                      @for (riskLevel of riskLevels(); track riskLevel.id) {
                        <option [value]="riskLevel.id">{{ riskLevel.label }}</option>
                      }
                    </select>
                  </label>
                </div>

                <label class="text-sm text-muted">
                  Dirección
                  <textarea
                    formControlName="address"
                    rows="3"
                    placeholder="Ej: Calle 100 # 19-30, Bogotá D.C."
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  ></textarea>
                </label>
              </div>

              @if (errorMessage()) {
                <div class="mt-4 rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
                  {{ errorMessage() }}
                </div>
              }

              <div class="mt-6 flex gap-3">
                <button
                  type="button"
                  (click)="cancel.emit()"
                  class="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="flex-1 rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong"
                  [disabled]="isSubmitting() || form().invalid"
                >
                  {{ isEditing() ? 'Actualizar' : 'Crear cliente' }}
                </button>
              </div>
            </form>

            @if (isEditing() && editingClientId()) {
              <div class="border-l border-default bg-surface-muted p-4 md:p-6 overflow-y-auto" style="max-height: 90vh">
                <h4 class="mb-4 text-sm font-semibold text-text">Archivos del cliente</h4>
                <app-entity-files
                  entityType="client"
                  [entityId]="editingClientId()!"
                />

                <h4 class="mt-6 mb-4 text-sm font-semibold text-text">Portal del cliente</h4>
                <app-client-portal-invitations [clientId]="editingClientId()!" />
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ClientFormComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  isEditing = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  editingClientId = input<string | null>(null);
  documentTypes = input<CatalogItem[]>([]);
  riskLevels = input<CatalogItem[]>([]);

  cancel = output<void>();
  submit = output<void>();
}
