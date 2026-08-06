import { TaskPriority } from '../models/task.model';
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
