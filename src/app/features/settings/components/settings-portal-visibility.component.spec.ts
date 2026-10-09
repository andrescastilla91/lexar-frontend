import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { SettingsPortalVisibilityComponent } from './settings-portal-visibility.component';
import { PortalVisibilityPolicyService } from '../../../core/services/portal-visibility-policy.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast.service';
import { PermissionsService } from '../../../core/services/permissions.service';
import {
  PortalEventVisibilityMode,
  PortalEventVisibilityPolicy,
} from '../../../core/models/portal-visibility-policy.model';
import { ProcessEventType } from '../../../core/models/process-event.model';

describe('SettingsPortalVisibilityComponent', () => {
  let policyServiceMock: { getAll: jest.Mock; update: jest.Mock };
  let confirmDialogMock: { confirm: jest.Mock };
  let toastServiceMock: { success: jest.Mock; error: jest.Mock };

  const policies: PortalEventVisibilityPolicy[] = [
    { eventType: ProcessEventType.ANNOTATION, mode: PortalEventVisibilityMode.DEFAULT_OFF, allowsAlways: false },
    { eventType: ProcessEventType.STATUS_CHANGE, mode: PortalEventVisibilityMode.ALWAYS, allowsAlways: true },
    // allowsAlways: true pero el modo real NO es ALWAYS — regresión del bug
    // real reportado por el usuario: el selector mostraba siempre la primera
    // opción (ALWAYS, cuando allowsAlways es true) en vez del modo real.
    { eventType: ProcessEventType.DOCUMENT_UPLOADED, mode: PortalEventVisibilityMode.DEFAULT_OFF, allowsAlways: true },
  ];

  function configure(): void {
    policyServiceMock = {
      getAll: jest.fn().mockReturnValue(of(policies)),
      update: jest.fn(),
    };
    confirmDialogMock = { confirm: jest.fn().mockResolvedValue(true) };
    toastServiceMock = { success: jest.fn(), error: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SettingsPortalVisibilityComponent],
      providers: [
        { provide: PortalVisibilityPolicyService, useValue: policyServiceMock },
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
    const fixture = TestBed.createComponent(SettingsPortalVisibilityComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => configure());

  it('al inicializar carga la política de visibilidad', () => {
    const { component } = createComponent();

    expect(policyServiceMock.getAll).toHaveBeenCalled();
    expect(component.policies()).toEqual(policies);
    expect(component.isLoading()).toBe(false);
  });

  it('si falla la carga, muestra un toast de error', () => {
    policyServiceMock.getAll.mockReturnValue(throwError(() => ({ message: 'Error al cargar' })));
    const { component } = createComponent();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Error al cargar');
    expect(component.isLoading()).toBe(false);
  });

  const triggers = (fixture: { nativeElement: HTMLElement }) =>
    Array.from(fixture.nativeElement.querySelectorAll<HTMLButtonElement>('app-select button[role="combobox"]'));

  it('no ofrece la opción ALWAYS para ANNOTATION en el selector', () => {
    const { fixture } = createComponent();

    triggers(fixture)[0].click();
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')).map((o) =>
      (o as HTMLElement).textContent?.trim(),
    );

    expect(labels).toEqual(['Visible por defecto', 'Oculto por defecto']);
  });

  it('ofrece ALWAYS cuando el evento lo permite', () => {
    const { fixture } = createComponent();

    triggers(fixture)[1].click();
    fixture.detectChanges();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')).map((o) =>
      (o as HTMLElement).textContent?.trim(),
    );

    expect(labels).toEqual(['Siempre visible', 'Visible por defecto', 'Oculto por defecto']);
  });

  it('F27: cada selector muestra su modo real, no siempre el primero de la lista', () => {
    const { fixture } = createComponent();

    const shown = triggers(fixture).map((trigger) => trigger.textContent?.trim());
    // ANNOTATION: su modo es DEFAULT_OFF aunque la primera opción sea DEFAULT_ON.
    // DOCUMENT_UPLOADED: allowsAlways=true (primera opción ALWAYS) pero su modo
    // real es DEFAULT_OFF — el caso que rompía el <select> nativo anterior.
    expect(shown).toEqual(['Oculto por defecto', 'Siempre visible', 'Oculto por defecto']);
  });

  it('elegir una opción en el selector guarda el nuevo modo', () => {
    policyServiceMock.update.mockReturnValue(
      of({ eventType: ProcessEventType.STATUS_CHANGE, mode: PortalEventVisibilityMode.DEFAULT_ON, allowsAlways: true }),
    );
    const { fixture } = createComponent();

    triggers(fixture)[1].click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('[role="option"]')[1] as HTMLElement).click();
    fixture.detectChanges();

    expect(policyServiceMock.update).toHaveBeenCalledWith(
      ProcessEventType.STATUS_CHANGE,
      PortalEventVisibilityMode.DEFAULT_ON,
    );
    expect(triggers(fixture)[1].textContent?.trim()).toBe('Visible por defecto');
  });

  it('no llama al servicio cuando el modo elegido es igual al actual', async () => {
    const { component } = createComponent();

    await component.onModeChange(policies[0], PortalEventVisibilityMode.DEFAULT_OFF);

    expect(policyServiceMock.update).not.toHaveBeenCalled();
  });

  it('F27: pide confirmación antes de activar ANNOTATION en DEFAULT_ON', async () => {
    policyServiceMock.update.mockReturnValue(
      of({ eventType: ProcessEventType.ANNOTATION, mode: PortalEventVisibilityMode.DEFAULT_ON, allowsAlways: false }),
    );
    const { component } = createComponent();

    await component.onModeChange(policies[0], PortalEventVisibilityMode.DEFAULT_ON);

    expect(confirmDialogMock.confirm).toHaveBeenCalled();
    expect(policyServiceMock.update).toHaveBeenCalledWith(
      ProcessEventType.ANNOTATION,
      PortalEventVisibilityMode.DEFAULT_ON,
    );
    expect(toastServiceMock.success).toHaveBeenCalled();
  });

  it('F27: si el usuario cancela la confirmación no llama al servicio y el selector sigue mostrando el modo real', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { fixture } = createComponent();

    triggers(fixture)[0].click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('[role="option"]')[0] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(policyServiceMock.update).not.toHaveBeenCalled();
    expect(triggers(fixture)[0].textContent?.trim()).toBe('Oculto por defecto');
  });

  it('en error de actualización muestra un toast y el selector conserva el modo real', async () => {
    policyServiceMock.update.mockReturnValue(throwError(() => ({ message: 'No se pudo actualizar' })));
    const { fixture } = createComponent();

    triggers(fixture)[1].click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('[role="option"]')[2] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar');
    expect(triggers(fixture)[1].textContent?.trim()).toBe('Siempre visible');
  });
});
