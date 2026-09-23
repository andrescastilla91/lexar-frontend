import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { DeadlineDetailComponent } from './deadline-detail.component';
import { DeadlinesService } from '../../../core/services/deadlines.service';
import { LegalProcessesService } from '../../../core/services/legal-processes.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { AdvisorsService } from '../../../core/services/advisors.service';
import { UsersService } from '../../../core/services/users.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { DeadlineComputationType, DeadlineResponse, DeadlineScope, DeadlineStatus } from '../../../core/models/deadline.model';
import { AdvisorResponse } from '../../../core/models/advisor-backend.model';
import { LegalProcessResponse } from '../../../core/models/legal-process.model';

function buildDeadline(overrides: Partial<DeadlineResponse> = {}): DeadlineResponse {
  return {
    id: 'd1',
    processId: null,
    process: null,
    title: 'Audiencia de conciliación',
    type: { id: 't1', label: 'Audiencia', color: 'navy' } as any,
    dueAt: '2026-10-01T10:00:00.000Z',
    allDay: false,
    notes: null,
    status: DeadlineStatus.PENDING,
    assignees: [],
    scope: DeadlineScope.ONLY_ME,
    blocksAgenda: false,
    durationMinutes: null,
    computationType: DeadlineComputationType.BUSINESS_DAYS,
    needsReview: false,
    createdBy: 'u1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('DeadlineDetailComponent', () => {
  let deadlinesServiceMock: { getOne: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let legalProcessesServiceMock: { getLegalProcess: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let confirmDialogServiceMock: { confirm: jest.Mock };
  let router: Router;

  function configureAndCreate(overrides: {
    routeId?: string | null;
    queryParams?: Record<string, string>;
    deadline?: DeadlineResponse;
    permissions?: string[];
  } = {}) {
    const routeId = overrides.routeId === undefined ? 'd1' : overrides.routeId;
    const grantedPermissions = overrides.permissions ?? ['deadlines.update', 'deadlines.create.team-scope'];
    const deadline = overrides.deadline ?? buildDeadline();

    deadlinesServiceMock = {
      getOne: jest.fn().mockReturnValue(of(deadline)),
      update: jest.fn().mockReturnValue(of(deadline)),
      delete: jest.fn().mockReturnValue(of(undefined)),
    };
    legalProcessesServiceMock = {
      getLegalProcess: jest.fn().mockReturnValue(
        of({ id: 'p1', advisors: [{ id: 'adv-1', userId: 'user-1' }] } as unknown as LegalProcessResponse),
      ),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    confirmDialogServiceMock = { confirm: jest.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [DeadlineDetailComponent],
      providers: [
        provideRouter([]),
        { provide: DeadlinesService, useValue: deadlinesServiceMock },
        { provide: LegalProcessesService, useValue: legalProcessesServiceMock },
        { provide: CatalogsService, useValue: { getActiveCatalog: jest.fn().mockReturnValue(of([])) } },
        {
          provide: AdvisorsService,
          useValue: {
            getAdvisors: jest.fn().mockReturnValue(
              of({
                advisors: [
                  { id: 'adv-1', userId: 'user-1', user: { id: 'user-1', firstName: 'Ana', lastName: 'García' } },
                  { id: 'adv-2', userId: 'user-2', user: { id: 'user-2', firstName: 'Carlos', lastName: 'Pérez' } },
                ] as AdvisorResponse[],
                total: 2,
              }),
            ),
          },
        },
        {
          provide: UsersService,
          useValue: {
            getAssignableUsers: jest
              .fn()
              .mockReturnValue(of({ users: [{ id: 'user-3', firstName: 'Lucía', lastName: 'Restrepo', email: 'lucia@lexar.com' }] } as any)),
          },
        },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogServiceMock },
        {
          provide: PermissionsService,
          useValue: { hasPermission: jest.fn((code: string) => grantedPermissions.includes(code)) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(routeId ? { id: routeId } : {}),
              queryParamMap: convertToParamMap(overrides.queryParams ?? {}),
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(DeadlineDetailComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('sin id en la ruta, no carga nada y deja isLoading en false', () => {
    const { component } = configureAndCreate({ routeId: null });

    expect(component.isLoading()).toBe(false);
    expect(component.deadline()).toBeNull();
    expect(deadlinesServiceMock.getOne).not.toHaveBeenCalled();
  });

  it('carga el plazo y precarga el formulario', () => {
    const { component } = configureAndCreate({
      deadline: buildDeadline({ title: 'Radicar memorial', notes: 'Ver anexos', assignees: [] }),
    });

    expect(component.isLoading()).toBe(false);
    expect(component.form.get('title')?.value).toBe('Radicar memorial');
    expect(component.form.get('notes')?.value).toBe('Ver anexos');
  });

  it('evento general (sin proceso): no pide los asesores del proceso y assignmentItems usa assignableUsers', () => {
    const { component } = configureAndCreate({ deadline: buildDeadline({ processId: null }) });

    expect(legalProcessesServiceMock.getLegalProcess).not.toHaveBeenCalled();
    expect(component['assignmentItems']()).toEqual([{ id: 'user-3', label: 'Lucía Restrepo' }]);
  });

  it('plazo de proceso: carga los asesores del proceso y prioriza a los relacionados', () => {
    const { component } = configureAndCreate({
      deadline: buildDeadline({ processId: 'p1', process: { id: 'p1', title: 'Proceso demo' } }),
    });

    expect(legalProcessesServiceMock.getLegalProcess).toHaveBeenCalledWith('p1');
    expect(component.relatedAdvisorUserIds()).toEqual(['user-1']);
    expect(component['assignmentItems']()).toEqual([
      { id: 'user-1', label: 'Ana García', description: 'Asesor del proceso' },
      { id: 'user-2', label: 'Carlos Pérez' },
    ]);
  });

  it('backLink/backLabel vuelven a Calendario por defecto', () => {
    const { component } = configureAndCreate();

    expect(component.backLink()).toEqual(['/calendario']);
    expect(component.backLabel()).toBe('Calendario');
  });

  it('backLink/backLabel vuelven al proceso de origen con returnTo=proceso', () => {
    const { component } = configureAndCreate({ queryParams: { returnTo: 'proceso', processId: 'p1' } });

    expect(component.backLink()).toEqual(['/procesos', 'p1']);
    expect(component.backLabel()).toBe('Proceso');
  });

  // Dos it() en vez de uno: TestBed no permite reconfigurar el módulo de
  // testing una vez instanciado un componente (configureAndCreate() llama a
  // TestBed.configureTestingModule) — cada it() arranca con un TestBed
  // limpio automáticamente, dos configureAndCreate() en un mismo it() no.
  it('backQueryParams reabre la pestaña Plazos al volver a un proceso', () => {
    const { component } = configureAndCreate({ queryParams: { returnTo: 'proceso', processId: 'p1' } });
    expect(component.backQueryParams()).toEqual({ tab: 'plazos' });
  });

  it('backQueryParams no lleva nada al volver a Calendario', () => {
    const { component } = configureAndCreate();
    expect(component.backQueryParams()).toEqual({});
  });

  it('submit(): envía scope/blocksAgenda solo si el plazo NO tiene proceso', () => {
    const { component } = configureAndCreate({ deadline: buildDeadline({ processId: null }) });
    component.form.patchValue({ title: 'Evento', typeId: 't1', dueAt: '2026-10-01T10:00' });

    component.submit();

    const [, payload] = deadlinesServiceMock.update.mock.calls[0];
    expect(payload.scope).toBeDefined();
    expect(payload.blocksAgenda).toBeDefined();
  });

  it('submit(): NO envía scope/blocksAgenda si el plazo tiene proceso', () => {
    const { component } = configureAndCreate({
      deadline: buildDeadline({ processId: 'p1', process: { id: 'p1', title: 'Proceso demo' } }),
    });
    component.form.patchValue({ title: 'Plazo', typeId: 't1', dueAt: '2026-10-01T10:00' });

    component.submit();

    const [, payload] = deadlinesServiceMock.update.mock.calls[0];
    expect(payload.scope).toBeUndefined();
    expect(payload.blocksAgenda).toBeUndefined();
  });

  it('submit(): actualiza el plazo cargado con la respuesta y muestra un toast', () => {
    const updated = buildDeadline({ title: 'Actualizado' });
    const { component } = configureAndCreate();
    deadlinesServiceMock.update.mockReturnValue(of(updated));
    component.form.patchValue({ title: 'Actualizado', typeId: 't1', dueAt: '2026-10-01T10:00' });

    component.submit();

    expect(component.deadline()).toEqual(updated);
    expect(toastServiceMock.success).toHaveBeenCalled();
  });

  it('submit(): no hace nada si el formulario es inválido', () => {
    const { component } = configureAndCreate();
    component.form.patchValue({ title: '' });

    component.submit();

    expect(deadlinesServiceMock.update).not.toHaveBeenCalled();
  });

  it('markDone(): marca el plazo como completado', () => {
    const { component } = configureAndCreate();

    component.markDone();

    expect(deadlinesServiceMock.update).toHaveBeenCalledWith('d1', { status: DeadlineStatus.DONE });
  });

  it('deleteDeadline(): pide confirmación, elimina y navega al origen', async () => {
    const { component } = configureAndCreate({ queryParams: { returnTo: 'proceso', processId: 'p1' } });
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.deleteDeadline();

    expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
    expect(deadlinesServiceMock.delete).toHaveBeenCalledWith('d1');
    expect(navigateSpy).toHaveBeenCalledWith(['/procesos', 'p1'], { queryParams: { tab: 'plazos' } });
  });

  it('deleteDeadline(): no elimina si el usuario cancela la confirmación', async () => {
    const { component } = configureAndCreate();
    confirmDialogServiceMock.confirm.mockResolvedValue(false);

    await component.deleteDeadline();

    expect(deadlinesServiceMock.delete).not.toHaveBeenCalled();
  });

  it('onAssigneesChange(): avisa si se agrega a alguien no relacionado con el proceso del plazo', async () => {
    const { component } = configureAndCreate({
      deadline: buildDeadline({ processId: 'p1', process: { id: 'p1', title: 'Proceso demo' } }),
    });

    await component.onAssigneesChange(['user-2']);

    expect(confirmDialogServiceMock.confirm).toHaveBeenCalled();
    expect(component.form.get('assigneeUserIds')?.value).toEqual(['user-2']);
  });

  it('onAssigneesChange(): revierte la selección si el usuario cancela la confirmación', async () => {
    const { component } = configureAndCreate({
      deadline: buildDeadline({ processId: 'p1', process: { id: 'p1', title: 'Proceso demo' } }),
    });
    confirmDialogServiceMock.confirm.mockResolvedValue(false);

    await component.onAssigneesChange(['user-2']);

    expect(component.form.get('assigneeUserIds')?.value).toEqual([]);
  });

  it('canEdit()/canCreateTeamScope() reflejan los permisos del usuario', () => {
    const { component } = configureAndCreate({ permissions: [] });

    expect(component.canEdit()).toBe(false);
    expect(component.canCreateTeamScope()).toBe(false);
  });
});
