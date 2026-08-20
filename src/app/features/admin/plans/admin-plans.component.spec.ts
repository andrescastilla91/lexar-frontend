import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminPlansComponent } from './admin-plans.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminPlan } from '../../../core/models/admin.model';

describe('AdminPlansComponent', () => {
  let platformAdminServiceMock: {
    listPlans: jest.Mock;
    createPlan: jest.Mock;
    deactivatePlan: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const plan: AdminPlan = {
    id: 'plan-1',
    code: 'INDEPENDIENTE',
    name: 'Independiente',
    priceMonthly: 50000,
    priceYearly: 500000,
    currency: 'COP',
    maxUsers: 1,
    maxActiveProcesses: 10,
    maxStorageMb: 1024,
    features: { chatbot: false, clientPortal: false, advancedReports: false },
    isActive: true,
    sortOrder: 0,
  };

  function configure(): void {
    platformAdminServiceMock = {
      listPlans: jest.fn().mockReturnValue(of([plan])),
      createPlan: jest.fn(),
      deactivatePlan: jest.fn(),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AdminPlansComponent],
      providers: [
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminPlansComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga el listado de planes', () => {
    const component = createComponent();

    expect(component.plans()).toEqual([plan]);
  });

  it('al inicializar en error notifica el mensaje sin romper el listado', () => {
    platformAdminServiceMock.listPlans.mockReturnValue(throwError(() => new Error('Error al cargar los planes')));

    const component = createComponent();

    expect(component.plans()).toEqual([]);
    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar los planes');
  });

  it('formatPrice formatea como moneda COP sin decimales', () => {
    const component = createComponent();

    expect(component.formatPrice(50000)).toContain('50.000');
  });

  it('statusClasses distingue planes activos e inactivos', () => {
    const component = createComponent();

    expect(component.statusClasses(true)).toContain('text-success');
    expect(component.statusClasses(false)).toContain('text-subtle');
  });

  it('onCreate no envía si el formulario es inválido', () => {
    const component = createComponent();

    component.onCreate();

    expect(platformAdminServiceMock.createPlan).not.toHaveBeenCalled();
    expect(component.createForm.get('code')?.touched).toBe(true);
  });

  it('onCreate en éxito crea el plan, recarga el listado y cierra el formulario', () => {
    platformAdminServiceMock.createPlan.mockReturnValue(of(plan));
    platformAdminServiceMock.listPlans.mockReturnValue(of([plan]));
    const component = createComponent();
    component.showCreateForm.set(true);
    component.createForm.setValue({
      code: 'ESTUDIO',
      name: 'Estudio',
      priceMonthly: 100000,
      priceYearly: 1000000,
      maxUsers: 5,
      maxActiveProcesses: 50,
      maxStorageMb: 2048,
      chatbot: true,
      clientPortal: false,
      advancedReports: false,
    });

    component.onCreate();

    expect(platformAdminServiceMock.createPlan).toHaveBeenCalledWith({
      code: 'ESTUDIO',
      name: 'Estudio',
      priceMonthly: 100000,
      priceYearly: 1000000,
      currency: 'COP',
      maxUsers: 5,
      maxActiveProcesses: 50,
      maxStorageMb: 2048,
      sortOrder: 1,
      features: { chatbot: true, clientPortal: false, advancedReports: false },
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Plan creado correctamente.');
    expect(component.showCreateForm()).toBe(false);
    expect(component.isSaving()).toBe(false);
  });

  it('onCreate en error notifica y deja el formulario abierto', () => {
    platformAdminServiceMock.createPlan.mockReturnValue(throwError(() => new Error('No se pudo crear el plan')));
    const component = createComponent();
    component.showCreateForm.set(true);
    component.createForm.setValue({
      code: 'ESTUDIO',
      name: 'Estudio',
      priceMonthly: 100000,
      priceYearly: 1000000,
      maxUsers: null,
      maxActiveProcesses: null,
      maxStorageMb: null,
      chatbot: false,
      clientPortal: false,
      advancedReports: false,
    });

    component.onCreate();

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo crear el plan');
    expect(component.showCreateForm()).toBe(true);
    expect(component.isSaving()).toBe(false);
  });

  it('deactivate pide confirmación y, al aceptar, desactiva y recarga', async () => {
    platformAdminServiceMock.deactivatePlan.mockReturnValue(of({ ...plan, isActive: false }));
    const component = createComponent();

    await component.deactivate(plan);

    expect(platformAdminServiceMock.deactivatePlan).toHaveBeenCalledWith('plan-1');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Plan desactivado.');
  });

  it('deactivate no hace nada si el usuario cancela el diálogo', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.deactivate(plan);

    expect(platformAdminServiceMock.deactivatePlan).not.toHaveBeenCalled();
  });

  it('deactivate en error notifica el mensaje', async () => {
    platformAdminServiceMock.deactivatePlan.mockReturnValue(throwError(() => new Error('No se pudo desactivar el plan')));
    const component = createComponent();

    await component.deactivate(plan);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo desactivar el plan');
  });
});
