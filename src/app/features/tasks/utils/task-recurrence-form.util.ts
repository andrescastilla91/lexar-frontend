import { NonNullableFormBuilder, Validators } from '@angular/forms';
import {
  CreateTaskRecurrenceRequest,
  RecurrenceEndMode,
  RecurrenceFrequency,
  UpdateTaskRecurrenceRequest,
} from '../../../core/models/task-recurrence.model';
import { TaskPriority } from '../../../core/models/task.model';

export const MAX_RECURRENCE_OCCURRENCES = 1000;

export interface RecurrenceFormValue {
  repeat: boolean;
  frequency: RecurrenceFrequency;
  endMode: RecurrenceEndMode;
  endDate: string;
  maxOccurrences: number | null;
}

/** Controles de la regla de repetición; los comparten el modal de creación de
 * tareas y el de edición de una serie. */
export function createRecurrenceForm(fb: NonNullableFormBuilder) {
  return fb.group({
    repeat: [false],
    frequency: [RecurrenceFrequency.MONTHLY],
    endMode: ['NEVER' as RecurrenceEndMode],
    endDate: [''],
    maxOccurrences: [
      12 as number | null,
      [Validators.min(1), Validators.max(MAX_RECURRENCE_OCCURRENCES)],
    ],
  });
}

export type RuleResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

interface EndRule {
  endDate: string | null;
  maxOccurrences: number | null;
}

function resolveEnd(value: RecurrenceFormValue): RuleResult<EndRule> {
  if (value.endMode === 'DATE') {
    if (!value.endDate) {
      return { ok: false, error: 'Indica la fecha en que termina la serie.' };
    }
    return { ok: true, value: { endDate: value.endDate, maxOccurrences: null } };
  }
  if (value.endMode === 'COUNT') {
    const count = Number(value.maxOccurrences);
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_RECURRENCE_OCCURRENCES
    ) {
      return {
        ok: false,
        error: `El número de ocurrencias debe estar entre 1 y ${MAX_RECURRENCE_OCCURRENCES}.`,
      };
    }
    return { ok: true, value: { endDate: null, maxOccurrences: count } };
  }
  return { ok: true, value: { endDate: null, maxOccurrences: null } };
}

export interface TaskRecurrenceBase {
  title: string;
  description?: string;
  processId?: string;
  clientId?: string;
  assigneeUserId?: string;
  priority?: TaskPriority;
}

/**
 * Arma la petición de creación de una serie a partir del formulario de tarea.
 * La fecha/hora de vencimiento (`datetime-local`, hora local) define la
 * primera ocurrencia: fecha de inicio + hora de vencimiento de cada una.
 */
export function buildCreateRecurrenceRequest(
  base: TaskRecurrenceBase,
  dueAtLocal: string,
  recurrence: RecurrenceFormValue,
): RuleResult<CreateTaskRecurrenceRequest> {
  if (!dueAtLocal) {
    return {
      ok: false,
      error:
        'Indica la fecha y hora del primer vencimiento para repetir la tarea.',
    };
  }
  const end = resolveEnd(recurrence);
  if (!end.ok) {
    return end;
  }
  return {
    ok: true,
    value: {
      ...base,
      frequency: recurrence.frequency,
      startDate: dueAtLocal.slice(0, 10),
      dueTime: dueAtLocal.slice(11, 16),
      ...(end.value.endDate ? { endDate: end.value.endDate } : {}),
      ...(end.value.maxOccurrences !== null
        ? { maxOccurrences: end.value.maxOccurrences }
        : {}),
    },
  };
}

/** Cambios de la regla al editar una serie: el modo de fin siempre se envía
 * completo (`null` quita el otro) para que el backend no conserve uno viejo. */
export function buildRuleUpdate(
  recurrence: RecurrenceFormValue,
): RuleResult<
  Pick<
    UpdateTaskRecurrenceRequest,
    'frequency' | 'endDate' | 'maxOccurrences'
  >
> {
  const end = resolveEnd(recurrence);
  if (!end.ok) {
    return end;
  }
  return {
    ok: true,
    value: {
      frequency: recurrence.frequency,
      endDate: end.value.endDate,
      maxOccurrences: end.value.maxOccurrences,
    },
  };
}
