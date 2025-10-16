export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  createdAt: string;
  assignedAdvisorId: string;
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
}
