/**
 * Backend Legal Process DTOs and Interfaces
 */

import { AdvisorResponse } from './advisor-backend.model';
import { CatalogRef } from './catalog-backend.model';
import { ClientMatterStatus, ClientPersonType } from './client-backend.model';

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


/**
 * F40 §CLI-12: resultado (no bloqueante) de cruzar un número de
 * identificación contra las contrapartes registradas en los procesos del
 * tenant (al crear un cliente) o contra los clientes del tenant (al
 * registrar una contraparte, el caso inverso). `null`/`undefined` = sin
 * coincidencia.
 */
export interface DocumentConflict {
  legalProcessId: string;
  legalProcessTitle: string;
  /** Nombre del lado opuesto del cruce: la contraparte si se advirtió al crear un cliente, el cliente si se advirtió al crear una contraparte. */
  matchedName: string;
}

/**
 * F40 §PRO-07: la contraparte de un proceso — entidad propia (un proceso
 * puede tener varias). Reutiliza `ClientPersonType`/el catálogo
 * `document_type` de F33, mismo criterio que `Client`.
 */
export interface ProcessCounterpartyResponse {
  id: string;
  legalProcessId: string;
  fullName: string;
  personType: ClientPersonType;
  documentType: CatalogRef | null;
  identificationNumber: string;
  attorneyName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** F40 §CLI-12: solo viene poblado en la respuesta de create() — el cruce se hace una vez, al registrar la contraparte. */
  documentConflict?: DocumentConflict | null;
}

export interface CreateProcessCounterpartyRequest {
  legalProcessId: string;
  fullName: string;
  personType?: ClientPersonType;
  documentTypeId?: string;
  identificationNumber: string;
  attorneyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface UpdateProcessCounterpartyRequest {
  fullName?: string;
  personType?: ClientPersonType;
  documentTypeId?: string;
  identificationNumber?: string;
  attorneyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}
