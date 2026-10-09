import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SettingsCatalogsComponent } from './settings-catalogs.component';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { PlanUpgradeService } from '../../../core/services/plan-upgrade.service';
import { CatalogItem, CatalogSummaryItem } from '../../../core/models/catalog-backend.model';
import { CATALOG_META } from '../utils/catalog-registry';

describe('SettingsCatalogsComponent', () => {
  let catalogsServiceMock: {
    getCatalog: jest.Mock;
    getSummary: jest.Mock;
    createItem: jest.Mock;
    updateItem: jest.Mock;
    deleteItem: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };
  let planUpgradeMock: { isPlanGateError: jest.Mock; promptUpgrade: jest.Mock };
  let routerMock: { navigate: jest.Mock };
  let queryParams: Record<string, string>;

  const summary: CatalogSummaryItem[] = [
    { catalogType: 'document_type', total: 7, active: 6 },
    { catalogType: 'process_type', total: 0, active: 0 },
  ];

  const items: CatalogItem[] = [
    { id: '1', catalogType: 'document_type', code: 'CONTRATO', label: 'Contrato', color: 'primary', sortOrder: 0, isActive: true, isSystem: true, personTypeScope: null, processTypeScope: null, usageCount: 3 },
    { id: '2', catalogType: 'document_type', code: 'PODER', label: 'Poder', color: null, sortOrder: 1, isActive: true, isSystem: false, personTypeScope: null, processTypeScope: null, usageCount: 0 },
  ];

  function configure(initialQueryParams: Record<string, string> = {}): void {
    queryParams = initialQueryParams;
    routerMock = { navigate: jest.fn().mockResolvedValue(true) };
    catalogsServiceMock = {
      getCatalog: jest.fn().mockReturnValue(of(items)),
      getSummary: jest.fn().mockReturnValue(of(summary)),
      createItem: jest.fn(),
      updateItem: jest.fn(),
      deleteItem: jest.fn(),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };
    planUpgradeMock = { isPlanGateError: jest.fn().mockReturnValue(false), promptUpgrade: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsCatalogsComponent],
      providers: [
        { provide: CatalogsService, useValue: catalogsServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: PlanUpgradeService, useValue: planUpgradeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
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

  // F34 §1: nueva pestaña "Tipos de vinculación" (contract_type).
  it('incluye la pestaña "Tipos de vinculación" (contract_type) y permite seleccionarla', () => {
    catalogsServiceMock.getCatalog.mockReturnValue(of([]));
    const component = createComponent();

    expect(CATALOG_META.contract_type.label).toBe('Tipos de vinculación');

    component.selectType('contract_type');

    expect(component.activeType()).toBe('contract_type');
    expect(catalogsServiceMock.getCatalog).toHaveBeenCalledWith('contract_type');
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
    component.itemForm.setValue({ code: 'URGENTE', label: 'Urgente', color: 'danger', processTypeScope: null });

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
    component.itemForm.setValue({ code: 'URGENTE', label: 'Urgente', color: '', processTypeScope: null });

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

  // F7-R3: customCatalogs está gateado por plan (create/update/delete). El
  // toast+CTA de upgrade lo dispara error.interceptor.ts de forma
  // centralizada (ver error.interceptor.spec.ts) — el componente solo hace
  // su limpieza local y evita mostrar el error genérico encima.
  it('submitItem en gate de plan: cierra el modal, no muestra el error genérico ni dispara el CTA él mismo', () => {
    const gateError = { error: { code: 'FEATURE_NOT_IN_PLAN', message: 'Tu plan no incluye catálogos personalizables' } };
    planUpgradeMock.isPlanGateError.mockReturnValue(true);
    catalogsServiceMock.createItem.mockReturnValue(throwError(() => gateError));
    const component = createComponent();
    component.openCreateModal();
    component.itemForm.setValue({ code: 'URGENTE', label: 'Urgente', color: '', processTypeScope: null });

    component.submitItem();

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
    expect(component.modalOpen()).toBe(false);
    expect(component.formError()).toBeNull();
  });

  it('toggleActive en gate de plan: no muestra el toast genérico ni dispara el CTA él mismo', () => {
    const gateError = { error: { code: 'FEATURE_NOT_IN_PLAN', message: 'Tu plan no incluye catálogos personalizables' } };
    planUpgradeMock.isPlanGateError.mockReturnValue(true);
    catalogsServiceMock.updateItem.mockReturnValue(throwError(() => gateError));
    const component = createComponent();

    component.toggleActive(items[0]);

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
    expect(toastServiceMock.error).not.toHaveBeenCalled();
  });

  it('deleteItem en gate de plan: no muestra el toast genérico ni dispara el CTA él mismo', async () => {
    const gateError = { error: { code: 'FEATURE_NOT_IN_PLAN', message: 'Tu plan no incluye catálogos personalizables' } };
    planUpgradeMock.isPlanGateError.mockReturnValue(true);
    catalogsServiceMock.deleteItem.mockReturnValue(throwError(() => gateError));
    const component = createComponent();

    await component.deleteItem(items[1]);

    expect(planUpgradeMock.promptUpgrade).not.toHaveBeenCalled();
    expect(toastServiceMock.error).not.toHaveBeenCalled();
  });

  // F40 §PRO-04: nueva pestaña "Tipos de proceso" (process_type).
  it('incluye la pestaña "Tipos de proceso" (process_type) y permite seleccionarla', () => {
    catalogsServiceMock.getCatalog.mockReturnValue(of([]));
    const component = createComponent();

    expect(CATALOG_META.process_type.label).toBe('Tipos de proceso');

    component.selectType('process_type');

    expect(component.activeType()).toBe('process_type');
    expect(catalogsServiceMock.getCatalog).toHaveBeenCalledWith('process_type');
  });

  // F40 §PRO-03: processTypeScope solo es relevante en la pestaña de etapas.
  describe('processTypeScope (F40 §PRO-03)', () => {
    const stageItem: CatalogItem = {
      id: 's1',
      catalogType: 'process_stage',
      code: 'AUDIENCIA',
      label: 'Audiencia',
      color: null,
      sortOrder: 0,
      isActive: true,
      isSystem: false,
      processTypeScope: 'type-1',
    } as CatalogItem;

    it('ngOnInit carga las opciones de tipo de proceso para el selector de scope', () => {
      catalogsServiceMock.getCatalog.mockImplementation((type: string) =>
        type === 'process_type'
          ? of([{ id: 'type-1', catalogType: 'process_type', code: 'JUDICIAL', label: 'Judicial' } as CatalogItem])
          : of(items),
      );
      const component = createComponent();

      expect(component.processTypeOptions()).toEqual([
        { id: 'type-1', catalogType: 'process_type', code: 'JUDICIAL', label: 'Judicial' },
      ]);
    });

    it('openEditModal precarga processTypeScope del ítem', () => {
      const component = createComponent();

      component.openEditModal(stageItem);

      expect(component.itemForm.get('processTypeScope')?.value).toBe('type-1');
    });

    it('submitItem incluye processTypeScope en el payload cuando la pestaña activa es process_stage', () => {
      catalogsServiceMock.updateItem.mockReturnValue(of(stageItem));
      const component = createComponent();
      component.selectType('process_stage');
      component.openEditModal(stageItem);
      component.itemForm.patchValue({ processTypeScope: 'type-2' });

      component.submitItem();

      expect(catalogsServiceMock.updateItem).toHaveBeenCalledWith('process_stage', 's1', {
        label: 'Audiencia',
        color: undefined,
        processTypeScope: 'type-2',
      });
    });

    it('submitItem omite processTypeScope del payload en cualquier otra pestaña', () => {
      catalogsServiceMock.updateItem.mockReturnValue(of(items[0]));
      const component = createComponent();
      component.openEditModal(items[0]);

      component.submitItem();

      expect(catalogsServiceMock.updateItem).toHaveBeenCalledWith('document_type', '1', {
        label: 'Contrato',
        color: 'primary',
      });
    });
  });

  describe('navegación entre catálogos (F47)', () => {
    it('sin ?tipo abre el primer catálogo', () => {
      const component = createComponent();

      expect(component.activeType()).toBe('document_type');
    });

    it('un enlace profundo ?tipo= abre ese catálogo y carga sus ítems', () => {
      TestBed.resetTestingModule();
      configure({ tipo: 'process_type' });
      const component = createComponent();

      expect(component.activeType()).toBe('process_type');
      expect(catalogsServiceMock.getCatalog).toHaveBeenCalledWith('process_type');
      expect(catalogsServiceMock.getCatalog).not.toHaveBeenCalledWith('document_type');
    });

    it('un ?tipo inválido se ignora y abre el catálogo por defecto', () => {
      TestBed.resetTestingModule();
      configure({ tipo: 'inventado' });
      const component = createComponent();

      expect(component.activeType()).toBe('document_type');
    });

    it('seleccionar un catálogo lo deja en la URL sin llenar el historial', () => {
      const component = createComponent();

      component.selectType('risk_level');

      expect(routerMock.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { tab: 'catalogs', tipo: 'risk_level' },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
    });

    it('volver a seleccionar el catálogo activo no toca la URL', () => {
      const component = createComponent();

      component.selectType('document_type');

      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('carga el resumen al abrir y lo pasa a la navegación', () => {
      const fixture = TestBed.createComponent(SettingsCatalogsComponent);
      fixture.detectChanges();

      expect(catalogsServiceMock.getSummary).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.summary()).toEqual(summary);
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Clientes');
      expect(text).toContain('Procesos');
    });

    it('si el resumen falla no molesta al usuario: sin toast y la lista sigue funcionando', () => {
      catalogsServiceMock.getSummary.mockReturnValue(throwError(() => new Error('falló')));
      const component = createComponent();

      expect(component.summary()).toBeNull();
      expect(toastServiceMock.error).not.toHaveBeenCalled();
      expect(component.items()).toHaveLength(2);
    });

    it('al crear un ítem se vuelven a pedir lista y resumen', () => {
      catalogsServiceMock.createItem.mockReturnValue(of(items[0]));
      const component = createComponent();
      catalogsServiceMock.getSummary.mockClear();
      component.openCreateModal();
      component.itemForm.patchValue({ code: 'NUEVO', label: 'Nuevo' });

      component.submitItem();

      expect(catalogsServiceMock.getSummary).toHaveBeenCalledTimes(1);
    });

    it('un catálogo vacío explica qué es y ofrece crear el primer ítem', () => {
      catalogsServiceMock.getCatalog.mockReturnValue(of([]));
      const fixture = TestBed.createComponent(SettingsCatalogsComponent);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Aún no hay ítems en Tipos de documento');
      expect(text).toContain(CATALOG_META.document_type.description);
      expect(text).toContain('Crear el primer ítem');
    });

    it('ya no hay pestañas horizontales: la navegación es la lista de catálogos', () => {
      const fixture = TestBed.createComponent(SettingsCatalogsComponent);
      fixture.detectChanges();

      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('nav[aria-label="Tipos de catálogo"]')).toBeNull();
      expect(root.querySelector('nav[aria-label="Catálogos disponibles"]')).not.toBeNull();
    });
  });
});
