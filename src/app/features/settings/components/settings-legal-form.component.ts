import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TAX_REGIME_OPTIONS } from '../../../core/models/company.model';
import { departmentNames, municipalitiesOf } from '../../../core/utils/colombia-location.util';
import { INVALID_EMAIL_MESSAGE } from '../../../core/validators/email.validator';
import { SelectComponent, SelectItem } from '../../../shared/components/select/select.component';

const INPUT_CLASSES =
  'mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30';

const INVALID_INPUT_CLASSES = INPUT_CLASSES.replace('border-default', 'border-danger');

const toItems = (names: readonly string[]): SelectItem[] => names.map((name) => ({ value: name, label: name }));

@Component({
  selector: 'app-settings-legal-form',
  standalone: true,
  imports: [ReactiveFormsModule, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Datos legales</h2>
      <p class="mt-1 text-sm text-subtle">Información legal y de contacto de tu empresa.</p>

      <form class="mt-6 space-y-4" [formGroup]="form()" (ngSubmit)="submit.emit()">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            Razón social
            <input formControlName="legalName" type="text" [class]="inputClasses" />
          </label>
          <label class="text-sm text-muted">
            NIT / RUT
            <input
              [value]="taxId()"
              type="text"
              disabled
              class="mt-2 w-full cursor-not-allowed rounded-md border border-default bg-surface-muted px-4 py-2.5 text-sm text-subtle shadow-card"
            />
          </label>
        </div>

        <label class="block text-sm text-muted">
          Dirección
          <input formControlName="address" type="text" [class]="inputClasses" />
        </label>

        <label class="block text-sm text-muted">
          Representante legal
          <input formControlName="legalRepresentative" type="text" [class]="inputClasses" />
        </label>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block text-sm text-muted">
            Departamento
            <app-select
              class="mt-2"
              formControlName="department"
              [items]="departmentItems"
              placeholder="Selecciona el departamento"
              searchPlaceholder="Buscar departamento…"
              data-test="department"
              (valueChange)="onDepartmentChange()"
            />
          </label>
          <label class="block text-sm text-muted">
            Ciudad
            <app-select
              class="mt-2"
              formControlName="city"
              [items]="cityItems()"
              [isDisabled]="!department()"
              [placeholder]="department() ? 'Selecciona la ciudad' : 'Primero elige el departamento'"
              searchPlaceholder="Buscar ciudad…"
              data-test="city"
            />
            @if (legacyCityNotice()) {
              <span class="mt-1 block text-xs text-warning" data-test="legacy-city">
                Antes registraste «{{ legacyCityNotice() }}», que no está en el listado oficial. Elige la ciudad correcta.
              </span>
            }
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            País (ISO-2)
            <input
              formControlName="country"
              type="text"
              maxlength="2"
              [class]="inputClasses + ' uppercase'"
            />
          </label>
          <label class="text-sm text-muted">
            Teléfono
            <input formControlName="phone" type="text" [class]="inputClasses" />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="text-sm text-muted">
            Correo de contacto
            <input
              formControlName="email"
              type="email"
              data-test="contact-email"
              [attr.aria-invalid]="emailInvalid() ? 'true' : null"
              [class]="emailInvalid() ? invalidInputClasses : inputClasses"
            />
            @if (emailInvalid()) {
              <span class="mt-1 block text-xs text-danger" data-test="contact-email-error">{{ invalidEmailMessage }}</span>
            }
          </label>
          <label class="text-sm text-muted">
            Matrícula mercantil
            <input formControlName="registrationNumber" type="text" [class]="inputClasses" />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 sm:items-start">
          <label class="block text-sm text-muted">
            Régimen tributario
            <app-select
              class="mt-2"
              formControlName="taxRegime"
              [items]="taxRegimeItems"
              placeholder="Selecciona el régimen"
              data-test="tax-regime"
            />
            @if (legacyTaxRegimeNotice()) {
              <span class="mt-1 block text-xs text-warning" data-test="legacy-tax-regime">
                Antes registraste «{{ legacyTaxRegimeNotice() }}». Elige una opción de la lista.
              </span>
            }
          </label>

          <label class="block text-sm text-muted">
            Prefijo de código de proceso
            <input
              formControlName="processCodePrefix"
              type="text"
              maxlength="3"
              placeholder="Ej. RGJ"
              data-test="process-code-prefix"
              [class]="inputClasses + ' uppercase disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle'"
            />
            <span class="mt-1 block text-xs text-subtle" data-test="process-code-prefix-hint">
              Encabeza el código de cada proceso (ej. RGJ-000001).
              @if (processCodeCounter() > 0) {
                No editable: ya hay procesos con código asignado.
              } @else {
                Si lo dejas vacío, se toma de la razón social.
              }
            </span>
          </label>
        </div>

        @if (errorMessage()) {
          <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          class="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong sm:w-auto"
          [disabled]="isSubmitting() || formInvalid()"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  `,
})
export class SettingsLegalFormComponent {
  form = input.required<FormGroup>();
  taxId = input('');
  /** F40 §PRO-06: >0 deshabilita el prefijo (el control real ya viene deshabilitado desde el formulario del contenedor, ver BUG-14; esto solo controla el texto de ayuda). */
  processCodeCounter = input(0);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);
  /** Ciudad guardada antes de las listas oficiales que no se pudo emparejar (se pide elegirla de nuevo). */
  legacyCityNotice = input('');
  /** Régimen guardado como texto libre que no se pudo interpretar. */
  legacyTaxRegimeNotice = input('');

  submit = output<void>();

  protected readonly inputClasses = INPUT_CLASSES;
  protected readonly invalidInputClasses = INVALID_INPUT_CLASSES;
  protected readonly invalidEmailMessage = INVALID_EMAIL_MESSAGE;
  protected readonly departmentItems = toItems(departmentNames());
  protected readonly taxRegimeItems: SelectItem[] = TAX_REGIME_OPTIONS.map((option) => ({
    value: option.code,
    label: option.label,
    description: option.description,
  }));

  /** Sube con cada evento del FormGroup para que este OnPush relea su estado. */
  private readonly formVersion = signal(0);
  protected readonly department = signal('');
  protected readonly cityItems = computed(() => toItems(municipalitiesOf(this.department())));

  constructor() {
    // El listado de ciudades depende del departamento, que cambia por fuera de
    // este componente (al cargar la empresa) y por dentro (al elegirlo).
    effect((onCleanup) => {
      const control = this.form().get('department');
      this.department.set(String(control?.value ?? ''));
      const subscription = control?.valueChanges.subscribe((value) => this.department.set(String(value ?? '')));
      onCleanup(() => subscription?.unsubscribe());
    });
    effect((onCleanup) => {
      const subscription = this.form().events.subscribe(() => this.formVersion.update((v) => v + 1));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected formInvalid(): boolean {
    this.formVersion();
    return this.form().invalid;
  }

  protected emailInvalid(): boolean {
    this.formVersion();
    const control = this.form().get('email');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  /** Al cambiar de departamento, una ciudad que ya no le pertenece se limpia. */
  protected onDepartmentChange(): void {
    const city = this.form().get('city');
    const stillValid = municipalitiesOf(this.form().get('department')?.value).includes(String(city?.value ?? ''));
    if (city && !stillValid) {
      city.setValue('');
    }
  }
}
