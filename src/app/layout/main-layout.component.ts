
import { Component, Signal, computed, signal, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { PermissionsService } from '../core/services/permissions.service';
import { AuthUser } from '../core/models/auth.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';

interface MenuItem {
  label: string;
  description: string;
  icon: string;
  route: string;
  permissions?: string[]; // Permisos requeridos para ver el menú (si no tiene, se muestra siempre)
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-slate-100 text-slate-900">
      <div class="flex h-screen overflow-hidden">
        @if (sidebarOpen()) {
          <div
            class="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
            (click)="toggleSidebar()"
          ></div>
        }
    
        <aside
          class="fixed inset-y-0 left-0 z-40 w-72 transform bg-[#192033] text-white shadow-xl transition-transform duration-300 lg:translate-x-0 lg:static lg:flex lg:flex-col"
          [class.-translate-x-full]="!sidebarOpen()"
          >
          <div class="flex h-16 items-center justify-between px-6">
            <div>
              <p class="text-sm uppercase tracking-widest text-slate-400">LexAr Suite</p>
              <p class="text-lg font-semibold">Gestión Legal</p>
            </div>
            <button
              type="button"
              class="rounded-md p-2 text-slate-300 transition hover:bg-white/10 lg:hidden"
              (click)="toggleSidebar()"
              aria-label="Cerrar menú"
              >
              <span class="sr-only">Cerrar menú</span>
              <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
    
          <nav class="mt-6 flex-1 space-y-1 px-4">
            @for (item of filteredMenuItems(); track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-white/10 text-white"
                class="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                (click)="closeSidebar()"
                >
                <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-200 transition group-hover:bg-white/15">
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path [attr.d]="item.icon" stroke-linecap="round" stroke-linejoin="round"></path>
                  </svg>
                </span>
                <span class="flex-1">
                  <span class="block text-base font-semibold">{{ item.label }}</span>
                  <span class="text-xs text-slate-400">{{ item.description }}</span>
                </span>
              </a>
            }
          </nav>
    
          <div class="border-t border-white/10 px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                {{ userInitials() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">{{ currentUser()?.email }}</p>
                <p class="truncate text-xs text-slate-400">{{ userRoleLabel() }}</p>
              </div>
              <button
                type="button"
                (click)="handleLogout()"
                class="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                >
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>
    
        <div class="flex flex-1 flex-col">
          <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
            <div class="flex w-full items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 lg:hidden"
                  (click)="toggleSidebar()"
                  aria-label="Abrir menú"
                  >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
                <div>
                  <p class="text-sm font-medium text-slate-500">Panel central</p>
                  <p class="text-lg font-semibold text-slate-800">{{ activeRouteLabel() }}</p>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="hidden md:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#192033] text-white text-sm font-semibold">
                    {{ userInitials() }}
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-700 truncate">{{ currentUser()?.email }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ userRoleLabel() }}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
    
          @if (hasNoRoles()) {
            <div class="px-4 md:px-6 lg:px-8">
              <div class="mx-auto mt-4 border-l-4 border-amber-500 bg-amber-50 p-4 rounded-lg">
                <div class="flex items-center gap-3">
                  <svg class="h-6 w-6 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div class="flex-1">
                    <h3 class="text-sm font-semibold text-amber-800">Sin roles asignados</h3>
                    <p class="text-sm text-amber-700 mt-1">
                      Tu cuenta no tiene roles ni permisos asignados. Contacta al administrador de tu empresa para que te asigne los permisos necesarios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }

          <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
            <div class="min-w-0 w-full max-w-[1400px] mx-auto">
              <router-outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
    `,
})
export class MainLayoutComponent {
  readonly sidebarOpen = signal(false);
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly router = inject(Router);

  readonly menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      description: 'Resumen de actividad y riesgos',
      icon: 'M3.75 5.25h16.5m-16.5 6h16.5m-16.5 6h16.5',
      route: '/dashboard',
    },
    {
      label: 'Usuarios',
      description: 'Gestión de cuentas y equipos',
      icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
      route: '/usuarios',
      permissions: ['users.list'],
    },
    {
      label: 'Roles',
      description: 'Permisos y control de acceso',
      icon: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
      route: '/roles',
      permissions: ['roles.list'],
    },
    {
      label: 'Asesores',
      description: 'Talento y asignaciones activas',
      icon: 'M16.5 7.5 21 12l-4.5 4.5M8.25 7.5 3 12l5.25 4.5',
      route: '/asesores',
      permissions: ['users.list'],
    },
    {
      label: 'Clientes',
      description: 'Portafolio y riesgos asociados',
      icon: 'M3 7.5l9 4.5 9-4.5M3 15l9 4.5 9-4.5',
      route: '/clientes',
      permissions: ['clients.list'],
    },
    {
      label: 'Procesos',
      description: 'Seguimiento procesal detallado',
      icon: 'm4.5 19.5 7.5-7.5 7.5 7.5M12 12V3.75',
      route: '/procesos',
      permissions: ['processes.list'],
    },
    {
      label: 'Documentos',
      description: 'Control y cargue seguro',
      icon: 'M9 17.25v1.125a2.625 2.625 0 0 0 2.625 2.625h6.75A2.625 2.625 0 0 0 21 18.375V9.017a2.625 2.625 0 0 0-.769-1.856l-4.266-4.266A2.625 2.625 0 0 0 14.109 2.25H8.625A2.625 2.625 0 0 0 6 4.875v1.875',
      route: '/documentos',
      permissions: ['files.view'],
    },
    {
      label: 'Chatbot',
      description: 'Asistencia operativa inmediata',
      icon: 'M12 20.25c4.908 0 8.887-3.478 8.887-7.769 0-4.29-3.979-7.768-8.887-7.768-4.907 0-8.886 3.478-8.886 7.768a7.44 7.44 0 0 0 2.741 5.7L6 20.25v-2.292',
      route: '/chatbot',
    },
  ];

  // Filtrar menú según permisos del usuario
  readonly filteredMenuItems = computed(() => {
    return this.menuItems
      .filter((item) => item.route !== '/chatbot' || environment.features.chatbot)
      .filter((item) => {
        // Si no tiene permisos requeridos, se muestra siempre
        if (!item.permissions || item.permissions.length === 0) {
          return true;
        }
        // Si tiene permisos, verificar que el usuario tenga al menos uno
        return this.permissionsService.hasAnyPermission(item.permissions);
      });
  });

  readonly currentUser: Signal<AuthUser | null>;
  readonly currentRoute = signal('');

  readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user?.email) {
      return 'LS';
    }

    // Extraer iniciales del email
    const emailPart = user.email.split('@')[0];
    const parts = emailPart.split('.');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return emailPart.substring(0, 2).toUpperCase();
  });

  readonly userRoleLabel = computed(() => {
    const user = this.currentUser();
    if (!user?.roles?.length) {
      return 'Usuario';
    }
    
    const role = user.roles[0]; // Tomamos el primer rol
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrador':
        return 'Administrador';
      case 'advisor':
      case 'asesor':
        return 'Asesor legal';
      case 'assistant':
      case 'asistente':
        return 'Asistente legal';
      default:
        return role;
    }
  });

  readonly activeRouteLabel = computed(() => {
    const route = this.currentRoute();
    return this.filteredMenuItems().find((item) => route.startsWith(item.route))?.label ?? 'Panel central';
  });

  // Detectar si el usuario no tiene roles asignados
  readonly hasNoRoles = computed(() => {
    const user = this.currentUser();
    return user && (!user.roles || user.roles.length === 0);
  });

  constructor() {
    this.currentUser = this.authService.currentUser;
    this.currentRoute.set(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => this.currentRoute.set(event.urlAfterRedirects));
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  handleLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        // Incluso si hay error, redirigir a login
        this.router.navigate(['/login']);
      },
    });
  }
}
