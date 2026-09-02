import { TestBed } from '@angular/core/testing';
import { ProcessHistoryModalComponent } from './process-history-modal.component';
import { ProcessEvent, ProcessEventType } from '../../../core/models/process-event.model';
import { PermissionsService } from '../../../core/services/permissions.service';
import { PortalEventVisibilityMode } from '../../../core/models/portal-visibility-policy.model';

describe('ProcessHistoryModalComponent', () => {
  let permissionsServiceMock: { userPermissions: () => string[]; hasAnyPermission: jest.Mock };

  function configure(canEdit: boolean) {
    permissionsServiceMock = {
      userPermissions: () => [],
      hasAnyPermission: jest.fn().mockReturnValue(canEdit),
    };

    return TestBed.configureTestingModule({
      imports: [ProcessHistoryModalComponent],
      providers: [{ provide: PermissionsService, useValue: permissionsServiceMock }],
    }).compileComponents();
  }

  function createComponent() {
    return TestBed.createComponent(ProcessHistoryModalComponent);
  }

  const baseEvent: ProcessEvent = {
    id: 'ev1',
    type: ProcessEventType.STATUS_CHANGE,
    description: 'Cambio de estado a Activo',
    metadata: null,
    attachments: null,
    legalProcessId: 'p1',
    user: { id: 'u1', firstName: 'Ana', lastName: 'Gómez', email: 'ana@lexar.com' },
    createdAt: new Date('2026-01-01T10:00:00'),
    visibleToClient: false,
  };

  it('no renderiza nada cuando isOpen es false', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fixed')).toBeNull();
  });

  it('muestra el spinner mientras isLoadingHistory es true', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('isLoadingHistory', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.animate-spin')).not.toBeNull();
  });

  it('muestra el mensaje vacío cuando no hay eventos', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('events', []);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay eventos registrados para este proceso');
  });

  it('renderiza la descripción y el autor del evento', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('events', [baseEvent]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cambio de estado a Activo');
    expect(fixture.nativeElement.textContent).toContain('Ana Gómez');
  });

  it('F27: muestra el botón de visibilidad para eventos ANNOTATION cuando su política no es ALWAYS', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('events', [{ ...baseEvent, type: ProcessEventType.ANNOTATION }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title*="visible"]')).not.toBeNull();
  });

  it('F27: oculta el botón de visibilidad y muestra el badge "Siempre visible" cuando el tipo está en modo ALWAYS', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('events', [baseEvent]);
    fixture.componentRef.setInput('visibilityPolicies', [
      { eventType: ProcessEventType.STATUS_CHANGE, mode: PortalEventVisibilityMode.ALWAYS, allowsAlways: true },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title*="visible"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Siempre visible para el cliente');
  });

  it('sin el permiso legal_processes.edit, no muestra el botón de visibilidad', async () => {
    await configure(false);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('events', [baseEvent]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[title*="visible"]')).toBeNull();
  });

  it('con permiso, emite toggleVisibility invirtiendo el estado actual', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('events', [{ ...baseEvent, visibleToClient: false }]);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.toggleVisibility.subscribe(spy);

    fixture.nativeElement.querySelector('button[title*="visible"]').click();

    expect(spy).toHaveBeenCalledWith({ eventId: 'ev1', visibleToClient: true });
  });

  it('muestra los archivos adjuntos con acciones de ver y descargar', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('events', [
      {
        ...baseEvent,
        attachments: [{ url: 'file-1', filename: 'contrato.pdf', size: 2048, uploadedAt: new Date('2026-01-01') }],
      },
    ]);
    fixture.detectChanges();

    const previewSpy = jest.fn();
    const downloadSpy = jest.fn();
    fixture.componentInstance.previewFile.subscribe(previewSpy);
    fixture.componentInstance.downloadFile.subscribe(downloadSpy);

    fixture.nativeElement.querySelector('button[title="Ver archivo"]').click();
    fixture.nativeElement.querySelector('button[title="Descargar archivo"]').click();

    expect(previewSpy).toHaveBeenCalledWith({ fileId: 'file-1', filename: 'contrato.pdf' });
    expect(downloadSpy).toHaveBeenCalledWith('file-1');
  });

  it('emite close al hacer clic en cerrar', async () => {
    await configure(true);
    const fixture = createComponent();
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('events', []);
    fixture.detectChanges();

    const spy = jest.fn();
    fixture.componentInstance.close.subscribe(spy);

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const closeBtn = buttons.find((b) => b.textContent?.trim() === 'Cerrar');
    closeBtn!.click();

    expect(spy).toHaveBeenCalled();
  });
});
