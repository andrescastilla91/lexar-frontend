import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminHolidaysComponent } from './admin-holidays.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Holiday } from '../../../core/models/admin.model';

describe('AdminHolidaysComponent', () => {
  let platformAdminServiceMock: {
    listHolidays: jest.Mock;
    createHoliday: jest.Mock;
    updateHoliday: jest.Mock;
    deleteHoliday: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const holidayA: Holiday = {
    id: 'holiday-1',
    date: '2026-01-01',
    name: 'Año Nuevo',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const holidayB: Holiday = {
    id: 'holiday-2',
    date: '2027-12-25',
    name: 'Navidad',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  function configure(): void {
    platformAdminServiceMock = {
      listHolidays: jest.fn().mockReturnValue(of([holidayA, holidayB])),
      createHoliday: jest.fn(),
      updateHoliday: jest.fn(),
      deleteHoliday: jest.fn(),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AdminHolidaysComponent],
      providers: [
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminHolidaysComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga el listado de festivos', () => {
    const component = createComponent();

    expect(component.holidays()).toEqual([holidayA, holidayB]);
  });

  it('al inicializar en error notifica el mensaje sin romper el listado', () => {
    platformAdminServiceMock.listHolidays.mockReturnValue(throwError(() => new Error('Error al cargar los festivos')));

    const component = createComponent();

    expect(component.holidays()).toEqual([]);
    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar los festivos');
  });

  it('years deriva los años distintos presentes en el listado, ordenados', () => {
    const component = createComponent();

    expect(component.years()).toEqual([2026, 2027]);
  });

  it('filteredHolidays devuelve todo ordenado por fecha cuando el filtro es "all"', () => {
    const component = createComponent();

    expect(component.filteredHolidays()).toEqual([holidayA, holidayB]);
  });

  it('filteredHolidays filtra por año cuando se selecciona uno', () => {
    const component = createComponent();

    component.selectedYear.set(2027);

    expect(component.filteredHolidays()).toEqual([holidayB]);
  });

  it('onYearFilterChange actualiza selectedYear a partir del <select>', () => {
    const component = createComponent();
    const target = { value: '2027' } as unknown as HTMLSelectElement;

    component.onYearFilterChange({ target } as unknown as Event);

    expect(component.selectedYear()).toBe(2027);
  });

  it('onYearFilterChange vuelve a "all" cuando se elige esa opción', () => {
    const component = createComponent();
    component.selectedYear.set(2027);
    const target = { value: 'all' } as unknown as HTMLSelectElement;

    component.onYearFilterChange({ target } as unknown as Event);

    expect(component.selectedYear()).toBe('all');
  });

  it('formatDate formatea la fecha en español sin desfase de zona horaria', () => {
    const component = createComponent();

    const formatted = component.formatDate('2026-01-01');

    expect(formatted).toContain('2026');
    expect(formatted.toLowerCase()).toContain('enero');
  });

  it('onCreate no envía si el formulario es inválido', () => {
    const component = createComponent();

    component.onCreate();

    expect(platformAdminServiceMock.createHoliday).not.toHaveBeenCalled();
    expect(component.createForm.get('date')?.touched).toBe(true);
  });

  it('onCreate en éxito crea el festivo, recarga el listado y cierra el formulario', () => {
    platformAdminServiceMock.createHoliday.mockReturnValue(of(holidayA));
    const component = createComponent();
    component.showCreateForm.set(true);
    component.createForm.setValue({ date: '2026-05-01', name: 'Día del Trabajo' });

    component.onCreate();

    expect(platformAdminServiceMock.createHoliday).toHaveBeenCalledWith({
      date: '2026-05-01',
      name: 'Día del Trabajo',
    });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Festivo creado correctamente.');
    expect(component.showCreateForm()).toBe(false);
    expect(component.isSaving()).toBe(false);
  });

  it('onCreate en error notifica y deja el formulario abierto', () => {
    platformAdminServiceMock.createHoliday.mockReturnValue(
      throwError(() => new Error('Ya existe un festivo registrado el 2026-05-01')),
    );
    const component = createComponent();
    component.showCreateForm.set(true);
    component.createForm.setValue({ date: '2026-05-01', name: 'Día del Trabajo' });

    component.onCreate();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Ya existe un festivo registrado el 2026-05-01');
    expect(component.showCreateForm()).toBe(true);
    expect(component.isSaving()).toBe(false);
  });

  it('startEdit precarga el editForm con el nombre del festivo y cierra el formulario de creación', () => {
    const component = createComponent();
    component.showCreateForm.set(true);

    component.startEdit(holidayA);

    expect(component.showCreateForm()).toBe(false);
    expect(component.editingHolidayId()).toBe('holiday-1');
    expect(component.editingHolidayDate()).toBe('2026-01-01');
    expect(component.editForm.getRawValue()).toEqual({ name: 'Año Nuevo' });
  });

  it('cancelEdit limpia el festivo en edición', () => {
    const component = createComponent();
    component.startEdit(holidayA);

    component.cancelEdit();

    expect(component.editingHolidayId()).toBeNull();
    expect(component.editingHolidayDate()).toBeNull();
  });

  it('onUpdate no envía si no hay festivo en edición', () => {
    const component = createComponent();

    component.onUpdate();

    expect(platformAdminServiceMock.updateHoliday).not.toHaveBeenCalled();
  });

  it('onUpdate en éxito actualiza el festivo, recarga el listado y cierra la edición', () => {
    platformAdminServiceMock.updateHoliday.mockReturnValue(of({ ...holidayA, name: 'Año Nuevo (ajustado)' }));
    const component = createComponent();
    component.startEdit(holidayA);
    component.editForm.patchValue({ name: 'Año Nuevo (ajustado)' });

    component.onUpdate();

    expect(platformAdminServiceMock.updateHoliday).toHaveBeenCalledWith('holiday-1', { name: 'Año Nuevo (ajustado)' });
    expect(toastServiceMock.success).toHaveBeenCalledWith('Festivo actualizado correctamente.');
    expect(component.editingHolidayId()).toBeNull();
    expect(component.isSaving()).toBe(false);
  });

  it('onUpdate en error notifica y deja la edición abierta', () => {
    platformAdminServiceMock.updateHoliday.mockReturnValue(throwError(() => new Error('No se pudo actualizar el festivo')));
    const component = createComponent();
    component.startEdit(holidayA);

    component.onUpdate();

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar el festivo');
    expect(component.editingHolidayId()).toBe('holiday-1');
    expect(component.isSaving()).toBe(false);
  });

  it('toggleCreateForm alterna el formulario de creación y cierra cualquier edición en curso', () => {
    const component = createComponent();
    component.startEdit(holidayA);

    component.toggleCreateForm();

    expect(component.showCreateForm()).toBe(true);
    expect(component.editingHolidayId()).toBeNull();
  });

  it('remove pide confirmación y, al aceptar, elimina y recarga', async () => {
    platformAdminServiceMock.deleteHoliday.mockReturnValue(of(undefined));
    const component = createComponent();

    await component.remove(holidayA);

    expect(confirmDialogMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Eliminar festivo', danger: true }),
    );
    expect(platformAdminServiceMock.deleteHoliday).toHaveBeenCalledWith('holiday-1');
    expect(toastServiceMock.success).toHaveBeenCalledWith('Festivo eliminado.');
  });

  it('remove no hace nada si el usuario cancela el diálogo', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.remove(holidayA);

    expect(platformAdminServiceMock.deleteHoliday).not.toHaveBeenCalled();
  });

  it('remove en error notifica el mensaje', async () => {
    platformAdminServiceMock.deleteHoliday.mockReturnValue(throwError(() => new Error('No se pudo eliminar el festivo')));
    const component = createComponent();

    await component.remove(holidayA);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo eliminar el festivo');
  });
});
