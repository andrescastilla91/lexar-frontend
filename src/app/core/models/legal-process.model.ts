export interface LegalProcess {
  id: string;
  title: string;
  clientId: string;
  advisorId: string;
  status: 'En curso' | 'En revisión' | 'Finalizado' | 'En riesgo';
  stage: 'Investigación' | 'Audiencia' | 'Notificación' | 'Ejecución';
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
  nextHearingDate: string;
  updatedAt: string;
  court: string;
}
