import { ProcessEventType } from './process-event.model';

/**
 * F27 — política de visibilidad hacia el portal, configurable por tenant y
 * por tipo de evento. Espejo del enum del backend
 * (portal-event-visibility-policy.entity.ts).
 */
export enum PortalEventVisibilityMode {
  /** Nace visible, el asesor no puede ocultarlo (no admitido para ANNOTATION). */
  ALWAYS = 'ALWAYS',
  /** Nace visible, el asesor puede ocultarlo caso a caso (opt-out). */
  DEFAULT_ON = 'DEFAULT_ON',
  /** Nace oculto, el asesor puede mostrarlo (opt-in) — comportamiento pre-F27. */
  DEFAULT_OFF = 'DEFAULT_OFF',
}

export interface PortalEventVisibilityPolicy {
  eventType: ProcessEventType;
  mode: PortalEventVisibilityMode;
  /** ANNOTATION nunca admite ALWAYS — evita duplicar la regla en cada
   * pantalla que arma el selector de modos. */
  allowsAlways: boolean;
}
