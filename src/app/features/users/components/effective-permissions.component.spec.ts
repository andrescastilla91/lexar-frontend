import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EffectivePermissionsComponent } from './effective-permissions.component';
import { UsersService } from '../../../core/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { EffectivePermissionsResponse } from '../../../core/models/user-backend.model';
import * as blobUtil from '../../../core/utils/blob-download.util';

const RESPONSE: EffectivePermissionsResponse = {
  message: 'ok',
  user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez' },
  roles: [
    { id: 'r1', name: 'Asesor' },
    { id: 'r2', name: 'Asistente' },
  ],
  groups: [
    {
      groupCode: 'clients',
      groupLabel: 'Clientes',
      permissions: [
        {
          code: 'clients.view',
          label: 'Ver detalle de cliente',
          description: 'Ver clientes',
          sources: [
            { roleId: 'r1', roleName: 'Asesor' },
            { roleId: 'r2', roleName: 'Asistente' },
          ],
        },
      ],
    },
  ],
  total: 1,
};

describe('EffectivePermissionsComponent', () => {
  let usersServiceMock: { getEffectivePermissions: jest.Mock; exportEffectivePermissions: jest.Mock };
  let toastMock: { success: jest.Mock; error: jest.Mock };

  function configure(): void {
    usersServiceMock = {
      getEffectivePermissions: jest.fn().mockReturnValue(of(RESPONSE)),
      exportEffectivePermissions: jest.fn().mockReturnValue(of(new Blob(['csv']))),
    };
    toastMock = { success: jest.fn(), error: jest.fn() };
    TestBed.configureTestingModule({
      imports: [EffectivePermissionsComponent],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(EffectivePermissionsComponent);
    fixture.componentRef.setInput('userId', 'u1');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  afterEach(() => jest.restoreAllMocks());

  it('carga los permisos efectivos del usuario y los pinta con su origen', () => {
    configure();
    const { fixture, component } = createComponent();

    expect(usersServiceMock.getEffectivePermissions).toHaveBeenCalledWith('u1');
    expect(component.data()).toEqual(RESPONSE);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Clientes');
    expect(text).toContain('Ver detalle de cliente');
    expect(text).toContain('Origen: Asesor, Asistente');
    expect(text).toContain('1 permiso efectivo');
    expect(text).toContain('2 roles');
  });

  it('un permiso que viene de varios roles se muestra una sola vez', () => {
    configure();
    const { fixture } = createComponent();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('li').length).toBe(1);
  });

  it('si el usuario no tiene roles, lo dice y deshabilita la exportación', () => {
    configure();
    usersServiceMock.getEffectivePermissions.mockReturnValue(
      of({ ...RESPONSE, roles: [], groups: [], total: 0 }),
    );
    const { fixture } = createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no tiene roles asignados');
    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('si los roles no otorgan permisos, lo dice distinto a "sin roles"', () => {
    configure();
    usersServiceMock.getEffectivePermissions.mockReturnValue(
      of({ ...RESPONSE, groups: [], total: 0 }),
    );
    const { fixture } = createComponent();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no otorgan permisos');
  });

  it('si la carga falla, muestra el mensaje del backend', () => {
    configure();
    usersServiceMock.getEffectivePermissions.mockReturnValue(
      throwError(() => ({ message: 'Usuario no encontrado' })),
    );
    const { fixture, component } = createComponent();

    expect(component.data()).toBeNull();
    expect(component.loading()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Usuario no encontrado');
  });

  it('exportCsv descarga el blob con el nombre del día', () => {
    configure();
    const downloadSpy = jest.spyOn(blobUtil, 'downloadBlob').mockImplementation(() => undefined);
    jest.spyOn(blobUtil, 'todayStamp').mockReturnValue('2026-10-05');
    const { component } = createComponent();

    component.exportCsv();

    expect(usersServiceMock.exportEffectivePermissions).toHaveBeenCalledWith('u1');
    expect(downloadSpy).toHaveBeenCalledWith(expect.any(Blob), 'permisos-efectivos-2026-10-05.csv');
    expect(component.exporting()).toBe(false);
  });

  it('exportCsv en error avisa por toast y no descarga', () => {
    configure();
    const downloadSpy = jest.spyOn(blobUtil, 'downloadBlob').mockImplementation(() => undefined);
    usersServiceMock.exportEffectivePermissions.mockReturnValue(throwError(() => new Error('Sin permiso')));
    const { component } = createComponent();

    component.exportCsv();

    expect(toastMock.error).toHaveBeenCalledWith('Sin permiso');
    expect(downloadSpy).not.toHaveBeenCalled();
    expect(component.exporting()).toBe(false);
  });

  it('recarga cuando cambia refreshKey (p. ej. tras reasignar roles)', () => {
    configure();
    const { fixture } = createComponent();
    expect(usersServiceMock.getEffectivePermissions).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('refreshKey', [{ id: 'r9', name: 'Otro' }]);
    fixture.detectChanges();

    expect(usersServiceMock.getEffectivePermissions).toHaveBeenCalledTimes(2);
  });
});
