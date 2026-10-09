import { LegalDocumentType } from './admin.model';

export type LegalAcceptanceSubjectKind = 'user' | 'portal';
export type ClientAuthorizationStatus = 'authorized' | 'pending';
export type DataProcessingAuthorizationMethodCode = 'FISICA' | 'DIGITAL';

export interface LegalAcceptanceRecord {
  id: string;
  acceptedAt: string;
  documentType: LegalDocumentType;
  documentTypeLabel: string;
  documentVersion: string;
  documentFilename: string;
  subjectKind: LegalAcceptanceSubjectKind;
  subjectName: string | null;
  subjectEmail: string | null;
  ip: string | null;
  userAgent: string | null;
}

export interface LegalAcceptancesFilters {
  documentType?: LegalDocumentType;
  subjectKind?: LegalAcceptanceSubjectKind;
  from?: string;
  to?: string;
  search?: string;
}

export interface LegalAcceptancesListResponse {
  message: string;
  acceptances: LegalAcceptanceRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ClientAuthorizationRecord {
  clientId: string;
  fullName: string;
  identificationNumber: string;
  authorized: boolean;
  authorizedAt: string | null;
  method: DataProcessingAuthorizationMethodCode | null;
  methodLabel: string | null;
  attachment: { fileId: string; originalFilename: string } | null;
}

export interface ClientAuthorizationsFilters {
  status?: ClientAuthorizationStatus;
  method?: DataProcessingAuthorizationMethodCode;
  from?: string;
  to?: string;
  search?: string;
}

export interface ClientAuthorizationsListResponse {
  message: string;
  authorizations: ClientAuthorizationRecord[];
  total: number;
  page: number;
  limit: number;
}
