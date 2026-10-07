import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from '../core/services/auth.service';

const KEY_PREFIX = 'lexar-sidebar-collapsed';

/**
 * F48 — preferencia de menú lateral colapsado (rail de iconos). Vive en el
 * navegador, con clave por usuario: dos personas en el mismo equipo no se
 * pisan la preferencia. No viaja entre dispositivos a propósito.
 */
@Injectable({ providedIn: 'root' })
export class SidebarPreferenceService {
  private readonly authService = inject(AuthService);

  readonly collapsed = signal(false);

  constructor() {
    const initialKey = this.storageKey();
    if (initialKey) {
      this.collapsed.set(this.read(initialKey));
    }
    effect(() => {
      const key = this.storageKey();
      this.collapsed.set(key ? this.read(key) : false);
    });
  }

  toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    const key = this.storageKey();
    if (key) {
      this.write(key, next);
    }
  }

  private storageKey(): string | null {
    // Se clava en el correo: es lo único presente en TODAS las formas del usuario
    // (respuesta de login y GET /auth/me). `id` solo viene en el login, así que
    // usarlo partía la clave y la preferencia no sobrevivía a un refresco.
    const email = this.authService.currentUser()?.email?.trim().toLowerCase();
    return email ? `${KEY_PREFIX}:${email}` : null;
  }

  private read(key: string): boolean {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  private write(key: string, value: boolean): void {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Sin almacenamiento disponible: la preferencia vale solo para esta sesión.
    }
  }
}
