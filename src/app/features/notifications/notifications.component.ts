import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationsService } from '../../core/services/notifications.service';
import { NotificationItem } from '../../core/models/notification.model';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-text">Notificaciones</h1>
          <p class="text-sm text-subtle">Historial de avisos de tu cuenta.</p>
        </div>
        @if (items().length > 0) {
          <button
            type="button"
            class="rounded-md border border-default px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-muted"
            (click)="markAllRead()"
          >
            Marcar todas leídas
          </button>
        }
      </div>

      <div class="overflow-hidden rounded-lg border border-default bg-surface shadow-card">
        @for (item of items(); track item.id) {
          <button
            type="button"
            class="flex w-full flex-col gap-1 border-b border-default px-4 py-4 text-left transition last:border-b-0 hover:bg-surface-muted"
            [class.bg-surface-muted]="!item.readAt"
            (click)="open(item)"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-text">{{ item.title }}</p>
              <p class="flex-shrink-0 text-xs text-subtle">{{ item.createdAt | date: 'short' }}</p>
            </div>
            <p class="text-sm text-muted">{{ item.body }}</p>
          </button>
        } @empty {
          <p class="px-4 py-10 text-center text-sm text-subtle">
            {{ loading() ? 'Cargando...' : 'No tienes notificaciones todavía.' }}
          </p>
        }
      </div>

      @if (hasMore()) {
        <div class="flex justify-center">
          <button
            type="button"
            class="rounded-md border border-default px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted"
            [disabled]="loading()"
            (click)="loadMore()"
          >
            {{ loading() ? 'Cargando...' : 'Ver más' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly items = signal<NotificationItem[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  private page = 1;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.notificationsService.list(this.page, PAGE_SIZE).subscribe({
      next: (res) => {
        this.items.update((current) => (this.page === 1 ? res.data : [...current, ...res.data]));
        this.hasMore.set(this.page * PAGE_SIZE < res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore(): void {
    this.page += 1;
    this.load();
  }

  markAllRead(): void {
    this.notificationsService.markAllRead().subscribe({
      next: () => {
        this.items.update((items) =>
          items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
        );
      },
      error: () => {},
    });
  }

  open(item: NotificationItem): void {
    if (!item.readAt) {
      this.notificationsService.markRead(item.id).subscribe({
        next: () => {
          this.items.update((items) =>
            items.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)),
          );
        },
        error: () => {},
      });
    }
    if (item.linkPath) {
      this.router.navigateByUrl(item.linkPath);
    }
  }
}
