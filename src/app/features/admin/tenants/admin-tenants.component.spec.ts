import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminTenantsComponent } from './admin-tenants.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { TenantDetail, TenantSummary } from '../../../core/models/admin.model';

describe('AdminTenantsComponent', () => {
  let platformAdminServiceMock: {
    listTenants: jest.Mock;
    getTenant: jest.Mock;
    updateSubscription: jest.Mock;
    impersonate: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let navigateSpy: jest.SpyInstance;

  const tenantSummary: TenantSummary = {
    id: 'company-1',
    legalName: 'Bufete Uno',
    taxId: '900123456-1',
    planCode: 'FIRMA',
    planName: 'Firma',
    subscriptionStatus: 'active',
    currentPeriodEnd: new Date().toISOString(),
    userCount: 5,
    storageMb: 120,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  const tenantDetail: TenantDetail = {
    ...tenantSummary,
    activeProcesses: 3,
    limits: { maxUsers: null, maxActiveProcesses: null, maxStorageMb: null },
    cancelAtPeriodEnd: false,
    users: [
      { id: 'user-1', email: 'admin@bufete.com', firstName: 'Ana', lastName: 'Gómez', isActive: true },
    ],
  };

  function configure(): void {
    platformAdminServiceMock = {
      listTenants: jest.fn().mockReturnValue(of([tenantSummary])),
      getTenant: jest.fn().mockReturnValue(of(tenantDetail)),
      updateSubscription: jest.fn(),
      impersonate: jest.fn(),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AdminTenantsComponent],
      providers: [
        provideRouter([]),
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });

    const router = TestBed.inject(Router);
    navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminTenantsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga el listado de tenants', () => {
    const component = createComponent();

    expect(component.tenants()).toEqual([tenantSummary]);
    expect(component.isLoading()).toBe(false);
  });

  it('selectTenant carga el detalle', () => {
    const component = createComponent();

    component.selectTenant('company-1');

    expect(platformAdminServiceMock.getTenant).toHaveBeenCalledWith('company-1');
    expect(component.selectedTenant()).toEqual(tenantDetail);
  });

  it('closeDetail limpia el tenant seleccionado', () => {
    const component = createComponent();
    component.selectTenant('company-1');

    component.closeDetail();

    expect(component.selectedTenant()).toBeNull();
  });

  it('applySubscriptionAction en change_plan envía el planCode', async () => {
    platformAdminServiceMock.updateSubscription.mockReturnValue(of({ message: 'Suscripción actualizada' }));
    const component = createComponent();
    component.subscriptionAction.set('change_plan');
    component.planCodeInput.set('ESTUDIO');

    await component.applySubscriptionAction('company-1');

    expect(platformAdminServiceMock.updateSubscription).toHaveBeenCalledWith('company-1', {
      action: 'change_plan',
      planCode: 'ESTUDIO',
      days: undefined,
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Suscripción actualizada');
  });

  it('applySubscriptionAction en suspend pide confirmación antes de aplicar', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();
    component.subscriptionAction.set('suspend');

    await component.applySubscriptionAction('company-1');

    expect(platformAdminServiceMock.updateSubscription).not.toHaveBeenCalled();
  });

  it('applySubscriptionAction en error muestra un toast', async () => {
    platformAdminServiceMock.updateSubscription.mockReturnValue(throwError(() => new Error('No se pudo')));
    const component = createComponent();
    component.subscriptionAction.set('reactivate');

    await component.applySubscriptionAction('company-1');

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo');
    expect(component.isUpdatingSubscription()).toBe(false);
  });

  it('impersonate pide confirmación y, al aceptar, navega al dashboard del tenant', async () => {
    platformAdminServiceMock.impersonate.mockReturnValue(of({ message: 'ok' }));
    const component = createComponent();

    await component.impersonate('company-1', 'user-1');

    expect(platformAdminServiceMock.impersonate).toHaveBeenCalledWith('company-1', 'user-1');
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('impersonate no hace nada si el usuario cancela el diálogo', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.impersonate('company-1', 'user-1');

    expect(platformAdminServiceMock.impersonate).not.toHaveBeenCalled();
  });
});
