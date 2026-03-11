export enum AdvisorStatus {
  AVAILABLE = 'AVAILABLE',
  IN_HEARING = 'IN_HEARING',
  IN_MEETING = 'IN_MEETING',
  BUSY = 'BUSY',
}

export interface AdvisorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AdvisorResponse {
  id: string;
  userId: string;
  specialty: string;
  phone: string | null;
  status: AdvisorStatus;
  rating: number | null;
  experienceYears: number;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  user?: AdvisorUser;
}

export interface CreateAdvisorRequest {
  userId: string;
  specialty: string;
  phone?: string;
  status?: AdvisorStatus;
  rating?: number;
  experienceYears?: number;
}

export interface UpdateAdvisorRequest {
  specialty?: string;
  phone?: string;
  status?: AdvisorStatus;
  rating?: number;
  experienceYears?: number;
  isActive?: boolean;
}
