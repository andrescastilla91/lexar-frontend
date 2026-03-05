/**
 * Backend Client DTOs and Interfaces
 */

export interface ClientResponse {
  id: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  email: string;
  address: string | null;
  documentType: DocumentType;
  identificationNumber: string;
  riskLevel: RiskLevel;
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
  documentType?: DocumentType;
  identificationNumber: string;
  riskLevel?: RiskLevel;
  assignedAdvisorId?: string;
}

export interface UpdateClientRequest {
  fullName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  documentType?: DocumentType;
  identificationNumber?: string;
  riskLevel?: RiskLevel;
  assignedAdvisorId?: string;
}

export type DocumentType = 'CC' | 'NIT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
