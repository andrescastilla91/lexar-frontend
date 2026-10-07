import { TaskPriority } from '../models/task.model';
import {
  RecurrenceFrequency,
  TaskRecurrenceStatus,
} from '../models/task-recurrence.model';
import { TaskStatusRef } from '../models/task-status.model';
import { getCatalogBadgeClasses } from './catalog-badge.util';

/** El estado ahora es un objeto del catálogo configurable (F14), no un
 * enum fijo: label/color ya vienen resueltos desde el backend. */
export function getTaskStatusLabel(status: TaskStatusRef): string {
  return status.label;
}

export function getTaskStatusClasses(status: TaskStatusRef): string {
  return getCatalogBadgeClasses(status.color);
}

export function getTaskPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: 'Baja',
    [TaskPriority.NORMAL]: 'Normal',
    [TaskPriority.HIGH]: 'Alta',
  };
  return labels[priority] || priority;
}

export function getTaskPriorityClasses(priority: TaskPriority): string {
  const classes: Record<TaskPriority, string> = {
    [TaskPriority.LOW]: 'bg-surface-muted text-muted',
    [TaskPriority.NORMAL]: 'bg-info-tint text-info',
    [TaskPriority.HIGH]: 'bg-danger-tint text-danger',
  };
  return classes[priority] || 'bg-surface-muted text-muted';
}

export function getRecurrenceFrequencyLabel(
  frequency: RecurrenceFrequency,
): string {
  const labels: Record<RecurrenceFrequency, string> = {
    [RecurrenceFrequency.DAILY]: 'Diaria',
    [RecurrenceFrequency.WEEKLY]: 'Semanal',
    [RecurrenceFrequency.MONTHLY]: 'Mensual',
    [RecurrenceFrequency.QUARTERLY]: 'Trimestral',
    [RecurrenceFrequency.YEARLY]: 'Anual',
  };
  return labels[frequency] || frequency;
}

export function getRecurrenceStatusLabel(status: TaskRecurrenceStatus): string {
  const labels: Record<TaskRecurrenceStatus, string> = {
    [TaskRecurrenceStatus.ACTIVE]: 'Activa',
    [TaskRecurrenceStatus.STOPPED]: 'Detenida',
    [TaskRecurrenceStatus.COMPLETED]: 'Finalizada',
  };
  return labels[status] || status;
}

export function getRecurrenceStatusClasses(
  status: TaskRecurrenceStatus,
): string {
  const classes: Record<TaskRecurrenceStatus, string> = {
    [TaskRecurrenceStatus.ACTIVE]: 'bg-success-tint text-success',
    [TaskRecurrenceStatus.STOPPED]: 'bg-warning-tint text-warning',
    [TaskRecurrenceStatus.COMPLETED]: 'bg-surface-muted text-muted',
  };
  return classes[status] || 'bg-surface-muted text-muted';
}
