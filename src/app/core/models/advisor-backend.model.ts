import { CatalogRef } from './catalog-backend.model';

export interface AdvisorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
}

/**
 * F35: unificación de usuarios y asesores — el "estado operativo" manual
 * (AdvisorStatus: disponible/en audiencia/en reunión/ocupado) se eliminó
 * porque nadie lo mantenía actualizado; `isActive` ya cubre lo necesario.
 * `specialty` (única) fue reemplazada por `specialties` (M2M) — un asesor
 * puede tener varias especialidades del catálogo `advisor_specialty`.
 */
export interface AdvisorResponse {
  id: string;
  userId: string;
  specialties: CatalogRef[];
  phone: string | null;
  professionalCard: string | null;
  mobileSecondary: string | null;
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
  specialtyIds?: string[];
  phone?: string;
  professionalCard?: string;
  mobileSecondary?: string;
  rating?: number;
  experienceYears?: number;
}

export interface UpdateAdvisorRequest {
  specialtyIds?: string[];
  phone?: string;
  professionalCard?: string;
  mobileSecondary?: string;
  rating?: number;
  experienceYears?: number;
  isActive?: boolean;
}
