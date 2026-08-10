import { Directive, ElementRef, HostListener, inject, output } from '@angular/core';

/**
 * Bug corregido 2026-08-08: los dropdowns de usuario/notificaciones usaban
 * un `<div class="fixed inset-0">` invisible para detectar el click fuera.
 * Ese truco se rompe si algún ancestro (ej. el header con `backdrop-blur`)
 * crea un containing block para `position: fixed` — el overlay termina
 * confinado al tamaño de ese ancestro en vez de cubrir toda la página, y el
 * dropdown deja de cerrarse con clicks fuera de esa zona.
 *
 * Esta directiva no depende de posicionamiento: escucha clicks en todo el
 * `document` y compara el `target` contra el elemento host directamente.
 * Aplicar en el contenedor que envuelve TANTO el botón que abre el menú
 * COMO el panel desplegable, para que el propio click de apertura no cuente
 * como "afuera" (evita que se abra y se cierre en el mismo click).
 */
@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly appClickOutside = output<void>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.appClickOutside.emit();
    }
  }
}
