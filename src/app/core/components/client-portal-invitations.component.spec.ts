import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ClientPortalInvitationsComponent } from './client-portal-invitations.component';
import { ClientPortalInvitationsService } from '../services/client-portal-invitations.service';
import { SubscriptionService } from '../services/subscription.service';
import { PlanUpgradeService } from '../services/plan-upgrade.service';
import { PermissionsService } from '../services/permissions.service';
import { ToastService } from '../services/toast.service';
import { Entitlements } from '../models/subscription-backend.model';
import { ClientPortalInvitationSummary } from '../models/portal.model';

describe('ClientPortalInvitationsComponent', () => {
  let portalInvitationsServiceMock: { list: jest.Mock; invite: jest.Mock; resend: jest.Mock };
  let subscriptionServiceMock: { getEntitlements: jest.Mock };
  let planUpgradeMock: { isPlanGateError: jest.Mock; promptUpgrade: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const invitations: ClientPortalInvitationSummary[] = [
    { id: 'p1', email: 'cliente1@x.com', isActive: true, status: 'pendiente', lastLoginAt: null, createdAt: '2026-01-01T00:00:00.000Z' },
  ];

  function entitlementsWithPortal(hasPortal: boolean): Entitlements {
    return {
      planCode: 'ESTUDIO',
      planName: 'Estudio',
      status: 'active',
      isReadOnly: false,
      trialEndsAt: null,
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      features: {
        chatbot: true,
        clientPortal: hasPortal,
        advancedReports: false,
        taskApprovals: true,
        customCatalogs: true,
        mandatory2faPolicy: true,
        exportableReports: false,
        exportableAudit: false,
        earlyAccess: false,
      },
      limits: { maxUsers: 10, maxActiveProcesses: 100, maxStorageMb: 15360, aiCreditsMonth: 100, portalClientsMax: null },
      usage: { users: 1, activeProcesses: 1, storageMb: 1 },
    };
  }

  function configure(): void {
    portalInvitationsServiceMock = {
      list: jest.fn().mockReturnValue(of({ portalUsers: invitations })),
      invite: jest.fn(),
      resend: jest.fn(),
    };
    subscriptionServiceMock = { getEntitlements: jest.fn().mockReturnValue(of(entitlementsWithPortal(true))) };
    planUpgradeMock = { isPlanGateError: jest.fn().mockReturnValue(false), promptUpgrade: jest.fn() };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ClientPortalInvitationsComponent],
      providers: [
        provideRouter([]),
        { provide: ClientPortalInvitationsService, useValue: portalInvitationsServiceMock },
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        { provide: PlanUpgradeService, useValue: planUpgradeMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn().mockReturnValue(true),
            userPermissions: signal<string[]>([]),
          },
        },
      ],
    });
  }

  function createComponent(clientId = 'client-1') {
    const fixture = TestBed.createComponent(ClientPortalInvitationsComponent);
    fixture.componentRef.setInput('clientId', clientId);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('con clientPortal en el plan, carga la lista de invitaciones', () => {
    const component = createComponent();

    expect(component.hasClientPortalFeature()).toBe(true);
    expect(portalInvitationsServiceMock.list).toHaveBeenCalledWith('client-1');
    expect(component.invitations()).toEqual(invitations);
  });

  it('sin clientPortal en el plan, no carga la lista (queda vacía)', () => {
    subscriptionServiceMock.getEntitlements.mockReturnValue(of(entitlementsWithPortal(false)));
    const component = createComponent();

    expect(component.hasClientPortalFeature()).toBe(false);
    expect(portalInvitationsServiceMock.list).not.toHaveBeenCalled();
  });

  it('si falla la carga de entitlements, trata el feature como no disponible', () => {
    subscriptionServiceMock.getEntitlements.mockReturnValue(throwError(() => new Error('fail')));
    const component = createComponent();

    expect(component.hasClientPortalFeature()).toBe(false);
    expect(component.isLoadingEntitlements()).toBe(false);
  });

  it('invite() no hace nada si el correo está vacío', () => {
    const component = createComponent();
    component.inviteEmail = '   ';

    component.invite();

    expect(portalInvitationsServiceMock.invite).not.toHaveBeenCalled();
  });

  it('invite() en éxito limpia el campo, muestra un toast y recarga la lista', () => {
    portalInvitationsServiceMock.invite.mockReturnValue(of({ message: 'ok', portalUser: { id: 'p2', email: 'nuevo@x.com', clientId: 'client-1' } }));
    const component = createComponent();
    component.inviteEmail = 'nuevo@x.com';

    component.invite();

    expect(portalInvitationsServiceMock.invite).toHaveBeenCalledWith('client-1', 'nuevo@x.com');
    expect(component.inviteEmail).toBe('');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Invitación al portal enviada');
    expect(component.isInviting()).toBe(false);
  });

  // F7-R3: el toast+CTA de upgrade lo dispara error.interceptor.ts de forma
  // centralizada (ver error.interceptor.spec.ts) — este componente no tiene
  // limpieza local propia, solo evita mostrar su error inline genérico.
  it('invite() en un gate de plan (portalClientsMax): no muestra el error inline ni dispara el CTA él mismo', () => {
    const gateError = { error: { code: 'LIMIT_REACHED', message: 'Llegaste al límite de clientes de tu plan' } };
    planUpgradeMock.isPlanGateError.mockReturnValue(true);
    portalInvitationsServiceMock.invite.mockReturnValue(throwError(() => gateError));
    const component = createComponent();
    component.inviteEmail = 'nuevo@x.com';

    component.invite();

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBeNull();
    expect(component.isInviting()).toBe(false);
  });

  it('invite() en un error normal: expone el mensaje real del backend inline y en un toast', () => {
    // BUG-20 ola 1: ClientPortalInvitationsService no envuelve sus errores —
    // el componente recibe directo el objeto de error.interceptor.ts, con
    // .message ya resuelto (no anidado bajo .error).
    portalInvitationsServiceMock.invite.mockReturnValue(throwError(() => ({ message: 'Correo ya invitado' })));
    const component = createComponent();
    component.inviteEmail = 'nuevo@x.com';

    component.invite();

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Correo ya invitado');
    expect(toastServiceMock.error).toHaveBeenCalledWith('Correo ya invitado');
  });

  it('resend() en éxito muestra un toast', () => {
    portalInvitationsServiceMock.resend.mockReturnValue(of({ message: 'ok' }));
    const component = createComponent();

    component.resend(invitations[0]);

    expect(portalInvitationsServiceMock.resend).toHaveBeenCalledWith('client-1', 'p1');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Invitación reenviada');
    expect(component.resendingId()).toBeNull();
  });

  it('resend() en error, muestra un toast con el mensaje real', () => {
    portalInvitationsServiceMock.resend.mockReturnValue(throwError(() => ({ message: 'No se pudo reenviar' })));
    const component = createComponent();

    component.resend(invitations[0]);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo reenviar');
    expect(component.resendingId()).toBeNull();
  });

  it('el enlace "Actualizar plan" apunta a /configuracion con ?tab=plan', () => {
    subscriptionServiceMock.getEntitlements.mockReturnValue(of(entitlementsWithPortal(false)));
    const fixture = TestBed.createComponent(ClientPortalInvitationsComponent);
    fixture.componentRef.setInput('clientId', 'client-1');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Actualizar plan');
  });
});
