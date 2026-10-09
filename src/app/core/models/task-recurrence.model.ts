/**
 * F42 (TAR-03): tareas recurrentes. Una serie guarda la plantilla y la regla
 * de repetición; sus ocurrencias son tareas normales (`TaskResponse` con
 * `recurrenceId`).
 */

import { TaskAssignee, TaskPriority } from './task.model';

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum TaskRecurrenceStatus {
  ACTIVE = 'ACTIVE',
  STOPPED = 'STOPPED',
  COMPLETED = 'COMPLETED',
}

/** Cómo termina la serie en el formulario: sin fin, en una fecha o tras N ocurrencias. */
export type RecurrenceEndMode = 'NEVER' | 'DATE' | 'COUNT';

export interface TaskRecurrenceResponse {
  id: string;
  title: string;
  description: string | null;
  processId: string | null;
  process: { id: string; title: string; internalCode: string } | null;
  clientId: string | null;
  client: { id: string; name: string } | null;
  assigneeUserId: string | null;
  assignee: TaskAssignee | null;
  priority: TaskPriority;
  frequency: RecurrenceFrequency;
  /** YYYY-MM-DD, hora de Colombia. */
  startDate: string;
  /** HH:mm local de vencimiento de cada ocurrencia. */
  dueTime: string;
  endDate: string | null;
  maxOccurrences: number | null;
  generatedCount: number;
  status: TaskRecurrenceStatus;
  /** Fecha de la próxima ocurrencia por generar; null si la serie ya no genera más. */
  nextOccurrenceDate: string | null;
  lastTaskId: string | null;
  stoppedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRecurrenceRequest {
  title: string;
  description?: string;
  processId?: string;
  clientId?: string;
  assigneeUserId?: string;
  priority?: TaskPriority;
  frequency: RecurrenceFrequency;
  startDate: string;
  dueTime?: string;
  endDate?: string;
  maxOccurrences?: number;
}

/** `null` en responsable/fin los quita. Proceso, cliente e inicio no se editan. */
export interface UpdateTaskRecurrenceRequest {
  title?: string;
  description?: string | null;
  assigneeUserId?: string | null;
  priority?: TaskPriority;
  frequency?: RecurrenceFrequency;
  dueTime?: string;
  endDate?: string | null;
  maxOccurrences?: number | null;
}

export interface QueryTaskRecurrencesFilters {
  status?: TaskRecurrenceStatus;
  processId?: string;
  clientId?: string;
}
