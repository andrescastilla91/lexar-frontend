import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning';

/**
 * F7-R3: acción opcional del toast (hoy solo la usa el CTA de upgrade de
 * plan — "Ver planes" con el plan sugerido resaltado). `routerLink` sigue
 * el mismo tipo que acepta la directiva de Angular Router.
 */
export interface ToastAction {
  label: string;
  routerLink: string | string[];
  queryParams?: Record<string, string>;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

const AUTO_DISMISS_MS = 4000;
// Un toast con acción (el usuario tiene que leer y decidir si hacer clic)
// se queda más tiempo que uno informativo puro.
const AUTO_DISMISS_WITH_ACTION_MS = 10000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly state = signal<ToastItem[]>([]);
  readonly toasts = this.state.asReadonly();
  private nextId = 1;

  success(message: string, action?: ToastAction): void {
    this.push('success', message, action);
  }

  error(message: string, action?: ToastAction): void {
    this.push('error', message, action);
  }

  /**
   * F40 §CLI-12: advertencias no bloqueantes (p. ej. el cruce de conflicto
   * de interés al crear un cliente/contraparte) — distinto de `error()`
   * porque la acción sí se completó, solo hay algo que revisar.
   */
  warning(message: string, action?: ToastAction): void {
    this.push('warning', message, action);
  }

  dismiss(id: number): void {
    this.state.update((items) => items.filter((item) => item.id !== id));
  }

  private push(type: ToastType, message: string, action?: ToastAction): void {
    const id = this.nextId++;
    this.state.update((items) => [...items, { id, type, message, action }]);
    setTimeout(() => this.dismiss(id), action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS);
  }
}
