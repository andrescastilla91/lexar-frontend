import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompanyNotificationSetting,
  NotificationItem,
  NotificationListResponse,
  NotificationPreferenceItem,
} from '../models/notification.model';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'not-subscribed';

@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  private readonly unread = signal(0);
  readonly unreadCount = this.unread.asReadonly();

  private readonly latest = signal<NotificationItem[]>([]);
  readonly latestNotifications = this.latest.asReadonly();

  private eventSource?: EventSource;

  connectStream(): void {
    if (this.eventSource) {
      return;
    }

    this.eventSource = new EventSource(`${this.apiUrl}/stream`, { withCredentials: true });
    this.eventSource.onopen = () => {
      this.list(1, 10).subscribe({ error: () => {} });
    };
    this.eventSource.addEventListener('notification', (event: MessageEvent<string>) => {
      const notification = JSON.parse(event.data) as NotificationItem;
      this.latest.update((items) => [notification, ...items].slice(0, 10));
      this.unread.update((count) => count + 1);
    });
  }

  disconnectStream(): void {
    this.eventSource?.close();
    this.eventSource = undefined;
    this.unread.set(0);
    this.latest.set([]);
  }

  list(page: number, limit: number): Observable<NotificationListResponse> {
    return this.http
      .get<NotificationListResponse>(this.apiUrl, {
        params: { page: String(page), limit: String(limit) },
      })
      .pipe(
        tap((res) => {
          this.unread.set(res.unreadCount);
          if (page === 1) {
            this.latest.set(res.data);
          }
        }),
      );
  }

  markRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.unread.update((count) => Math.max(0, count - 1));
        this.latest.update((items) =>
          items.map((item) =>
            item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
          ),
        );
      }),
    );
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.unread.set(0);
        this.latest.update((items) =>
          items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
        );
      }),
    );
  }

  getPreferences(): Observable<NotificationPreferenceItem[]> {
    return this.http.get<NotificationPreferenceItem[]>(`${this.apiUrl}/preferences`);
  }

  updatePreferences(preferences: NotificationPreferenceItem[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/preferences`, {
      preferences: preferences.map((p) => ({
        type: p.type,
        inAppEnabled: p.inAppEnabled,
        emailEnabled: p.emailEnabled,
        pushEnabled: p.pushEnabled,
      })),
    });
  }

  getCompanySettings(): Observable<CompanyNotificationSetting[]> {
    return this.http.get<CompanyNotificationSetting[]>(`${this.apiUrl}/company-settings`);
  }

  updateCompanySettings(settings: { type: string; channel: string; enabled: boolean }[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/company-settings`, { settings });
  }

  private subscribePush(subscription: PushSubscriptionJSON): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/push/subscribe`, {
      endpoint: subscription.endpoint,
      p256dhKey: subscription.keys?.['p256dh'],
      authKey: subscription.keys?.['auth'],
      userAgent: navigator.userAgent,
    });
  }

  private unsubscribePushRequest(endpoint: string): Observable<void> {
    return this.http.request<void>('delete', `${this.apiUrl}/push/subscribe`, {
      body: { endpoint },
    });
  }

  isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  async getPushState(): Promise<PushState> {
    if (!this.isPushSupported()) {
      return 'unsupported';
    }
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ? 'subscribed' : 'not-subscribed';
  }

  async enablePush(): Promise<void> {
    const { publicKey } = await firstValueFrom(
      this.http.get<{ publicKey: string | null }>(`${this.apiUrl}/push/public-key`),
    );

    if (!publicKey) {
      throw new Error('El servidor no tiene configurado el canal push.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permiso de notificaciones no concedido.');
    }

    const registration = await navigator.serviceWorker.register('/push-sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await firstValueFrom(this.subscribePush(subscription.toJSON()));
  }

  async disablePush(): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) {
      return;
    }
    await firstValueFrom(this.unsubscribePushRequest(subscription.endpoint));
    await subscription.unsubscribe();
  }

  ngOnDestroy(): void {
    this.disconnectStream();
  }
}
