export type SearchResultType =
  'legal_process' | 'client' | 'file' | 'advisor' | 'deadline' | 'task';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  linkPath: string;
}

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  legal_process: 'Procesos',
  client: 'Clientes',
  file: 'Documentos',
  advisor: 'Asesores',
  deadline: 'Plazos y audiencias',
  task: 'Tareas',
};
