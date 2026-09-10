import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchService } from './search.service';
import { SearchResultItem } from '../models/search.model';
import { environment } from '../../../environments/environment';

import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/search`;

  const result: SearchResultItem = {
    type: 'client',
    id: 'client-1',
    title: 'Industria Midas S.A.',
    subtitle: 'juridica@midas.com',
    linkPath: '/clients/client-1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });

    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('search hace GET a /search con el query q y extrae los resultados', () => {
    let results: SearchResultItem[] | undefined;
    service.search('midas').subscribe((r) => (results = r));

    const req = httpMock.expectOne((r) => r.url === apiUrl && r.params.get('q') === 'midas');
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', results: [result] });

    expect(results).toEqual([result]);
  });

  it('search en error propaga el mensaje del backend', () => {
    let error: Error | undefined;
    service.search('midas').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush({ message: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });

    expect(error?.message).toBe('No autorizado');
  });

  it('search en error sin mensaje del backend usa el mensaje genérico', () => {
    let error: Error | undefined;
    service.search('midas').subscribe({ error: (e) => (error = e) });

    httpMock.expectOne(() => true).flush('error', { status: 500, statusText: 'Server Error' });

    expect(error?.message).toBe('Error interno del servidor');
  });
});
