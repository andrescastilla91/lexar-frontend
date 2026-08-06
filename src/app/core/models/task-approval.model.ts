import { TaskAttachment } from './task-activity.model';

export type TaskApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface TaskApprovalUserRef {
  id: string;
  firstName: string;
  lastName: string;
}

/** Fila de la bandeja de aprobaciones pendientes (F14). */
export interface TaskApprovalRequestResponse {
  id: string;
  taskId: string;
  taskTitle: string;
  processId: string | null;
  processTitle: string | null;
  fromStatusLabel: string;
  toStatusLabel: string;
  requestedBy: TaskApprovalUserRef | null;
  note: string | null;
  attachments: TaskAttachment[];
  status: TaskApprovalStatus;
  decidedBy: TaskApprovalUserRef | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export interface DecideTaskApprovalRequest {
  approve: boolean;
  note?: string;
}
