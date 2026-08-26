import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SettingsCatalogsComponent } from './settings-catalogs.component';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { CatalogItem } from '../../../core/models/catalog-backend.model';

describe('SettingsCatalogsComponent', () => {
  let catalogsServiceMock: {
    getCatalog: jest.Mock;
    createItem: jest.Mock;
    updateItem: jest.Mock;
    deleteItem: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const items: CatalogItem[] = [
    { id: '1', catalogType: 'document_type', code: 'CONTRATO', label: 'Contrato', color: 'primary', sortOrder: 0, isActive: true, isSystem: true, usageCount: 3 },
    { id: '2', catalogType: 'document_type', code: 'PODER', label: 'Poder', color: null, sortOrder: 1, isActive: true, isSystem: false, usageCount: 0 },
  ];

  function configure(): void {
    catalogsServiceMock = {
      getCatalog: jest.fn().mockReturnValue(of(items)),
      createItem: jest.fn(),
      updateItem: jest.fn(),
      deleteItem: jest.fn(),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsCatalogsComponent],
      providers: [
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

  function createComponent() {
    const fixture = TestBed.createComponent(SettingsCatalogsComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga el catálogo activo por defecto (document_type), ordenado por sortOrder', () => {
    const component = createComponent();

    expect(catalogsServiceMock.getCatalog).toHaveBeenCalledWith('document_type');
    expect(component.items().map((i) => i.id)).toEqual(['1', '2']);
    expect(component.isLoading()).toBe(false);
  });

  it('si falla la carga, muestra un toast de error y deja la lista vacía', () => {
    catalogsServiceMock.getCatalog.mockReturnValue(throwError(() => ({ message: 'Error al cargar catálogo' })));
    const component = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar catálogo');
    expect(component.items()).toEqual([]);
    expect(component.isLoading()).toBe(false);
  });

  it('selectType cambia el tipo activo y recarga; no hace nada si ya está activo', () => {
    const component = createComponent();
    catalogsServiceMock.getCatalog.mockClear();

    component.selectType('document_type');
    expect(catalogsServiceMock.getCatalog).not.toHaveBeenCalled();

    component.selectType('risk_level');
    expect(component.activeType()).toBe('risk_level');
    expect(catalogsServiceMock.getCatalog).toHaveBeenCalledWith('risk_level');
  });

  it('openCreateModal limpia el formulario, habilita el código y abre el modal', () => {
    const component = createComponent();

    component.openCreateModal();

    expect(component.editingItem()).toBeNull();
    expect(component.itemForm.get('code')?.enabled).toBe(true);
    expect(component.modalOpen()).toBe(true);
  });

  it('openEditModal precarga el ítem y deshabilita el código', () => {
    const component = createComponent();

    component.openEditModal(items[0]);

    expect(component.editingItem()).toEqual(items[0]);
    expect(component.itemForm.get('label')?.value).toBe('Contrato');
    expect(component.itemForm.get('code')?.disabled).toBe(true);
    expect(component.modalOpen()).toBe(true);
  });

  it('submitItem no hace nada si el formulario es inválido', () => {
    const component = createComponent();
    component.openCreateModal();
    component.itemForm.patchValue({ code: '', label: '' });

    component.submitItem();

    expect(catalogsServiceMock.createItem).not.toHaveBeenCalled();
    expect(component.itemForm.get('code')?.touched).toBe(true);
  });

  it('submitItem crea un ítem nuevo en éxito, cierra el modal y recarga', () => {
    catalogsServiceMock.createItem.mockReturnValue(of(items[1]));
    const component = createComponent();
    component.openCreateModal();
    component.itemForm.setValue({ code: 'URGENTE', label: 'Urgente', color: 'danger' });

    component.submitItem();

    expect(catalogsServiceMock.createItem).toHaveBeenCalledWith('document_type', {
      code: 'URGENTE',
      label: 'Urgente',
      color: 'danger',
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Ítem creado correctamente.');
    expect(component.modalOpen()).toBe(false);
    expect(component.isSubmitting()).toBe(false);
  });

  it('submitItem edita un ítem existente en éxito', () => {
    catalogsServiceMock.updateItem.mockReturnValue(of(items[0]));
    const component = createComponent();
    component.openEditModal(items[0]);
    component.itemForm.patchValue({ label: 'Contrato renombrado' });

    component.submitItem();

    expect(catalogsServiceMock.updateItem).toHaveBeenCalledWith('document_type', '1', {
      label: 'Contrato renombrado',
      color: 'primary',
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Ítem actualizado correctamente.');
  });

  it('submitItem en error expone el mensaje del backend y no cierra el modal', () => {
    catalogsServiceMock.createItem.mockReturnValue(throwError(() => ({ message: 'Código duplicado' })));
    const component = createComponent();
    component.openCreateModal();
    component.itemForm.setValue({ code: 'URGENTE', label: 'Urgente', color: '' });

    component.submitItem();

    expect(component.formError()).toBe('Código duplicado');
    expect(component.isSubmitting()).toBe(false);
    expect(component.modalOpen()).toBe(true);
  });

  it('submitItem ignora envíos repetidos mientras isSubmitting ya está activo', () => {
    const component = createComponent();
    component.isSubmitting.set(true);

    component.submitItem();

    expect(catalogsServiceMock.createItem).not.toHaveBeenCalled();
  });

  it('toggleActive invierte isActive del ítem en éxito', () => {
    catalogsServiceMock.updateItem.mockReturnValue(of({ ...items[0], isActive: false }));
    const component = createComponent();

    component.toggleActive(items[0]);

    expect(catalogsServiceMock.updateItem).toHaveBeenCalledWith('document_type', '1', { isActive: false });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Ítem desactivado.');
  });

  it('toggleActive en error muestra un toast de error', () => {
    catalogsServiceMock.updateItem.mockReturnValue(throwError(() => ({ message: 'No se pudo' })));
    const component = createComponent();

    component.toggleActive(items[0]);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo');
  });

  it('moveItem intercambia el sortOrder con el ítem vecino', () => {
    catalogsServiceMock.updateItem.mockReturnValueOnce(of(items[0])).mockReturnValueOnce(of(items[1]));
    const component = createComponent();

    component.moveItem(items[0], 1);

    expect(catalogsServiceMock.updateItem).toHaveBeenCalledWith('document_type', '1', { sortOrder: 1 });
    expect(catalogsServiceMock.updateItem).toHaveBeenCalledWith('document_type', '2', { sortOrder: 0 });
  });

  it('moveItem no hace nada si el destino queda fuera de rango', () => {
    const component = createComponent();

    component.moveItem(items[0], -1);

    expect(catalogsServiceMock.updateItem).not.toHaveBeenCalled();
  });

  it('deleteItem no hace nada si el ítem está en uso', async () => {
    const component = createComponent();

    await component.deleteItem(items[0]);

    expect(confirmDialogMock.confirm).not.toHaveBeenCalled();
    expect(catalogsServiceMock.deleteItem).not.toHaveBeenCalled();
  });

  it('deleteItem no elimina si el usuario cancela la confirmación', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.deleteItem(items[1]);

    expect(catalogsServiceMock.deleteItem).not.toHaveBeenCalled();
  });

  it('deleteItem elimina el ítem al confirmar y muestra un toast', async () => {
    catalogsServiceMock.deleteItem.mockReturnValue(of(undefined));
    const component = createComponent();

    await component.deleteItem(items[1]);

    expect(catalogsServiceMock.deleteItem).toHaveBeenCalledWith('document_type', '2');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Ítem eliminado correctamente.');
  });

  it('deleteItem en error muestra un toast de error', async () => {
    catalogsServiceMock.deleteItem.mockReturnValue(throwError(() => ({ message: 'No se pudo eliminar' })));
    const component = createComponent();

    await component.deleteItem(items[1]);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo eliminar');
  });
});
