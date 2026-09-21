import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ProcessCounterpartiesModalComponent } from './process-counterparties-modal.component';
import { LegalProcessesService } from '../../../core/services/legal-processes.service';
import { CatalogsService } from '../../../core/services/catalogs.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import { ProcessCounterpartyResponse } from '../../../core/models/legal-process.model';
import { ClientPersonType } from '../../../core/models/client-backend.model';
import { CatalogItem } from '../../../core/models/catalog-backend.model';

/**
 * F40 §PRO-07/§CLI-12 — primer spec de este componente, siguiendo el mismo
 * patrón que client-matters-panel.component.spec.ts (componente
 * autocontenido, sin precedente de "dumb modal" con inputs/outputs de
 * datos, así que se mockean sus dependencias directas en vez de un padre).
 */
describe('ProcessCounterpartiesModalComponent', () => {
  let legalProcessesServiceMock: {
    getCounterparties: jest.Mock;
    createCounterparty: jest.Mock;
    updateCounterparty: jest.Mock;
    removeCounterparty: jest.Mock;
  };
  let catalogsServiceMock: { getActiveCatalog: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock; warning: jest.Mock };

  const documentTypeCC: CatalogItem = {
    id: 'doc-cc',
    catalogType: 'document_type',
    code: 'CC',
    label: 'Cédula de Ciudadanía',
    color: null,
    sortOrder: 1,
    isActive: true,
    isSystem: true,
    personTypeScope: 'NATURAL',
    processTypeScope: null,
  };

  const documentTypeNit: CatalogItem = {
    id: 'doc-nit',
    catalogType: 'document_type',
    code: 'NIT',
    label: 'NIT',
    color: null,
    sortOrder: 2,
    isActive: true,
    isSystem: true,
    personTypeScope: 'JURIDICA',
    processTypeScope: null,
  };

  const counterparty: ProcessCounterpartyResponse = {
    id: 'cp1',
    legalProcessId: 'p1',
    fullName: 'Banco XYZ',
    personType: ClientPersonType.JURIDICA,
    documentType: { id: 'doc-nit', code: 'NIT', label: 'NIT', color: null },
    identificationNumber: '900123',
    attorneyName: null,
    contactEmail: null,
    contactPhone: null,
    notes: null,
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
  };

  function configure(): void {
    legalProcessesServiceMock = {
      getCounterparties: jest.fn().mockReturnValue(of([counterparty])),
      createCounterparty: jest.fn(),
      updateCounterparty: jest.fn(),
      removeCounterparty: jest.fn(),
    };
    catalogsServiceMock = {
      getActiveCatalog: jest.fn().mockReturnValue(of([documentTypeCC, documentTypeNit])),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };

    TestBed.configureTestingModule({
      imports: [ProcessCounterpartiesModalComponent],
      providers: [
        { provide: LegalProcessesService, useValue: legalProcessesServiceMock },
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

  function createComponent(isOpen = true, legalProcessId: string | null = 'p1') {
    const fixture = TestBed.createComponent(ProcessCounterpartiesModalComponent);
    fixture.componentRef.setInput('isOpen', isOpen);
    fixture.componentRef.setInput('legalProcessId', legalProcessId);
    fixture.componentRef.setInput('processTitle', 'Proceso 1');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => configure());

  it('al abrirse (isOpen true) carga las contrapartes del proceso y el catálogo de tipos de documento', () => {
    const { component } = createComponent();

    expect(legalProcessesServiceMock.getCounterparties).toHaveBeenCalledWith('p1');
    expect(catalogsServiceMock.getActiveCatalog).toHaveBeenCalledWith('document_type');
    expect(component.counterparties()).toEqual([counterparty]);
    expect(component.isLoading()).toBe(false);
  });

  it('no carga nada si isOpen es false', () => {
    createComponent(false, 'p1');

    expect(legalProcessesServiceMock.getCounterparties).not.toHaveBeenCalled();
  });

  it('si falla la carga, deja la lista vacía sin lanzar', () => {
    legalProcessesServiceMock.getCounterparties.mockReturnValue(throwError(() => ({ message: 'Error' })));
    const { component } = createComponent();

    expect(component.counterparties()).toEqual([]);
    expect(component.isLoading()).toBe(false);
  });

  it('muestra el estado vacío cuando el proceso no tiene contrapartes', () => {
    legalProcessesServiceMock.getCounterparties.mockReturnValue(of([]));
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('No hay contrapartes registradas para este proceso');
  });

  it('muestra el nombre, tipo de persona y documento de cada contraparte', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Banco XYZ');
    expect(fixture.nativeElement.textContent).toContain('Jurídica');
    expect(fixture.nativeElement.textContent).toContain('900123');
  });

  it('documentTypesForPersonType filtra por el tipo de persona seleccionado', () => {
    const { component } = createComponent();

    component.form.patchValue({ personType: ClientPersonType.NATURAL });
    expect(component.documentTypesForPersonType()).toEqual([documentTypeCC]);

    component.form.patchValue({ personType: ClientPersonType.JURIDICA });
    expect(component.documentTypesForPersonType()).toEqual([documentTypeNit]);
  });

  it('openCreateForm limpia el formulario y cambia a la pestaña de formulario', () => {
    const { component } = createComponent();
    component.form.patchValue({ fullName: 'Residuo previo' });

    component.openCreateForm();

    expect(component.editingId()).toBeNull();
    expect(component.form.get('fullName')?.value).toBe('');
    expect(component.activeTab()).toBe('form');
  });

  it('openEditForm precarga el formulario con los datos de la contraparte', () => {
    const { component } = createComponent();

    component.openEditForm(counterparty);

    expect(component.editingId()).toBe('cp1');
    expect(component.form.get('fullName')?.value).toBe('Banco XYZ');
    expect(component.form.get('documentTypeId')?.value).toBe('doc-nit');
    expect(component.form.get('identificationNumber')?.value).toBe('900123');
    expect(component.activeTab()).toBe('form');
  });

  it('save no hace nada si el formulario es inválido', () => {
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ fullName: '', identificationNumber: '' });

    component.save();

    expect(legalProcessesServiceMock.createCounterparty).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
  });

  it('save crea una contraparte nueva en éxito, vuelve al listado y recarga', () => {
    legalProcessesServiceMock.createCounterparty.mockReturnValue(of(counterparty));
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ fullName: 'Nueva contraparte', identificationNumber: '123' });
    legalProcessesServiceMock.getCounterparties.mockClear();

    component.save();

    expect(legalProcessesServiceMock.createCounterparty).toHaveBeenCalledWith(
      expect.objectContaining({ legalProcessId: 'p1', fullName: 'Nueva contraparte' }),
    );
    expect(toastServiceMock.success).toHaveBeenCalledWith('Contraparte creada exitosamente');
    expect(component.activeTab()).toBe('list');
    expect(legalProcessesServiceMock.getCounterparties).toHaveBeenCalled();
  });

  // F40 §CLI-12: el cruce de conflicto de interés no bloquea — la
  // contraparte se crea igual (201/success), pero se advierte con un toast
  // separado.
  it('save muestra un toast de advertencia (no de error) cuando el backend devuelve documentConflict', () => {
    legalProcessesServiceMock.createCounterparty.mockReturnValue(
      of({
        ...counterparty,
        documentConflict: {
          legalProcessId: 'p1',
          legalProcessTitle: 'Proceso 1',
          matchedName: 'Cliente existente',
        },
      }),
    );
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ fullName: 'Nueva contraparte', identificationNumber: '900123' });

    component.save();

    expect(toastServiceMock.success).toHaveBeenCalledWith('Contraparte creada exitosamente');
    expect(toastServiceMock.warning).toHaveBeenCalledWith(
      expect.stringContaining('Cliente existente'),
    );
    expect(toastServiceMock.error).not.toHaveBeenCalled();
  });

  it('save no muestra advertencia cuando documentConflict es null', () => {
    legalProcessesServiceMock.createCounterparty.mockReturnValue(of(counterparty));
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ fullName: 'Nueva contraparte', identificationNumber: '1' });

    component.save();

    expect(toastServiceMock.warning).not.toHaveBeenCalled();
  });

  it('save edita una contraparte existente en éxito', () => {
    legalProcessesServiceMock.updateCounterparty.mockReturnValue(of(counterparty));
    const { component } = createComponent();
    component.openEditForm(counterparty);
    component.form.patchValue({ fullName: 'Renombrada' });

    component.save();

    expect(legalProcessesServiceMock.updateCounterparty).toHaveBeenCalledWith(
      'cp1',
      expect.objectContaining({ fullName: 'Renombrada' }),
    );
    expect(toastServiceMock.success).toHaveBeenCalledWith('Contraparte actualizada exitosamente');
  });

  it('save en error expone el mensaje del backend y se queda en el formulario', () => {
    legalProcessesServiceMock.createCounterparty.mockReturnValue(
      throwError(() => ({ message: 'Documento inválido' })),
    );
    const { component } = createComponent();
    component.openCreateForm();
    component.form.patchValue({ fullName: 'Nueva contraparte', identificationNumber: '1' });

    component.save();

    expect(component.errorMessage()).toBe('Documento inválido');
    expect(component.isSaving()).toBe(false);
  });

  it('remove no elimina si el usuario cancela la confirmación', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();

    await component.remove(counterparty);

    expect(legalProcessesServiceMock.removeCounterparty).not.toHaveBeenCalled();
  });

  it('remove elimina la contraparte al confirmar y muestra un toast', async () => {
    legalProcessesServiceMock.removeCounterparty.mockReturnValue(of(undefined));
    const { component } = createComponent();

    await component.remove(counterparty);

    expect(legalProcessesServiceMock.removeCounterparty).toHaveBeenCalledWith('cp1');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Contraparte eliminada exitosamente');
  });

  it('remove en error muestra un toast de error', async () => {
    legalProcessesServiceMock.removeCounterparty.mockReturnValue(
      throwError(() => ({ message: 'No se pudo eliminar' })),
    );
    const { component } = createComponent();

    await component.remove(counterparty);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo eliminar');
  });
});
