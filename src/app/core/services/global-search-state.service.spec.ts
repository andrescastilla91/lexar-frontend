import { TestBed } from '@angular/core/testing';
import { GlobalSearchStateService } from './global-search-state.service';

describe('GlobalSearchStateService', () => {
  let service: GlobalSearchStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalSearchStateService);
  });

  it('empieza cerrado', () => {
    expect(service.isOpen()).toBe(false);
  });

  it('open pone isOpen en true', () => {
    service.open();
    expect(service.isOpen()).toBe(true);
  });

  it('close pone isOpen en false', () => {
    service.open();
    service.close();
    expect(service.isOpen()).toBe(false);
  });

  it('close cuando ya está cerrado sigue en false', () => {
    service.close();
    expect(service.isOpen()).toBe(false);
  });

  it('toggle invierte el estado en cada llamada', () => {
    expect(service.isOpen()).toBe(false);

    service.toggle();
    expect(service.isOpen()).toBe(true);

    service.toggle();
    expect(service.isOpen()).toBe(false);
  });
});
