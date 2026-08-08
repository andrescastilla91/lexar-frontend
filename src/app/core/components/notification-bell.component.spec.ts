import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { NotificationBellComponent } from './notification-bell.component';
import { NotificationsService } from '../services/notifications.service';

describe('NotificationBellComponent', () => {
  let fixture: ComponentFixture<NotificationBellComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [
        provideRouter([]),
        {
          provide: NotificationsService,
          useValue: {
            unreadCount: signal(0),
            latestNotifications: signal([]),
            markAllRead: jest.fn().mockReturnValue(of(undefined)),
            markRead: jest.fn().mockReturnValue(of(undefined)),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  function openBell(): void {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  it('abre el panel de notificaciones al hacer click en la campana', () => {
    openBell();

    expect(fixture.componentInstance.open()).toBe(true);
  });

  // Bug corregido 2026-08-08: mismo problema que UserMenuComponent — el
  // panel solo se cerraba con click en una opción, no con click fuera.
  it('cierra el panel al hacer click fuera, en cualquier parte del documento', () => {
    openBell();

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(false);
    outside.remove();
  });
});
