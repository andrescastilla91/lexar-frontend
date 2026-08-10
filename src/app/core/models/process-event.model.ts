export enum ProcessEventType {
  ANNOTATION = 'ANNOTATION',
  STATUS_CHANGE = 'STATUS_CHANGE',
  ADVISOR_ASSIGNED = 'ADVISOR_ASSIGNED',
  ADVISOR_REMOVED = 'ADVISOR_REMOVED',
  PROCESS_CREATED = 'PROCESS_CREATED',
  PROCESS_UPDATED = 'PROCESS_UPDATED',
  CLIENT_CHANGED = 'CLIENT_CHANGED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
}

export interface ProcessEventUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProcessEventAttachment {
  url: string;
  filename: string;
  size: number;
  uploadedAt: Date;
}

export interface ProcessEvent {
  id: string;
  type: ProcessEventType;
  description: string;
  metadata: Record<string, any> | null;
  attachments: ProcessEventAttachment[] | null;
  legalProcessId: string;
  user: ProcessEventUser;
  createdAt: Date;
  /** F16: toggle "compartir con cliente" — nunca disponible para ANNOTATION. */
  visibleToClient?: boolean;
}

export interface CreateAnnotationRequest {
  description: string;
}

export interface ProcessHistoryResponse {
  events: ProcessEvent[];
  total: number;
}
