import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { PortalAuthService } from '../core/services/portal-auth.service';

/**
 * F16: layout minimalista y separado del shell interno (MainLayoutComponent)
 * — mismo Design System, sin sidebar ni navegación de RBAC interno. Solo
 * "mis procesos" y logout.
 */
@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-surface-muted">
      <header class="border-b border-default bg-navy-900 text-white">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a routerLink="/portal/procesos" class="text-sm font-semibold uppercase tracking-[0.2em] text-white/90">
            LexAr · Portal del cliente
          </a>
          <div class="flex items-center gap-4 text-sm text-white/80">
            @if (portalAuthService.currentPortalUser(); as user) {
              <span>{{ user.email }}</span>
            }
            <button
              type="button"
              class="rounded-md border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
              (click)="onLogout()"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-5xl px-6 py-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class PortalLayoutComponent {
  readonly portalAuthService = inject(PortalAuthService);
  private readonly router = inject(Router);

  onLogout(): void {
    this.portalAuthService.logout().subscribe(() => {
      this.router.navigate(['/portal/login']);
    });
  }
}
