import { DeadlineStatus } from '../models/deadline.model';

export function getDeadlineStatusLabel(status: DeadlineStatus): string {
  const labels: Record<DeadlineStatus, string> = {
    [DeadlineStatus.PENDING]: 'Pendiente',
    [DeadlineStatus.DONE]: 'Completado',
    [DeadlineStatus.MISSED]: 'Vencido',
  };
  return labels[status] || status;
}

export function getDeadlineStatusClasses(status: DeadlineStatus): string {
  const classes: Record<DeadlineStatus, string> = {
    [DeadlineStatus.PENDING]: 'bg-info-tint text-info',
    [DeadlineStatus.DONE]: 'bg-success-tint text-success',
    [DeadlineStatus.MISSED]: 'bg-danger-tint text-danger',
  };
  return classes[status] || 'bg-surface-muted text-muted';
}

/**
 * Tokens semánticos válidos para `CatalogItem.color` (ver CATALOG_COLOR_TOKENS
 * en el backend), resueltos a variables CSS del Design System — nunca hex
 * literal — para pintar eventos de FullCalendar (que exige un color real,
 * no una clase Tailwind).
 */
const EVENT_COLOR_VARS: Record<string, string> = {
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  info: 'var(--color-info)',
  accent: 'var(--color-accent)',
  primary: 'var(--color-primary)',
};

export function getDeadlineEventColor(color: string | null | undefined): string {
  if (color && EVENT_COLOR_VARS[color]) {
    return EVENT_COLOR_VARS[color];
  }
  return 'var(--color-text-subtle)';
}
