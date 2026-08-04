import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PlatformAdminService } from '../core/services/platform-admin.service';
import { ConfirmDialogComponent } from '../core/components/confirm-dialog.component';
import { ToastComponent } from '../core/components/toast.component';

interface AdminNavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmDialogComponent, ToastComponent],
  template: `
    <div class="min-h-screen bg-surface-muted text-text">
      <header class="border-b border-default bg-navy-900 text-white">
        <div class="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 md:px-8">
          <div class="flex items-center gap-8">
            <div>
              <p class="text-xs uppercase tracking-widest text-white/60">LexAr</p>
              <p class="text-base font-semibold">Panel de plataforma</p>
            </div>
            <nav class="flex items-center gap-1">
              @for (item of navItems; track item.route) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="bg-white/10 text-white"
                  class="rounded-md px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {{ item.label }}
                </a>
              }
            </nav>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-sm text-white/70">{{ platformAdminService.currentAdmin()?.email }}</span>
            <button
              type="button"
              class="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
              (click)="logout()"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
        <router-outlet />
      </main>

      <app-confirm-dialog />
      <app-toast />
    </div>
  `,
})
export class AdminLayoutComponent {
  protected readonly platformAdminService = inject(PlatformAdminService);
  private readonly router = inject(Router);

  readonly navItems: AdminNavItem[] = [
    { label: 'Tenants', route: '/admin/tenants' },
    { label: 'Planes', route: '/admin/plans' },
    { label: 'Métricas', route: '/admin/metrics' },
    { label: 'Equipo', route: '/admin/team' },
    { label: 'Notificaciones', route: '/admin/notifications' },
  ];

  logout(): void {
    this.platformAdminService.logout().subscribe({
      next: () => this.router.navigate(['/admin/login']),
      error: () => this.router.navigate(['/admin/login']),
    });
  }
}
