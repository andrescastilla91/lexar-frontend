/**
 * Backend Legal Process DTOs and Interfaces
 */

import { AdvisorResponse } from './advisor-backend.model';

export enum ProcessStatus {
  DRAFT = 'DRAFT', // Borrador
  ACTIVE = 'ACTIVE', // Activo/En Progreso
  UNDER_REVIEW = 'UNDER_REVIEW', // En Revisión
  SUSPENDED = 'SUSPENDED', // Suspendido
  COMPLETED = 'COMPLETED', // Completado
  CANCELLED = 'CANCELLED', // Cancelado
  ARCHIVED = 'ARCHIVED', // Archivado
}

export enum ProcessStage {
  INVESTIGATION = 'INVESTIGATION',
  HEARING = 'HEARING',
  NOTIFICATION = 'NOTIFICATION',
  EXECUTION = 'EXECUTION',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface LegalProcessResponse {
  id: string;
  title: string;
  description: string | null;
  status: ProcessStatus;
  stage: ProcessStage;
  riskLevel: RiskLevel;
  court: string | null;
  caseNumber: string | null;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLegalProcessRequest {
  title: string;
  description?: string;
  status?: ProcessStatus;
  stage?: ProcessStage;
  riskLevel?: RiskLevel;
  court?: string;
  caseNumber?: string;
  nextHearingDate?: string;
  startDate?: string;
  endDate?: string;
  clientId: string;
  advisorIds?: string[];
}

export interface UpdateLegalProcessRequest {
  title?: string;
  description?: string;
  status?: ProcessStatus;
  stage?: ProcessStage;
  riskLevel?: RiskLevel;
  court?: string;
  caseNumber?: string;
  nextHearingDate?: string;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  advisorIds?: string[];
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
