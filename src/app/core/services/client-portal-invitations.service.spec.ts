import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClientPortalInvitationsService } from './client-portal-invitations.service';
import { ClientPortalInvitationSummary } from '../models/portal.model';
import { environment } from '../../../environments/environment';

describe('ClientPortalInvitationsService', () => {
  let service: ClientPortalInvitationsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/clients`;
  const clientId = 'client-1';

  const summary: ClientPortalInvitationSummary = {
    id: 'pu-1',
    email: 'cliente@x.com',
    isActive: true,
    status: 'pendiente',
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ClientPortalInvitationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('list hace GET a /clients/:clientId/portal-invitations', () => {
    let result: { portalUsers: ClientPortalInvitationSummary[] } | undefined;
    service.list(clientId).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/${clientId}/portal-invitations`);
    expect(req.request.method).toBe('GET');
    req.flush({ portalUsers: [summary] });

    expect(result).toEqual({ portalUsers: [summary] });
  });

  it('invite hace POST con el email en el body', () => {
    let result: { message: string; portalUser: { id: string; email: string; clientId: string } } | undefined;
    service.invite(clientId, 'nuevo@x.com').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/${clientId}/portal-invitations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'nuevo@x.com' });

    const response = { message: 'ok', portalUser: { id: 'pu-2', email: 'nuevo@x.com', clientId } };
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('resend hace POST a /portal-invitations/:portalUserId/resend', () => {
    let result: { message: string } | undefined;
    service.resend(clientId, 'pu-1').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/${clientId}/portal-invitations/pu-1/resend`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ message: 'Invitación reenviada' });

    expect(result).toEqual({ message: 'Invitación reenviada' });
  });
});
