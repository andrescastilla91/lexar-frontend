import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationsService } from './notifications.service';
import { NotificationItem } from '../models/notification.model';
import { environment } from '../../../environments/environment';

/** Deja correr suficientes vueltas de microtask queue para que las cadenas
 * async/await con múltiples promesas encadenadas (mocks resueltos) terminen
 * de propagarse antes de hacer las aserciones. */
async function flushMicrotasks(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  private readonly listeners: Record<string, ((event: MessageEvent<string>) => void)[]> = {};
  closed = false;

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (event: MessageEvent<string>) => void): void {
    this.listeners[type] = this.listeners[type] ?? [];
    this.listeners[type].push(cb);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, event: MessageEvent<string>): void {
    (this.listeners[type] ?? []).forEach((cb) => cb(event));
  }
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/notifications`;

  const notification: NotificationItem = {
    id: 'notif-1',
    type: 'deadline.due-soon',
    title: 'Plazo próximo',
    body: 'La audiencia es mañana',
    linkPath: '/deadlines/1',
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    FakeEventSource.instances = [];
    (global as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  describe('connectStream / disconnectStream', () => {
    it('connectStream crea un único EventSource incluso si se llama dos veces', () => {
      service.connectStream();
      service.connectStream();

      expect(FakeEventSource.instances.length).toBe(1);
    });

    it('al abrir la conexión hace list(1, 10) en segundo plano', () => {
      service.connectStream();
      const instance = FakeEventSource.instances[0];

      instance.onopen?.();

      const req = httpMock.expectOne((r) => r.url === apiUrl && r.params.get('page') === '1' && r.params.get('limit') === '10');
      req.flush({ data: [notification], total: 1, unreadCount: 3, page: 1, limit: 10 });

      expect(service.unreadCount()).toBe(3);
      expect(service.latestNotifications()).toEqual([notification]);
    });

    it('un evento "notification" agrega el item al frente y suma unreadCount', () => {
      service.connectStream();
      const instance = FakeEventSource.instances[0];

      instance.emit('notification', { data: JSON.stringify(notification) } as MessageEvent<string>);

      expect(service.latestNotifications()).toEqual([notification]);
      expect(service.unreadCount()).toBe(1);
    });

    it('limita latestNotifications a los últimos 10 elementos', () => {
      service.connectStream();
      const instance = FakeEventSource.instances[0];

      for (let i = 0; i < 12; i++) {
        instance.emit('notification', { data: JSON.stringify({ ...notification, id: `n-${i}` }) } as MessageEvent<string>);
      }

      expect(service.latestNotifications().length).toBe(10);
      expect(service.unreadCount()).toBe(12);
    });

    it('disconnectStream cierra el EventSource y limpia el estado', () => {
      service.connectStream();
      const instance = FakeEventSource.instances[0];
      instance.emit('notification', { data: JSON.stringify(notification) } as MessageEvent<string>);

      service.disconnectStream();

      expect(instance.closed).toBe(true);
      expect(service.unreadCount()).toBe(0);
      expect(service.latestNotifications()).toEqual([]);
    });

    it('disconnectStream sin conexión activa no lanza error', () => {
      expect(() => service.disconnectStream()).not.toThrow();
    });

    it('ngOnDestroy desconecta el stream', () => {
      service.connectStream();
      const instance = FakeEventSource.instances[0];

      service.ngOnDestroy();

      expect(instance.closed).toBe(true);
    });
  });

  describe('list', () => {
    it('hace GET con page y limit, y actualiza unreadCount', () => {
      let result: unknown;
      service.list(2, 5).subscribe((r) => (result = r));

      const req = httpMock.expectOne((r) => r.url === apiUrl && r.params.get('page') === '2' && r.params.get('limit') === '5');
      const response = { data: [notification], total: 1, unreadCount: 7, page: 2, limit: 5 };
      req.flush(response);

      expect(result).toEqual(response);
      expect(service.unreadCount()).toBe(7);
    });

    it('solo actualiza latestNotifications cuando page es 1', () => {
      service.list(2, 5).subscribe();

      httpMock.expectOne(() => true).flush({ data: [notification], total: 1, unreadCount: 1, page: 2, limit: 5 });

      expect(service.latestNotifications()).toEqual([]);
    });
  });

  describe('markRead', () => {
    it('hace PATCH a /:id/read, decrementa unread y marca readAt', () => {
      service.list(1, 10).subscribe();
      httpMock.expectOne(() => true).flush({ data: [notification], total: 1, unreadCount: 1, page: 1, limit: 10 });

      service.markRead('notif-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/notif-1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null);

      expect(service.unreadCount()).toBe(0);
      expect(service.latestNotifications()[0].readAt).not.toBeNull();
    });

    it('no deja unreadCount negativo', () => {
      service.markRead('notif-1').subscribe();

      httpMock.expectOne(`${apiUrl}/notif-1/read`).flush(null);

      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('markAllRead', () => {
    it('hace POST a /read-all, pone unread en 0 y marca todos los readAt', () => {
      service.list(1, 10).subscribe();
      httpMock.expectOne(() => true).flush({ data: [notification], total: 1, unreadCount: 1, page: 1, limit: 10 });

      service.markAllRead().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/read-all`);
      expect(req.request.method).toBe('POST');
      req.flush(null);

      expect(service.unreadCount()).toBe(0);
      expect(service.latestNotifications().every((n) => n.readAt !== null)).toBe(true);
    });
  });

  describe('preferencias', () => {
    it('getPreferences hace GET a /preferences', () => {
      service.getPreferences().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/preferences`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('updatePreferences hace PATCH mapeando solo los campos esperados', () => {
      service
        .updatePreferences([
          {
            type: 'deadline.due-soon',
            description: 'x',
            inAppEnabled: true,
            emailEnabled: false,
            pushEnabled: true,
            availableChannels: ['inApp', 'email', 'push'],
          },
        ])
        .subscribe();

      const req = httpMock.expectOne(`${apiUrl}/preferences`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        preferences: [{ type: 'deadline.due-soon', inAppEnabled: true, emailEnabled: false, pushEnabled: true }],
      });
      req.flush(null);
    });

    it('getCompanySettings hace GET a /company-settings', () => {
      service.getCompanySettings().subscribe();
      const req = httpMock.expectOne(`${apiUrl}/company-settings`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('updateCompanySettings hace PATCH con settings', () => {
      const settings = [{ type: 'deadline.due-soon', channel: 'email', enabled: true }];
      service.updateCompanySettings(settings).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/company-settings`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ settings });
      req.flush(null);
    });
  });

  describe('push', () => {
    afterEach(() => {
      Reflect.deleteProperty(navigator, 'serviceWorker');
      Reflect.deleteProperty(window, 'PushManager');
      Reflect.deleteProperty(window, 'Notification');
    });

    function definePushSupport(): void {
      Object.defineProperty(window, 'PushManager', { value: class {}, configurable: true });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: jest.fn(),
          getRegistration: jest.fn(),
        },
        configurable: true,
      });
    }

    it('isPushSupported es false si falta serviceWorker o PushManager', () => {
      expect(service.isPushSupported()).toBe(false);
    });

    it('isPushSupported es true cuando ambos están disponibles', () => {
      definePushSupport();
      expect(service.isPushSupported()).toBe(true);
    });

    it('getPushState retorna "unsupported" si el navegador no soporta push', async () => {
      const state = await service.getPushState();
      expect(state).toBe('unsupported');
    });

    it('getPushState retorna "denied" cuando el permiso fue denegado', async () => {
      definePushSupport();
      Object.defineProperty(window, 'Notification', { value: { permission: 'denied' }, configurable: true });

      const state = await service.getPushState();
      expect(state).toBe('denied');
    });

    it('getPushState retorna "subscribed" si ya existe una suscripción activa', async () => {
      definePushSupport();
      Object.defineProperty(window, 'Notification', { value: { permission: 'granted' }, configurable: true });
      (navigator.serviceWorker.getRegistration as jest.Mock).mockResolvedValue({
        pushManager: { getSubscription: jest.fn().mockResolvedValue({ endpoint: 'https://push/x' }) },
      });

      const state = await service.getPushState();
      expect(state).toBe('subscribed');
    });

    it('getPushState retorna "not-subscribed" si no hay suscripción', async () => {
      definePushSupport();
      Object.defineProperty(window, 'Notification', { value: { permission: 'granted' }, configurable: true });
      (navigator.serviceWorker.getRegistration as jest.Mock).mockResolvedValue({
        pushManager: { getSubscription: jest.fn().mockResolvedValue(null) },
      });

      const state = await service.getPushState();
      expect(state).toBe('not-subscribed');
    });

    it('enablePush lanza error si el backend no tiene publicKey configurada', async () => {
      const promise = service.enablePush();

      httpMock.expectOne(`${apiUrl}/push/public-key`).flush({ publicKey: null });

      await expect(promise).rejects.toThrow('El servidor no tiene configurado el canal push.');
    });

    it('enablePush lanza error si el usuario no concede el permiso', async () => {
      definePushSupport();
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default', requestPermission: jest.fn().mockResolvedValue('denied') },
        configurable: true,
      });

      const promise = service.enablePush();
      httpMock.expectOne(`${apiUrl}/push/public-key`).flush({ publicKey: 'QUJDRA' });

      await expect(promise).rejects.toThrow('Permiso de notificaciones no concedido.');
    });

    it('enablePush registra el service worker y suscribe cuando todo sale bien', async () => {
      definePushSupport();
      Object.defineProperty(window, 'Notification', {
        value: { permission: 'default', requestPermission: jest.fn().mockResolvedValue('granted') },
        configurable: true,
      });

      const subscribeMock = jest.fn().mockResolvedValue({
        endpoint: 'https://push/endpoint',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
        toJSON() {
          return { endpoint: this.endpoint, keys: this.keys };
        },
      });
      (navigator.serviceWorker.register as jest.Mock).mockResolvedValue({
        pushManager: { subscribe: subscribeMock },
      });

      const promise = service.enablePush();

      httpMock.expectOne(`${apiUrl}/push/public-key`).flush({ publicKey: 'QUJDRA' });

      await flushMicrotasks();

      const subscribeReq = httpMock.expectOne(`${apiUrl}/push/subscribe`);
      expect(subscribeReq.request.method).toBe('POST');
      expect(subscribeReq.request.body).toEqual({
        endpoint: 'https://push/endpoint',
        p256dhKey: 'p256dh-key',
        authKey: 'auth-key',
        userAgent: navigator.userAgent,
      });
      subscribeReq.flush(null);

      await promise;
    });

    it('disablePush no hace nada si no hay suscripción activa', async () => {
      definePushSupport();
      (navigator.serviceWorker.getRegistration as jest.Mock).mockResolvedValue({
        pushManager: { getSubscription: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.disablePush()).resolves.toBeUndefined();
    });

    it('disablePush desuscribe cuando hay una suscripción activa', async () => {
      definePushSupport();
      const unsubscribeMock = jest.fn().mockResolvedValue(true);
      (navigator.serviceWorker.getRegistration as jest.Mock).mockResolvedValue({
        pushManager: {
          getSubscription: jest.fn().mockResolvedValue({ endpoint: 'https://push/endpoint', unsubscribe: unsubscribeMock }),
        },
      });

      const promise = service.disablePush();

      await flushMicrotasks();

      const req = httpMock.expectOne(`${apiUrl}/push/subscribe`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual({ endpoint: 'https://push/endpoint' });
      req.flush(null);

      await promise;

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});
