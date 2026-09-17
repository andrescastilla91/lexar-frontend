import { ClientMatterStatus } from '../models/client-backend.model';

/**
 * F34 §2: vigencia de un asunto (`ClientMatter`). Extraído a util compartido
 * en F34-b — antes vivía duplicado solo en `client-matters-panel.component.ts`;
 * ahora también lo usan la pestaña "Procesos" de la ficha del cliente y la
 * card de `/procesos`, que muestran el mismo badge sobre el asunto vinculado.
 */
export function matterStatusLabel(status: ClientMatterStatus): string {
  switch (status) {
    case ClientMatterStatus.VIGENTE:
      return 'Vigente';
    case ClientMatterStatus.VENCIDO:
      return 'Vencido';
    case ClientMatterStatus.TERMINADO:
      return 'Terminado';
    default:
      return status;
  }
}

export function matterStatusClasses(status: ClientMatterStatus): string {
  switch (status) {
    case ClientMatterStatus.VIGENTE:
      return 'bg-success-tint text-success';
    case ClientMatterStatus.VENCIDO:
      return 'bg-danger-tint text-danger';
    case ClientMatterStatus.TERMINADO:
      return 'bg-surface-muted text-subtle';
    default:
      return 'bg-surface-muted text-muted';
  }
}
