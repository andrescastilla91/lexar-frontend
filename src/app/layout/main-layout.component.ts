import { Component, Signal, computed, signal, inject } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { PermissionsService } from '../core/services/permissions.service';
import { AuthUser } from '../core/models/auth.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ConfirmDialogComponent } from '../core/components/confirm-dialog.component';
import { ToastComponent } from '../core/components/toast.component';
import { UserMenuComponent } from '../core/components/user-menu.component';
import { NotificationBellComponent } from '../core/components/notification-bell.component';
import { GlobalSearchTriggerComponent } from '../core/components/global-search-trigger.component';
import { GlobalSearchOverlayComponent } from '../core/components/global-search-overlay.component';
import { ThemeService } from '../core/services/theme.service';
import { ProfileService } from '../core/services/profile.service';
import { CompanyService } from '../core/services/company.service';
import { CompanyProfile } from '../core/models/company.model';
import { SubscriptionService } from '../core/services/subscription.service';
import { NotificationsService } from '../core/services/notifications.service';
import { ChatWidgetComponent } from '../core/components/chat-widget.component';
import { MENU_GROUP_LABELS, MENU_ITEMS, groupMenuItems } from './menu-items';
import { SidebarComponent } from './sidebar.component';
import { SidebarPreferenceService } from './sidebar-preference.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    ConfirmDialogComponent,
    ToastComponent,
    UserMenuComponent,
    NotificationBellComponent,
    GlobalSearchTriggerComponent,
    GlobalSearchOverlayComponent,
    ChatWidgetComponent,
    SidebarComponent,
  ],
  template: `
    <div class="min-h-screen bg-surface-muted text-text">
      <div class="flex h-screen overflow-hidden">
        @if (sidebarOpen()) {
          <div
            class="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
            (click)="toggleSidebar()"
          ></div>
        }

        <aside
          app-sidebar
          [groups]="menuGroups()"
          [open]="sidebarOpen()"
          [collapsed]="sidebarPreference.collapsed()"
          [companyName]="companyName()"
          [companyLogoUrl]="companyLogoUrl()"
          (toggleCollapsed)="sidebarPreference.toggle()"
          (closeRequested)="closeSidebar()"
        ></aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <header
            class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-default bg-surface/90 px-4 backdrop-blur lg:px-8"
          >
            <div class="flex w-full items-center justify-between gap-4">
              <div class="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  class="shrink-0 rounded-md border border-default p-2 text-muted transition hover:bg-surface-muted lg:hidden"
                  (click)="toggleSidebar()"
                  aria-label="Abrir menú"
                >
                  <svg
                    class="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4 7h16M4 12h16M4 17h16"
                    />
                  </svg>
                </button>
                <div class="min-w-0">
                  @if (activeGroupLabel(); as group) {
                    <p class="hidden text-sm font-medium text-subtle sm:block">
                      {{ group }}
                    </p>
                  }
                  <p class="truncate text-base font-semibold text-text sm:text-lg">
                    {{ activeRouteLabel() }}
                  </p>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2 sm:gap-4">
                <app-global-search-trigger />
                <button
                  type="button"
                  (click)="toggleTheme()"
                  class="rounded-md border border-default p-2 text-muted transition hover:bg-surface-muted"
                  [attr.aria-label]="
                    themeService.theme() === 'dark'
                      ? 'Cambiar a modo claro'
                      : 'Cambiar a modo oscuro'
                  "
                  [title]="
                    themeService.theme() === 'dark'
                      ? 'Cambiar a modo claro'
                      : 'Cambiar a modo oscuro'
                  "
                >
                  @if (themeService.theme() === 'dark') {
                    <svg
                      class="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                      />
                    </svg>
                  } @else {
                    <svg
                      class="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
                      />
                    </svg>
                  }
                </button>
                <app-notification-bell />
                <app-user-menu
                  [avatarUrl]="userAvatarUrl()"
                  [initials]="userInitials()"
                  [displayName]="userDisplayName()"
                  [email]="currentUser()?.email ?? ''"
                  [roleLabel]="userRoleLabel()"
                  [companyName]="companyName()"
                  [companyLogoUrl]="companyLogoUrl()"
                  [showSettings]="canManageCompany()"
                  (logout)="handleLogout()"
                />
              </div>
            </div>
          </header>

          @if (currentUser()?.impersonating) {
            <div
              class="bg-danger px-4 py-2 text-center text-sm font-semibold text-white md:px-6 lg:px-8"
            >
              Estás operando esta cuenta como platform admin (impersonación) —
              expira sola en 30 minutos.
              <button
                type="button"
                class="ml-3 underline hover:no-underline"
                (click)="exitImpersonation()"
              >
                Salir de la impersonación
              </button>
            </div>
          }

          @if (hasNoRoles()) {
            <div class="px-4 md:px-6 lg:px-8">
              <div
                class="mx-auto mt-4 rounded-lg border-l-4 border-warning bg-warning-tint p-4"
              >
                <div class="flex items-center gap-3">
                  <svg
                    class="h-6 w-6 text-warning flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                  <div class="flex-1">
                    <h3 class="text-sm font-semibold text-warning">
                      Sin roles asignados
                    </h3>
                    <p class="text-sm text-warning mt-1">
                      Tu cuenta no tiene roles ni permisos asignados. Contacta
                      al administrador de tu empresa para que te asigne los
                      permisos necesarios.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }

          <main
            class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8"
          >
            <div class="min-w-0 w-full max-w-[1400px] mx-auto">
              <router-outlet />
            </div>
          </main>
        </div>
      </div>
      <app-confirm-dialog />
      <app-toast />
      <app-global-search-overlay />
      <!-- HU-F20-1-b: widget flotante global del asistente IA — se
           gatea a sí mismo por el entitlement chatbot y se oculta en
           /chatbot para no duplicar UI (ver ChatWidgetComponent). -->
      <app-chat-widget />
    </div>
  `,
})
export class MainLayoutComponent {
  readonly sidebarOpen = signal(false);
  private readonly authService = inject(AuthService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly profileService = inject(ProfileService);
  private readonly companyService = inject(CompanyService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);
  protected readonly sidebarPreference = inject(SidebarPreferenceService);

  private readonly company = signal<CompanyProfile | null>(null);
  readonly companyName = computed(() => this.company()?.legalName ?? '');
  readonly companyLogoUrl = computed(() => this.company()?.logoUrl ?? null);
  readonly canManageCompany = computed(() =>
    this.permissionsService.hasPermission('companies.edit'),
  );

  // F7: el chatbot en el menú se gatea por entitlement de plan, no por
  // environment flag. Arranca en `false` (oculto) hasta que llegue la
  // respuesta de `/api/subscription` — evita un parpadeo mostrando algo que
  // luego se oculta.
  private readonly chatbotEnabled = signal(false);

  readonly menuItems = MENU_ITEMS;

  // Filtrar menú según permisos del usuario
  readonly filteredMenuItems = computed(() => {
    return this.menuItems
      .filter((item) => item.route !== '/chatbot' || this.chatbotEnabled())
      .filter((item) => {
        // Si no tiene permisos requeridos, se muestra siempre
        if (!item.permissions || item.permissions.length === 0) {
          return true;
        }
        // Si tiene permisos, verificar que el usuario tenga al menos uno
        return this.permissionsService.hasAnyPermission(item.permissions);
      });
  });

  readonly menuGroups = computed(() => groupMenuItems(this.filteredMenuItems()));

  readonly currentUser: Signal<AuthUser | null>;
  readonly currentRoute = signal('');

  readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return 'LS';
    }

