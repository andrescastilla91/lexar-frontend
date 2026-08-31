import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SettingsTaskStatusesComponent } from './settings-task-statuses.component';
import { TaskStatusesService } from '../../../core/services/task-statuses.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { PlanUpgradeService } from '../../../core/services/plan-upgrade.service';
import { TaskApprovalCandidate, TaskStatusResponse } from '../../../core/models/task-status.model';

describe('SettingsTaskStatusesComponent', () => {
  let taskStatusesServiceMock: {
    getAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    getApprovalCandidates: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let planUpgradeMock: { isPlanGateError: jest.Mock; promptUpgrade: jest.Mock };

  const statuses: TaskStatusResponse[] = [
    {
      id: 's1',
      code: 'pendiente',
      label: 'Pendiente',
      color: 'info',
      isTerminal: false,
      requiresApproval: false,
      requiresNote: false,
      sortOrder: 0,
      isSystem: true,
      isActive: true,
      approvers: [],
    },
    {
      id: 's2',
      code: 'aprobado',
      label: 'Aprobado',
      color: 'success',
      isTerminal: true,
      requiresApproval: true,
      requiresNote: false,
      sortOrder: 1,
      isSystem: false,
      isActive: true,
      approvers: [{ id: 'u1', firstName: 'Ana', lastName: 'Gómez' }],
    },
  ];

  const candidates: TaskApprovalCandidate[] = [
    { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
  ];

  function configure(): void {
    taskStatusesServiceMock = {
      getAll: jest.fn().mockReturnValue(of(statuses)),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getApprovalCandidates: jest.fn().mockReturnValue(of(candidates)),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    planUpgradeMock = { isPlanGateError: jest.fn().mockReturnValue(false), promptUpgrade: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsTaskStatusesComponent],
      providers: [
        { provide: TaskStatusesService, useValue: taskStatusesServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: PlanUpgradeService, useValue: planUpgradeMock },
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

  function createComponent() {
    const fixture = TestBed.createComponent(SettingsTaskStatusesComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga los estados y los candidatos a aprobador', () => {
    const component = createComponent();

    expect(taskStatusesServiceMock.getAll).toHaveBeenCalled();
    expect(taskStatusesServiceMock.getApprovalCandidates).toHaveBeenCalled();
    expect(component.statuses()).toEqual(statuses);
    expect(component.approvalCandidates()).toEqual(candidates);
    expect(component.isLoading()).toBe(false);
    expect(component.isLoadingCandidates()).toBe(false);
  });

  it('si falla la carga de estados, muestra un toast de error', () => {
    taskStatusesServiceMock.getAll.mockReturnValue(throwError(() => ({ message: 'Error al cargar los estados' })));
    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar los estados');
    expect(component.isLoading()).toBe(false);
  });

  it('si falla la carga de candidatos, no rompe la carga de estados', () => {
    taskStatusesServiceMock.getApprovalCandidates.mockReturnValue(throwError(() => new Error('fail')));
    const component = createComponent();

    expect(component.isLoadingCandidates()).toBe(false);
    expect(component.approvalCandidates()).toEqual([]);
    expect(component.statuses()).toEqual(statuses);
  });

  it('toggleApprover agrega y quita ids del set de seleccionados', () => {
    const component = createComponent();

    component.toggleApprover('u1');
    expect(component.selectedApproverIds().has('u1')).toBe(true);

    component.toggleApprover('u1');
    expect(component.selectedApproverIds().has('u1')).toBe(false);
  });

  it('openCreateModal limpia el form, aprobadores y habilita el código', () => {
    const component = createComponent();

    component.openCreateModal();

    expect(component.editingStatus()).toBeNull();
    expect(component.selectedApproverIds().size).toBe(0);
    expect(component.form.get('code')?.enabled).toBe(true);
    expect(component.modalOpen()).toBe(true);
  });

  it('openEditModal precarga el status, sus aprobadores y deshabilita el código', () => {
    const component = createComponent();

    component.openEditModal(statuses[1]);

    expect(component.editingStatus()).toEqual(statuses[1]);
    expect(component.selectedApproverIds().has('u1')).toBe(true);
    expect(component.form.get('label')?.value).toBe('Aprobado');
    expect(component.form.get('code')?.disabled).toBe(true);
  });

  it('submit no hace nada si el form es inválido', () => {
    const component = createComponent();
    component.openCreateModal();
    component.form.patchValue({ code: '', label: '' });

    component.submit();

    expect(taskStatusesServiceMock.create).not.toHaveBeenCalled();
    expect(component.formError()).toBe('Completa los campos obligatorios.');
  });

  it('submit crea un estado nuevo en éxito, con approverUserIds solo si requiresApproval', () => {
    taskStatusesServiceMock.create.mockReturnValue(of(statuses[0]));
    const component = createComponent();
    component.openCreateModal();
    component.form.setValue({
      code: 'en_revision',
      label: 'En revisión',
      color: 'warning',
      isTerminal: false,
      requiresApproval: false,
      requiresNote: false,
    });
    component.toggleApprover('u1');

    component.submit();

    expect(taskStatusesServiceMock.create).toHaveBeenCalledWith({
      code: 'en_revision',
      label: 'En revisión',
      color: 'warning',
      isTerminal: false,
      requiresApproval: false,
      requiresNote: false,
      approverUserIds: [],
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Estado creado correctamente.');
  });

  it('submit incluye approverUserIds cuando requiresApproval está activo', () => {
    taskStatusesServiceMock.create.mockReturnValue(of(statuses[1]));
    const component = createComponent();
    component.openCreateModal();
    component.form.setValue({
      code: 'aprobado_2',
      label: 'Aprobado 2',
      color: 'success',
      isTerminal: true,
      requiresApproval: true,
      requiresNote: false,
    });
    component.toggleApprover('u1');

    component.submit();

    expect(taskStatusesServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ approverUserIds: ['u1'] }),
    );
  });

  it('submit edita un estado existente en éxito', () => {
    taskStatusesServiceMock.update.mockReturnValue(of(statuses[1]));
    const component = createComponent();
    component.openEditModal(statuses[1]);

    component.submit();

    expect(taskStatusesServiceMock.update).toHaveBeenCalledWith('s2', {
      label: 'Aprobado',
      color: 'success',
      isTerminal: true,
      requiresApproval: true,
      requiresNote: false,
      approverUserIds: ['u1'],
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Estado actualizado correctamente.');
  });

  it('submit en error expone el mensaje y muestra un toast', () => {
    taskStatusesServiceMock.create.mockReturnValue(throwError(() => ({ message: 'Código en uso' })));
    const component = createComponent();
    component.openCreateModal();
    component.form.setValue({
      code: 'en_revision',
      label: 'En revisión',
      color: 'warning',
      isTerminal: false,
      requiresApproval: false,
      requiresNote: false,
    });

    component.submit();

    expect(component.formError()).toBe('Código en uso');
    expect(toastServiceMock.error).toHaveBeenCalledWith('Código en uso');
    expect(component.isSubmitting()).toBe(false);
  });

  it('submit ignora envíos repetidos mientras isSubmitting ya está activo', () => {
    const component = createComponent();
    component.isSubmitting.set(true);

    component.submit();

    expect(taskStatusesServiceMock.create).not.toHaveBeenCalled();
  });

  it('deleteStatus no elimina si el usuario cancela la confirmación', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.deleteStatus(statuses[1]);

    expect(taskStatusesServiceMock.delete).not.toHaveBeenCalled();
  });

  it('deleteStatus elimina el estado al confirmar y muestra un toast', async () => {
    taskStatusesServiceMock.delete.mockReturnValue(of(undefined));
    const component = createComponent();

    await component.deleteStatus(statuses[1]);

    expect(taskStatusesServiceMock.delete).toHaveBeenCalledWith('s2');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Estado eliminado correctamente.');
  });

  it('deleteStatus en error muestra un toast de error', async () => {
    taskStatusesServiceMock.delete.mockReturnValue(throwError(() => ({ message: 'No se pudo eliminar' })));
    const component = createComponent();

    await component.deleteStatus(statuses[1]);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo eliminar');
  });

  // F7-R3: taskApprovals solo gatea la creación/edición con requiresApproval:true.
  // El toast+CTA de upgrade lo dispara error.interceptor.ts de forma
  // centralizada (ver error.interceptor.spec.ts) — el componente solo cierra
  // el modal y evita mostrar el error genérico encima.
  it('submit en gate de plan: cierra el modal, no muestra el error genérico ni dispara el CTA él mismo', () => {
    const gateError = { error: { code: 'FEATURE_NOT_IN_PLAN', message: 'Tu plan no incluye el motor de aprobaciones' } };
    planUpgradeMock.isPlanGateError.mockReturnValue(true);
    taskStatusesServiceMock.create.mockReturnValue(throwError(() => gateError));
    const component = createComponent();
    component.openCreateModal();
    component.form.setValue({
      code: 'en_revision',
      label: 'En revisión',
      color: 'warning',
      isTerminal: false,
      requiresApproval: true,
      requiresNote: false,
    });

    component.submit();

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
    expect(component.modalOpen()).toBe(false);
    expect(component.formError()).toBeNull();
    expect(toastServiceMock.error).not.toHaveBeenCalled();
  });
});
