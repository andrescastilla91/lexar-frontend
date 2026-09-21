/**
 * Backend Client DTOs and Interfaces
 */

import { CatalogRef } from './catalog-backend.model';
import { DocumentConflict } from './legal-process.model';

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
  /** F34 §4: tipo de vinculación de los asuntos no cerrados del cliente —
   * `CatalogRef` cuando comparten un único tipo, `'VARIOS'` cuando hay más
   * de uno, `null`/`undefined` cuando no tiene asuntos con tipo asignado.
   * Solo viene poblado en el listado (`GET /clients`), no en la ficha. */
  contractTypeSummary?: CatalogRef | 'VARIOS' | null;
  /**
   * F40 §CLI-12: solo viene poblado en la respuesta de crear el cliente —
   * coincidencia con una contraparte ya registrada en algún proceso de
   * este tenant, si la hay. `undefined` en listado/ficha/edición.
   */
  documentConflict?: DocumentConflict | null;
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

/** F34 §2: vigencia del asunto. VENCIDO se calcula en el backend a partir
 * de endDate; TERMINADO es el único estado que se persiste explícitamente
 * (cierre anticipado) y siempre prevalece sobre el cálculo por fecha. */
export enum ClientMatterStatus {
  VIGENTE = 'VIGENTE',
  VENCIDO = 'VENCIDO',
  TERMINADO = 'TERMINADO',
}

export interface ClientMatterResponse {
  id: string;
  clientId: string;
  contractType: CatalogRef | null;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: ClientMatterStatus;
  processCount: number;
  createdAt: string;
  updatedAt: string;
  /** Bug QA 2026-09-17 (F34): true solo en entradas sintéticas que el
   * frontend arma a partir de `LegalProcessResponse.matter` para que el
   * <select> del formulario de proceso pueda seguir mostrando/preseleccionando
   * un asunto ya eliminado — nunca viene así de GET /client-matters. */
  isDeleted?: boolean;
}

export interface CreateClientMatterRequest {
  clientId: string;
  contractTypeId?: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateClientMatterRequest {
  contractTypeId?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: ClientMatterStatus;
}
