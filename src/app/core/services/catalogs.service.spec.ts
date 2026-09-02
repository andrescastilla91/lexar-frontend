import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogsService } from './catalogs.service';
import { CatalogItem } from '../models/catalog-backend.model';
import { environment } from '../../../environments/environment';

import { errorInterceptor } from '../interceptors/error.interceptor';
import { PlanUpgradeService } from './plan-upgrade.service';

describe('CatalogsService', () => {
  let service: CatalogsService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/catalogs`;

  const items: CatalogItem[] = [
    {
      id: '1',
      catalogType: 'risk_level',
      code: 'LOW',
      label: 'Bajo',
      color: 'success',
      sortOrder: 2,
      isActive: true,
      isSystem: true,
    },
    {
      id: '2',
      catalogType: 'risk_level',
      code: 'HIGH',
      label: 'Alto',
      color: 'danger',
      sortOrder: 1,
      isActive: true,
      isSystem: true,
    },
    {
      id: '3',
      catalogType: 'risk_level',
      code: 'OLD',
      label: 'Obsoleto',
      color: null,
      sortOrder: 3,
      isActive: false,
      isSystem: false,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PlanUpgradeService, useValue: { isPlanGateError: () => false, promptUpgrade: () => {} } },
      ],
    });

    service = TestBed.inject(CatalogsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getCatalog hace GET a /catalogs/:type y extrae items', () => {
    let result: CatalogItem[] | undefined;
    service.getCatalog('risk_level').subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${apiUrl}/risk_level`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', items });

    expect(result).toEqual(items);
  });

  it('getCatalog cachea el resultado: dos suscripciones solo disparan un GET', () => {
    service.getCatalog('risk_level').subscribe();
    service.getCatalog('risk_level').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/risk_level`);
    req.flush({ message: 'ok', items });

    httpMock.expectNone(`${apiUrl}/risk_level`);
  });

  it('invalidate() limpia el caché y fuerza un nuevo GET en la siguiente llamada', () => {
    service.getCatalog('risk_level').subscribe();
    httpMock.expectOne(`${apiUrl}/risk_level`).flush({ message: 'ok', items });

    service.invalidate('risk_level');
    service.getCatalog('risk_level').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/risk_level`);
    req.flush({ message: 'ok', items });
  });

  it('getActiveCatalog filtra inactivos y ordena por sortOrder', () => {
    let result: CatalogItem[] | undefined;
    service.getActiveCatalog('risk_level').subscribe((r) => (result = r));

    httpMock.expectOne(`${apiUrl}/risk_level`).flush({ message: 'ok', items });

    expect(result?.map((i) => i.code)).toEqual(['HIGH', 'LOW']);
  });

  it('createItem invalida el caché: un GET previamente cacheado se vuelve a pedir', () => {
    // 1. Poblar el caché con un primer GET
    service.getCatalog('risk_level').subscribe();
    httpMock.expectOne(`${apiUrl}/risk_level`).flush({ message: 'ok', items });

    // 2. Crear un ítem — esto debe invalidar el caché de 'risk_level'
    let created: CatalogItem | undefined;
    service.createItem('risk_level', { code: 'URGENT', label: 'Urgente' }).subscribe((c) => (created = c));

    const postReq = httpMock.expectOne(`${apiUrl}/risk_level`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({ code: 'URGENT', label: 'Urgente' });
    postReq.flush({ message: 'ok', item: items[0] });
    expect(created).toEqual(items[0]);

    // 3. Si el caché NO se hubiera invalidado, esta llamada reutilizaría el observable
    //    anterior y no dispararía un GET nuevo — expectOne fallaría.
    service.getCatalog('risk_level').subscribe();
    httpMock.expectOne(`${apiUrl}/risk_level`).flush({ message: 'ok', items });
  });

  it('updateItem hace PATCH a /catalogs/items/:id', () => {
    let updated: CatalogItem | undefined;
    service.updateItem('risk_level', '1', { isActive: false }).subscribe((c) => (updated = c));

    const req = httpMock.expectOne(`${apiUrl}/items/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false });
    req.flush({ message: 'ok', item: { ...items[0], isActive: false } });

    expect(updated?.isActive).toBe(false);
  });

  it('deleteItem hace DELETE a /catalogs/items/:id', () => {
    let completed = false;
    service.deleteItem('risk_level', '3').subscribe(() => (completed = true));

    const req = httpMock.expectOne(`${apiUrl}/items/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok' });

    expect(completed).toBe(true);
  });

  it('propaga el mensaje de error del backend cuando el GET falla', () => {
    let error: Error | undefined;
    service.getCatalog('risk_level').subscribe({ error: (e) => (error = e) });

    httpMock
      .expectOne(`${apiUrl}/risk_level`)
      .flush({ message: 'Catálogo no encontrado' }, { status: 400, statusText: 'Bad Request' });

    expect(error?.message).toBe('Catálogo no encontrado');
  });
});
