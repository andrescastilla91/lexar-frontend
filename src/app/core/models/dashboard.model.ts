import { ProcessStatus, RiskLevel } from './legal-process.model';

export interface ProcessStatusCount {
  status: ProcessStatus;
  count: number;
}

export interface DashboardHearingItem {
  id: string;
  title: string;
  court: string | null;
  nextHearingDate: string | null;
  riskLevel: RiskLevel;
  client: { id: string; fullName: string } | null;
  advisors: { id: string; firstName: string; lastName: string }[];
}

export interface DashboardProcessItem {
  id: string;
  title: string;
  court: string | null;
  nextHearingDate: string | null;
  riskLevel: RiskLevel;
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
  specialty: string;
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
