import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ClientMattersPanelComponent } from './client-matters-panel.component';
import { ClientsService } from '../../../../core/services/clients.service';
import { CatalogsService } from '../../../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PermissionsService } from '../../../../core/services/permissions.service';
import { ClientMatterResponse, ClientMatterStatus } from '../../../../core/models/client-backend.model';
import { CatalogItem } from '../../../../core/models/catalog-backend.model';

// F34 §2/§4: primer spec de este componente — no había precedente en este
// directorio (client-contacts-panel tampoco tiene spec propio), así que se
// sigue el patrón de settings-catalogs.component.spec.ts para el mock de
// PermissionsService/ConfirmDialogService/ToastService.
describe('ClientMattersPanelComponent', () => {
  let clientsServiceMock: {
    getMatters: jest.Mock;
    createMatter: jest.Mock;
    updateMatter: jest.Mock;
    removeMatter: jest.Mock;
  };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const contractType: CatalogItem = {
    id: 'ct1',
    catalogType: 'contract_type',
    code: 'CONSULTORIA',
    label: 'Consultoría',
    color: 'primary',
    sortOrder: 0,
    isActive: true,
    isSystem: false,
    usageCount: 0,
  };

  const matterVigente: ClientMatterResponse = {
    id: 'm1',
    clientId: 'cl1',
    contractType: { id: 'ct1', code: 'CONSULTORIA', label: 'Consultoría', color: 'primary' },
    name: 'Asesoría permanente',
    description: 'Descripción del asunto',
    startDate: '2026-01-01',
    endDate: null,
    status: ClientMatterStatus.VIGENTE,
    processCount: 2,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const matterTerminado: ClientMatterResponse = {
    ...matterVigente,
    id: 'm2',
    name: 'Litigio cerrado',
    status: ClientMatterStatus.TERMINADO,
  };

  // BUG-27 (ajuste 2026-09-17): matterVigente tiene processCount: 2 a
  // propósito (para probar el bloqueo de borrado) — los tests de "sí
  // elimina" usan este fixture aparte, sin procesos vinculados.
  const matterSinProcesos: ClientMatterResponse = {
    ...matterVigente,
    id: 'm3',
    name: 'Asunto sin procesos',
    processCount: 0,
  };

  function configure(): void {
    clientsServiceMock = {
      getMatters: jest.fn().mockReturnValue(of([matterVigente])),
      createMatter: jest.fn(),
      updateMatter: jest.fn(),
      removeMatter: jest.fn(),
    };
    catalogsServiceMock = { getActiveCatalog: jest.fn().mockReturnValue(of([contractType])) };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ClientMattersPanelComponent],
      providers: [
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: CatalogsService, useValue: catalogsServiceMock },
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

  function createComponent(clientId = 'cl1') {
    const fixture = TestBed.createComponent(ClientMattersPanelComponent);
    fixture.componentRef.setInput('clientId', clientId);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => configure());

  it('al inicializar carga los asuntos del cliente y el catálogo de tipos de vinculación activos', () => {
    const { component } = createComponent();

    expect(clientsServiceMock.getMatters).toHaveBeenCalledWith('cl1');
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('contract_type');
    expect(component.matters()).toEqual([matterVigente]);
    expect(component.contractTypes()).toEqual([contractType]);
    expect(component.isLoading()).toBe(false);
  });

  it('si falla la carga de asuntos, deja la lista vacía sin lanzar', () => {
    clientsServiceMock.getMatters.mockReturnValue(throwError(() => ({ message: 'Error al cargar' })));
    const { component } = createComponent();

    expect(component.matters()).toEqual([]);
    expect(component.isLoading()).toBe(false);
  });

  it('muestra el estado vacío cuando el cliente no tiene asuntos', () => {
    clientsServiceMock.getMatters.mockReturnValue(of([]));
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Este cliente no tiene asuntos registrados.');
  });

  it('muestra el nombre, la vigencia y el tipo de vinculación de cada asunto', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Asesoría permanente');
    expect(fixture.nativeElement.textContent).toContain('Vigente');
    expect(fixture.nativeElement.textContent).toContain('Consultoría');
  });

  it('oculta el botón de cerrar anticipadamente cuando el asunto ya está TERMINADO', () => {
    clientsServiceMock.getMatters.mockReturnValue(of([matterTerminado]));
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('button[title="Cerrar anticipadamente"]')).toBeNull();
  });

  it('openCreateForm limpia el formulario y abre el modal', () => {
    const { component } = createComponent();
    component.form.patchValue({ name: 'Residuo previo' });

    component.openCreateForm();

    expect(component.editingMatterId()).toBeNull();
    expect(component.form.get('name')?.value).toBe('');
    expect(component.isFormOpen()).toBe(true);
  });

  it('openEditForm precarga el formulario con los datos del asunto', () => {
    const { component } = createComponent();

    component.openEditForm(matterVigente);

    expect(component.editingMatterId()).toBe('m1');
    expect(component.form.get('name')?.value).toBe('Asesoría permanente');
    expect(component.form.get('contractTypeId')?.value).toBe('ct1');
    expect(component.form.get('startDate')?.value).toBe('2026-01-01');
    expect(component.isFormOpen()).toBe(true);
  });

  it('save no hace nada si el formulario es inválido', () => {
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ name: '' });

    component.save();

    expect(clientsServiceMock.createMatter).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
  });

  it('save crea un asunto nuevo en éxito, cierra el modal y recarga', () => {
    clientsServiceMock.createMatter.mockReturnValue(of(matterVigente));
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ name: 'Nuevo asunto' });
    clientsServiceMock.getMatters.mockClear();

    component.save();

    expect(clientsServiceMock.createMatter).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'cl1', name: 'Nuevo asunto' }),
    );
    expect(toastServiceMock.success).toHaveBeenCalledWith('Asunto creado exitosamente');
    expect(component.isFormOpen()).toBe(false);
    expect(clientsServiceMock.getMatters).toHaveBeenCalled();
  });

  it('save edita un asunto existente en éxito', () => {
    clientsServiceMock.updateMatter.mockReturnValue(of(matterVigente));
    const { component } = createComponent();
    component.openEditForm(matterVigente);
    component.form.patchValue({ name: 'Renombrado' });

    component.save();

    expect(clientsServiceMock.updateMatter).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({ name: 'Renombrado' }),
    );
    expect(toastServiceMock.success).toHaveBeenCalledWith('Asunto actualizado exitosamente');
  });

  it('save en error expone el mensaje del backend y no cierra el modal', () => {
    clientsServiceMock.createMatter.mockReturnValue(throwError(() => ({ message: 'Nombre duplicado' })));
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ name: 'Nuevo asunto' });

    component.save();

    expect(component.errorMessage()).toBe('Nombre duplicado');
    expect(component.isSaving()).toBe(false);
    expect(component.isFormOpen()).toBe(true);
  });

  it('save ignora envíos repetidos mientras isSaving ya está activo', () => {
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ name: 'Nuevo asunto' });
    component.isSaving.set(true);

    component.save();

    expect(clientsServiceMock.createMatter).not.toHaveBeenCalled();
  });

  it('closeEarly no hace nada si el usuario cancela la confirmación', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.closeEarly(matterVigente);

    expect(clientsServiceMock.updateMatter).not.toHaveBeenCalled();
  });

  it('closeEarly marca el asunto como TERMINADO al confirmar y muestra un toast', async () => {
    clientsServiceMock.updateMatter.mockReturnValue(of({ ...matterVigente, status: ClientMatterStatus.TERMINADO }));
    const { component } = createComponent();

    await component.closeEarly(matterVigente);

    expect(clientsServiceMock.updateMatter).toHaveBeenCalledWith('m1', { status: ClientMatterStatus.TERMINADO });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Asunto cerrado exitosamente');
  });

  it('closeEarly en error muestra un toast de error', async () => {
    clientsServiceMock.updateMatter.mockReturnValue(throwError(() => ({ message: 'No se pudo cerrar' })));
    const { component } = createComponent();

    await component.closeEarly(matterVigente);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo cerrar');
  });

  it('remove no elimina si el usuario cancela la confirmación', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.remove(matterSinProcesos);

    expect(clientsServiceMock.removeMatter).not.toHaveBeenCalled();
  });

  it('remove elimina el asunto al confirmar y muestra un toast', async () => {
    clientsServiceMock.removeMatter.mockReturnValue(of(undefined));
    const { component } = createComponent();

    await component.remove(matterSinProcesos);

    expect(clientsServiceMock.removeMatter).toHaveBeenCalledWith('m3');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Asunto eliminado exitosamente');
  });

  it('remove en error muestra un toast de error', async () => {
    clientsServiceMock.removeMatter.mockReturnValue(throwError(() => ({ message: 'No se pudo eliminar' })));
    const { component } = createComponent();

    await component.remove(matterSinProcesos);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo eliminar');
  });

  // BUG-27 (ajuste 2026-09-17, decisión del propietario): un asunto con
  // procesos vinculados no se elimina nunca — se cierra anticipadamente. Esta
  // guardia en remove() es la segunda defensa (la primera es el atributo
  // [disabled] del botón en el template, cubierto por los tests de abajo).
  it('remove no elimina y muestra un toast de error si el asunto tiene procesos vinculados', async () => {
    const { component } = createComponent();

    await component.remove(matterVigente);

    expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
    expect(clientsServiceMock.removeMatter).not.toHaveBeenCalled();
    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'No se puede eliminar un asunto con procesos vinculados. Ciérralo anticipadamente en su lugar.',
    );
  });

  it('deshabilita el botón Eliminar cuando el asunto tiene procesos vinculados', () => {
    const { fixture } = createComponent();

    const deleteButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find((btn) =>
      (btn as HTMLButtonElement).title.startsWith('No se puede eliminar'),
    ) as HTMLButtonElement | undefined;

    expect(deleteButton).toBeTruthy();
    expect(deleteButton!.disabled).toBe(true);
  });

  it('habilita el botón Eliminar cuando el asunto no tiene procesos vinculados', () => {
    clientsServiceMock.getMatters.mockReturnValue(of([matterSinProcesos]));
    const { fixture } = createComponent();

    const deleteButton = fixture.nativeElement.querySelector('button[title="Eliminar"]') as HTMLButtonElement | null;

    expect(deleteButton).toBeTruthy();
    expect(deleteButton!.disabled).toBe(false);
  });
});
