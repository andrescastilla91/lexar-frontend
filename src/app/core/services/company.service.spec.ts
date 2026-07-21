import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CompanyService } from './company.service';
import { CompanyProfile } from '../models/company.model';
import { environment } from '../../../environments/environment';

describe('CompanyService', () => {
  let service: CompanyService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/company`;

  const company: CompanyProfile = {
    id: 'c1',
    legalName: 'Bufete Test',
    taxId: 'TAXID-1',
    address: null,
    email: null,
    legalRepresentative: null,
    phone: null,
    city: null,
    country: 'CO',
    registrationNumber: null,
    taxRegime: null,
    billingEmail: null,
    website: null,
    logoUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CompanyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getCompany extrae la empresa de la respuesta', () => {
    let result: CompanyProfile | undefined;
    service.getCompany().subscribe((c) => (result = c));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', company });

    expect(result).toEqual(company);
  });

  it('updateCompany envía PATCH con el cuerpo dado', () => {
    let result: CompanyProfile | undefined;
    service.updateCompany({ city: 'Bogotá' }).subscribe((c) => (result = c));

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ city: 'Bogotá' });
    req.flush({ message: 'ok', company: { ...company, city: 'Bogotá' } });

    expect(result?.city).toBe('Bogotá');
  });

  it('updateCompany elimina los campos vacíos antes de enviarlos', () => {
    service.updateCompany({ city: 'Cali', email: '', website: '' }).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.body).toEqual({ city: 'Cali' });
    req.flush({ message: 'ok', company });
  });
});
