import { ProcessStatus } from './legal-process.model';
import { CatalogRef } from './catalog-backend.model';

export interface ProcessStatusCount {
  status: ProcessStatus;
  count: number;
}

export interface DashboardHearingItem {
  id: string;
  title: string;
  court: string | null;
  nextHearingDate: string | null;
  riskLevel: CatalogRef | null;
  client: { id: string; fullName: string } | null;
  advisors: { id: string; firstName: string; lastName: string }[];
}

export interface DashboardProcessItem {
  id: string;
  title: string;
  court: string | null;
  nextHearingDate: string | null;
  riskLevel: CatalogRef | null;
  client: { id: string; fullName: string } | null;
}

export interface DashboardDocumentItem {
  id: string;
  filename: string;
  entityType: string;
  uploadedBy: string;
  createdAt: string;
}

export interface DashboardAdvisorItem {
  id: string;
  name: string;
  specialty: CatalogRef | null;
  rating: number;
  experienceYears: number;
}

export interface DashboardSummary {
  totalProcesses: number;
  processesByStatus: ProcessStatusCount[];
  activeClients: number;
  documentsThisMonth: number;
  upcomingHearingsCount: number;
  upcomingHearings: DashboardHearingItem[];
  highRiskProcessesCount: number;
  highRiskProcesses: DashboardProcessItem[];
  recentDocuments: DashboardDocumentItem[];
  topAdvisors: DashboardAdvisorItem[];
}

export interface DashboardSummaryResponse {
  message: string;
  summary: DashboardSummary;
}

/** F10: checklist "Primeros pasos" del dashboard. */
export interface OnboardingChecklist {
  emailVerified: boolean;
  companyProfileComplete: boolean;
  firstClientCreated: boolean;
  firstProcessCreated: boolean;
  firstDocumentUploaded: boolean;
  teamInvited: boolean;
  wizardCompleted: boolean;
}

export interface OnboardingChecklistResponse {
  message: string;
  // BUG-11: null cuando quien pide el checklist no es el dueño de la
  // empresa — la card "Primeros pasos" no aplica a usuarios invitados.
  checklist: OnboardingChecklist | null;
}
