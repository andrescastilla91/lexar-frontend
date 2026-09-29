import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  MultiSelectComponent,
  MultiSelectItem,
} from '../../../shared/components/multi-select/multi-select.component';

/** F41 §CAL-04 (ola 3). ISO 8601: 1=lunes .. 7=domingo. */
export const WORKING_DAY_KEYS = [
  { key: 'mon', iso: 1, label: 'Lunes' },
  { key: 'tue', iso: 2, label: 'Martes' },
  { key: 'wed', iso: 3, label: 'Miércoles' },
  { key: 'thu', iso: 4, label: 'Jueves' },
  { key: 'fri', iso: 5, label: 'Viernes' },
  { key: 'sat', iso: 6, label: 'Sábado' },
  { key: 'sun', iso: 7, label: 'Domingo' },
] as const;

@Component({
  selector: 'app-settings-schedule-form',
  standalone: true,
  imports: [ReactiveFormsModule, MultiSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-lg border border-default bg-surface p-6 shadow-card">
      <h2 class="text-lg font-semibold text-text">Horario</h2>
      <p class="mt-1 text-sm text-subtle">
        Días hábiles y horario laboral de tu empresa. Esta configuración se usará para el cómputo
        de términos del calendario.
      </p>

      <form class="mt-6 space-y-6" [formGroup]="form()" (ngSubmit)="submit.emit()">
        <div>
          <p class="text-sm font-medium text-muted">Días hábiles</p>
          <div class="mt-2 flex flex-wrap gap-3" formGroupName="workingDays">
            @for (day of dayKeys; track day.key) {
              <label
                class="flex items-center gap-2 rounded-md border border-default px-3 py-2 text-sm text-text"
              >
                <input type="checkbox" [formControlName]="day.key" class="h-4 w-4 rounded border-default" />
                {{ day.label }}
              </label>
            }
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-muted">
            Horario laboral (opcional)
          </p>
          <p class="mt-1 text-xs text-subtle">
            Si lo configuras, el calendario muestra un aviso (no bloqueante) al agendar fuera de
            este rango.
          </p>
          <div class="mt-2 grid gap-4 sm:grid-cols-2">
            <label class="text-sm text-muted">
              Hora de inicio
              <input
                formControlName="businessHoursStart"
                type="time"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
            <label class="text-sm text-muted">
              Hora de fin
              <input
                formControlName="businessHoursEnd"
                type="time"
                class="mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30"
              />
            </label>
          </div>
        </div>

        <div>
          <p class="text-sm font-medium text-muted">Excepción: crear en días no hábiles</p>
          <p class="mt-1 text-xs text-subtle">
            Usuarios habilitados para crear plazos/eventos en un día no hábil o festivo. Si no
            eliges a nadie, decide el permiso "Crear en días no hábiles o festivos" para todos.
          </p>
          @if (isLoadingUsers()) {
            <p class="mt-2 text-xs text-subtle">Cargando usuarios…</p>
          } @else {
            <div class="mt-2">
              <app-multi-select
                [items]="userOptions()"
                [selectedIds]="selectedExceptionUserIds()"
                placeholder="Buscar por nombre…"
                emptyStateText="Ningún usuario coincide"
                (selectionChange)="exceptionUserIdsChange.emit($event)"
              />
            </div>
          }
        </div>

        @if (errorMessage()) {
          <div class="rounded-md border border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          class="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-950 disabled:bg-strong sm:w-auto"
          [disabled]="isSubmitting() || form().invalid"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  `,
})
export class SettingsScheduleFormComponent {
  protected readonly dayKeys = WORKING_DAY_KEYS;

  form = input.required<FormGroup>();
  userOptions = input<MultiSelectItem[]>([]);
  selectedExceptionUserIds = input<string[]>([]);
  isLoadingUsers = input(false);
  isSubmitting = input(false);
  errorMessage = input<string | null>(null);

  submit = output<void>();
  exceptionUserIdsChange = output<string[]>();
}
