// F43: módulo de auditoría visible. `description` viene ya traducida del
// backend (mismo catálogo que audit-log-translations.ts) — el frontend
// nunca reconstruye ni traduce `action`/`entityType` por su cuenta.
export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  userId: string | null;
  userEmail: string | null;
  detail: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  description: string;
  /** BUG-31: mismas traducciones que ya componen `description`, sueltas
   * para la vista de detalle ampliada — nunca se recalculan en frontend. */
  actionLabel: string;
  entityTypeLabel: string | null;
}

export interface AuditLogListResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}
