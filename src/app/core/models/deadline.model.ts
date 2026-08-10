/**
 * Backend Deadline DTOs and Interfaces (F13 — calendario legal y gestión de plazos)
 */

import { CatalogRef } from './catalog-backend.model';

export enum DeadlineStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  MISSED = 'MISSED',
}

export interface DeadlineAssignee {
  id: string;
  firstName: string;
  lastName: string;
}

export interface DeadlineResponse {
  id: string;
  processId: string;
  process: { id: string; title: string } | null;
  title: string;
  type: CatalogRef | null;
  dueAt: string;
  allDay: boolean;
  notes: string | null;
  status: DeadlineStatus;
  assignees: DeadlineAssignee[];
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
}

export interface UpdateDeadlineRequest {
  title?: string;
  typeId?: string;
  dueAt?: string;
  allDay?: boolean;
  notes?: string;
  status?: DeadlineStatus;
  assigneeUserIds?: string[];
}

export interface QueryDeadlinesFilters {
  from?: string;
  to?: string;
  assignee?: string;
  type?: string;
  processId?: string;
}