    if (user.firstName || user.lastName) {
      const first = user.firstName?.charAt(0) ?? '';
      const last = user.lastName?.charAt(0) ?? '';
      return (first + last).toUpperCase() || 'LS';
    }

    if (!user.email) {
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

  readonly userDisplayName = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return '';
    }
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return fullName || user.email;
  });

  readonly userAvatarUrl = computed(
    () => this.currentUser()?.avatarUrl ?? null,
  );

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

  private readonly activeMenuItem = computed(() => {
    const route = this.currentRoute();
    return this.filteredMenuItems().find((item) => route.startsWith(item.route));
  });

  readonly activeRouteLabel = computed(
    () => this.activeMenuItem()?.label ?? 'Panel central',
  );

  readonly activeGroupLabel = computed(() => {
    const item = this.activeMenuItem();
    return item ? MENU_GROUP_LABELS[item.group] : null;
  });

  // Detectar si el usuario no tiene roles asignados
  readonly hasNoRoles = computed(() => {
    const user = this.currentUser();
    return user && (!user.roles || user.roles.length === 0);
  });

  constructor() {
    this.currentUser = this.authService.currentUser;
    this.currentRoute.set(this.router.url);

    this.companyService.getCompany().subscribe({
      next: (company) => this.company.set(company),
      error: () => {},
    });

    this.subscriptionService.getEntitlements().subscribe({
      next: (entitlements) =>
        this.chatbotEnabled.set(entitlements.features.chatbot),
      error: () => {},
    });

    this.notificationsService.connectStream();

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentRoute.set(event.urlAfterRedirects));
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleTheme(): void {
    this.themeService.toggle();
    this.profileService
      .updateMe({ themePreference: this.themeService.theme() })
      .subscribe({
        error: () => {
          // El cambio ya se aplicó localmente; si falla la sincronización, se reintentará en el próximo toggle o desde el perfil.
        },
      });
  }

  handleLogout(): void {
    this.notificationsService.disconnectStream();
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

  exitImpersonation(): void {
    this.authService.exitImpersonation().subscribe({
      next: () => this.router.navigate(['/admin/tenants']),
      error: () => this.router.navigate(['/admin/tenants']),
    });
  }
}
