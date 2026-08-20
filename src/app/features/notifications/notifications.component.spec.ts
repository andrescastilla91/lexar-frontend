import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationsComponent } from './notifications.component';
import { NotificationsService } from '../../core/services/notifications.service';
import { NotificationItem, NotificationListResponse } from '../../core/models/notification.model';

describe('NotificationsComponent', () => {
  let notificationsServiceMock: { list: jest.Mock; markAllRead: jest.Mock; markRead: jest.Mock };
  let navigateByUrlSpy: jest.SpyInstance;

  function makeItem(overrides: Partial<NotificationItem> = {}): NotificationItem {
    return {
      id: 'n1',
      type: 'deadline_reminder',
      title: 'Plazo próximo a vencer',
      body: 'La audiencia inicial vence mañana.',
      linkPath: null,
      readAt: null,
      createdAt: '2026-08-19T10:00:00Z',
      ...overrides,
    };
  }

  function makeResponse(overrides: Partial<NotificationListResponse> = {}): NotificationListResponse {
    return {
      data: [makeItem()],
      total: 1,
      unreadCount: 1,
      page: 1,
      limit: 20,
      ...overrides,
    };
  }

  function configure(overrides: Partial<typeof notificationsServiceMock> = {}) {
    notificationsServiceMock = {
      list: jest.fn().mockReturnValue(of(makeResponse())),
      markAllRead: jest.fn().mockReturnValue(of(undefined)),
      markRead: jest.fn().mockReturnValue(of(undefined)),
      ...overrides,
    };

    return TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [provideRouter([]), { provide: NotificationsService, useValue: notificationsServiceMock }],
    })
      .compileComponents()
      .then(() => {
        const router = TestBed.inject(Router);
        navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('al iniciar, carga la primera página de notificaciones', async () => {
    await configure();
    const component = createComponent();

    expect(notificationsServiceMock.list).toHaveBeenCalledWith(1, 20);
    expect(component.items()).toEqual([makeItem()]);
    expect(component.loading()).toBe(false);
  });

  it('si el total supera lo cargado, expone hasMore en true', async () => {
    await configure({
      list: jest.fn().mockReturnValue(of(makeResponse({ total: 45 }))),
    });
    const component = createComponent();

    expect(component.hasMore()).toBe(true);
  });

  it('si ya se cargó todo, hasMore es false', async () => {
    await configure({
      list: jest.fn().mockReturnValue(of(makeResponse({ total: 1 }))),
    });
    const component = createComponent();

    expect(component.hasMore()).toBe(false);
  });

  it('en error de carga, deja de mostrar el spinner sin romper', async () => {
    await configure({
      list: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    const component = createComponent();

    expect(component.loading()).toBe(false);
    expect(component.items()).toEqual([]);
  });

  it('loadMore acumula la siguiente página en vez de reemplazar', async () => {
    const page1 = makeResponse({ data: [makeItem({ id: 'n1' })], total: 3, page: 1 });
    const page2 = makeResponse({ data: [makeItem({ id: 'n2' })], total: 3, page: 2 });
    await configure({
      list: jest.fn().mockReturnValueOnce(of(page1)).mockReturnValueOnce(of(page2)),
    });
    const component = createComponent();
    expect(component.items().map((i) => i.id)).toEqual(['n1']);

    component.loadMore();

    expect(notificationsServiceMock.list).toHaveBeenCalledWith(2, 20);
    expect(component.items().map((i) => i.id)).toEqual(['n1', 'n2']);
  });

  it('markAllRead marca todos los items locales como leídos', async () => {
    const unread = makeItem({ id: 'n1', readAt: null });
    await configure({
      list: jest.fn().mockReturnValue(of(makeResponse({ data: [unread] }))),
    });
    const component = createComponent();

    component.markAllRead();

    expect(notificationsServiceMock.markAllRead).toHaveBeenCalled();
    expect(component.items()[0].readAt).not.toBeNull();
  });

  it('markAllRead en error del backend, no rompe ni cambia el estado local', async () => {
    const unread = makeItem({ id: 'n1', readAt: null });
    await configure({
      list: jest.fn().mockReturnValue(of(makeResponse({ data: [unread] }))),
      markAllRead: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    const component = createComponent();

    component.markAllRead();

    expect(component.items()[0].readAt).toBeNull();
  });

  it('open en un item no leído, lo marca como leído', async () => {
    const unread = makeItem({ id: 'n1', readAt: null, linkPath: null });
    await configure({
      list: jest.fn().mockReturnValue(of(makeResponse({ data: [unread] }))),
    });
    const component = createComponent();

    component.open(unread);

    expect(notificationsServiceMock.markRead).toHaveBeenCalledWith('n1');
    expect(component.items()[0].readAt).not.toBeNull();
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('open en un item ya leído, no vuelve a llamar a markRead', async () => {
    const read = makeItem({ id: 'n1', readAt: '2026-08-19T11:00:00Z' });
    await configure({
      list: jest.fn().mockReturnValue(of(makeResponse({ data: [read] }))),
    });
    const component = createComponent();

    component.open(read);

    expect(notificationsServiceMock.markRead).not.toHaveBeenCalled();
  });

  it('open con linkPath, navega hacia ese path', async () => {
    const item = makeItem({ id: 'n1', readAt: null, linkPath: '/procesos/proc-1' });
    await configure({
      list: jest.fn().mockReturnValue(of(makeResponse({ data: [item] }))),
    });
    const component = createComponent();

    component.open(item);

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/procesos/proc-1');
  });

  it('open en error de markRead, no rompe y no navega si falla antes', async () => {
    const item = makeItem({ id: 'n1', readAt: null, linkPath: '/procesos/proc-1' });
    await configure({
      list: jest.fn().mockReturnValue(of(makeResponse({ data: [item] }))),
      markRead: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    const component = createComponent();

    component.open(item);

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/procesos/proc-1');
    expect(component.items()[0].readAt).toBeNull();
  });
});
