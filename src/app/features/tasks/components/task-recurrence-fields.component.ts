import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RecurrenceFrequency } from '../../../core/models/task-recurrence.model';
import { getRecurrenceFrequencyLabel } from '../../../core/utils/task-format.util';

const INPUT_CLASSES =
  'mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30';

/**
 * F42 (TAR-03): regla de repetición de una tarea — periodicidad y fin. Opera
 * sobre el FormGroup de `createRecurrenceForm`. En el modal de creación lleva
 * el interruptor "Repetir esta tarea"; en la edición de una serie (sin
 * interruptor) la regla siempre está activa.
 */
@Component({
  selector: 'app-task-recurrence-fields',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div [formGroup]="form()" class="grid gap-4">
      @if (showToggle()) {
        <label class="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            formControlName="repeat"
            class="h-4 w-4 rounded border-default text-navy-900 focus:ring-navy-900/30"
          />
          Repetir esta tarea
        </label>
      }

      @if (!showToggle() || form().controls['repeat'].value) {
        <div class="grid gap-4 rounded-md border border-default bg-surface-muted p-4">
          @if (showToggle()) {
            <p class="text-xs text-subtle">
              La primera tarea vence en la fecha y hora elegidas arriba; las
              siguientes se crean una a una, cuando se cierra la anterior o
              llega su día.
            </p>
          }

          <label class="text-sm text-muted">
            Se repite
            <select formControlName="frequency" [class]="inputClasses">
              @for (frequency of frequencies; track frequency) {
                <option [value]="frequency">{{ frequencyLabel(frequency) }}</option>
              }
            </select>
          </label>

          <label class="text-sm text-muted">
            Termina
            <select formControlName="endMode" [class]="inputClasses">
              <option value="NEVER">Nunca (hasta detenerla)</option>
              <option value="DATE">En una fecha</option>
              <option value="COUNT">Después de un número de veces</option>
            </select>
          </label>

          @if (form().controls['endMode'].value === 'DATE') {
            <label class="text-sm text-muted">
              Fecha de fin
              <input type="date" formControlName="endDate" [class]="inputClasses" />
            </label>
          }

          @if (form().controls['endMode'].value === 'COUNT') {
            <label class="text-sm text-muted">
              Número de ocurrencias
              <input
                type="number"
                min="1"
                max="1000"
                formControlName="maxOccurrences"
                [class]="inputClasses"
              />
            </label>
          }

          @if (hint(); as text) {
            <p class="text-xs text-subtle">{{ text }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class TaskRecurrenceFieldsComponent {
  form = input.required<FormGroup>();
  showToggle = input(true);
  hint = input<string | null>(null);

  protected readonly inputClasses = INPUT_CLASSES;
  protected readonly frequencies = Object.values(RecurrenceFrequency);
  protected readonly frequencyLabel = getRecurrenceFrequencyLabel;
}
