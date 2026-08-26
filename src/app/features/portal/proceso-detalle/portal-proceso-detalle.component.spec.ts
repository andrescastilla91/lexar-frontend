import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalProcesoDetalleComponent } from './portal-proceso-detalle.component';
import { PortalProcessesService } from '../../../core/services/portal-processes.service';
import { PortalDocumentItem, PortalTimelineItem } from '../../../core/models/portal.model';

describe('PortalProcesoDetalleComponent', () => {
  let portalProcessesServiceMock: {
    findTimeline: jest.Mock;
    findDocuments: jest.Mock;
    getDownloadUrl: jest.Mock;
  };
  let openSpy: jest.SpyInstance;

  const timeline: PortalTimelineItem[] = [
    { id: 'ev1', type: 'STATUS_CHANGE', description: 'x', createdAt: '2026-01-01' },
  ];
  const documents: PortalDocumentItem[] = [
    {
      id: 'f1',
      originalFilename: 'doc.pdf',
      contentType: 'application/pdf',
      formattedSize: '1.2 MB',
      createdAt: '2026-01-01',
    },
  ];

  function configure(
    paramId: string | null,
    overrides: Partial<typeof portalProcessesServiceMock> = {},
  ) {
    portalProcessesServiceMock = {
      findTimeline: jest.fn().mockReturnValue(of(timeline)),
      findDocuments: jest.fn().mockReturnValue(of(documents)),
      getDownloadUrl: jest.fn(),
      ...overrides,
    };

    const activatedRouteMock = {
      snapshot: { paramMap: { get: () => paramId } },
    };

    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    return TestBed.configureTestingModule({
      imports: [PortalProcesoDetalleComponent],
      providers: [
        provideRouter([]),
        { provide: PortalProcessesService, useValue: portalProcessesServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();
  }

  function createComponent() {
    const fixture = TestBed.createComponent(PortalProcesoDetalleComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => {
    openSpy?.mockRestore();
  });

  it('sin id en la ruta, muestra error sin llamar al servicio', async () => {
    await configure(null);
    const component = createComponent();

    expect(component.errorMessage()).toBe('Proceso no encontrado.');
    expect(component.isLoading()).toBe(false);
    expect(portalProcessesServiceMock.findTimeline).not.toHaveBeenCalled();
  });

  it('con id válido, carga timeline y documentos en paralelo', async () => {
    await configure('p1');
    const component = createComponent();

    expect(portalProcessesServiceMock.findTimeline).toHaveBeenCalledWith('p1');
    expect(portalProcessesServiceMock.findDocuments).toHaveBeenCalledWith('p1');
    expect(component.timeline()).toEqual(timeline);
    expect(component.documents()).toEqual(documents);
    expect(component.isLoading()).toBe(false);
  });

  it('en error de alguna de las dos cargas, expone el mensaje', async () => {
    await configure('p1', {
      findTimeline: jest.fn().mockReturnValue(
        throwError(() => new Error('No se pudo cargar el proceso')),
      ),
    });

    const component = createComponent();

    expect(component.errorMessage()).toBe('No se pudo cargar el proceso');
    expect(component.isLoading()).toBe(false);
  });

  it('eventTypeLabel traduce tipos conocidos y deja pasar los desconocidos', async () => {
    await configure('p1');
    const component = createComponent();

    expect(component.eventTypeLabel('STATUS_CHANGE')).toBe('Cambio de estado');
    expect(component.eventTypeLabel('TIPO_DESCONOCIDO')).toBe('TIPO_DESCONOCIDO');
  });

  it('onDownload abre la url firmada en una pestaña nueva', async () => {
    await configure('p1');
    portalProcessesServiceMock.getDownloadUrl.mockReturnValue(
      of({ url: 'https://s3/x', filename: 'doc.pdf', contentType: 'application/pdf', expiresIn: 300 }),
    );
    const component = createComponent();

    component.onDownload('f1');

    expect(portalProcessesServiceMock.getDownloadUrl).toHaveBeenCalledWith('p1', 'f1');
    expect(openSpy).toHaveBeenCalledWith('https://s3/x', '_blank', 'noopener');
    expect(component.downloadingId()).toBeNull();
  });

  it('onDownload no dispara una segunda descarga mientras una está en curso', async () => {
    await configure('p1');
    portalProcessesServiceMock.getDownloadUrl.mockReturnValue(of({ url: 'https://s3/x' }));
    const component = createComponent();
    component.downloadingId.set('f1');

    component.onDownload('f2');

    expect(portalProcessesServiceMock.getDownloadUrl).not.toHaveBeenCalled();
  });

  it('onDownload en error libera downloadingId sin abrir ventana', async () => {
    await configure('p1');
    portalProcessesServiceMock.getDownloadUrl.mockReturnValue(
      throwError(() => new Error('No se pudo generar el enlace')),
    );
    const component = createComponent();

    component.onDownload('f1');

    expect(component.downloadingId()).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
