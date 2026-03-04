
import { Component, Signal, computed, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { User } from '../core/models/user.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

interface MenuItem {
  label: string;
  description: string;
  icon: string;
  route: string;
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
            @for (item of menuItems; track item.route) {
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
                <p class="truncate text-sm font-semibold">{{ currentUser()?.fullName }}</p>
                <p class="truncate text-xs text-slate-400">{{ currentUser()?.email }}</p>
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
              <div class="hidden sm:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#192033] text-white text-sm font-semibold">
                  {{ userInitials() }}
                </span>
                <div>
                  <p class="text-sm font-semibold text-slate-700">{{ currentUser()?.fullName }}</p>
                  <p class="text-xs text-slate-400">{{ userRoleLabel() }}</p>
                </div>
              </div>
            </div>
          </header>
    
          <main class="flex-1 overflow-y-auto p-4 lg:p-8">
            <div class="min-w-0 w-full">
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

  readonly menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      description: 'Resumen de actividad y riesgos',
      icon: 'M3.75 5.25h16.5m-16.5 6h16.5m-16.5 6h16.5',
      route: '/dashboard',
    },
    {
      label: 'Asesores',
      description: 'Talento y asignaciones activas',
      icon: 'M16.5 7.5 21 12l-4.5 4.5M8.25 7.5 3 12l5.25 4.5',
      route: '/asesores',
    },
    {
      label: 'Clientes',
      description: 'Portafolio y riesgos asociados',
      icon: 'M3 7.5l9 4.5 9-4.5M3 15l9 4.5 9-4.5',
      route: '/clientes',
    },
    {
      label: 'Procesos',
      description: 'Seguimiento procesal detallado',
      icon: 'm4.5 19.5 7.5-7.5 7.5 7.5M12 12V3.75',
      route: '/procesos',
    },
    {
      label: 'Documentos',
      description: 'Control y cargue seguro',
      icon: 'M9 17.25v1.125a2.625 2.625 0 0 0 2.625 2.625h6.75A2.625 2.625 0 0 0 21 18.375V9.017a2.625 2.625 0 0 0-.769-1.856l-4.266-4.266A2.625 2.625 0 0 0 14.109 2.25H8.625A2.625 2.625 0 0 0 6 4.875v1.875',
      route: '/documentos',
    },
    {
      label: 'Chatbot',
      description: 'Asistencia operativa inmediata',
      icon: 'M12 20.25c4.908 0 8.887-3.478 8.887-7.769 0-4.29-3.979-7.768-8.887-7.768-4.907 0-8.886 3.478-8.886 7.768a7.44 7.44 0 0 0 2.741 5.7L6 20.25v-2.292',
      route: '/chatbot',
    },
  ];

  readonly currentUser: Signal<User | null>;
  readonly currentRoute = signal('');

  readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return 'LS';
    }

    const [firstName, lastName] = user.fullName.split(' ');
    const firstInitial = firstName ? firstName.charAt(0) : '';
    const lastInitial = lastName ? lastName.charAt(0) : '';
    return (firstInitial + lastInitial).toUpperCase();
  });

  readonly userRoleLabel = computed(() => {
    const role = this.currentUser()?.role;
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'advisor':
        return 'Asesor legal';
      case 'assistant':
        return 'Asistente legal';
      default:
        return 'LexAr Suite';
    }
  });

  readonly activeRouteLabel = computed(() => {
    const route = this.currentRoute();
    return this.menuItems.find((item) => route.startsWith(item.route))?.label ?? 'Panel central';
  });

  constructor(private readonly authService: AuthService, private readonly router: Router) {
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
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
