import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminTeamComponent } from './admin-team.component';
import { PlatformAdminService } from '../../../core/services/platform-admin.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PlatformAdminSummary } from '../../../core/models/admin.model';

describe('AdminTeamComponent', () => {
  let platformAdminServiceMock: {
    listPlatformAdmins: jest.Mock;
    createPlatformAdmin: jest.Mock;
    togglePlatformAdminActive: jest.Mock;
    currentAdmin: jest.Mock;
  };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const self: PlatformAdminSummary = {
    id: 'admin-1',
    email: 'yo@lexar.com',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  const other: PlatformAdminSummary = {
    id: 'admin-2',
    email: 'otro@lexar.com',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  function configure(): void {
    platformAdminServiceMock = {
      listPlatformAdmins: jest.fn().mockReturnValue(of([self, other])),
      createPlatformAdmin: jest.fn(),
      togglePlatformAdminActive: jest.fn(),
      currentAdmin: jest.fn().mockReturnValue({ email: 'yo@lexar.com' }),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [AdminTeamComponent],
      providers: [
        { provide: PlatformAdminService, useValue: platformAdminServiceMock },
        { provide: ConfirmDialogService, useValue: confirmDialogMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });
  }

  function createComponent() {
    const fixture = TestBed.createComponent(AdminTeamComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => configure());

  it('al inicializar carga el listado de platform admins', () => {
    const component = createComponent();

    expect(component.admins()).toEqual([self, other]);
  });

  it('isSelf identifica al admin con el mismo correo de la sesión actual', () => {
    const component = createComponent();

    expect(component.isSelf(self)).toBe(true);
    expect(component.isSelf(other)).toBe(false);
  });

  it('onCreate no envía si el formulario es inválido', () => {
    const component = createComponent();

    component.onCreate();

    expect(platformAdminServiceMock.createPlatformAdmin).not.toHaveBeenCalled();
    expect(component.createForm.get('email')?.touched).toBe(true);
  });

  it('onCreate en éxito recarga el listado y limpia el formulario', () => {
    platformAdminServiceMock.createPlatformAdmin.mockReturnValue(of(other));
    const component = createComponent();
    component.createForm.setValue({ email: 'nuevo@lexar.com', password: 'password123' });

    component.onCreate();

    expect(platformAdminServiceMock.createPlatformAdmin).toHaveBeenCalledWith({
      email: 'nuevo@lexar.com',
      password: 'password123',
    });
    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(component.showCreateForm()).toBe(false);
    expect(component.isSaving()).toBe(false);
  });

  it('onCreate en error muestra el mensaje sin cerrar el formulario', () => {
    platformAdminServiceMock.createPlatformAdmin.mockReturnValue(throwError(() => new Error('Dominio no permitido')));
    const component = createComponent();
    component.showCreateForm.set(true);
    component.createForm.setValue({ email: 'nuevo@gmail.com', password: 'password123' });

    component.onCreate();

    expect(component.createError()).toBe('Dominio no permitido');
    expect(component.showCreateForm()).toBe(true);
    expect(component.isSaving()).toBe(false);
  });

  it('toggleActive pide confirmación y, al aceptar, llama al servicio', async () => {
    platformAdminServiceMock.togglePlatformAdminActive.mockReturnValue(of(other));
    const component = createComponent();

    await component.toggleActive(other);

    expect(platformAdminServiceMock.togglePlatformAdminActive).toHaveBeenCalledWith('admin-2');
    expect(toastServiceMock.success).toHaveBeenCalled();
  });

  it('toggleActive no hace nada si el usuario cancela el diálogo', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const component = createComponent();

    await component.toggleActive(other);

    expect(platformAdminServiceMock.togglePlatformAdminActive).not.toHaveBeenCalled();
  });
});
