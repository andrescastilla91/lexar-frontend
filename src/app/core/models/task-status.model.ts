/**
 * Catálogo de estados de tarea, configurable por tenant (F14 — motor de
 * workflow). Reemplaza el antiguo enum fijo TaskStatus (TODO/IN_PROGRESS/
 * DONE): ahora cada tenant define sus propios estados, con banderas que
 * condicionan transiciones (`requiresApproval`, `requiresNote`).
 */
export interface TaskStatusRef {
  id: string;
  code: string;
  label: string;
  color: string | null;
  isTerminal: boolean;
  requiresApproval: boolean;
  requiresNote: boolean;
}

export interface TaskStatusApproverRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TaskStatusResponse extends TaskStatusRef {
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  /** Usuarios habilitados para decidir aprobaciones de este estado. Si
   * está vacío, cualquier usuario con el permiso tasks.approve puede
   * decidir (fallback del backend). */
  approvers: TaskStatusApproverRef[];
}

export interface CreateTaskStatusRequest {
  code: string;
  label: string;
  color?: string;
  sortOrder?: number;
  isTerminal?: boolean;
  requiresApproval?: boolean;
  requiresNote?: boolean;
  approverUserIds?: string[];
}

export interface UpdateTaskStatusRequest {
  label?: string;
  color?: string;
  sortOrder?: number;
  isTerminal?: boolean;
  requiresApproval?: boolean;
  requiresNote?: boolean;
  isActive?: boolean;
  approverUserIds?: string[];
}

/** Candidato para el selector de aprobadores en Configuración (GET
 * /task-statuses/approval-candidates): usuarios activos con tasks.approve. */
export interface TaskApprovalCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}
