export interface ChatMessage {
  id: string;
  author: 'usuario' | 'asistente';
  content: string;
  timestamp: string;
  sentiment?: 'positivo' | 'neutral' | 'alerta';
  relatedProcessId?: string;
}
