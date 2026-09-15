import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { ClientDetailComponent } from './client-detail.component';
import { ClientsService } from '../../../core/services/clients.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { AdvisorsService } from '../../../core/services/advisors.service';
import { LegalProcessesService } from '../../../core/services/legal-processes.service';
import { TasksService } from '../../../core/services/tasks.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ClientResponse, ClientPersonType } from '../../../core/models/client-backend.model';
import { LegalProcessResponse } from '../../../core/models/legal-process.model';
import { TaskResponse } from '../../../core/models/task.model';

const client: ClientResponse = {
  id: 'c1',
  fullName: 'Cliente Uno',
  personType: ClientPersonType.NATURAL,
  address: null,
  documentType: { id: 'd1', code: 'CC', label: 'Cédula', color: null },
  identificationNumber: '123456',
  riskLevel: null,
  laftRisk: null,
  isActive: true,
  createdAt: '2026-01-01',
  contacts: [],
  advisors: [],
};

describe('ClientDetailComponent', () => {
  let clientsServiceMock: { getClient: jest.Mock; updateClient: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  function configureAndCreate(overrides: {
    processes?: LegalProcessResponse[];
    tasks?: TaskResponse[];
    permissions?: string[];
  } = {}) {
    clientsServiceMock = {
      getClient: jest.fn().mockReturnValue(of(client)),
      updateClient: jest.fn().mockReturnValue(of(client)),
      updateClientCompliance: jest.fn().mockReturnValue(of(client)),
    };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    const grantedPermissions =
      overrides.permissions ?? ['clients.edit', 'clients.edit-compliance'];

    TestBed.configureTestingModule({
      imports: [ClientDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ClientsService, useValue: clientsServiceMock },
        {
          provide: CatalogsService,
          useValue: {
            getActiveCatalog: jest.fn().mockReturnValue(
              of([
                { id: 'd1', catalogType: 'document_type', code: 'CC', label: 'Cédula', color: null, sortOrder: 0, isActive: true, isSystem: true, personTypeScope: 'NATURAL' },
                { id: 'd3', catalogType: 'document_type', code: 'NIT', label: 'NIT', color: null, sortOrder: 1, isActive: true, isSystem: true, personTypeScope: 'JURIDICA' },
              ]),
            ),
          },
        },
        { provide: AdvisorsService, useValue: { getAdvisors: jest.fn().mockReturnValue(of({ advisors: [] })) } },
        {
          provide: LegalProcessesService,
          useValue: { getLegalProcesses: jest.fn().mockReturnValue(of({ legalProcesses: overrides.processes ?? [] })) },
        },
        { provide: TasksService, useValue: { getForProcess: jest.fn().mockReturnValue(of(overrides.tasks ?? [])) } },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: PermissionsService,
          useValue: {
            hasAnyPermission: jest.fn().mockReturnValue(true),
            hasPermission: jest.fn((code: string) => grantedPermissions.includes(code)),
            userPermissions: signal(grantedPermissions),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(ClientDetailComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  // Regresión QA F33 2026-09-14: `isJuridica`/`documentTypesForPersonType`
  // no reaccionaban al radio Natural/Jurídica por leer FormControl.value
  // dentro de un computed() sin signal de por medio.
  it('actualiza documentTypesForPersonType e isJuridica al cambiar el radio', () => {
    const { fixture, component } = configureAndCreate();

    expect(component.isJuridica()).toBe(false);
    expect(component.documentTypesForPersonType().map((d) => d.id)).toEqual(['d1']);

    component.editForm.get('personType')?.setValue(ClientPersonType.JURIDICA);
    fixture.detectChanges();

    expect(component.isJuridica()).toBe(true);
    expect(component.documentTypesForPersonType().map((d) => d.id)).toEqual(['d3']);
  });

  // Regresión QA F33 2026-09-14: guardar desde Cumplimiento con un campo
  // inválido en Datos no daba ningún feedback visible.
  it('avisa por toast y salta a la pestaña Datos si el formulario es inválido', () => {
    const { component } = configureAndCreate();

    component.activeTab.set('cumplimiento');
    component.editForm.patchValue({ fullName: '' });
    component.saveClient();

    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'Hay campos obligatorios sin completar en la pestaña Datos',
    );
    expect(component.activeTab()).toBe('datos');
    expect(clientsServiceMock.updateClient).not.toHaveBeenCalled();
  });

  it('muestra un toast de error si falla la actualización', () => {
    const { component } = configureAndCreate();
    clientsServiceMock.updateClient.mockReturnValue({
      subscribe: ({ error }: { error: (e: unknown) => void }) => error({ message: 'Error al actualizar cliente' }),
    });

    component.saveClient();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al actualizar cliente');
  });

  it('muestra un toast de éxito al guardar correctamente', () => {
    const { component } = configureAndCreate();

    component.saveClient();

    expect(toastServiceMock.success).toHaveBeenCalledWith('Cliente actualizado exitosamente');
  });

  // RBAC 2026-09-14: Datos y Cumplimiento comparten `editForm` pero se
  // guardan contra endpoints/permisos separados.
  it('guarda desde la pestaña Cumplimiento en el endpoint de compliance, no en updateClient', () => {
    const { component } = configureAndCreate();

    component.activeTab.set('cumplimiento');
    component.editForm.patchValue({ riskLevelId: 'risk-1', laftRiskId: 'laft-1' });
    component.saveClient();

    expect(clientsServiceMock.updateClientCompliance).toHaveBeenCalledWith('c1', {
      riskLevelId: 'risk-1',
      laftRiskId: 'laft-1',
    });
    expect(clientsServiceMock.updateClient).not.toHaveBeenCalled();
    expect(toastServiceMock.success).toHaveBeenCalledWith('Cliente actualizado exitosamente');
  });

  it('guarda desde la pestaña Datos sin incluir riskLevelId/laftRiskId en el payload', () => {
    const { component } = configureAndCreate();

    component.activeTab.set('datos');
    component.saveClient();

    expect(clientsServiceMock.updateClient).toHaveBeenCalled();
    const payload = clientsServiceMock.updateClient.mock.calls[0][1];
    expect(payload).not.toHaveProperty('riskLevelId');
    expect(payload).not.toHaveProperty('laftRiskId');
    expect(clientsServiceMock.updateClientCompliance).not.toHaveBeenCalled();
  });

  it('deshabilita los campos de Datos y muestra aviso cuando falta clients.edit', () => {
    const { fixture, component } = configureAndCreate({
      permissions: ['clients.edit-compliance'],
    });

    component.activeTab.set('datos');
    fixture.detectChanges();

    expect(component.canEditBasicData()).toBe(false);
    const fullNameInput = fixture.nativeElement.querySelector(
      'input[formcontrolname="fullName"]',
    ) as HTMLInputElement;
    expect(fullNameInput.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No tienes permiso para editar los datos del cliente.',
    );
  });

  it('deshabilita los campos de Cumplimiento y muestra aviso cuando falta clients.edit-compliance', () => {
    const { fixture, component } = configureAndCreate({
      permissions: ['clients.edit'],
    });

    component.activeTab.set('cumplimiento');
    fixture.detectChanges();

    expect(component.canEditCompliance()).toBe(false);
    const riskLevelSelect = fixture.nativeElement.querySelector(
      'select[formcontrolname="riskLevelId"]',
    ) as HTMLSelectElement;
    expect(riskLevelSelect.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No tienes permiso para editar el nivel de criticidad ni el riesgo LA/FT del cliente.',
    );
  });

  // QA F33 ronda 2 (2026-09-14): la pestaña Portal se separó de Documentos
  // para no mezclar invitaciones del portal con archivos.
  it('incluye una pestaña Portal separada de Documentos', () => {
    const { component } = configureAndCreate();

    expect(component.tabs.map((t) => t.id)).toEqual(
      expect.arrayContaining(['documentos', 'portal']),
    );
    expect(component.tabs.find((t) => t.id === 'portal')?.label).toBe('Portal');
  });

  // QA F33 ronda 2 (2026-09-14): cada tarea del cliente debe navegar a
  // /tareas?openId=<id>, mismo patrón que la pestaña Procesos.
  it('enlaza cada tarea de la pestaña Tareas a /tareas con su openId', () => {
    const process = { id: 'p1', title: 'Proceso Uno' } as unknown as LegalProcessResponse;
    const task = {
      id: 't1',
      title: 'Tarea Uno',
      status: { id: 's1', label: 'Pendiente' },
      process: { id: 'p1', title: 'Proceso Uno' },
    } as unknown as TaskResponse;
    const { fixture, component } = configureAndCreate({ processes: [process], tasks: [task] });

    component.activeTab.set('tareas');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href*="tareas"]') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Tarea Uno');
  });
});
