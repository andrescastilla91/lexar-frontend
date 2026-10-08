import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FISCAL_RESPONSIBILITY_OPTIONS } from '../../../core/models/company.model';
import { INVALID_EMAIL_MESSAGE } from '../../../core/validators/email.validator';
import { SelectComponent, SelectItem } from '../../../shared/components/select/select.component';
import { computeNitCheckDigit, splitNit } from '../../../core/utils/nit.util';

const INPUT_CLASSES =
  'mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30';
const INVALID_INPUT_CLASSES = INPUT_CLASSES.replace('border-default', 'border-danger');

const PERSON_TYPE_ITEMS: SelectItem[] = [
  { value: 'LEGAL_ENTITY', label: 'Persona jurídica' },
  { value: 'NATURAL_PERSON', label: 'Persona natural' },
];

@Component({
  selector: 'app-settings-billing-form',
  standalone: true,
  imports: [ReactiveFormsModule, SelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Facturación</h2>
      <p class="mt-1 text-sm text-subtle">
        Datos con los que te emitimos la factura electrónica de la suscripción. Los datos de la empresa (razón social,
        NIT, dirección, departamento, ciudad, teléfono y régimen) se editan en «Datos legales».
      </p>

      <form class="mt-6 space-y-4" [formGroup]="form()" (ngSubmit)="submit.emit()">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block text-sm text-muted">
            Correo de facturación
            <input
              formControlName="billingEmail"
              type="email"
              data-test="billing-email"
              [attr.aria-invalid]="billingEmailInvalid() ? 'true' : null"
              [class]="billingEmailInvalid() ? invalidInputClasses : inputClasses"
            />
            @if (billingEmailInvalid()) {
              <span class="mt-1 block text-xs text-danger" data-test="billing-email-error">{{ invalidEmailMessage }}</span>
            }
          </label>
          <label class="block text-sm text-muted">
            Contacto de facturación (opcional)
            <input formControlName="billingContactName" type="text" [class]="inputClasses" />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block text-sm text-muted">
            Tipo de persona
            <app-select
              class="mt-2"
              formControlName="personType"
              [items]="personTypeItems"
              placeholder="Selecciona…"
              data-test="person-type"
            />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-[1fr_9rem] sm:items-start">
          <div class="text-sm text-muted">
            NIT
            <p class="mt-2 rounded-md border border-default bg-surface-muted px-4 py-2.5 text-sm text-text">
              {{ taxId() || 'Sin NIT registrado' }}
            </p>
          </div>
          <label class="block text-sm text-muted">
            Dígito de verificación
            <input
              formControlName="taxIdCheckDigit"
              type="text"
              inputmode="numeric"
              maxlength="1"
              data-test="check-digit"
              [class]="inputClasses"
            />
          </label>
        </div>
        <p class="-mt-2 text-xs" [class]="digitMismatch() ? 'text-danger' : 'text-subtle'" data-test="check-digit-hint">
          {{ digitHint() }}
        </p>

        <label class="block text-sm text-muted">
          Dirección fiscal (solo si es distinta a la dirección de la empresa)
          <input formControlName="fiscalAddress" type="text" [class]="inputClasses" />
        </label>

        <fieldset>
          <legend class="text-sm text-muted">Responsabilidades fiscales (opcional)</legend>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            @for (option of responsibilityOptions; track option.code) {
              <label class="flex min-h-11 items-start gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-default"
                  [checked]="isResponsibilitySelected(option.code)"
                  (change)="toggleResponsibility(option.code, $any($event.target).checked)"
                />
                <span>
                  <span class="font-medium">{{ option.code }}</span> · {{ option.label }}
                </span>
              </label>
            }
          </div>
        </fieldset>

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
export class SettingsBillingFormComponent {
  form = input.required<FormGroup>();
  taxId = input('');
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);

  submit = output<void>();

  protected readonly inputClasses = INPUT_CLASSES;
  protected readonly invalidInputClasses = INVALID_INPUT_CLASSES;
  protected readonly invalidEmailMessage = INVALID_EMAIL_MESSAGE;
  protected readonly personTypeItems = PERSON_TYPE_ITEMS;
  protected readonly responsibilityOptions = FISCAL_RESPONSIBILITY_OPTIONS;

  /**
   * El formulario vive fuera del componente y este es OnPush: cada evento del
   * FormGroup (valor, estado, touched) sube esta versión para que los métodos
   * del template que leen el formulario se vuelvan a evaluar.
   */
  private readonly formVersion = signal(0);

  private readonly nit = computed(() => splitNit(this.taxId()));
  private readonly expectedDigit = computed(() => computeNitCheckDigit(this.nit().number));

  constructor() {
    effect((onCleanup) => {
      const subscription = this.form().events.subscribe(() => this.formVersion.update((v) => v + 1));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected formInvalid(): boolean {
    this.formVersion();
    return this.form().invalid;
  }

  protected billingEmailInvalid(): boolean {
    this.formVersion();
    const control = this.form().get('billingEmail');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected typedDigit(): string {
    this.formVersion();
    return String(this.form().get('taxIdCheckDigit')?.value ?? '');
  }

  protected digitMismatch(): boolean {
    const typed = this.typedDigit();
    const expected = this.expectedDigit();
    return typed !== '' && expected !== null && typed !== expected;
  }

  protected digitHint(): string {
    const { number, suffixDigit } = this.nit();
    const expected = this.expectedDigit();
    if (this.digitMismatch()) {
      return `El dígito no corresponde al NIT ${number}: debería ser ${expected}.`;
    }
    if (suffixDigit && !this.typedDigit()) {
      return `Tu NIT ya incluye el dígito (-${suffixDigit}); puedes dejar este campo vacío.`;
    }
    if (expected !== null && number) {
      return `Para el NIT ${number} el dígito de verificación es ${expected}.`;
    }
    return 'Es el número después del guion en tu NIT (p. ej. 900123456-7).';
  }

  protected isResponsibilitySelected(code: string): boolean {
    this.formVersion();
    const value = this.form().get('fiscalResponsibilities')?.value as string[] | null;
    return Array.isArray(value) && value.includes(code);
  }

  protected toggleResponsibility(code: string, checked: boolean): void {
    const control = this.form().get('fiscalResponsibilities');
    const current = (control?.value as string[] | null) ?? [];
    const next = checked ? [...new Set([...current, code])] : current.filter((item) => item !== code);
    control?.setValue(next);
    control?.markAsDirty();
  }
}
