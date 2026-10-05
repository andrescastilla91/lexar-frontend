import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PortalLegalTermsRequiredComponent } from './portal-legal-terms-required.component';
import { PortalAuthService } from '../../../core/services/portal-auth.service';
import { PortalLegalDocumentsService } from '../../../core/services/portal-legal-documents.service';
import { PendingLegalDocument } from '../../../core/models/legal-document.model';

const pendingDocument: PendingLegalDocument = {
  id: 'doc-1',
  type: 'portal_terms',
  version: '1.0',
  originalFilename: 'terminos-portal.pdf',
  contentType: 'application/pdf',
  publishedAt: '2026-10-05T00:00:00.000Z',
  downloadUrl: 'https://signed.example/terminos-portal.pdf',
};

describe('PortalLegalTermsRequiredComponent', () => {
  let portalAuthServiceMock: { patchCurrentPortalUser: jest.Mock; logout: jest.Mock };
  let legalDocumentsMock: { getPendingAcceptance: jest.Mock; accept: jest.Mock };
  let routerMock: { navigateByUrl: jest.Mock; navigate: jest.Mock };

  function create(pending: PendingLegalDocument | null = pendingDocument) {
    portalAuthServiceMock = {
      patchCurrentPortalUser: jest.fn(),
      logout: jest.fn().mockReturnValue(of(void 0)),
    };
    legalDocumentsMock = {
      getPendingAcceptance: jest.fn().mockReturnValue(of({ pending })),
      accept: jest.fn().mockReturnValue(of({ message: 'ok', acceptedAt: '2026-10-05T00:00:00.000Z' })),
    };
    routerMock = { navigateByUrl: jest.fn(), navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [PortalLegalTermsRequiredComponent],
      providers: [
        { provide: PortalAuthService, useValue: portalAuthServiceMock },
        { provide: PortalLegalDocumentsService, useValue: legalDocumentsMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    const fixture = TestBed.createComponent(PortalLegalTermsRequiredComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('carga y muestra el documento pendiente con su enlace de descarga', () => {
    const { fixture, component } = create();

    expect(component.pendingDocument()).toEqual(pendingDocument);
    expect(component.isLoading()).toBe(false);
    const link = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(link?.getAttribute('href')).toBe(pendingDocument.downloadUrl);
  });

  it('si ya no hay nada pendiente, limpia el flag y redirige a los procesos', () => {
    create(null);

    expect(portalAuthServiceMock.patchCurrentPortalUser).toHaveBeenCalledWith({ legalTermsPending: false });
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/portal/procesos');
  });

  it('muestra un error si falla la carga del documento pendiente', () => {
    portalAuthServiceMock = { patchCurrentPortalUser: jest.fn(), logout: jest.fn() };
    legalDocumentsMock = {
      getPendingAcceptance: jest.fn().mockReturnValue(throwError(() => new Error('Fallo de red'))),
      accept: jest.fn(),
    };
    routerMock = { navigateByUrl: jest.fn(), navigate: jest.fn() };
    TestBed.configureTestingModule({
      imports: [PortalLegalTermsRequiredComponent],
      providers: [
        { provide: PortalAuthService, useValue: portalAuthServiceMock },
        { provide: PortalLegalDocumentsService, useValue: legalDocumentsMock },
        { provide: Router, useValue: routerMock },
      ],
    });
    const fixture = TestBed.createComponent(PortalLegalTermsRequiredComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).toBe('Fallo de red');
    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('aceptar registra la aceptación, limpia el flag y navega a los procesos', () => {
    const { component } = create();

    component.accept('doc-1');

    expect(legalDocumentsMock.accept).toHaveBeenCalledWith('doc-1');
    expect(portalAuthServiceMock.patchCurrentPortalUser).toHaveBeenCalledWith({ legalTermsPending: false });
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/portal/procesos');
    expect(component.isAccepting()).toBe(false);
  });

  it('muestra el error y no navega si falla la aceptación', () => {
    const { component } = create();
    legalDocumentsMock.accept.mockReturnValue(throwError(() => new Error('El documento ya no es vigente')));

    component.accept('doc-1');

    expect(component.acceptError()).toBe('El documento ya no es vigente');
    expect(component.isAccepting()).toBe(false);
    expect(portalAuthServiceMock.patchCurrentPortalUser).not.toHaveBeenCalled();
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('ignora un segundo clic mientras la aceptación está en curso', () => {
    const { component } = create();
    component.isAccepting.set(true);

    component.accept('doc-1');

    expect(legalDocumentsMock.accept).not.toHaveBeenCalled();
  });

  it('cerrar sesión llama al logout del portal y vuelve al login del portal', () => {
    const { component } = create();

    component.logout();

    expect(portalAuthServiceMock.logout).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/portal/login']);
  });
});
