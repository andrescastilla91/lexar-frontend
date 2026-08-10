import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationsService } from '../services/notifications.service';
import { ClickOutsideDirective } from '../directives/click-outside.directive';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [RouterLink, ClickOutsideDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" appClickOutside (appClickOutside)="close()">
      <button
        type="button"
        (click)="toggle()"
        class="relative rounded-md border border-default p-2 text-muted transition hover:bg-surface-muted"
        aria-label="Notificaciones"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        @if (notificationsService.unreadCount() > 0) {
          <span class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {{ notificationsService.unreadCount() > 9 ? '9+' : notificationsService.unreadCount() }}
          </span>
        }
      </button>

      @if (open()) {
        <div class="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border border-default bg-surface shadow-raised">
          <div class="flex items-center justify-between border-b border-default px-4 py-2.5">
            <p class="text-sm font-semibold text-text">Notificaciones</p>
            @if (notificationsService.unreadCount() > 0) {
              <button type="button" class="text-xs font-medium text-accent hover:underline" (click)="markAllRead()">
                Marcar todas leídas
              </button>
            }
          </div>

          <div class="max-h-96 overflow-y-auto">
            @for (item of notificationsService.latestNotifications(); track item.id) {
              <button
                type="button"
                class="flex w-full flex-col gap-0.5 border-b border-default px-4 py-3 text-left transition hover:bg-surface-muted"
                [class.bg-surface-muted]="!item.readAt"
                (click)="openNotification(item)"
              >
                <p class="text-sm font-medium text-text">{{ item.title }}</p>
                <p class="line-clamp-2 text-xs text-subtle">{{ item.body }}</p>
              </button>
            } @empty {
              <p class="px-4 py-6 text-center text-sm text-subtle">Sin notificaciones por ahora.</p>
            }
          </div>

          <div class="border-t border-default px-4 py-2.5">
            <a routerLink="/notificaciones" (click)="close()" class="text-xs font-medium text-accent hover:underline">
              Ver todas
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBellComponent {
  protected readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly open = signal(false);

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  markAllRead(): void {
    this.notificationsService.markAllRead().subscribe({ error: () => {} });
  }

  openNotification(item: { id: string; readAt: string | null; linkPath: string | null }): void {
    if (!item.readAt) {
      this.notificationsService.markRead(item.id).subscribe({ error: () => {} });
    }
    this.close();
    if (item.linkPath) {
      this.router.navigateByUrl(item.linkPath);
    }
  }
}
