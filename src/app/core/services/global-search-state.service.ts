import { Injectable, signal } from '@angular/core';

/**
 * F18 — estado compartido entre `GlobalSearchTriggerComponent` (botón en el
 * header) y `GlobalSearchOverlayComponent` (modal en el root de
 * main-layout). Se separaron en dos componentes porque el header tiene
 * `backdrop-blur` (backdrop-filter), que crea containing block para
 * `position: fixed` — un overlay `fixed inset-0` anidado dentro del header
 * queda recortado al tamaño del header en vez de cubrir el viewport. El
 * mismo patrón ya lo resuelven `ConfirmDialogComponent`/`ToastComponent`
 * viviendo como hermanos raíz, fuera del header.
 */
@Injectable({ providedIn: 'root' })
export class GlobalSearchStateService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
  }
}
