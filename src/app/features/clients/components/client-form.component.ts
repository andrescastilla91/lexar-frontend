import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, startWith } from 'rxjs';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MultiSelectComponent, MultiSelectItem } from '../../../shared/components/multi-select/multi-select.component';
import { CatalogItem } from '../../../core/models/catalog-backend.model';
import { ClientPersonType } from '../../../core/models/client-backend.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';

/**
 * F33: modal de alta rápida de cliente. Solo captura lo mínimo para crear el
 * registro (tipo de persona, nombre, documento, criticidad, asesores) — el
 * resto (contactos, riesgo LA/FT, procesos, tareas, documentos) se edita en
 * la ficha con pestañas (`ClientDetailComponent`) una vez creado.
 */
@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule, MultiSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div
          class="w-full max-w-xl overflow-y-auto rounded-lg border border-default bg-surface shadow-2xl"
          style="max-height: 90vh"
        >
          <form class="p-4 md:p-6" [formGroup]="form()" (ngSubmit)="submit.emit()">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-text">Nuevo cliente</h3>
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
              <div class="flex gap-4 text-sm text-muted">
                <label class="flex items-center gap-2">
                  <input type="radio" formControlName="personType" value="NATURAL" />
                  Persona natural
                </label>
                <label class="flex items-center gap-2">
                  <input type="radio" formControlName="personType" value="JURIDICA" />
                  Persona jurídica
                </label>
              </div>

              <label class="text-sm text-muted">
                {{ isJuridica() ? 'Razón social *' : 'Nombre completo *' }}
                <input
                  formControlName="fullName"
                  type="text"
                  [placeholder]="isJuridica() ? 'Ej: Corporación Legal S.A.S.' : 'Ej: María González Rodríguez'"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                />
                @if (form().get('fullName')?.touched && form().get('fullName')?.invalid) {
                  <p class="mt-1 text-xs text-danger">Campo requerido</p>
                }
              </label>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="text-sm text-muted">
                  Tipo de documento *
                  <select
                    formControlName="documentTypeId"
                    class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                  >
                    @for (documentType of documentTypesForPersonType(); track documentType.id) {
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
              </div>

              <label class="text-sm text-muted">
                Nivel de criticidad
                <select
                  formControlName="riskLevelId"
                  class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
                >
                  @for (riskLevel of riskLevels(); track riskLevel.id) {
                    <option [value]="riskLevel.id">{{ riskLevel.label }}</option>
                  }
                </select>
              </label>

              <div>
                <app-multi-select
                  [items]="advisorItems()"
                  [selectedIds]="selectedAdvisorIds()"
                  label="Asesores responsables"
                  placeholder="Buscar asesor…"
                  emptyStateText="No hay asesores disponibles"
                  (selectionChange)="advisorIdsChange.emit($event)"
                />
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

            <p class="mt-4 text-xs text-subtle">
              Contactos, riesgo LA/FT y demás información detallada se agregan luego de crear el cliente, desde su ficha.
            </p>

            <div class="mt-4 flex gap-3">
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
                Crear cliente
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClientFormComponent {
  form = input.required<FormGroup>();
  isOpen = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  documentTypes = input<CatalogItem[]>([]);
  riskLevels = input<CatalogItem[]>([]);
  advisors = input<AdvisorResponse[]>([]);

  cancel = output<void>();
  submit = output<void>();
  advisorIdsChange = output<string[]>();

  /** `computed()` solo reacciona a lecturas de signal — un `FormControl.value`
   * leído directo no dispara recálculo. `form` es un input, así que se
   * puentea con `toObservable` + `switchMap` a `valueChanges` antes de
   * convertir a signal. */
  private readonly personTypeValue = toSignal(
    toObservable(this.form).pipe(
      switchMap((form) =>
        form.get('personType')!.valueChanges.pipe(
          startWith(form.get('personType')!.value),
        ),
      ),
    ),
    { initialValue: ClientPersonType.NATURAL },
  );

  readonly isJuridica = computed(() => this.personTypeValue() === ClientPersonType.JURIDICA);

  /** F33 §1: filtra el tipo de documento según el tipo de persona seleccionado. */
  readonly documentTypesForPersonType = computed(() => {
    const personType = this.personTypeValue();
    return this.documentTypes().filter(
      (item) => !item.personTypeScope || item.personTypeScope === personType,
    );
  });

  readonly advisorItems = computed<MultiSelectItem[]>(() =>
    this.advisors().map((advisor) => ({
      id: advisor.id,
      label: `${advisor.user?.firstName ?? ''} ${advisor.user?.lastName ?? ''}`.trim(),
      description: advisor.specialty?.label || 'N/A',
    })),
  );

  selectedAdvisorIds(): string[] {
    return this.form().get('advisorIds')?.value || [];
  }
}
