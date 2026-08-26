import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('empieza sin toasts', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('success agrega un toast de tipo success con id incremental', () => {
    service.success('Guardado exitosamente');

    expect(service.toasts()).toEqual([{ id: 1, type: 'success', message: 'Guardado exitosamente' }]);
  });

  it('error agrega un toast de tipo error', () => {
    service.error('Ocurrió un error');

    expect(service.toasts()).toEqual([{ id: 1, type: 'error', message: 'Ocurrió un error' }]);
  });

  it('cada push usa un id distinto e incremental', () => {
    service.success('uno');
    service.error('dos');

    expect(service.toasts().map((t) => t.id)).toEqual([1, 2]);
  });

  it('dismiss elimina el toast por id', () => {
    service.success('uno');
    service.error('dos');

    service.dismiss(1);

    expect(service.toasts()).toEqual([{ id: 2, type: 'error', message: 'dos' }]);
  });

  it('dismiss con un id inexistente no altera la lista', () => {
    service.success('uno');

    service.dismiss(999);

    expect(service.toasts()).toHaveLength(1);
  });

  it('se autodescarta después de 4000ms', () => {
    jest.useFakeTimers();
    service.success('temporal');

    expect(service.toasts()).toHaveLength(1);

    jest.advanceTimersByTime(4000);

    expect(service.toasts()).toEqual([]);
  });

  it('no se autodescarta antes de los 4000ms', () => {
    jest.useFakeTimers();
    service.success('temporal');

    jest.advanceTimersByTime(3999);

    expect(service.toasts()).toHaveLength(1);
  });
});
