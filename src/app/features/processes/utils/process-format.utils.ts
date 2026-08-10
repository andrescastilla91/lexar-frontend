import { ProcessStatus } from '../../../core/models/legal-process.model';
import { ProcessEventType } from '../../../core/models/process-event.model';

export function formatDate(date: Date | string): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getStatusLabel(status: ProcessStatus): string {
  const labels: Record<ProcessStatus, string> = {
    [ProcessStatus.DRAFT]: 'Borrador',
    [ProcessStatus.ACTIVE]: 'Activo',
    [ProcessStatus.UNDER_REVIEW]: 'En Revisión',
    [ProcessStatus.SUSPENDED]: 'Suspendido',
    [ProcessStatus.COMPLETED]: 'Completado',
    [ProcessStatus.CANCELLED]: 'Cancelado',
    [ProcessStatus.ARCHIVED]: 'Archivado',
  };
  return labels[status] || status;
}

export function isProcessEditable(status: ProcessStatus): boolean {
  return [ProcessStatus.DRAFT, ProcessStatus.ACTIVE, ProcessStatus.SUSPENDED].includes(status);
}

export function getValidNextStatuses(currentStatus: ProcessStatus): ProcessStatus[] {
  const validTransitions: Record<ProcessStatus, ProcessStatus[]> = {
    [ProcessStatus.DRAFT]: [ProcessStatus.ACTIVE, ProcessStatus.CANCELLED],
    [ProcessStatus.ACTIVE]: [ProcessStatus.UNDER_REVIEW, ProcessStatus.SUSPENDED, ProcessStatus.CANCELLED],
    [ProcessStatus.UNDER_REVIEW]: [ProcessStatus.ACTIVE, ProcessStatus.COMPLETED, ProcessStatus.CANCELLED],
    [ProcessStatus.SUSPENDED]: [ProcessStatus.ACTIVE, ProcessStatus.CANCELLED],
    [ProcessStatus.COMPLETED]: [ProcessStatus.ARCHIVED],
    [ProcessStatus.CANCELLED]: [],
    [ProcessStatus.ARCHIVED]: [],
  };
  return validTransitions[currentStatus] || [];
}

export function getStatusClasses(status: ProcessStatus): string {
  const classes: Record<ProcessStatus, string> = {
    [ProcessStatus.DRAFT]: 'bg-surface-muted text-text',
    [ProcessStatus.ACTIVE]: 'bg-info-tint text-info',
    [ProcessStatus.UNDER_REVIEW]: 'bg-warning-tint text-warning',
    [ProcessStatus.SUSPENDED]: 'bg-orange-100 text-orange-700',
    [ProcessStatus.COMPLETED]: 'bg-success-tint text-success',
    [ProcessStatus.CANCELLED]: 'bg-danger-tint text-danger',
    [ProcessStatus.ARCHIVED]: 'bg-surface-muted text-subtle',
  };
  return classes[status] || 'bg-surface-muted text-text';
}

export function getStatusDot(status: ProcessStatus): string {
  const classes: Record<ProcessStatus, string> = {
    [ProcessStatus.DRAFT]: 'bg-subtle',
    [ProcessStatus.ACTIVE]: 'bg-primary',
    [ProcessStatus.UNDER_REVIEW]: 'bg-warning',
    [ProcessStatus.SUSPENDED]: 'bg-orange-500',
    [ProcessStatus.COMPLETED]: 'bg-success',
    [ProcessStatus.CANCELLED]: 'bg-danger',
    [ProcessStatus.ARCHIVED]: 'bg-strong',
  };
  return classes[status] || 'bg-subtle';
}

export function getEventIcon(type: ProcessEventType): string {
  switch (type) {
    case ProcessEventType.ANNOTATION:
      return 'm16.862 3.487 3.65 3.65a1 1 0 0 1 0 1.415L8.96 20.104a1 1 0 0 1-.708.292H4.5a.75.75 0 0 1-.75-.75v-3.752a1 1 0 0 1 .293-.707L15.447 3.487a1 1 0 0 1 1.415 0Z';
    case ProcessEventType.STATUS_CHANGE:
      return 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99';
    case ProcessEventType.ADVISOR_ASSIGNED:
      return 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z';
    case ProcessEventType.ADVISOR_REMOVED:
      return 'M15 9.75h3m3 0h-3m0 0h-3m3 0v3m0-3v-3m-8.625.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z';
    case ProcessEventType.PROCESS_CREATED:
      return 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z';
    case ProcessEventType.PROCESS_UPDATED:
      return 'm14.362 5.214 2.909 2.909M14.362 5.214 3.75 15.826l-1.5 4.874 4.874-1.5L17.336 8.588m-2.974-3.374L17.336 8.588M17.336 8.588l2.926-2.926a1.875 1.875 0 1 0-2.652-2.652l-2.926 2.926';
    case ProcessEventType.CLIENT_CHANGED:
      return 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5';
    case ProcessEventType.DOCUMENT_UPLOADED:
      return 'm18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13';
    default:
      return 'M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z';
  }
}

export function getEventColor(type: ProcessEventType): string {
  switch (type) {
    case ProcessEventType.ANNOTATION:
      return 'bg-info-tint text-primary';
    case ProcessEventType.STATUS_CHANGE:
      return 'bg-accent-tint text-accent';
    case ProcessEventType.ADVISOR_ASSIGNED:
      return 'bg-success-tint text-success';
    case ProcessEventType.ADVISOR_REMOVED:
      return 'bg-orange-100 text-orange-600';
    case ProcessEventType.PROCESS_CREATED:
      return 'bg-success-tint text-success';
    case ProcessEventType.PROCESS_UPDATED:
      return 'bg-warning-tint text-warning';
    case ProcessEventType.CLIENT_CHANGED:
      return 'bg-accent-tint text-accent';
    case ProcessEventType.DOCUMENT_UPLOADED:
      return 'bg-cyan-100 text-cyan-600';
    default:
      return 'bg-surface-muted text-muted';
  }
}

export function getEventLabel(type: ProcessEventType): string {
  switch (type) {
    case ProcessEventType.ANNOTATION:
      return 'Anotación';
    case ProcessEventType.STATUS_CHANGE:
      return 'Cambio de estado';
    case ProcessEventType.ADVISOR_ASSIGNED:
      return 'Asesor asignado';
    case ProcessEventType.ADVISOR_REMOVED:
      return 'Asesor removido';
    case ProcessEventType.PROCESS_CREATED:
      return 'Proceso creado';
    case ProcessEventType.PROCESS_UPDATED:
      return 'Proceso actualizado';
    case ProcessEventType.CLIENT_CHANGED:
      return 'Cliente cambiado';
    case ProcessEventType.DOCUMENT_UPLOADED:
      return 'Documento cargado';
    default:
      return 'Evento';
  }
}
