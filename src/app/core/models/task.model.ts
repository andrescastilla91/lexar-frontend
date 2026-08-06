/**
 * Backend Task DTOs and Interfaces (F14 — tareas y workflows por proceso)
 */

import { CatalogRef } from './catalog-backend.model';
import { TaskStatusRef } from './task-status.model';
import { TaskAttachment } from './task-activity.model';

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export interface TaskAssignee {
  id: string;
  firstName: string;
  lastName: string;
}

/** Estado de negocio (no administrable, no es un TaskStatusDefinition):
 * si no es null, la tarea sigue en `status` pero hay una transición
 * esperando que alguien habilitado la apruebe o la rechace. */
export interface TaskPendingApproval {
  id: string;
  toStatusLabel: string;
  requestedBy: TaskAssignee | null;
  note: string | null;
  attachments: TaskAttachment[];
  createdAt: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  processId: string | null;
  process: { id: string; title: string } | null;
  clientId: string | null;
  client: { id: string; name: string } | null;
  assigneeUserId: string | null;
  assignee: TaskAssignee | null;
  dueAt: string | null;
  status: TaskStatusRef;
  pendingApproval: TaskPendingApproval | null;
  priority: TaskPriority;
  sortOrder: number;
  createdBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  processId?: string;
  clientId?: string;
  assigneeUserId?: string;
  dueAt?: string;
  priority?: TaskPriority;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  processId?: string;
  clientId?: string;
  assigneeUserId?: string;
  dueAt?: string;
  statusId?: string;
  /** Anotación/evidencia del cambio de estado — obligatoria si el estado
   * destino tiene requiresNote=true (ver TaskStatusRef). */
  note?: string;
  /** Ids de archivos ya subidos (FilesService.uploadFile con
   * entityType='task') a adjuntar como evidencia de la anotación. */
  attachmentFileIds?: string[];
  priority?: TaskPriority;
  sortOrder?: number;
}

export interface QueryTasksFilters {
  assignee?: string;
  processId?: string;
  statusId?: string;
  from?: string;
  to?: string;
}

export interface TaskTemplateItem {
  id: string;
  title: string;
  offsetDays: number;
  sortOrder: number;
}

export interface TaskTemplateItemInput {
  title: string;
  offsetDays: number;
  sortOrder?: number;
}

export interface TaskTemplateResponse {
  id: string;
  name: string;
  processStage: CatalogRef | null;
  items: TaskTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskTemplateRequest {
  name: string;
  processStageId?: string;
  items: TaskTemplateItemInput[];
}

export interface UpdateTaskTemplateRequest {
  name?: string;
  processStageId?: string;
  items?: TaskTemplateItemInput[];
}
