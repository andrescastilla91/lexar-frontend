export type TaskActivityType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'STATUS_CHANGED'
  | 'DUE_CHANGED'
  | 'UPDATED'
  | 'DELETED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_REJECTED';

export interface TaskAttachment {
  fileId: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

export interface TaskActivityResponse {
  id: string;
  type: TaskActivityType;
  actor: { id: string; firstName: string; lastName: string } | null;
  fromStatusLabel: string | null;
  toStatusLabel: string | null;
  note: string | null;
  attachments: TaskAttachment[];
  createdAt: string;
}
