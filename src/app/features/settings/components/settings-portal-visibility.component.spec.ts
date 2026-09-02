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
    // real reportado por el usuario: el <select> mostraba siempre la
    // primera <option> renderizada (ALWAYS, cuando allowsAlways es true)
    // en vez del modo real, porque [value] estaba en el <select> padre en
    // vez de [selected] en cada <option> (Angular no resuelve a tiempo el
    // <option> que vive dentro de un @if antes de aplicar el value del
    // padre). Ver settings-portal-visibility.component.ts.
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

  it('no ofrece la opción ALWAYS para ANNOTATION en el select', () => {
    const { fixture } = createComponent();

    const selects: HTMLSelectElement[] = Array.from(fixture.nativeElement.querySelectorAll('select'));
    const annotationSelect = selects[0];
    const optionValues = Array.from(annotationSelect.options).map((o) => o.value);

    expect(optionValues).not.toContain(PortalEventVisibilityMode.ALWAYS);
  });

  it('F27: cada select muestra su modo real seleccionado, no siempre el primero de la lista', () => {
    const { fixture } = createComponent();

    const selects: HTMLSelectElement[] = Array.from(fixture.nativeElement.querySelectorAll('select'));
    // ANNOTATION: allowsAlways=false, primera opción real es DEFAULT_ON —
    // su modo es DEFAULT_OFF, así que si el bug reapareciera se vería en
    // blanco (ningún <option> marcado selected).
    expect(selects[0].value).toBe(PortalEventVisibilityMode.DEFAULT_OFF);
    // STATUS_CHANGE: su modo SÍ es la primera opción (ALWAYS) — no prueba
    // nada por sí solo, pero se incluye por completitud de la fila.
    expect(selects[1].value).toBe(PortalEventVisibilityMode.ALWAYS);
    // DOCUMENT_UPLOADED: allowsAlways=true (primera opción es ALWAYS) pero
    // su modo real es DEFAULT_OFF — este es el caso que el bug rompía: sin
    // el fix, el select mostraría "Siempre visible" aunque el modo
    // guardado fuera otro.
    expect(selects[2].value).toBe(PortalEventVisibilityMode.DEFAULT_OFF);
  });

  it('no llama al servicio cuando el modo elegido es igual al actual', async () => {
    const { component } = createComponent();

    await component.onModeChange(policies[0], {
      target: { value: PortalEventVisibilityMode.DEFAULT_OFF },
    } as unknown as Event);

    expect(policyServiceMock.update).not.toHaveBeenCalled();
  });

  it('F27: pide confirmación antes de activar ANNOTATION en DEFAULT_ON', async () => {
    policyServiceMock.update.mockReturnValue(
      of({ eventType: ProcessEventType.ANNOTATION, mode: PortalEventVisibilityMode.DEFAULT_ON, allowsAlways: false }),
    );
    const { component } = createComponent();
    const event = { target: { value: PortalEventVisibilityMode.DEFAULT_ON } } as unknown as Event;

    await component.onModeChange(policies[0], event);

    expect(confirmDialogMock.confirm).toHaveBeenCalled();
    expect(policyServiceMock.update).toHaveBeenCalledWith(
      ProcessEventType.ANNOTATION,
      PortalEventVisibilityMode.DEFAULT_ON,
    );
    expect(toastServiceMock.success).toHaveBeenCalled();
  });

  it('F27: si el usuario cancela la confirmación, revierte el select y no llama al servicio', async () => {
    confirmDialogMock.confirm.mockResolvedValue(false);
    const { component } = createComponent();
    const select = { value: PortalEventVisibilityMode.DEFAULT_ON } as HTMLSelectElement;
    const event = { target: select } as unknown as Event;

    await component.onModeChange(policies[0], event);

    expect(policyServiceMock.update).not.toHaveBeenCalled();
    expect(select.value).toBe(PortalEventVisibilityMode.DEFAULT_OFF);
  });

  it('en error de actualización, revierte el select y muestra un toast', async () => {
    policyServiceMock.update.mockReturnValue(throwError(() => ({ message: 'No se pudo actualizar' })));
    const { component } = createComponent();
    const select = { value: PortalEventVisibilityMode.DEFAULT_OFF } as HTMLSelectElement;
    const event = { target: select } as unknown as Event;

    await component.onModeChange(policies[1], event);

    expect(toastServiceMock.error).toHaveBeenCalledWith('No se pudo actualizar');
    expect(select.value).toBe(PortalEventVisibilityMode.ALWAYS);
  });
});
