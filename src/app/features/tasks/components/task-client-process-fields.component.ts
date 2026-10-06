import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LegalProcessResponse } from '../../../core/models/legal-process.model';
import { ClientResponse } from '../../../core/models/client-backend.model';
import { TaskProcessSummaryComponent } from './task-process-summary.component';

interface ClientOption {
  id: string;
  label: string;
}

const SELECT_CLASSES =
  'mt-2 w-full rounded-md border border-default px-4 py-2.5 text-sm text-text shadow-card focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/30 disabled:cursor-not-allowed disabled:bg-surface-muted';

/**
 * F42 (TAR-01): campos Proceso + Cliente de una tarea.
 * Con proceso, el cliente se toma del proceso y queda bloqueado (no puede
 * contradecirlo) y se muestra su resumen; sin proceso, el cliente es libre.
 * Opera sobre un FormGroup con los controles `processId` y `clientId`.
 */
@Component({
  selector: 'app-task-client-process-fields',
  standalone: true,
  imports: [ReactiveFormsModule, TaskProcessSummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [formGroup]="form()" class="grid gap-4">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="text-sm text-muted">
          Proceso
          <select formControlName="processId" [class]="selectClasses">
            <option value="">Ninguno (tarea general)</option>
            @for (process of processes(); track process.id) {
              <option [value]="process.id">{{ process.title }}</option>
            }
          </select>
        </label>
        <label class="text-sm text-muted">
          Cliente
          <select formControlName="clientId" [class]="selectClasses">
            <option value="">Sin cliente</option>
            @for (client of clientOptions(); track client.id) {
              <option [value]="client.id">{{ client.label }}</option>
            }
          </select>
          @if (locked()) {
            <span class="mt-1 block text-xs text-subtle">Lo define el proceso seleccionado.</span>
          }
        </label>
      </div>

      @if (selectedProcess(); as process) {
        <app-task-process-summary
          [clientName]="process.client.fullName"
          [caseNumber]="process.caseNumber"
          [stage]="process.stage?.label ?? null"
          [internalCode]="process.internalCode"
        />
      }
    </div>
  `,
})
export class TaskClientProcessFieldsComponent {
  form = input.required<FormGroup>();
  processes = input<LegalProcessResponse[]>([]);
  clients = input<ClientResponse[]>([]);

  protected readonly selectClasses = SELECT_CLASSES;

  private readonly processId = signal('');
  private wasLocked = false;

  readonly selectedProcess = computed(
    () => this.processes().find((process) => process.id === this.processId()) ?? null,
  );
  readonly locked = computed(() => this.selectedProcess() !== null);

  readonly clientOptions = computed<ClientOption[]>(() => {
    const options = this.clients().map((client) => ({ id: client.id, label: client.fullName }));
    const process = this.selectedProcess();
    if (process && !options.some((option) => option.id === process.clientId)) {
      options.push({ id: process.clientId, label: process.client.fullName });
    }
    return options;
  });

  constructor() {
    effect((onCleanup) => {
      const control = this.form().get('processId') as AbstractControl;
      this.processId.set(control.value ?? '');
      const subscription = control.valueChanges.subscribe((value: string | null) =>
        this.processId.set(value ?? ''),
      );
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const client = this.form().get('clientId') as AbstractControl;
      const process = this.selectedProcess();
      if (process) {
        client.setValue(process.clientId, { emitEvent: false });
        client.disable({ emitEvent: false });
        this.wasLocked = true;
      } else {
        if (this.wasLocked) {
          client.setValue('', { emitEvent: false });
        }
        client.enable({ emitEvent: false });
        this.wasLocked = false;
      }
    });
  }
}
