import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SettingsTaskTemplatesComponent } from './settings-task-templates.component';
import { TasksService } from '../../../core/services/tasks.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { TaskTemplateResponse } from '../../../core/models/task.model';

describe('SettingsTaskTemplatesComponent', () => {
  let tasksServiceMock: {
    getTemplates: jest.Mock;
    createTemplate: jest.Mock;
    updateTemplate: jest.Mock;
    deleteTemplate: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const templates: TaskTemplateResponse[] = [
    {
      id: 't1',
      name: 'Demanda ejecutiva',
      processStage: null,
      items: [{ id: 'i1', title: 'Redactar demanda', offsetDays: 0, sortOrder: 0 }],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  function configure(): void {
    tasksServiceMock = {
      getTemplates: jest.fn().mockReturnValue(of(templates)),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsTaskTemplatesComponent],
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
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

  function createComponent() {
    const fixture = TestBed.createComponent(SettingsTaskTemplatesComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga las plantillas', () => {
    const component = createComponent();

    expect(tasksServiceMock.getTemplates).toHaveBeenCalled();
    expect(component.templates()).toEqual(templates);
    expect(component.isLoading()).toBe(false);
  });

  it('si falla la carga, muestra un toast de error', () => {
    tasksServiceMock.getTemplates.mockReturnValue(throwError(() => ({ message: 'Error al cargar las plantillas' })));
    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar las plantillas');
    expect(component.isLoading()).toBe(false);
  });

  it('openCreateModal limpia el form y agrega un ítem vacío por defecto', () => {
    const component = createComponent();

    component.openCreateModal();

    expect(component.editingTemplate()).toBeNull();
    expect(component.items.length).toBe(1);
    expect(component.modalOpen()).toBe(true);
  });

  it('openEditModal precarga el nombre y los ítems de la plantilla', () => {
    const component = createComponent();

    component.openEditModal(templates[0]);

    expect(component.editingTemplate()).toEqual(templates[0]);
    expect(component.form.get('name')?.value).toBe('Demanda ejecutiva');
    expect(component.items.length).toBe(1);
    expect(component.items.at(0).get('title')?.value).toBe('Redactar demanda');
    expect(component.modalOpen()).toBe(true);
  });

  it('addItem agrega un ítem y removeItem lo quita por índice', () => {
    const component = createComponent();
    component.openCreateModal();
    expect(component.items.length).toBe(1);

    component.addItem();
    expect(component.items.length).toBe(2);

    component.removeItem(0);
    expect(component.items.length).toBe(1);
  });

  it('submit no hace nada si el form es inválido o no hay ítems', () => {
    const component = createComponent();
    component.openCreateModal();
    component.items.clear();

    component.submit();

    expect(tasksServiceMock.createTemplate).not.toHaveBeenCalled();
    expect(component.formError()).toBe('Completa el nombre y al menos un ítem.');
  });

  it('submit crea una plantilla nueva en éxito, cierra el modal y recarga', () => {
    tasksServiceMock.createTemplate.mockReturnValue(of(templates[0]));
    const component = createComponent();
    component.openCreateModal();
    component.form.patchValue({ name: 'Nueva plantilla' });
    component.items.at(0).patchValue({ title: 'Primer ítem', offsetDays: 2 });

    component.submit();

    expect(tasksServiceMock.createTemplate).toHaveBeenCalledWith({
      name: 'Nueva plantilla',
      items: [{ title: 'Primer ítem', offsetDays: 2, sortOrder: 0 }],
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Plantilla creada correctamente.');
    expect(component.modalOpen()).toBe(false);
  });

  it('submit edita una plantilla existente en éxito', () => {
    tasksServiceMock.updateTemplate.mockReturnValue(of(templates[0]));
    const component = createComponent();
    component.openEditModal(templates[0]);

    component.submit();

    expect(tasksServiceMock.updateTemplate).toHaveBeenCalledWith('t1', {
      name: 'Demanda ejecutiva',
      items: [{ title: 'Redactar demanda', offsetDays: 0, sortOrder: 0 }],
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Plantilla actualizada correctamente.');
  });

  it('submit en error expone el mensaje y muestra un toast, sin cerrar el modal', () => {
    tasksServiceMock.createTemplate.mockReturnValue(throwError(() => ({ message: 'No se pudo guardar' })));
    const component = createComponent();
    component.openCreateModal();
    component.form.patchValue({ name: 'Nueva plantilla' });
    component.items.at(0).patchValue({ title: 'Primer ítem', offsetDays: 2 });

    component.submit();

    expect(component.formError()).toBe('No se pudo guardar');
    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo guardar');
    expect(component.isSubmitting()).toBe(false);
    expect(component.modalOpen()).toBe(true);
  });

  it('submit ignora envíos repetidos mientras isSubmitting ya está activo', () => {
    const component = createComponent();
    component.isSubmitting.set(true);

    component.submit();

    expect(tasksServiceMock.createTemplate).not.toHaveBeenCalled();
  });

  it('deleteTemplate no elimina si el usuario cancela la confirmación', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.deleteTemplate(templates[0]);

    expect(tasksServiceMock.deleteTemplate).not.toHaveBeenCalled();
  });

  it('deleteTemplate elimina la plantilla al confirmar y muestra un toast', async () => {
    tasksServiceMock.deleteTemplate.mockReturnValue(of(undefined));
    const component = createComponent();

    await component.deleteTemplate(templates[0]);

    expect(tasksServiceMock.deleteTemplate).toHaveBeenCalledWith('t1');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Plantilla eliminada correctamente.');
  });

  it('deleteTemplate en error muestra un toast de error', async () => {
    tasksServiceMock.deleteTemplate.mockReturnValue(throwError(() => ({ message: 'No se pudo eliminar' })));
    const component = createComponent();

    await component.deleteTemplate(templates[0]);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo eliminar');
  });
});
