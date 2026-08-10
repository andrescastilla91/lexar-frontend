import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from './avatar.component';
import { ClickOutsideDirective } from '../directives/click-outside.directive';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [RouterLink, AvatarComponent, ClickOutsideDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" appClickOutside (appClickOutside)="close()">
      <button
        type="button"
        (click)="toggle()"
        class="flex items-center gap-3 rounded-lg border border-default bg-surface px-3 py-2 shadow-card transition hover:bg-surface-muted"
      >
        <app-avatar [url]="avatarUrl()" [initials]="initials()" [size]="32" />
        <div class="hidden min-w-0 md:block text-left">
          <p class="truncate text-sm font-semibold text-text">{{ displayName() }}</p>
          <p class="truncate text-xs text-subtle">{{ roleLabel() }}</p>
        </div>
        <svg class="hidden h-4 w-4 text-subtle md:block" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      @if (open()) {
        <div class="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-lg border border-default bg-surface shadow-raised">
          @if (companyName()) {
            <div class="flex items-center gap-2 border-b border-default bg-surface-muted px-4 py-2.5">
              @if (companyLogoUrl()) {
                <img [src]="companyLogoUrl()" alt="Logo" class="h-5 w-5 rounded object-contain" />
              }
              <p class="truncate text-xs font-semibold uppercase tracking-wide text-subtle">{{ companyName() }}</p>
            </div>
          }
          <div class="border-b border-default px-4 py-3">
            <p class="truncate text-sm font-semibold text-text">{{ displayName() }}</p>
            <p class="truncate text-xs text-subtle">{{ email() }}</p>
          </div>
          <nav class="py-1">
            <a
              routerLink="/perfil"
              (click)="close()"
              class="flex items-center gap-2 px-4 py-2 text-sm text-muted transition hover:bg-surface-muted hover:text-text"
            >
              Mi perfil
            </a>
            @if (showSettings()) {
              <a
                routerLink="/configuracion"
                (click)="close()"
                class="flex items-center gap-2 px-4 py-2 text-sm text-muted transition hover:bg-surface-muted hover:text-text"
              >
                Configuración de la empresa
              </a>
            }
          </nav>
          <div class="border-t border-default py-1">
            <button
              type="button"
              (click)="onLogout()"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-danger transition hover:bg-danger-tint"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class UserMenuComponent {
  avatarUrl = input<string | null>(null);
  initials = input('');
  displayName = input('');
  email = input('');
  roleLabel = input('');
  companyName = input('');
  companyLogoUrl = input<string | null>(null);
  showSettings = input(false);

  logout = output<void>();

  readonly open = signal(false);

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }

  onLogout(): void {
    this.close();
    this.logout.emit();
  }
}
