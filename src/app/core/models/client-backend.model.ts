/**
 * Backend Client DTOs and Interfaces
 */

import { CatalogRef } from './catalog-backend.model';

/** F33: tipo de persona del cliente. */
export enum ClientPersonType {
  NATURAL = 'NATURAL',
  JURIDICA = 'JURIDICA',
}

export interface ClientAdvisorRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ClientContactResponse {
  id: string;
  clientId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientResponse {
  id: string;
  fullName: string;
  personType: ClientPersonType;
  address: string | null;
  documentType: CatalogRef | null;
  identificationNumber: string;
  riskLevel: CatalogRef | null;
  laftRisk: CatalogRef | null;
  isActive: boolean;
  createdAt: string;
  contacts?: ClientContactResponse[];
  advisors?: ClientAdvisorRef[];
}

export interface CreateClientRequest {
  fullName: string;
  personType?: ClientPersonType;
  address?: string;
  documentTypeId?: string;
  identificationNumber: string;
  riskLevelId?: string;
  laftRiskId?: string;
  advisorIds?: string[];
}

export interface UpdateClientRequest {
  fullName?: string;
  personType?: ClientPersonType;
  address?: string;
  documentTypeId?: string;
  identificationNumber?: string;
  advisorIds?: string[];
  isActive?: boolean;
}

/**
 * QA F33 2026-09-14: separado de UpdateClientRequest — el backend ahora
 * exige el permiso independiente `clients.edit-compliance` para estos dos
 * campos, vía PATCH /clients/:id/compliance. No enviar riskLevelId/
 * laftRiskId en updateClient() — con forbidNonWhitelisted el backend
 * rechazaría el request con 400.
 */
export interface UpdateClientComplianceRequest {
  riskLevelId?: string;
  laftRiskId?: string;
}

export interface CreateClientContactRequest {
  clientId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
  notes?: string;
}

export interface UpdateClientContactRequest {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
  notes?: string;
}
