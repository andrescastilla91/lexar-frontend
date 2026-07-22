/**
 * Backend Client DTOs and Interfaces
 */

import { CatalogRef } from './catalog-backend.model';

export interface ClientResponse {
  id: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  email: string;
  address: string | null;
  documentType: CatalogRef | null;
  identificationNumber: string;
  riskLevel: CatalogRef | null;
  isActive: boolean;
  assignedAdvisor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientRequest {
  fullName: string;
  companyName?: string;
  phone?: string;
  email: string;
  address?: string;
  documentTypeId?: string;
  identificationNumber: string;
  riskLevelId?: string;
  assignedAdvisorId?: string;
}

export interface UpdateClientRequest {
  fullName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  documentTypeId?: string;
  identificationNumber?: string;
  riskLevelId?: string;
  assignedAdvisorId?: string;
}
