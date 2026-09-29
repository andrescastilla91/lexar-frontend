/**
 * Backend Deadline DTOs and Interfaces (F13 — calendario legal y gestión de plazos)
 */

import { CatalogRef } from './catalog-backend.model';

export enum DeadlineStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  MISSED = 'MISSED',
}

/** F41 §CAL-01: alcance de un evento general (sin proceso). */
export enum DeadlineScope {
  ONLY_ME = 'ONLY_ME',
  SELECTED = 'SELECTED',
  TEAM = 'TEAM',
}

/** F41 §CAL-04 (ola 4): hábil por defecto — ver Deadline.computationType. */
export enum DeadlineComputationType {
  BUSINESS_DAYS = 'BUSINESS_DAYS',
  CALENDAR_DAYS = 'CALENDAR_DAYS',
}

export interface DeadlineAssignee {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DeadlineResponse {
  id: string;
  processId: string | null;
  process: { id: string; title: string } | null;
  title: string;
  type: CatalogRef | null;
  dueAt: string;
  allDay: boolean;
  notes: string | null;
  status: DeadlineStatus;
  assignees: DeadlineAssignee[];
  scope: DeadlineScope | null;
  blocksAgenda: boolean;
  durationMinutes: number | null;
  computationType: DeadlineComputationType;
  needsReview: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeadlineRequest {
  title: string;
  typeId: string;
  dueAt: string;
  allDay?: boolean;
  notes?: string;
  assigneeUserIds?: string[];
  /** F41 §CAL-01: solo aplica al crear sin proceso (DeadlinesService.createGeneral). */
  scope?: DeadlineScope;
  blocksAgenda?: boolean;
  durationMinutes?: number;
  computationType?: DeadlineComputationType;
}

export interface UpdateDeadlineRequest {
  title?: string;
  typeId?: string;
  dueAt?: string;
  allDay?: boolean;
  notes?: string;
  status?: DeadlineStatus;
  assigneeUserIds?: string[];
  scope?: DeadlineScope;
  blocksAgenda?: boolean;
  durationMinutes?: number | null;
  computationType?: DeadlineComputationType;
}

export interface QueryDeadlinesFilters {
  from?: string;
  to?: string;
  assignee?: string;
  type?: string;
  processId?: string;
}
