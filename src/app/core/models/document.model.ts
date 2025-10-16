export interface LegalDocument {
  id: string;
  processId: string;
  title: string;
  category: 'Demanda' | 'Prueba' | 'Contrato' | 'Acta' | 'Otro';
  uploadedBy: string;
  uploadedAt: string;
  status: 'Validado' | 'Pendiente' | 'Observado';
  notes?: string;
  fileName: string;
}
