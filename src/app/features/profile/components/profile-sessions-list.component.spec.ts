import { TestBed } from '@angular/core/testing';
import { ProfileSessionsListComponent } from './profile-sessions-list.component';
import { SessionInfo } from '../../../core/models/profile.model';

describe('ProfileSessionsListComponent', () => {
  const currentSession: SessionInfo = {
    id: 's1',
    userAgent: 'Chrome en Windows',
    ip: '127.0.0.1',
    createdAt: '2026-01-01T00:00:00.000Z',
    current: true,
  };

  const otherSession: SessionInfo = {
    id: 's2',
    userAgent: 'Safari en iPhone',
    ip: '10.0.0.2',
    createdAt: '2026-01-02T00:00:00.000Z',
    current: false,
  };

  function createComponent() {
    const fixture = TestBed.createComponent(ProfileSessionsListComponent);
    return fixture;
  }

  it('muestra el estado de carga', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando sesiones');
  });

  it('muestra el mensaje de vacío cuando no hay sesiones', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('sessions', []);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay sesiones activas');
  });

  it('no muestra botón de cerrar sesión para la sesión actual', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('sessions', [currentSession]);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Actual');
  });

  it('emite revoke con el id al hacer clic en cerrar sesión de otra sesión', () => {
    const fixture = createComponent();
    fixture.componentRef.setInput('sessions', [currentSession, otherSession]);
    fixture.detectChanges();

    const revokeSpy = jest.fn();
    fixture.componentInstance.revoke.subscribe(revokeSpy);

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();

    expect(revokeSpy).toHaveBeenCalledWith('s2');
  });
});
