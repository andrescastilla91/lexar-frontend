/**
 * Backend Legal Process DTOs and Interfaces
 */

import { AdvisorResponse } from './advisor-backend.model';
import { CatalogRef } from './catalog-backend.model';
import { ClientMatterStatus } from './client-backend.model';

export enum ProcessStatus {
  DRAFT = 'DRAFT', // Borrador
  ACTIVE = 'ACTIVE', // Activo/En Progreso
  UNDER_REVIEW = 'UNDER_REVIEW', // En Revisión
  SUSPENDED = 'SUSPENDED', // Suspendido
  COMPLETED = 'COMPLETED', // Completado
  CANCELLED = 'CANCELLED', // Cancelado
  ARCHIVED = 'ARCHIVED', // Archivado
}

export interface LegalProcessResponse {
  id: string;
  title: string;
  description: string | null;
  status: ProcessStatus;
  stage: CatalogRef | null;
  riskLevel: CatalogRef | null;
  /** F40 §PRO-04: nulo en procesos preexistentes o creados sin tipo — misma
   * "Decisión de transición" que `matterId` (F34 §3), nunca retroactivo. */
  processType: CatalogRef | null;
  court: string | null;
  caseNumber: string | null;
  /** F40 §PRO-06: código interno del despacho — lo genera el sistema, inmutable, único por tenant. Nunca se envía al crear/editar. */
  internalCode: string;
  nextHearingDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  companyId: string;
  clientId: string;
  client: {
    id: string;
    fullName: string;
    email: string;
  };
  advisors?: AdvisorResponse[];
  /** F34 §3: nulo en procesos preexistentes o creados sin asunto — "Decisión
   * de transición" explícita, nunca retroactivamente obligatorio. */
  matterId: string | null;
  /** `isDeleted` (bug QA 2026-09-17): el asunto fue eliminado (soft delete)
   * pero el proceso conserva la referencia — el backend lo hidrata aparte
   * (`withDeleted: true`) para que esta relación nunca "desaparezca". */
  matter: {
    id: string;
    name: string;
    contractType: CatalogRef | null;
    /** F34-b: para pintar el mismo badge "Vencido" que ya usa la pestaña Asuntos del cliente. */
    status: ClientMatterStatus;
    isDeleted: boolean;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLegalProcessRequest {
  title: string;
  description?: string;
  status?: ProcessStatus;
  stageId?: string;
  riskLevelId?: string;
  processTypeId?: string;
  court?: string;
  caseNumber?: string;
  startDate?: string;
  endDate?: string;
  clientId: string;
  advisorIds?: string[];
  matterId?: string;
}

export interface UpdateLegalProcessRequest {
  title?: string;
  description?: string;
  status?: ProcessStatus;
  stageId?: string;
  riskLevelId?: string;
  processTypeId?: string;
  court?: string;
  caseNumber?: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  advisorIds?: string[];
  matterId?: string;
}

export interface UpdateProcessStatusRequest {
  status: ProcessStatus;
  notes?: string;
}

/**
 * @deprecated Use LegalProcessResponse instead. Kept for backward compatibility with mock data.
 */
export interface LegalProcess {
  id: string;
  title: string;
  court: string;
  clientId: string;
  advisorId: string;
  status: 'En curso' | 'En revisión' | 'Finalizado' | 'En riesgo';
  stage: 'Investigación' | 'Audiencia' | 'Notificación' | 'Ejecución';
  riskLevel: 'Alto' | 'Medio' | 'Bajo';
  nextHearingDate: string;
  updatedAt: string;
}
